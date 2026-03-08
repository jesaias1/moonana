"use client";

import React, { useState } from 'react';
import { Download, Expand, X, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageDisplayProps {
  images: string[];
  isLoading: boolean;
}

export default function ImageDisplay({ images, isLoading }: ImageDisplayProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleDownload = (imgUrl: string, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = imgUrl;
    a.download = `nano-banana-${Date.now()}-${index + 1}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex-1 bg-background relative flex p-6 overflow-y-auto w-full h-full">
      {isLoading ? (
        <div className="w-full flex-1 flex flex-col justify-center max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 border-4 border-panelBorder border-t-accent rounded-full animate-spin" />
            <div className="text-center">
              <h3 className="text-xl font-bold text-white mb-2">Synthesizing Image...</h3>
              <p className="text-sm text-gray-400">Google Gemini is fusing your prompt with structural composition constraints.</p>
            </div>
            
            {/* Mock Progress Bar */}
            <div className="w-full max-w-sm h-2 bg-panelBorder rounded-full overflow-hidden mt-6">
              <div className="h-full bg-accent animate-mock-progress rounded-full origin-left" />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-50">
            <div className="aspect-square w-full bg-panelBorder rounded-xl animate-pulse" />
            <div className="aspect-square w-full bg-panelBorder rounded-xl animate-pulse hidden sm:block" />
          </div>

          <style jsx>{`
            @keyframes mock-progress {
              0% { transform: scaleX(0); }
              30% { transform: scaleX(0.4); }
              70% { transform: scaleX(0.6); }
              90% { transform: scaleX(0.8); }
              100% { transform: scaleX(0.95); }
            }
            .animate-mock-progress {
              animation: mock-progress 15s cubic-bezier(0.1, 0.7, 1.0, 0.1) forwards;
            }
          `}</style>
        </div>
      ) : null}

      {!isLoading && images.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none">
          <div className="flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-panelBorder rounded-xl p-12 max-w-md w-full bg-panel shadow-lg pointer-events-auto mt-[-10vh]">
            <ImageIcon className="w-16 h-16 mb-4 opacity-50 text-gray-400" />
            <h3 className="text-xl font-medium mb-2 text-gray-300">No images generated yet</h3>
            <p className="text-sm text-center max-w-sm line-clamp-2">
              Enter a prompt below and click generate to invoke Google&apos;s Nano Banana model.
            </p>
          </div>
        </div>
      )}

      {!isLoading && images.length > 0 && (
        <div className={cn(
          "w-full h-full grid gap-6 content-start",
          images.length === 1 && "grid-cols-1",
          images.length === 2 && "grid-cols-2",
          images.length >= 3 && "grid-cols-2 lg:grid-cols-4",
        )}>
        {images.map((img, i) => (
          <div
            key={i}
            className="group relative rounded-xl overflow-hidden border border-panelBorder bg-black shadow-lg transition-transform hover:scale-[1.02] cursor-pointer flex items-center justify-center p-2"
            onClick={() => setSelectedImage(img)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={img} 
              alt={`Generation result ${i + 1}`} 
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
              <button 
                onClick={(e) => handleDownload(img, i, e)}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-colors"
                title="Download Image"
              >
                <Download className="w-5 h-5 text-white" />
              </button>
              <button 
                className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-md transition-colors"
                title="View Fullscreen"
              >
                <Expand className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        ))}
        </div>
      )}

      {/* Lightbox / Modal */}
      {selectedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-8"
          onClick={() => setSelectedImage(null)}
        >
          <button 
            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white transition-colors"
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-8 h-8" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={selectedImage} 
            alt="Fullscreen preview" 
            className="max-w-full max-h-full rounded-md shadow-2xl object-contain"
          />
        </div>
      )}
    </div>
  );
}
