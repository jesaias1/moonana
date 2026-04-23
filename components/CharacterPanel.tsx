"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Trash2, CheckSquare, Square, Users } from 'lucide-react';
import { CharacterProfile, ReferenceImage } from '@/lib/types';
import ReferenceImages from './ReferenceImages';
import { cn } from '@/lib/utils';

interface CharacterPanelProps {
  activeCharacterIds: string[];
  onChangeActive: (ids: string[]) => void;
}

export default function CharacterPanel({ activeCharacterIds, onChangeActive }: CharacterPanelProps) {
  const [characters, setCharacters] = useState<CharacterProfile[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [newCharImages, setNewCharImages] = useState<ReferenceImage[]>([]);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('aijourney_characters');
    if (saved) {
      try { setCharacters(JSON.parse(saved)); } catch { /* ignore */ }
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    try {
      localStorage.setItem('aijourney_characters', JSON.stringify(characters));
    } catch (e) {
      console.error('Failed to save characters to local storage, quota may be exceeded:', e);
    }
  }, [characters]);

  const toggleActive = (id: string) => {
    if (activeCharacterIds.includes(id)) {
      onChangeActive(activeCharacterIds.filter(c => c !== id));
    } else {
      onChangeActive([...activeCharacterIds, id]);
    }
  };

  const deleteCharacter = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCharacters(prev => prev.filter(c => c.id !== id));
    onChangeActive(activeCharacterIds.filter(c => c !== id));
  };

  const handleSaveCharacter = () => {
    if (!newCharName.trim() || newCharImages.length === 0) return;
    
    setCharacters(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      name: newCharName.trim(),
      images: newCharImages
    }]);
    
    setNewCharName('');
    setNewCharImages([]);
    setIsCreating(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
          <Users className="w-4 h-4" />
          Saved Characters
        </label>
        {!isCreating && (
          <button 
            onClick={() => setIsCreating(true)}
            className="p-1 rounded bg-accent/20 hover:bg-accent/40 text-accent transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {isCreating && (
        <div className="bg-background border border-panelBorder rounded-xl p-4 space-y-4">
          <input 
            type="text" 
            placeholder="Character Name"
            value={newCharName}
            onChange={e => setNewCharName(e.target.value)}
            className="w-full bg-panel border border-panelBorder rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <ReferenceImages 
            images={newCharImages} 
             // Auto-label for characters
            onChange={(imgs) => setNewCharImages(imgs.map(img => ({...img, label: 'Character Face'})))} 
            maxImages={3} 
          />
          <div className="flex gap-2 justify-end pt-2">
            <button 
              onClick={() => setIsCreating(false)}
              className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-white"
            >
              Cancel
            </button>
            <button 
              onClick={handleSaveCharacter}
              disabled={!newCharName.trim() || newCharImages.length === 0}
              className="px-3 py-1.5 text-xs font-medium bg-accent disabled:bg-panelBorder disabled:text-gray-500 rounded-md text-white hover:bg-accentHover"
            >
              Save Profile
            </button>
          </div>
        </div>
      )}

      {characters.length === 0 && !isCreating ? (
        <div className="text-center p-6 border border-dashed border-panelBorder rounded-xl">
           <p className="text-sm text-gray-500">No characters saved yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {characters.map(char => {
            const isActive = activeCharacterIds.includes(char.id);
            return (
              <div 
                key={char.id}
                onClick={() => toggleActive(char.id)}
                className={cn(
                  "group flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all",
                  isActive ? "bg-accent/10 border-accent/50" : "bg-panel border-panelBorder hover:border-gray-600"
                )}
              >
                <div className="flex items-center gap-3">
                  {isActive ? <CheckSquare className="w-5 h-5 text-accent" /> : <Square className="w-5 h-5 text-gray-500" />}
                  <div className="flex -space-x-2">
                    {char.images.slice(0, 3).map((img, i) => (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img key={i} src={img.base64} alt={char.name} className="w-8 h-8 rounded-full border-2 border-background object-cover" />
                    ))}
                  </div>
                  <span className={cn("text-sm font-medium", isActive ? "text-white" : "text-gray-400")}>{char.name}</span>
                </div>
                
                <button 
                  onClick={(e) => deleteCharacter(char.id, e)}
                  className="p-2 -mr-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete Character"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
