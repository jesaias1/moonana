"use client";

import React, { useEffect, useState } from 'react';
import { Terminal, Edit3, RefreshCw } from 'lucide-react';
import { GenerationSettings, CharacterProfile } from '@/lib/types';
import { cn } from '@/lib/utils';

interface PromptBuilderProps {
  settings: GenerationSettings;
  onChange: <K extends keyof GenerationSettings>(key: K, value: GenerationSettings[K]) => void;
}

export default function PromptBuilder({ settings, onChange }: PromptBuilderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeChars, setActiveChars] = useState<CharacterProfile[]>([]);

  // Fetch character names for preview simply by tracking local storage
  useEffect(() => {
    if (settings.activeCharacterIds.length > 0) {
      const savedChars = localStorage.getItem('banana_characters');
      if (savedChars) {
        try {
          const chars: CharacterProfile[] = JSON.parse(savedChars);
          setActiveChars(chars.filter(c => settings.activeCharacterIds.includes(c.id)));
        } catch { /* ignore */ }
      }
    } else {
      setActiveChars([]);
    }
  }, [settings.activeCharacterIds]);

  // Derive the compiled prompt
  useEffect(() => {
    if (settings.useCompiledPrompt) return; // Don't auto-compile if user is manually overriding

    let finalPrompt = settings.prompt || '...';

    // 1. Style Reference
    if (settings.styleReference) {
      const modifier = settings.styleStrength === 'Strong' ? 'in the exact visual style' 
                     : settings.styleStrength === 'Light' ? 'with a hint of the visual style' 
                     : 'in the visual style';
      finalPrompt = `Generate ${modifier} of the attached style reference image: \n\n${finalPrompt}`;
    }

    // 2. Character Instructions
    if (activeChars.length > 0) {
      const names = activeChars.map(c => c.name).join(', ');
      finalPrompt = `The generated output MUST feature characters that look EXACTLY identical to the following characters provided in the reference images: ${names}. Maintain strict consistency.\n\n` + finalPrompt;
    }

    // 2.5 Composition Instructions
    if (settings.compositionReferenceId && settings.references) {
      const compRef = settings.references.find(r => r.id === settings.compositionReferenceId);
      if (compRef) {
        const labelText = compRef.label ? ` labeled '${compRef.label}'` : '';
        const strength = settings.compositionStrength || 'Strict';
        
        let strengthModifierStr = 'maintain the exact same composition, layout, and pose as';
        if (strength === 'Loose') strengthModifierStr = 'loosely follow the general composition and layout of';
        if (strength === 'Exact') strengthModifierStr = 'feature pixel-perfect structural alignment to the composition, layout, and pose of';
        
        finalPrompt = `The generated output MUST ${strengthModifierStr} the attached reference image${labelText}.\n\n` + finalPrompt;
      }
    }

    // 3. Style Presets
    if (settings.styleModifier) {
      finalPrompt += `\n\nStyle: ${settings.styleModifier}`;
    }

    // 4. Negative Prompt
    if (settings.negativePrompt) {
      finalPrompt += `\nAvoid generating: ${settings.negativePrompt}`;
    }

    // 5. Tech Specs
    finalPrompt += `\nResolution: ${settings.resolution}`;
    finalPrompt += `\nAspect Ratio: ${settings.aspectRatio}`;
    finalPrompt += `\nThinking Level: ${settings.thinkingLevel}`;

    if (settings.compiledPromptOverride !== finalPrompt) {
      onChange('compiledPromptOverride', finalPrompt);
    }
  }, [
    settings.prompt, 
    settings.styleReference, 
    settings.styleStrength,
    settings.styleModifier, 
    settings.negativePrompt,
    settings.resolution,
    settings.aspectRatio,
    settings.thinkingLevel,
    settings.useCompiledPrompt,
    settings.compiledPromptOverride,
    settings.compositionReferenceId,
    settings.compositionStrength,
    settings.references,
    activeChars,
    onChange
  ]);

  const handleManualEdit = (val: string) => {
    if (!settings.useCompiledPrompt) onChange('useCompiledPrompt', true);
    onChange('compiledPromptOverride', val);
  };

  const resetToAuto = () => {
    onChange('useCompiledPrompt', false);
    // The effect will catch this next render and recompile based entirely on current settings.
  };

  return (
    <div className={cn("mx-6 mb-4 rounded-xl border transition-all overflow-hidden", isExpanded ? "border-accent/40 bg-panel shadow-md" : "border-panelBorder bg-transparent")}>
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 text-sm font-medium text-gray-300 hover:text-white transition-colors"
      >
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-accent" />
          Final Prompt Preview
        </div>
        {!isExpanded && settings.useCompiledPrompt && (
          <span className="text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full flex items-center gap-1">
            <Edit3 className="w-3 h-3" /> Manually Overridden
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
            <p>This is the exact string sent to the Gemini backend.</p>
            {settings.useCompiledPrompt && (
              <button 
                onClick={resetToAuto}
                className="flex items-center gap-1 text-accent hover:text-accentHover transition-colors"
                title="Reset to Auto-generated"
              >
                <RefreshCw className="w-3 h-3" /> Auto-sync
              </button>
            )}
          </div>
          <textarea
            value={settings.compiledPromptOverride || ''}
            onChange={(e) => handleManualEdit(e.target.value)}
            className={cn(
               "w-full bg-background border rounded-lg p-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent resize-y min-h-[120px]",
               settings.useCompiledPrompt ? "border-accent/50 text-accent" : "border-panelBorder text-gray-400"
            )}
            placeholder="Final prompt preview..."
          />
        </div>
      )}
    </div>
  );
}
