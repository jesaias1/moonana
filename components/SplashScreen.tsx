"use client";

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export default function SplashScreen() {
  const [isFading, setIsFading] = useState(false);
  const [isReadyForUnmount, setIsReadyForUnmount] = useState(false);

  useEffect(() => {
    // Show splash screen for 1.5 seconds, then fade out
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 1500);

    // Wait for the fade transition to complete (500ms) before unmounting
    const unmountTimer = setTimeout(() => {
      setIsReadyForUnmount(true);
    }, 2000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  if (isReadyForUnmount) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background text-foreground transition-opacity duration-500",
        isFading ? "opacity-0 pointer-events-none" : "opacity-100"
      )}
    >
      <div className="relative flex flex-col items-center animate-pulse">
        {/* Glowing Moon Logo */}
        <div className="relative mb-6 flex items-center justify-center">
          <div className="absolute inset-0 bg-yellow-100/20 blur-3xl rounded-full w-32 h-32 scale-150" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="/logo.png" 
            alt="Moonana Logo" 
            className="w-20 h-20 object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] z-10" 
          />
        </div>
        
        {/* Title & Branding */}
        <h1 className="text-3xl font-extrabold tracking-widest text-white mb-2 shadow-black drop-shadow-lg">
          MOONANA <span className="text-yellow-400 font-light">STUDIO</span>
        </h1>
        <p className="text-sm font-medium text-gray-400 tracking-[0.2em] uppercase">
          Initializing Workspace...
        </p>
        
        {/* Loading Bar */}
        <div className="w-48 h-1 bg-panelBorder rounded-full mt-8 overflow-hidden">
          <div className="h-full bg-yellow-400 w-full animate-progress rounded-full origin-left" />
        </div>
      </div>

      <style jsx>{`
        @keyframes progress {
          0% { transform: scaleX(0); }
          50% { transform: scaleX(0.7); }
          100% { transform: scaleX(1); }
        }
        .animate-progress {
          animation: progress 1.5s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}
