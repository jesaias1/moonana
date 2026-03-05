"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { Lock, LogIn } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        toast('Authentication successful!', 'success');
        router.push('/admin');
        router.refresh(); // Force server re-eval of layouts
      } else {
        const error = await res.json();
        toast(error.error || 'Login failed', 'error');
      }
    } catch {
      toast('A network error occurred', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 selection:bg-accent/30">
      <div className="w-full max-w-md bg-panel border border-panelBorder rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative Glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-accent/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="text-center mb-10 relative z-10">
          <div className="w-16 h-16 bg-background border border-panelBorder rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
             <Lock className="w-8 h-8 text-yellow-400" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Admin Security</h1>
          <p className="text-gray-400 text-sm">Sign in to access the Moonana Studio dashboard.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5 relative z-10">
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="E-mail"
              className="w-full bg-background border border-panelBorder rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-background border border-panelBorder rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all font-mono"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading || !email || !password}
            className="w-full h-12 mt-4 bg-accent hover:bg-yellow-300 disabled:bg-panel border disabled:border-panelBorder border-transparent rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-black disabled:text-gray-500 shadow-[0_0_20px_rgba(250,204,21,0.2)] disabled:shadow-none"
          >
            {isLoading ? (
               <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Secure Login</span>
                <LogIn className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
