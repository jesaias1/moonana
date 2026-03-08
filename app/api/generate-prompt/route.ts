import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'your_actual_api_key_here' || apiKey === 'your_key_here') {
       return NextResponse.json({ error: 'Google API Key not configured properly in .env.local' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const body = await req.json();

    if (!body.imageBase64) {
      return NextResponse.json({ error: 'Base64 Image is required' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Parse the base64 string
    const [meta, data] = body.imageBase64.split(',');
    const mimeType = meta.split(':')[1].split(';')[0];
    
    const prompt = "Analyze this image and provide a highly detailed, extremely descriptive prompt that could be used to recreate it with an AI image generator. Focus on the primary subject, specific lighting techniques, artistic style, structural composition, camera angles, and overarching mood. Write it as a single, fluid paragraph of comma-separated descriptive keywords. Do not include any conversational text. Return ONLY the final prompt.";

    const response = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: data,
          mimeType: mimeType
        }
      }
    ]);
    
    const text = response.response.text();

    return NextResponse.json({ prompt: text.trim().replace(/^"|"$/g, '') });
  } catch (err: unknown) {
    console.error('Prompt Generation Error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to generate prompt' }, { status: 500 });
  }
}
