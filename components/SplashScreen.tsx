"use client";

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export default function SplashScreen() {
  const [isFading, setIsFading] = useState(false);
  const [isGone, setIsGone] = useState(false);

  useEffect(() => {
    // Show splash for 0.8s, then fade out over 400ms
    const fadeTimer = setTimeout(() => setIsFading(true), 800);
    const unmountTimer = setTimeout(() => setIsGone(true), 1200);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (isGone) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] flex flex-col items-center justify-center bg-background text-foreground transition-opacity duration-400",
        isFading ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
    >
      <div className="relative flex flex-col items-center">
        {/* Glowing Moon Logo */}
        <div className="relative mb-6 flex items-center justify-center">
          <div className="absolute inset-0 bg-yellow-100/20 blur-3xl rounded-full w-32 h-32 scale-150 animate-pulse" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/logo.png" 
            alt="Moonana Logo" 
            className="w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] z-10" 
          />
        </div>
        
        {/* Title & Branding */}
        <h1 className="text-3xl font-extrabold tracking-widest text-white mb-2 drop-shadow-lg">
          MOONANA <span className="text-yellow-400 font-light">STUDIO</span>
        </h1>
        <p className="text-sm font-medium text-gray-400 tracking-[0.2em] uppercase">
          Initializing Workspace...
        </p>
        
        {/* Loading Bar */}
        <div className="w-48 h-1 bg-panelBorder rounded-full mt-8 overflow-hidden">
          <div className="h-full bg-yellow-400 w-full rounded-full origin-left animate-[splash-progress_0.8s_ease-in-out_forwards]" />
        </div>
      </div>

      <style jsx>{`
        @keyframes splash-progress {
          0% { transform: scaleX(0); }
          50% { transform: scaleX(0.6); }
          100% { transform: scaleX(1); }
        }
      `}</style>
    </div>
  );
}
