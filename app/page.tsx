import React from 'react';
import Link from 'next/link';
import { Layers, Wand2, Zap } from 'lucide-react';
import { db } from '@/db';
import { generationsTable } from '@/db/schema';
import { desc, isNotNull } from 'drizzle-orm';
import AnimatedHero from '@/components/AnimatedHero';
import AnimatedGallery from '@/components/AnimatedGallery';

export default async function LandingPage() {
  // Fetch recent generations for the public showcase gallery
  const recentGens = await db.select({ imageUrl: generationsTable.imageUrl })
    .from(generationsTable)
    .where(isNotNull(generationsTable.imageUrl))
    .orderBy(desc(generationsTable.createdAt))
    .limit(10);
    
  const galleryImages = recentGens.map(g => g.imageUrl);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-accent/30 flex flex-col overflow-x-hidden">
      
      {/* Navigation */}
      <header className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             {/* eslint-disable-next-line @next/next/no-img-element */}
             <img src="/logo.png" alt="Moonana Studio Logo" className="w-8 h-8 object-contain" />
             <span className="font-bold tracking-widest text-lg">MOONANA <span className="text-yellow-400 font-light">STUDIO</span></span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link href="#features" className="text-gray-400 hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</Link>
            <Link href="/studio" className="bg-white text-black px-5 py-2 rounded-full hover:bg-yellow-400 hover:scale-105 transition-all shadow-lg font-bold">
              Launch Studio
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section (Animated) */}
      <AnimatedHero />

      {/* Generated Image Showcase */}
      {galleryImages.length > 0 && <AnimatedGallery images={galleryImages} />}

      {/* Feature Highlights */}
      <section id="features" className="py-24 bg-black/50 border-t border-b border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">Engineered for Creators</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">Stop wrestling with prompt engineering. Use our visual tools to enforce structural alignment and persistent characters.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-panel/50 border border-panelBorder p-8 rounded-2xl hover:bg-panel transition-colors group">
              <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center mb-6 text-accent group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Composition Strictness</h3>
              <p className="text-gray-400 leading-relaxed">
                Upload a layout reference and dial in the strictness. From "Loose" inspiration to "Exact" pixel-perfect structural alignment.
              </p>
            </div>
            
            <div className="bg-panel/50 border border-panelBorder p-8 rounded-2xl hover:bg-panel transition-colors group">
              <div className="w-12 h-12 bg-yellow-400/20 rounded-xl flex items-center justify-center mb-6 text-yellow-500 group-hover:scale-110 transition-transform">
                <Wand2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Style Presets & Transfer</h3>
              <p className="text-gray-400 leading-relaxed">
                Apply curated 8k cinematic lighting presets, or upload a reference painting to extract and transfer its aesthetic universally.
              </p>
            </div>

            <div className="bg-panel/50 border border-panelBorder p-8 rounded-2xl hover:bg-panel transition-colors group">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center mb-6 text-purple-400 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold mb-3">Persistent Characters</h3>
              <p className="text-gray-400 leading-relaxed">
                Save local Character Profiles with multi-angle reference photos. Inject them instantly into any scenario with zero hallucination.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section id="pricing" className="py-24 px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Simple, Transparent Pricing</h2>
          <p className="text-gray-400 mb-12">Get 7 free generations on sign up. Purchase tokens to continue creating.</p>

          <div className="bg-gradient-to-br from-panel to-background border border-panelBorder rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden text-left hover:shadow-accent/10 transition-shadow duration-500">
            <div className="absolute top-0 right-0 w-64 h-64 bg-accent/10 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 relative z-10">
              <div>
                <h3 className="text-2xl font-bold mb-2">Moonana Tokens <span className="text-accent bg-accent/10 px-2 py-0.5 rounded text-sm ml-2">PRO</span></h3>
                <p className="text-gray-400 mb-6">Fuel your creativity without subscription traps.</p>
                <div className="flex flex-col mb-6 text-white bg-white/5 p-5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-5xl font-extrabold text-green-400">7 Free</span>
                    <span className="text-gray-300 font-medium tracking-wide uppercase text-sm">Generations</span>
                  </div>
                  <div className="flex items-baseline gap-2 pt-3 border-t border-white/10">
                    <span className="text-2xl font-bold">$5</span>
                    <span className="text-gray-500 font-medium uppercase text-xs">/ 50 images thereafter</span>
                  </div>
                </div>
                <ul className="space-y-3">
                  {['High-speed Gemini Flash generations', 'Unlimited local history', 'Custom style presets', 'Composition enforcement tools'].map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-gray-300">
                      <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 text-xs">✓</div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="w-full md:w-auto flex-shrink-0">
                <Link 
                  href="/studio" 
                  className="block w-full text-center bg-white text-black px-10 py-5 rounded-2xl font-bold text-lg hover:bg-yellow-400 transition-colors shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:scale-105 transform duration-300"
                >
                  Enter Studio
                </Link>
                <p className="text-xs text-gray-500 text-center mt-4">No credit card required.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-600 border-t border-white/5 relative z-10">
        <p>© {new Date().getFullYear()} Moonana Studio. All rights reserved.</p>
      </footer>
    </div>
  );
}
