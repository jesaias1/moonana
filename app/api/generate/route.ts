import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GenerationSettings } from '@/lib/types';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { usersTable, generationsTable } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_MOONANAS_SUPABASE_URL || '',
  process.env.MOONANAS_SUPABASE_SERVICE_ROLE_KEY || ''
);

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

    // Explicitly fallback to 'dummy' to satisfy Next.js static analyzers that might bypass the conditional return
    const genAI = new GoogleGenerativeAI(apiKey || 'dummy_build_token');
    const body: GenerationSettings = await req.json();

    const session = await getSession();
    const reqIp = req.ip ?? req.headers.get('x-forwarded-for') ?? 'unknown'; // Token Limit Validation
    const requestedImages = body.numberOfImages || 1;

    let hasToken = false;
    let userId: string = '';
    let currentDbTokens = 0;

    if (session && typeof session.id === 'string') {
      userId = session.id;
      const userRecords = await db.select().from(usersTable).where(eq(usersTable.id, userId));
      if (userRecords.length > 0) {
        currentDbTokens = userRecords[0].tokenBalance;
        hasToken = currentDbTokens >= requestedImages;
      }
    } else {
      hasToken = checkAndConsumeToken(reqIp); // old guest fallback
    }

    if (!hasToken) {
      return NextResponse.json(
        { error: 'Token limit exhausted. Please login or purchase more tokens.', code: 'PAYMENT_REQUIRED' },
        { status: 402 } // HTTP 402 Payment Required
      );
    }
    
    if (!body.prompt && (!body.references || body.references.length === 0)) {
      return NextResponse.json({ error: 'A prompt or a reference image is required' }, { status: 400 });
    }

    const finalPrompt = body.prompt && body.prompt.trim() !== '' 
      ? body.prompt 
      : "Generate a high-quality image that combines the provided reference images, adhering to their composition and style features.";

    // Spec says to use model: "gemini-3.1-flash-image-preview" via @google/generative-ai
    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image-preview' });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [{ text: finalPrompt }];
    
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
    for (let i = 0; i < requestedImages; i++) {
        const generationConfig: Record<string, unknown> = {};
        if (body.seed !== undefined && body.seed !== null) {
             generationConfig.seed = body.seed + i; // Offset seed for multiple outputs to avoid duplicate images
        }

        const response = await model.generateContent({
             contents: [{ role: 'user', parts: parts }],
             generationConfig
        });
        
        const candidates = response.response.candidates;
        let base64Image = '';
        
        if (candidates && candidates.length > 0 && candidates[0].content?.parts?.[0]?.inlineData) {
            const data = candidates[0].content.parts[0].inlineData;
            base64Image = data.data; // Raw base64 payload
        } else {
             const responseText = response.response.text();
             if (responseText.length > 500) { 
                 base64Image = responseText.replace(/^data:image\/\w+;base64,/, '');
             } else {
                 throw new Error("Could not parse image from model response, check API key permissions.");
             }
        }
        
        if (base64Image) {
            // Convert base64 to buffer natively on Node Edge
            const buffer = Buffer.from(base64Image, 'base64');
            const blobId = randomUUID();
            const filePath = `${blobId}.jpg`;
            
            // Push directly to Supabase Storage
            const { error: uploadError } = await supabase.storage
              .from('generations')
              .upload(filePath, buffer, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: false
              });
              
            if (uploadError) {
              console.error("Supabase Storage Upload Error:", uploadError);
              throw new Error("Failed to upload image to storage");
            }

            // Get public URL
            const { data: publicUrlData } = supabase.storage
              .from('generations')
              .getPublicUrl(filePath);

            results.push(publicUrlData.publicUrl);
        }
    }

    // Deduct tokens and log history if logged in
    if (session && userId && results.length > 0) {
      // Deduct exactly the amount we successfully generated
      await db.update(usersTable)
        .set({ tokenBalance: sql`${usersTable.tokenBalance} - ${results.length}` })
        .where(eq(usersTable.id, userId));

      // Asynchronously log the generations to PostgreSQL using the Blob CDN URL
      try {
         const generationInserts = results.map(url => ({
           id: randomUUID(),
           userId: userId,
           prompt: body.prompt,
           imageUrl: url, 
         }));
         await db.insert(generationsTable).values(generationInserts);
      } catch (logErr) {
         console.error("Failed to log generation history to DB:", logErr);
      }
    }

    // Return the updated balance to the frontend
    let finalTokensRemaining = 0;
    if (session && userId) {
       finalTokensRemaining = currentDbTokens - results.length;
    } else {
       finalTokensRemaining = tokenMap.get(reqIp)?.balance || 0;
    }

    return NextResponse.json({ images: results, tokensRemaining: finalTokensRemaining });
  } catch (err: unknown) {
    console.error('Generation Error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to generate image' }, { status: 500 });
  }
}
