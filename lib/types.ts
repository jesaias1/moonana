export interface ReferenceImage {
  id: string;
  base64: string;
  label: string;
}

export interface CharacterProfile {
  id: string;
  name: string;
  images: ReferenceImage[];
}

export interface GenerationSettings {
  prompt: string;
  resolution: string;
  aspectRatio: string;
  thinkingLevel: string;
  negativePrompt: string;
  numberOfImages: number;
  seed?: number;
  references: ReferenceImage[];
  activeCharacterIds: string[];
  compositionReferenceId?: string | null;
  compositionStrength?: 'Loose' | 'Strict' | 'Exact';
  stylePresetIds?: string[];
  styleModifiers?: string[];
  styleReference?: ReferenceImage | null;
  styleStrength?: 'Light' | 'Medium' | 'Strong';
  useCompiledPrompt?: boolean;
  compiledPromptOverride?: string;
}

export interface GenerationHistoryEntry {
  id: string;
  timestamp: string;
  prompt: string;
  settings: GenerationSettings;
  images: string[];
}
