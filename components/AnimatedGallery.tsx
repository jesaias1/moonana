"use client";

import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  images: string[];
}

export default function AnimatedGallery({ images }: Props) {
  if (!images || images.length === 0) return null;
  // Triple the array for smooth seamless looping
  const marqueeImages = [...images, ...images, ...images];

  return (
    <div className="w-full overflow-hidden relative py-16 bg-black/40 border-y border-white/5 my-24">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-accent/5 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="text-center mb-10 relative z-20">
        <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
          Created with AIJourney
        </h2>
      </div>

      <div className="absolute inset-y-0 left-0 w-32 md:w-64 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-y-0 right-0 w-32 md:w-64 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
      
      <motion.div 
        className="flex gap-6 w-max px-6"
        animate={{ x: "-33.3333%" }}
        transition={{ repeat: Infinity, ease: "linear", duration: 30 }}
      >
        {marqueeImages.map((src, idx) => (
          <div 
            key={idx} 
            className="w-64 h-64 md:w-80 md:h-80 flex-shrink-0 rounded-3xl overflow-hidden border border-white/10 shadow-[0_0_30px_rgba(0,0,0,0.5)] relative group"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={src} 
              alt="Generated art preview" 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000 ease-out" 
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-500" />
          </div>
        ))}
      </motion.div>
    </div>
  );
}
