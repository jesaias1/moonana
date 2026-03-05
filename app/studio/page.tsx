"use client";

import React, { useState, useEffect } from 'react';
import SettingsPanel from '@/components/SettingsPanel';
import ReferenceImages from '@/components/ReferenceImages';
import CharacterPanel from '@/components/CharacterPanel';
import HistoryPanel, { addHistoryEntry } from '@/components/History';
import ImageDisplay from '@/components/ImageDisplay';
import StylePresets from '@/components/StylePresets';
import StyleReference from '@/components/StyleReference';
import PromptBuilder from '@/components/PromptBuilder';
import SplashScreen from '@/components/SplashScreen';
import PaywallModal from '@/components/ui/PaywallModal';
import { useToast } from '@/components/ui/Toast';
import { GenerationSettings, CharacterProfile } from '@/lib/types';
import { SendHorizontal, Settings2, ImagePlus, Users, Palette, Menu, X, UserCircle2, LogIn, LayoutDashboard, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function Home() {
  const { toast } = useToast();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [settings, setSettings] = useState<GenerationSettings>({
    prompt: '',
    resolution: '1024x1024',
    aspectRatio: '1:1',
    thinkingLevel: 'High',
    negativePrompt: '',
    numberOfImages: 1,
    seed: undefined,
    references: [],
    activeCharacterIds: [],
  });

  const [activeTab, setActiveTab] = useState<'settings' | 'styles' | 'references' | 'characters'>('settings');

  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [tokensRemaining, setTokensRemaining] = useState<number>(10);

  // Check auth session
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
      })
      .catch(console.error);
  }, []);

  const handleSettingChange = <K extends keyof GenerationSettings>(key: K, value: GenerationSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerate = async () => {
    if (!settings.prompt) return;
    
    setIsLoading(true);
    setError(null);
    try {
      // Resolve character references from local storage
      let compiledReferences = [...settings.references];
      if (settings.activeCharacterIds.length > 0) {
         const savedChars = localStorage.getItem('banana_characters');
         if (savedChars) {
           const characters: CharacterProfile[] = JSON.parse(savedChars);
           const activeChars = characters.filter(c => settings.activeCharacterIds.includes(c.id));
           activeChars.forEach(c => {
             compiledReferences = [...compiledReferences, ...c.images];
           });
         }
      }
      
      if (settings.styleReference) {
         compiledReferences.push(settings.styleReference);
      }

      const payload = { 
        ...settings, 
        prompt: settings.compiledPromptOverride || settings.prompt, // Use compiled override if it exists
        references: compiledReferences 
      };

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.status === 402) {
        setShowPaywall(true);
        setIsLoading(false);
        return;
      }
      
      let data;
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(`Server Error (${res.status}): ${text.slice(0, 100)}...`);
      }

      if (!res.ok) throw new Error(data.error || 'Failed to generate image');
      
      if (data.tokensRemaining !== undefined) {
        setTokensRemaining(data.tokensRemaining);
      }

      const imagesData = data.images || [];
      setImages(imagesData);

      // Save History
      if (imagesData.length > 0) {
        toast('Generation complete! Image saved to history.', 'success');
        addHistoryEntry({
          id: Math.random().toString(36).substring(7),
          timestamp: new Date().toISOString(),
          prompt: settings.prompt,
          settings: { ...settings },
          images: imagesData
        });
      }

    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      toast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGeneratePrompt = async (base64: string) => {
    setIsLoading(true);
    toast('Analyzing image context via Gemini Vision...', 'info');
    try {
      const res = await fetch('/api/generate-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate prompt');
      
      handleSettingChange('prompt', data.prompt);
      toast('Prompt successfully extracted and applied!', 'success');
    } catch (err: unknown) {
      console.error(err);
      toast(err instanceof Error ? err.message : 'Unknown error', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <main className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <SplashScreen />
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />
      
      {/* Mobile Sidebar Backdrop */}
      {showMobileSidebar && (
        <div 
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setShowMobileSidebar(false)}
        />
      )}

      {/* Left Sidebar (Tabbed) */}
      <div className={cn(
        "fixed md:relative z-50 md:z-20 h-full bg-panel flex flex-col shrink-0 shadow-2xl md:shadow-xl transition-transform duration-300 w-full max-w-[320px] md:max-w-none md:w-[360px] border-r border-panelBorder",
        showMobileSidebar ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Mobile Header for Sidebar */}
        <div className="md:hidden flex items-center justify-between p-4 border-b border-panelBorder bg-background/50">
          <span className="font-bold tracking-wide text-sm text-gray-200">Tools</span>
          <button onClick={() => setShowMobileSidebar(false)} className="p-1 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex border-b border-panelBorder overflow-x-auto scrollbar-hide">
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn("flex-1 py-3 px-2 text-xs font-medium flex justify-center items-center gap-2 border-b-2 transition-colors min-w-fit", activeTab === 'settings' ? "border-accent text-white" : "border-transparent text-gray-500 hover:text-gray-300")}
          >
            <Settings2 className="w-4 h-4" /> Config
          </button>
          <button 
            onClick={() => setActiveTab('styles')}
            className={cn("flex-1 py-3 px-2 text-xs font-medium flex justify-center items-center gap-2 border-b-2 transition-colors min-w-fit", activeTab === 'styles' ? "border-accent text-white" : "border-transparent text-gray-500 hover:text-gray-300")}
          >
            <Palette className="w-4 h-4" /> Styles
            {(settings.stylePresetId || settings.styleReference) && <span className="bg-accent rounded-full w-1.5 h-1.5" />}
          </button>
          <button 
            onClick={() => setActiveTab('references')}
            className={cn("flex-1 py-3 px-2 text-xs font-medium flex justify-center items-center gap-2 border-b-2 transition-colors min-w-fit", activeTab === 'references' ? "border-accent text-white" : "border-transparent text-gray-500 hover:text-gray-300")}
          >
            <ImagePlus className="w-4 h-4" /> Refs
            {settings.references.length > 0 && <span className="bg-accent text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">{settings.references.length}</span>}
          </button>
          <button 
            onClick={() => setActiveTab('characters')}
            className={cn("flex-1 py-3 text-xs font-medium flex justify-center items-center gap-2 border-b-2 transition-colors", activeTab === 'characters' ? "border-accent text-white" : "border-transparent text-gray-500 hover:text-gray-300")}
          >
            <Users className="w-4 h-4" /> Chars
            {settings.activeCharacterIds.length > 0 && <span className="bg-accent text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">{settings.activeCharacterIds.length}</span>}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-0">
          <div className={cn("h-full", activeTab === 'settings' ? 'block' : 'hidden')}>
            <SettingsPanel settings={settings} onChange={handleSettingChange} />
          </div>
          <div className={cn("p-6 h-full space-y-6", activeTab === 'styles' ? 'block' : 'hidden')}>
            <StylePresets settings={settings} onChange={handleSettingChange} />
            <StyleReference settings={settings} onChange={handleSettingChange} />
          </div>
          <div className={cn("p-6 h-full", activeTab === 'references' ? 'block' : 'hidden')}>
            <ReferenceImages 
              images={settings.references} 
              onChange={(imgs) => handleSettingChange('references', imgs)} 
              onGeneratePrompt={handleGeneratePrompt}
            />
          </div>
          <div className={cn("p-6 h-full", activeTab === 'characters' ? 'block' : 'hidden')}>
            <CharacterPanel 
              activeCharacterIds={settings.activeCharacterIds} 
              onChangeActive={(ids) => handleSettingChange('activeCharacterIds', ids)}
            />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative min-w-0">
        
        {/* Top Header */}
        <header className="h-14 border-b border-panelBorder flex items-center px-4 md:px-6 shrink-0 bg-background/80 backdrop-blur-sm z-10 w-full shadow-sm">
          <button 
            onClick={() => setShowMobileSidebar(true)}
            className="md:hidden mr-3 p-2 -ml-2 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>

          <Link href="/" className="flex items-center group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Moonana Studio Logo" className="hidden md:block w-6 h-6 mr-3 object-contain group-hover:scale-110 transition-transform" />
            <h1 className="text-sm font-semibold tracking-wide text-gray-200">
              Moonana <span className="text-yellow-400">Studio</span>
            </h1>
          </Link>

          <div className="ml-auto flex items-center gap-4">
             {/* Token Balance */}
             <button 
               onClick={() => setShowPaywall(true)}
               className="hidden sm:flex items-center gap-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/20 px-3 py-1.5 rounded-lg text-sm font-bold transition-all shadow-[0_0_10px_rgba(250,204,21,0.1)] hover:shadow-[0_0_15px_rgba(250,204,21,0.2)]"
             >
               <Zap className="w-4 h-4 fill-yellow-500" />
               {tokensRemaining}
             </button>

             <div className="hidden sm:block text-xs text-panelBorder px-2 py-1 rounded bg-panel font-mono border border-panelBorder">
               Model: gemini-3.1-flash-image-preview
             </div>
             
             {/* Profile Account Menu */}
             <div className="relative group">
               {user ? (
                 <>
                   <button className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/20 text-accent hover:bg-accent/40 transition-colors border border-accent/20 shadow-sm cursor-pointer">
                     <UserCircle2 className="w-5 h-5" />
                   </button>
                   {/* Dropdown Menu (Hover Trigger) */}
                   <div className="absolute right-0 top-full mt-2 w-48 bg-panel border border-panelBorder rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 py-1 z-50 transform origin-top-right group-hover:scale-100 scale-95">
                     <div className="px-4 py-2 text-xs font-mono text-gray-500 border-b border-panelBorder mb-1 truncate">
                       {user.email}
                     </div>
                     <Link href="/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                       <LayoutDashboard className="w-4 h-4 text-yellow-500" /> Admin Dashboard
                     </Link>
                     <button onClick={() => { fetch('/api/auth/logout', { method: 'POST' }).then(() => { setUser(null); window.location.reload(); }) }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
                       Sign Out
                     </button>
                   </div>
                 </>
               ) : (
                 <Link href="/login" className="flex items-center gap-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors px-2 py-1.5 rounded hover:bg-white/5">
                   <LogIn className="w-3.5 h-3.5" /> Sign In
                 </Link>
               )}
             </div>
          </div>
        </header>

        {/* Center: Image Display */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
           <ImageDisplay images={images} isLoading={isLoading} />
        </div>

        {/* Bottom: Prompt Input & Builder */}
        <div className="shrink-0 border-t border-panelBorder pt-4 pb-6 bg-panel/50 backdrop-blur-xl w-full">
          <PromptBuilder settings={settings} onChange={handleSettingChange} />
          
          {error && (
            <div className="mb-4 mx-6 flex items-center justify-between bg-red-500/10 p-4 rounded-lg border border-red-500/20">
              <span className="text-red-400 text-sm font-medium">{error}</span>
              <button 
                onClick={handleGenerate}
                disabled={isLoading}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-bold rounded-md transition-colors shadow-sm disabled:opacity-50"
              >
                Retry Request
              </button>
            </div>
          )}
          <div className="max-w-4xl mx-auto flex items-end gap-4 relative px-6">
            <div className="flex-1 relative">
              <textarea
                value={settings.prompt}
                onChange={(e) => handleSettingChange('prompt', e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your masterpiece... (Press Enter to generate)"
                className="w-full bg-background border border-panelBorder rounded-xl pl-4 pr-12 py-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all resize-none overflow-hidden h-[56px] min-h-[56px] max-h-32 shadow-inner"
                rows={1}
                style={{ height: 'auto' }}
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={isLoading || !settings.prompt.trim()}
              className="h-[56px] px-8 bg-accent hover:bg-accentHover disabled:bg-panel border disabled:border-panelBorder border-transparent rounded-xl flex items-center gap-2 font-medium transition-all shadow-lg active:scale-95 text-white disabled:text-gray-500"
            >
              <span>{isLoading ? 'Wait...' : 'Generate'}</span>
              {!isLoading && <SendHorizontal className="w-4 h-4 ml-1" />}
            </button>
          </div>
        </div>
        
        {/* History Panel */}
        <HistoryPanel onRestore={(restoredSettings) => setSettings(restoredSettings)} />
      </div>
    </main>
  );
}
