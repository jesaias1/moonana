# Moonana Studio

A power-user image generation frontend for Google's Gemini models (`gemini-3.1-flash-image-preview`) via the Gemini API.

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Add API Key:**
   Copy `.env.example` to `.env.local` and add your Google API Key:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local`:
   ```env
   GOOGLE_API_KEY=your_actual_api_key_here
   ```

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
