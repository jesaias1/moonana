import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { GenerationSettings } from '@/lib/types';
import { getSession } from '@/lib/auth';
import { db } from '@/db';
import { usersTable, generationsTable } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_MOONANAS_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.MOONANAS_SUPABASE_SERVICE_ROLE_KEY || '';

// Lazy-init supabase client (only if credentials are present)
const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export const maxDuration = 300;
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
 * Map the app's resolution/aspect ratio settings to GPT Image 2 supported sizes.
 * Supported sizes: 1024x1024, 1024x1792, 1792x1024, and "auto"
 */
function mapToGptImageSize(resolution: string, aspectRatio: string): "1024x1024" | "1024x1792" | "1792x1024" | "auto" {
  // Prioritize aspect ratio for size selection
  if (aspectRatio === '9:16' || aspectRatio === '2:3') {
    return '1024x1792'; // Portrait
  }
  if (aspectRatio === '16:9' || aspectRatio === '3:2') {
    return '1792x1024'; // Landscape
  }
  // Check resolution string for non-square hints
  if (resolution) {
    const parts = resolution.split('x').map(Number);
    if (parts.length === 2 && parts[0] > parts[1]) return '1792x1024';
    if (parts.length === 2 && parts[1] > parts[0]) return '1024x1792';
  }
  return '1024x1024'; // Default square
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'your_openai_api_key_here') {
       return NextResponse.json({ error: 'OpenAI API Key not configured properly in .env.local' }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey });
    const body: GenerationSettings = await req.json();

    const session = await getSession();
    const reqIp = req.ip ?? req.headers.get('x-forwarded-for') ?? 'unknown';
    const requestedImages = body.numberOfImages || 1;

    let hasToken = false;
    let userId: string = '';
    let currentDbTokens = 0;

    if (session && typeof session.id === 'string') {
      userId = session.id;
      try {
        const userRecords = await db.select().from(usersTable).where(eq(usersTable.id, userId));
        if (userRecords.length > 0) {
          currentDbTokens = userRecords[0].tokenBalance;
          hasToken = currentDbTokens >= requestedImages;
        }
      } catch {
        // DB is down — fall back to in-memory token tracking for logged-in users too
        console.warn('DB unavailable for token check, using in-memory fallback');
        hasToken = checkAndConsumeToken(reqIp);
        userId = ''; // Don't try DB writes later
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

    // Build the final prompt, incorporating reference image descriptions into the text
    let finalPrompt = body.prompt && body.prompt.trim() !== '' 
      ? body.prompt 
      : "Generate a stunning, high-quality image with vivid colors and professional composition.";

    // Append reference image labels into prompt context (GPT Image 2 does not accept inline image data)
    if (body.references && body.references.length > 0) {
      const refDescriptions = body.references
        .map((ref, i) => ref.label || `Reference ${i + 1}`)
        .join(', ');
      finalPrompt += `\n\n[Context: This generation should be informed by the following reference concepts: ${refDescriptions}]`;
    }

    // Map resolution settings to GPT Image 2 supported sizes
    const imageSize = mapToGptImageSize(body.resolution || '1024x1024', body.aspectRatio || '1:1');

    // Generate images sequentially
    const PER_IMAGE_TIMEOUT_MS = 120_000; // 120 seconds per image
    const results: string[] = [];

    for (let i = 0; i < requestedImages; i++) {
        // Create AbortController for per-image timeout
        const controller = new AbortController();
        const timeoutHandle = setTimeout(() => controller.abort(), PER_IMAGE_TIMEOUT_MS);

        try {
          const response = await openai.images.generate({
            model: 'gpt-image-2',
            prompt: finalPrompt,
            n: 1,
            size: imageSize,
            quality: 'high',
          });

          clearTimeout(timeoutHandle);
          
          const imageData = response.data?.[0];
          if (!imageData) {
            throw new Error("Failed to extract image data from GPT Image 2 response.");
          }

          let imageUrl: string;

          // Handle base64 response
          if (imageData.b64_json) {
            const base64Image = imageData.b64_json;
            imageUrl = `data:image/png;base64,${base64Image}`;

            // Try to upload to Supabase Storage
            if (supabase) {
              try {
                const buffer = Buffer.from(base64Image, 'base64');
                const arrayBuffer = new Uint8Array(buffer).buffer;
                const blobId = randomUUID();
                const filePath = `${blobId}.png`;
                
                const { error: uploadError } = await supabase.storage
                  .from('generations')
                  .upload(filePath, arrayBuffer, {
                    contentType: 'image/png',
                    cacheControl: '3600',
                    upsert: false
                  });
                  
                if (!uploadError) {
                  const { data: publicUrlData } = supabase.storage
                    .from('generations')
                    .getPublicUrl(filePath);
                  imageUrl = publicUrlData.publicUrl;
                } else {
                  console.error("Supabase Storage Upload Error:", uploadError);
                }
              } catch (storageErr) {
                console.error("Storage upload network error:", storageErr);
              }
            }
          } else if (imageData.url) {
            // Handle URL response — download and re-upload to Supabase for persistence
            imageUrl = imageData.url;

            if (supabase) {
              try {
                const imgResponse = await fetch(imageData.url);
                const imgBuffer = await imgResponse.arrayBuffer();
                const blobId = randomUUID();
                const filePath = `${blobId}.png`;

                const { error: uploadError } = await supabase.storage
                  .from('generations')
                  .upload(filePath, imgBuffer, {
                    contentType: 'image/png',
                    cacheControl: '3600',
                    upsert: false
                  });

                if (!uploadError) {
                  const { data: publicUrlData } = supabase.storage
                    .from('generations')
                    .getPublicUrl(filePath);
                  imageUrl = publicUrlData.publicUrl;
                } else {
                  console.error("Supabase Storage Upload Error:", uploadError);
                }
              } catch (storageErr) {
                console.error("Storage upload network error:", storageErr);
              }
            }
          } else {
            throw new Error("GPT Image 2 returned neither a URL nor base64 data.");
          }

          results.push(imageUrl);
        } catch (imgErr) {
          clearTimeout(timeoutHandle);
          if (imgErr instanceof Error && imgErr.name === 'AbortError') {
            console.error(`Image ${i + 1} generation timed out after ${PER_IMAGE_TIMEOUT_MS / 1000}s`);
            // If we already have some results, continue with what we have
            if (results.length > 0) break;
            throw new Error(`Image generation timed out after ${PER_IMAGE_TIMEOUT_MS / 1000} seconds. Try a simpler prompt or fewer images.`);
          }
          throw imgErr;
        }
    }
    const elapsedMs = Date.now() - startTime;

    // Deduct tokens and log history if logged in (skip if DB is down — userId will be empty)
    if (session && userId && results.length > 0) {
      try {
        await db.update(usersTable)
          .set({ tokenBalance: sql`${usersTable.tokenBalance} - ${results.length}` })
          .where(eq(usersTable.id, userId));

        const generationInserts = results.map(url => ({
          id: randomUUID(),
          userId: userId,
          prompt: body.prompt,
          imageUrl: url.startsWith('data:') ? '[inline-base64]' : url,
        }));
        await db.insert(generationsTable).values(generationInserts);
      } catch (dbErr) {
        console.warn("DB unavailable for token deduction/logging:", (dbErr as Error).message);
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
