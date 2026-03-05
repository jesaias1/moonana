import React from 'react';
import { Settings, Maximize, Target, Brain, CopyMinus, Hash, Fingerprint, Image as ImageIcon } from 'lucide-react';
import { GenerationSettings } from '@/lib/types';

interface SettingsPanelProps {
  settings: GenerationSettings;
  onChange: <K extends keyof GenerationSettings>(key: K, value: GenerationSettings[K]) => void;
}

const RESOLUTIONS = ['512x512', '1024x1024', '2048x2048', '4096x4096'];
// Aliases for user display
const RESOLUTION_LABELS: Record<string, string> = {
  '512x512': '512px',
  '1024x1024': '1K (1024px)',
  '2048x2048': '2K (2048px)',
  '4096x4096': '4K (4096px)',
};

const ASPECT_RATIOS = ['1:1', '16:9', '9:16', '4:3', '3:4', '2:1', '1:2'];
const THINKING_LEVELS = ['Minimal', 'High', 'Dynamic'];

export default function SettingsPanel({ settings, onChange }: SettingsPanelProps) {
  return (
    <div className="w-full border-r border-panelBorder bg-panel h-full flex flex-col p-6 overflow-y-auto">
      <div className="flex items-center gap-2 mb-8">
        <Settings className="w-5 h-5 text-accent" />
        <h2 className="text-xl font-semibold tracking-tight">Studio Settings</h2>
      </div>

      <div className="space-y-6">
        {/* Composition Reference */}
        {settings.references.length > 0 && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <ImageIcon className="w-4 h-4" />
              Composition Reference
            </label>
            <select
              value={settings.compositionReferenceId || ''}
              onChange={(e) => onChange('compositionReferenceId', e.target.value === '' ? null : e.target.value)}
              className="w-full bg-background border border-panelBorder rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-all"
            >
              <option value="">None</option>
              {settings.references.map((ref, idx) => (
                <option key={ref.id} value={ref.id}>
                  {ref.label || `Reference Image ${idx + 1}`}
                </option>
              ))}
            </select>
            
            {/* Composition Strength Segmented Control */}
            <div className="flex bg-background border border-panelBorder rounded-md p-1 mt-2">
              {(['Loose', 'Strict', 'Exact'] as const).map(strength => (
                <button
                  key={strength}
                  onClick={() => onChange('compositionStrength', strength)}
                  className={`flex-1 py-1 text-xs font-medium rounded transition-all ${
                    (settings.compositionStrength || 'Strict') === strength 
                      ? 'bg-accent text-white shadow' 
                      : 'text-gray-400 hover:text-gray-200 hover:bg-panelBorder'
                  }`}
                >
                  {strength}
                </button>
              ))}
            </div>

          </div>
        )}
        {/* Resolution */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <Maximize className="w-4 h-4" />
            Resolution
          </label>
          <select
            value={settings.resolution}
            onChange={(e) => onChange('resolution', e.target.value)}
            className="w-full bg-background border border-panelBorder rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-all"
          >
            {RESOLUTIONS.map((res) => (
              <option key={res} value={res}>
                {RESOLUTION_LABELS[res] || res}
              </option>
            ))}
          </select>
        </div>

        {/* Aspect Ratio */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <Target className="w-4 h-4" />
            Aspect Ratio
          </label>
          <select
            value={settings.aspectRatio}
            onChange={(e) => onChange('aspectRatio', e.target.value)}
            className="w-full bg-background border border-panelBorder rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-all"
          >
            {ASPECT_RATIOS.map((ar) => (
              <option key={ar} value={ar}>
                {ar}
              </option>
            ))}
          </select>
        </div>

        {/* Thinking Level */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <Brain className="w-4 h-4" />
            Thinking Level
          </label>
          <select
            value={settings.thinkingLevel}
            onChange={(e) => onChange('thinkingLevel', e.target.value)}
            className="w-full bg-background border border-panelBorder rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-all"
          >
            {THINKING_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        {/* Negative Prompt */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <CopyMinus className="w-4 h-4" />
            Negative Prompt
          </label>
          <textarea
            value={settings.negativePrompt}
            onChange={(e) => onChange('negativePrompt', e.target.value)}
            placeholder="E.g., blurry, malformed..."
            className="w-full bg-background border border-panelBorder rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-all resize-none h-20 placeholder:text-gray-600"
          />
        </div>

        {/* Number of Images */}
        <div className="space-y-2">
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-300">
            <div className="flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Number of Images
            </div>
            <span className="text-xs text-gray-500">Value: {settings.numberOfImages}</span>
          </label>
          <div className="flex bg-background border border-panelBorder rounded-md p-1">
            {[1, 2, 3, 4].map(num => (
              <button
                key={num}
                onClick={() => onChange('numberOfImages', num)}
                className={`flex-1 py-1.5 text-xs font-medium rounded transition-all ${
                  settings.numberOfImages === num 
                    ? 'bg-accent text-white shadow' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-panelBorder'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {/* Seed */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
            <Fingerprint className="w-4 h-4" />
            Seed (Optional)
          </label>
          <input
            type="number"
            value={settings.seed || ''}
            onChange={(e) => onChange('seed', e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="Random"
            className="w-full bg-background border border-panelBorder rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent transition-all placeholder:text-gray-600"
          />
        </div>
      </div>
    </div>
  );
}
