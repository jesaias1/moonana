"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { Lock, LogIn, UserPlus } from 'lucide-react';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        toast(isLogin ? 'Welcome back!' : 'Account created successfully!', 'success');
        router.push('/studio');
        router.refresh(); 
      } else {
        const error = await res.json();
        toast(error.error || (isLogin ? 'Login failed' : 'Signup failed'), 'error');
      }
    } catch {
      toast('A network error occurred', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 selection:bg-accent/30">
      <div className="w-full max-w-md bg-panel border border-panelBorder rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative Glow */}
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-accent/20 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="text-center mb-10 relative z-10">
          <div className="w-16 h-16 bg-background border border-panelBorder rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            {isLogin ? <Lock className="w-8 h-8 text-violet-400" /> : <UserPlus className="w-8 h-8 text-violet-400" />}
          </div>
          <h1 className="text-2xl font-bold mb-2">{isLogin ? 'Welcome Back' : 'Join AIJourney'}</h1>
          <p className="text-gray-400 text-sm">
            {isLogin ? 'Sign in to access your generative dashboard.' : 'Create an account to get 10 free generations.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-background/50 rounded-xl mb-8 relative z-10 border border-panelBorder">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              isLogin ? 'bg-panel text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
              !isLogin ? 'bg-panel text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
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
              minLength={6}
              placeholder="••••••••"
              className="w-full bg-background border border-panelBorder rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all font-mono"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={isLoading || !email || !password || password.length < 6}
            className="w-full h-12 mt-4 bg-accent hover:bg-violet-400 disabled:bg-panel border disabled:border-panelBorder border-transparent rounded-xl flex items-center justify-center gap-2 font-bold transition-all text-white disabled:text-gray-500 shadow-[0_0_20px_rgba(139,92,246,0.2)] disabled:shadow-none"
          >
            {isLoading ? (
               <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isLogin ? 'Secure Login' : 'Create Account'}</span>
                {isLogin ? <LogIn className="w-4 h-4 ml-1" /> : <UserPlus className="w-4 h-4 ml-1" />}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
