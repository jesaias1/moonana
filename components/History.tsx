"use client";

import React, { useState, useEffect } from 'react';
import { History as HistoryIcon, RotateCcw, ImageIcon, Download, BookmarkPlus } from 'lucide-react';
import { GenerationHistoryEntry, GenerationSettings } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';

interface HistoryProps {
  onRestore: (settings: GenerationSettings) => void;
}

export default function HistoryPanel({ onRestore }: HistoryProps) {
  const [history, setHistory] = useState<GenerationHistoryEntry[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  const handleDownload = async (imageUrl: string, index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `moonana_generation_${index}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Failed to download image:', err);
    }
  };

  const handleSaveAsPreset = (settings: GenerationSettings, event: React.MouseEvent) => {
    event.stopPropagation();
    // Use prompt as name, or "History Preset" if empty
    const presetName = settings.prompt.trim().slice(0, 20) || 'History Preset';
    
    // Attempt to pull existing preset from local storage to not overwrite others
    let customPresets = [];
    try {
      const saved = localStorage.getItem('banana_styles');
      if (saved) customPresets = JSON.parse(saved);
    } catch { /* ignore */ }

    // Create a synthesized modifier string from prompt and existing modifiers
    let synthModifier = settings.prompt.trim();
    if (settings.styleModifiers && settings.styleModifiers.length > 0) {
       synthModifier += ', ' + settings.styleModifiers.join(', ');
    }

    const newPreset = {
      id: Math.random().toString(36).substring(7),
      name: presetName,
      modifier: synthModifier,
      isCustom: true
    };

    customPresets.push(newPreset);
    localStorage.setItem('banana_styles', JSON.stringify(customPresets));
    alert('Saved as custom preset! Refresh or open styles panel to see it.');
  };

  useEffect(() => {
    const saved = localStorage.getItem('banana_history');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  // Use a custom event listener or interval if we want true reactivity,
  // but for now, we'll export a helper they can call from page.tsx to trigger a reload.
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('banana_history');
      if (saved) {
        try { setHistory(JSON.parse(saved)); } catch { /* ignore */ }
      }
    };
    window.addEventListener('history_updated', handleStorageChange);
    return () => window.removeEventListener('history_updated', handleStorageChange);
  }, []);

  if (history.length === 0) return null;

  return (
    <div className="border-t border-panelBorder bg-panel/80 backdrop-blur-md">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-3 flex items-center justify-between text-sm font-medium text-gray-300 hover:text-white transition-colors"
      >
        <div className="flex items-center gap-2">
          <HistoryIcon className="w-4 h-4" />
          Generation History
        </div>
        <span className="text-xs bg-panelBorder px-2 py-0.5 rounded-full">{history.length}</span>
      </button>

      {isOpen && (
        <div className="px-6 pb-4 max-h-64 overflow-y-auto space-y-3">
          {history.map((entry) => (
            <div key={entry.id} className="flex gap-4 p-3 rounded-xl bg-background border border-panelBorder hover:border-gray-500 transition-colors group">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {entry.images.length > 0 ? (
                  entry.images.map((img, i) => (
                    <div key={i} className="relative group/img shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={img} 
                        alt={`History ${i}`} 
                        loading="lazy"
                        className="w-16 h-16 object-cover rounded-md border border-panelBorder flex-shrink-0 bg-background" 
                      />
                      <button 
                        onClick={(e) => handleDownload(img, i, e)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 flex items-center justify-center rounded-md transition-opacity"
                        title="Download Image"
                      >
                        <Download className="w-4 h-4 text-white hover:text-accent transition-colors" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-panelBorder bg-panel flex items-center justify-center">
                    <ImageIcon className="w-6 h-6 text-gray-600" />
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <p className="text-sm font-medium text-gray-200 truncate" title={entry.prompt}>
                  {entry.prompt}
                </p>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>{formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true })}</span>
                  <span>•</span>
                  <span>{entry.settings.resolution}</span>
                  <span>•</span>
                  <span>{entry.settings.aspectRatio}</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={(e) => { e.stopPropagation(); onRestore(entry.settings); }}
                  className="p-1 text-gray-400 hover:text-accent flex items-center gap-1 text-[10px] font-medium"
                >
                  <RotateCcw className="w-3 h-3" /> Restore
                </button>
                <button 
                  onClick={(e) => handleSaveAsPreset(entry.settings, e)}
                  className="p-1 text-gray-400 hover:text-accent flex items-center gap-1 text-[10px] font-medium"
                >
                  <BookmarkPlus className="w-3 h-3" /> Save Preset
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Exported helper to update history from page.tsx
export const addHistoryEntry = (entry: GenerationHistoryEntry) => {
  const saved = localStorage.getItem('banana_history');
  let history: GenerationHistoryEntry[] = [];
  if (saved) {
    try { history = JSON.parse(saved); } catch { /* ignore */ }
  }
  
  // Add new entry, keep last 20
  let newHistory = [entry, ...history].slice(0, 20);
  
  let success = false;
  while (!success && newHistory.length > 0) {
    try {
      localStorage.setItem('banana_history', JSON.stringify(newHistory));
      success = true;
    } catch {
      if (newHistory.length === 1) {
        // Even 1 item is too big, just give up and don't save history
        console.warn("Storage quota exceeded even for 1 history item. History not saved.");
        break;
      }
      // Prune the oldest item and try again
      newHistory = newHistory.slice(0, newHistory.length - 1);
    }
  }
  
  if (success) {
    window.dispatchEvent(new Event('history_updated'));
  }
};
