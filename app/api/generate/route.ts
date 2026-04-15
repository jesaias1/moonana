import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GenerationSettings } from '@/lib/types';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { usersTable, generationsTable } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_MOONANAS_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.MOONANAS_SUPABASE_SERVICE_ROLE_KEY || '';

// Lazy-init supabase client (only if credentials are present)
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Token tracking: Maps IP -> Remaining Tokens
const tokenMap = new Map<string, { balance: number; lastModified: number }>();
const MAX_FREE_TOKENS = 7;

function checkAndConsumeToken(ip: string): boolean {
  const now = Date.now();
  let record = tokenMap.get(ip);

  if (!record) {
    record = { balance: MAX_FREE_TOKENS, lastModified: now };
    tokenMap.set(ip, record);
  }

  // Quick garbage collection (1%) to prevent map leak
  if (Math.random() < 0.01) {
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
    Array.from(tokenMap.entries()).forEach(([key, value]) => {
      if (now - value.lastModified > THIRTY_DAYS) tokenMap.delete(key);
    });
  }

  if (record.balance > 0) {
    record.balance -= 1;
    record.lastModified = now;
    return true;
  }

  return false;
}

/**
 * Extract base64 image data from a Gemini API response.
 * Scans ALL candidate parts for inlineData, not just the first one.
 */
function extractBase64FromResponse(response: { response: { candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data: string; mimeType?: string } }> } }>; text: () => string } }): string {
  const candidates = response.response.candidates;
  
  if (candidates && candidates.length > 0) {
    // Scan all parts in all candidates for inlineData
    for (const candidate of candidates) {
      const parts = candidate.content?.parts;
      if (!parts) continue;
      
      for (const part of parts) {
        if (part.inlineData?.data) {
          return part.inlineData.data;
        }
      }
    }
  }
  
  // Final fallback: try text() which may contain raw base64
  try {
    const text = response.response.text();
    // Check if it looks like base64 image data (long string, no HTML tags)
    if (text.length > 1000 && !text.includes('<') && !text.includes('{')) {
      return text.replace(/^data:image\/\w+;base64,/, '');
    }
  } catch {
    // text() can throw if response has parts without text
  }

  return '';
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'your_actual_api_key_here' || apiKey === 'your_key_here') {
       return NextResponse.json({ error: 'Google API Key not configured properly in .env.local' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const body: GenerationSettings = await req.json();

    const session = await getSession();
    const reqIp = req.ip ?? req.headers.get('x-forwarded-for') ?? 'unknown';
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
      hasToken = checkAndConsumeToken(reqIp);
    }

    if (!hasToken) {
      return NextResponse.json(
        { error: 'Token limit exhausted. Please login or purchase more tokens.', code: 'PAYMENT_REQUIRED' },
        { status: 402 }
      );
    }
    
    if (!body.prompt && (!body.references || body.references.length === 0)) {
      return NextResponse.json({ error: 'A prompt or a reference image is required' }, { status: 400 });
    }

    const finalPrompt = body.prompt && body.prompt.trim() !== '' 
      ? body.prompt 
      : "Generate a high-quality image that combines the provided reference images, adhering to their composition and style features.";

    const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-image-preview' });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = [{ text: finalPrompt }];
    
    // Append any reference images
    if (body.references && body.references.length > 0) {
      body.references.forEach((ref) => {
        const [meta, data] = ref.base64.split(',');
        const mimeType = meta.split(':')[1].split(';')[0];
        
        parts.push({ text: `\n[Attached Reference Image: ${ref.label || 'Unnamed'}]\n` });
        
        parts.push({
          inlineData: {
            data: data,
            mimeType: mimeType
          }
        });
      });
    }

    // Generate images in parallel
    const generationPromises = Array.from({ length: requestedImages }).map(async (_, i) => {
        const generationConfig: Record<string, unknown> = {};
        if (body.seed !== undefined && body.seed !== null) {
             generationConfig.seed = body.seed + i;
        }

        const response = await model.generateContent({
             contents: [{ role: 'user', parts: parts }],
             generationConfig
        });
        
        const base64Image = extractBase64FromResponse(response);
        
        if (!base64Image) {
           throw new Error("Failed to extract image data from model response. The model may not have returned an image.");
        }

        // Try to upload to Supabase Storage, fall back to inline base64 if unavailable
        if (supabase) {
          try {
            const buffer = Buffer.from(base64Image, 'base64');
            const arrayBuffer = new Uint8Array(buffer).buffer;
            const blobId = randomUUID();
            const filePath = `${blobId}.jpg`;
            
            const { error: uploadError } = await supabase.storage
              .from('generations')
              .upload(filePath, arrayBuffer, {
                contentType: 'image/jpeg',
                cacheControl: '3600',
                upsert: false
              });
              
            if (uploadError) {
              console.error("Supabase Storage Upload Error:", uploadError);
              return `data:image/jpeg;base64,${base64Image}`;
            }

            const { data: publicUrlData } = supabase.storage
              .from('generations')
              .getPublicUrl(filePath);

            return publicUrlData.publicUrl;
          } catch (storageErr) {
            console.error("Storage upload network error:", storageErr);
            return `data:image/jpeg;base64,${base64Image}`;
          }
        }
        
        // No Supabase configured — return inline base64
        return `data:image/jpeg;base64,${base64Image}`;
    });

    const results: string[] = await Promise.all(generationPromises);
    const elapsedMs = Date.now() - startTime;

    // Deduct tokens and log history if logged in
    if (session && userId && results.length > 0) {
      await db.update(usersTable)
        .set({ tokenBalance: sql`${usersTable.tokenBalance} - ${results.length}` })
        .where(eq(usersTable.id, userId));

      try {
         const generationInserts = results.map(url => ({
           id: randomUUID(),
           userId: userId,
           prompt: body.prompt,
           imageUrl: url.startsWith('data:') ? '[inline-base64]' : url, // Don't store huge base64 in DB
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

    return NextResponse.json({ 
      images: results, 
      tokensRemaining: finalTokensRemaining,
      elapsedMs,
    });
  } catch (err: unknown) {
    console.error('Generation Error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to generate image' }, { status: 500 });
  }
}
