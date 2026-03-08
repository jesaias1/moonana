"use client";

import React, { useCallback, useRef } from 'react';
import { Upload, X, ImagePlus, Wand2 } from 'lucide-react';
import { ReferenceImage } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ReferenceImagesProps {
  images: ReferenceImage[];
  onChange: (images: ReferenceImage[]) => void;
  compositionId?: string | null;
  onSetComposition?: (id: string | null) => void;
  onGeneratePrompt?: (base64: string) => void;
  maxImages?: number;
}

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
        if (!ctx) {
          resolve(event.target?.result as string); // fallback
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8)); // Standardize to compressed jpeg
      };
      img.onerror = () => reject(new Error('Failed to load image'));
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
  });
};

export default function ReferenceImages({ images, onChange, compositionId, onSetComposition, onGeneratePrompt, maxImages = 5 }: ReferenceImagesProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    processFiles(files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processFiles = useCallback(async (files: File[]) => {
    const validFiles = files.filter(f => f.type.startsWith('image/')).slice(0, maxImages - images.length);
    if (validFiles.length === 0) return;

    try {
      const newImages = await Promise.all(validFiles.map(async file => {
        const base64 = await downscaleImage(file, 1024);
        return {
          id: Math.random().toString(36).substring(7),
          base64,
          label: 'Style Ref'
        };
      }));
      onChange([...images, ...newImages]);
    } catch (e) {
      console.error("Error processing images:", e);
    }
  }, [images, maxImages, onChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    processFiles(Array.from(e.dataTransfer.files));
  }, [processFiles]);

  const handleDragOver = (e: React.DragEvent) => e.preventDefault();

  const removeImage = (id: string) => {
    onChange(images.filter(img => img.id !== id));
    if (compositionId === id && onSetComposition) {
      onSetComposition(null);
    }
  };

  const updateLabel = (id: string, label: string) => {
    onChange(images.map(img => img.id === id ? { ...img, label } : img));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
          <ImagePlus className="w-4 h-4" />
          Style & Context References
        </label>
        <span className="text-xs text-gray-500">{images.length}/{maxImages}</span>
      </div>

      {images.length < maxImages && (
        <div 
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "border-2 border-dashed border-panelBorder rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors",
            "hover:bg-panelBorder/50 hover:border-gray-500"
          )}
        >
          <Upload className="w-6 h-6 text-gray-400 mb-2" />
          <p className="text-sm font-medium text-gray-300">Click or drag images</p>
          <p className="text-xs text-gray-500 mt-1">Supports JPG, PNG</p>
        </div>
      )}

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        accept="image/*" 
        multiple 
        className="hidden" 
      />

      {images.length > 0 && (
         <div className="space-y-3 mt-4">
          {images.map(img => (
            <div key={img.id} className="flex gap-3 items-start bg-background p-2 border border-panelBorder rounded-lg">
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img src={img.base64} alt={img.label} className="w-16 h-16 object-cover rounded-md bg-panel" />
               <div className="flex-1 flex flex-col gap-2">
                 <input 
                   type="text" 
                   value={img.label}
                   onChange={e => updateLabel(img.id, e.target.value)}
                   placeholder="e.g. Main Subject, Background"
                   className="w-full bg-panel border-b border-panelBorder px-2 py-1 text-xs text-foreground focus:outline-none focus:border-accent"
                 />
                 <div className="flex items-center gap-2 mt-1">
                   {onSetComposition && (
                     <button
                       onClick={() => onSetComposition(compositionId === img.id ? null : img.id)}
                       className={cn(
                         "text-[10px] px-2 py-1 rounded transition-colors font-medium border",
                         compositionId === img.id 
                           ? "bg-accent/20 text-accent border-accent/30" 
                           : "bg-panel border-panelBorder text-gray-400 hover:text-gray-300"
                       )}
                     >
                       {compositionId === img.id ? "★ Composition" : "Set Composition"}
                     </button>
                   )}
                 </div>
                 <div className="flex items-center gap-3 self-end mt-1">
                   {onGeneratePrompt && (
                     <button 
                       onClick={() => onGeneratePrompt(img.base64)}
                       className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1 font-medium transition-colors"
                     >
                       <Wand2 className="w-3 h-3" /> Auto-Prompt
                     </button>
                   )}
                   <button 
                     onClick={() => removeImage(img.id)}
                     className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 font-medium transition-colors"
                   >
                     <X className="w-3 h-3" /> Remove
                   </button>
                 </div>
               </div>
            </div>
          ))}
         </div>
      )}
    </div>
  );
}
