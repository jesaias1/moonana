"use client";

import React, { useRef, useState } from 'react';
import { ImagePlus, X, Image as ImageIcon, Sparkles } from 'lucide-react';
import { GenerationSettings, ReferenceImage } from '@/lib/types';
import { cn } from '@/lib/utils';

// Reuse downscaling logic
const downscaleImage = (file: File, maxWidth: number = 1024): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(event.target?.result as string);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};

interface StyleReferenceProps {
  settings: GenerationSettings;
  onChange: <K extends keyof GenerationSettings>(key: K, value: GenerationSettings[K]) => void;
}

export default function StyleReference({ settings, onChange }: StyleReferenceProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) return;

    setIsProcessing(true);
    try {
      const base64 = await downscaleImage(file, 1024);
      const newRef: ReferenceImage = {
        id: Math.random().toString(36).substring(7),
        base64,
        label: 'Style Reference'
      };
      onChange('styleReference', newRef);
      if (!settings.styleStrength) onChange('styleStrength', 'Medium');
    } catch (err) {
      console.error("Failed to process style image:", err);
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = () => {
    onChange('styleReference', null);
  };

  const strengths = ['Light', 'Medium', 'Strong'] as const;

  return (
    <div className="space-y-4 pt-6 border-t border-panelBorder mt-6">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-accent" />
        <label className="text-sm font-medium text-gray-300">Style Transfer Image</label>
      </div>

      {!settings.styleReference ? (
        <div 
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed border-panelBorder rounded-xl p-6 flex flex-col items-center justify-center transition-colors text-center cursor-pointer",
            isProcessing ? "opacity-50 cursor-wait" : "hover:bg-panelBorder/50 hover:border-gray-500"
          )}
        >
          <ImagePlus className="w-6 h-6 text-gray-400 mb-2" />
          <p className="text-sm font-medium text-gray-300">
            {isProcessing ? 'Optimizing...' : 'Upload Style Image'}
          </p>
          <p className="text-xs text-gray-500 mt-1 max-w-[200px] leading-relaxed">
            Attach an image to transfer its artistic style to your generation.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative group rounded-xl overflow-hidden border border-panelBorder shadow-sm">
             {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
               src={settings.styleReference.base64} 
               alt="Style Reference" 
               className="w-full h-32 object-cover bg-panel"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 pb-3">
               <span className="text-xs font-semibold text-white drop-shadow-md flex items-center gap-1.5">
                 <ImageIcon className="w-3 h-3" /> Active Style Image
               </span>
            </div>
            <button 
              onClick={removeImage}
              className="absolute top-2 right-2 p-1.5 bg-background/80 hover:bg-red-500 hover:text-white rounded backdrop-blur-sm text-gray-300 transition-colors shadow-sm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center justify-between border border-panelBorder bg-panel rounded-lg p-1">
            {strengths.map(level => (
               <button
                 key={level}
                 onClick={() => onChange('styleStrength', level)}
                 className={cn(
                   "flex-1 text-xs py-1.5 font-medium rounded-md transition-all",
                   settings.styleStrength === level ? "bg-accent text-white shadow" : "text-gray-400 hover:text-gray-200 hover:bg-background"
                 )}
               >
                 {level}
               </button>
            ))}
          </div>
        </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        className="hidden" 
      />
    </div>
  );
}
