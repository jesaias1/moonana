"use client";

import React, { useState, useEffect } from 'react';
import { Palette, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GenerationSettings } from '@/lib/types';

export interface StylePreset {
  id: string;
  name: string;
  modifier: string;
  isCustom?: boolean;
}

export const BUILT_IN_PRESETS: StylePreset[] = [
  { id: 'photorealistic', name: 'Photorealistic', modifier: 'photorealistic, 8k, detailed lighting' },
  { id: 'anime', name: 'Anime / Manga', modifier: 'anime style, cel shading, vibrant colors' },
  { id: 'oil-painting', name: 'Oil Painting', modifier: 'oil painting style, textured brushstrokes, classical' },
  { id: 'watercolor', name: 'Watercolor', modifier: 'watercolor painting, soft edges, flowing colors' },
  { id: 'cinematic', name: 'Cinematic', modifier: 'cinematic lighting, film grain, dramatic composition, 35mm' },
  { id: 'comic-book', name: 'Comic Book', modifier: 'comic book style, bold outlines, halftone dots' },
  { id: 'pixel-art', name: 'Pixel Art', modifier: 'pixel art style, retro, 16-bit' },
  { id: '3d-render', name: '3D Render', modifier: '3D render, Octane, volumetric lighting, subsurface scattering' },
  { id: 'minimalist', name: 'Minimalist', modifier: 'minimalist design, clean lines, simple shapes, white space' },
  { id: 'fantasy-art', name: 'Fantasy Art', modifier: 'fantasy art, epic, detailed, magical atmosphere' }
];

interface StylePresetsProps {
  settings: GenerationSettings;
  onChange: <K extends keyof GenerationSettings>(key: K, value: GenerationSettings[K]) => void;
}

export default function StylePresets({ settings, onChange }: StylePresetsProps) {
  const [customPresets, setCustomPresets] = useState<StylePreset[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newModifier, setNewModifier] = useState('');

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('banana_styles');
    if (saved) {
      try { setCustomPresets(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    try {
      localStorage.setItem('banana_styles', JSON.stringify(customPresets));
    } catch { /* ignore */ }
  }, [customPresets]);

  const togglePreset = (preset: StylePreset) => {
    if (settings.stylePresetId === preset.id) {
      // Deselect
      onChange('stylePresetId', undefined);
      onChange('styleModifier', undefined);
    } else {
      // Select
      onChange('stylePresetId', preset.id);
      onChange('styleModifier', preset.modifier);
    }
  };

  const handleSaveCustom = () => {
    if (!newName.trim() || !newModifier.trim()) return;
    
    setCustomPresets(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      name: newName.trim(),
      modifier: newModifier.trim(),
      isCustom: true
    }]);
    
    setNewName('');
    setNewModifier('');
    setIsCreating(false);
  };

  const deleteCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomPresets(prev => prev.filter(p => p.id !== id));
    if (settings.stylePresetId === id) {
      onChange('stylePresetId', undefined);
      onChange('styleModifier', undefined);
    }
  };

  const allPresets = [...BUILT_IN_PRESETS, ...customPresets];

  return (
    <div className="space-y-6 shrink-0">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
          <Palette className="w-4 h-4" />
          Style Presets
        </label>
        {!isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="p-1 rounded bg-accent/20 hover:bg-accent/40 text-accent transition-colors"
            title="Create Custom Preset"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {isCreating && (
        <div className="bg-background border border-panelBorder rounded-xl p-4 space-y-4 shadow-sm">
          <input 
            type="text" 
            placeholder="Preset Name (e.g., Synthwave)"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            className="w-full bg-panel border border-panelBorder rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <textarea 
            placeholder="Prompt modifier (e.g., synthwave, neon lights, outrun style, grid waves)"
            value={newModifier}
            onChange={e => setNewModifier(e.target.value)}
            className="w-full bg-panel border border-panelBorder rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent resize-none h-20"
          />
          <div className="flex gap-2 justify-end pt-2">
            <button 
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveCustom}
              disabled={!newName.trim() || !newModifier.trim()}
              className="px-3 py-1.5 text-xs font-medium bg-accent disabled:bg-panelBorder disabled:text-gray-500 rounded-md text-white hover:bg-accentHover transition-colors"
            >
              Save Preset
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {allPresets.map(preset => {
          const isActive = settings.stylePresetId === preset.id;
          return (
            <div 
              key={preset.id}
              onClick={() => togglePreset(preset)}
              className={cn(
                "group flex flex-col justify-center p-3 rounded-xl border cursor-pointer transition-all min-h-[4rem] relative overflow-hidden",
                isActive ? "bg-accent/10 border-accent/50 shadow-inner" : "bg-panel border-panelBorder hover:border-gray-500"
              )}
            >
              <div className="flex items-start justify-between">
                <span className={cn("text-xs font-semibold tracking-wide", isActive ? "text-accent" : "text-gray-300 group-hover:text-gray-100")}>
                  {preset.name}
                </span>
                {isActive ? <CheckCircle2 className="w-4 h-4 text-accent shrink-0" /> : <Circle className="w-4 h-4 text-gray-600 shrink-0" />}
              </div>
              <span className="text-[10px] text-gray-500 line-clamp-1 mt-1 font-mono" title={preset.modifier}>
                +{preset.modifier}
              </span>

              {preset.isCustom && (
                <button 
                  onClick={(e) => deleteCustom(preset.id, e)}
                  className="absolute right-2 bottom-2 p-1 bg-background/80 rounded backdrop-blur-sm text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete Custom Preset"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
