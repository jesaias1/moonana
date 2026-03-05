import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GenerationSettings } from '@/lib/types';

export const maxDuration = 60; // Set Vercel max duration limit higher for generation
export const dynamic = 'force-dynamic';

// Token tracking: Maps IP -> Remaining Tokens
const tokenMap = new Map<string, { balance: number; lastModified: number }>();
const MAX_FREE_TOKENS = 10;

function checkAndConsumeToken(ip: string): boolean {
  const now = Date.now();
  let record = tokenMap.get(ip);

  if (!record) {
    record = { balance: MAX_FREE_TOKENS, lastModified: now };
    tokenMap.set(ip, record);
  }

  // Quick garbage collection (1%) to prevent map leak
  if (Math.random() < 0.01) {
    // Arbitrary 30-day cleanup of dead IP records
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    Array.from(tokenMap.entries()).forEach(([key, value]) => {
      if (now - value.lastModified > THIRTY_DAYS) tokenMap.delete(key);
    });
  }

  if (record.balance > 0) {
    record.balance -= 1;
    record.lastModified = now;
    return true; // Token granted
  }

  return false; // Token exhausted
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'your_actual_api_key_here' || apiKey === 'your_key_here') {
       return NextResponse.json({ error: 'Google API Key not configured properly in .env.local' }, { status: 500 });
    }

    const ip = req.ip ?? req.headers.get('x-forwarded-for') ?? 'unknown'; // Token Limit Validation
    const hasToken = checkAndConsumeToken(ip);
    if (!hasToken) {
      return NextResponse.json(
        { error: 'Token limit exhausted', code: 'PAYMENT_REQUIRED' },
        { status: 402 } // HTTP 402 Payment Required
      );
    }
    
    // Explicitly fallback to 'dummy' to satisfy Next.js static analyzers that might bypass the conditional return
    const genAI = new GoogleGenerativeAI(apiKey || 'dummy_build_token');
    const body: GenerationSettings = await req.json();
    
    if (!body.prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Spec says to use model: "gemini-3.1-flash-image-preview" via @google/generative-ai
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image-preview' });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [{ text: body.prompt }];
    
    // Append any reference images
    if (body.references && body.references.length > 0) {
      body.references.forEach((ref) => {
        // base64 format is typically "data:image/jpeg;base64,...data..."
        const [meta, data] = ref.base64.split(',');
        const mimeType = meta.split(':')[1].split(';')[0];
        
        // Explicitly label the attached inlineData part
        parts.push({ text: `\n[Attached Reference Image: ${ref.label || 'Unnamed'}]\n` });
        
        parts.push({
          inlineData: {
            data: data,
            mimeType: mimeType
          }
        });
      });
    }

    const results: string[] = [];
    
    // We generate images iteratively based on numberOfImages
    for (let i = 0; i < body.numberOfImages; i++) {
        const generationConfig: Record<string, unknown> = {};
        if (body.seed !== undefined && body.seed !== null) {
             generationConfig.seed = body.seed + i; // Offset seed for multiple outputs to avoid duplicate images
        }

        const response = await model.generateContent({
             contents: [{ role: 'user', parts: parts }],
             generationConfig
        });
        
        // Handle response extraction. The Gemini SDK for image generation typically returns parts with inlineData.
        const candidates = response.response.candidates;
        let base64Image = '';
        
        if (candidates && candidates.length > 0 && candidates[0].content?.parts?.[0]?.inlineData) {
            const data = candidates[0].content.parts[0].inlineData;
            base64Image = `data:${data.mimeType};base64,${data.data}`;
        } else {
             // Fallback for models returning text payload representing base64 or JSON
             const responseText = response.response.text();
             if (responseText.length > 500) { // arbitrary threshold for base64 vs error string
                 if (responseText.startsWith('data:image')) {
                     base64Image = responseText;
                 } else {
                     base64Image = `data:image/jpeg;base64,${responseText.trim()}`;
                 }
             } else {
                 throw new Error("Could not parse image from model response, check API key permissions.");
             }
        }
        
        if (base64Image) {
            results.push(base64Image);
        }
    }

    const currentTokens = tokenMap.get(ip)?.balance || 0;
    return NextResponse.json({ images: results, tokensRemaining: currentTokens });
  } catch (err: unknown) {
    console.error('Generation Error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to generate image' }, { status: 500 });
  }
}
