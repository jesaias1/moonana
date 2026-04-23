"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Rocket, Activity, CreditCard, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function AdminDashboard() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [activeView, setActiveView] = useState<'analytics' | 'subscriptions'>('analytics');
  const [stats, setStats] = useState({ activeUsers: 0, totalGenerations: 0, status: 'Initializing...' });
  const router = useRouter();

  useEffect(() => {
    // Verify session client-side
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (!data.user || data.user.role !== 'admin') {
           router.push('/login');
        } else {
           setIsCheckingAuth(false);
           fetch('/api/admin/stats')
             .then(r => r.json())
             .then(s => {
                if (!s.error) {
                  setStats(s);
                } else {
                  setStats(prev => ({ ...prev, status: 'API Error' }));
                }
             })
             .catch(() => setStats(prev => ({ ...prev, status: 'Network Error' })));
        }
      })
      .catch(() => router.push('/login'));
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-panelBorder border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Admin Sidebar */}
      <div className="w-full md:w-64 bg-panel border-r border-panelBorder flex flex-col h-screen shrink-0">
        <div className="p-6 border-b border-panelBorder flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-violet-400" />
          <span className="font-bold tracking-wide">Admin Hub</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveView('analytics')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeView === 'analytics' ? 'bg-white/5 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Activity className="w-5 h-5" /> Analytics
          </button>
          <button 
            onClick={() => setActiveView('subscriptions')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${activeView === 'subscriptions' ? 'bg-white/5 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <CreditCard className="w-5 h-5" /> Subscriptions
          </button>
        </nav>

        <div className="p-4 border-t border-panelBorder">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-400 hover:text-white hover:bg-red-500/20 rounded-lg font-medium transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </div>

      {/* Admin Canvas */}
      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Welcome Back, Admin</h1>
              <p className="text-gray-400">Here&apos;s what&apos;s happening in AIJourney today.</p>
            </div>
            <Link href="/studio" className="flex items-center gap-2 px-6 py-3 bg-accent text-white font-bold rounded-xl hover:bg-violet-400 transition-colors shadow-lg shadow-accent/20">
              <Rocket className="w-4 h-4" /> Go to Studio
            </Link>
          </div>

          {activeView === 'analytics' ? (
            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-panel border border-panelBorder rounded-2xl p-6">
                 <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Total Generations</span>
                 <div className="text-4xl font-extrabold mt-3">{stats.totalGenerations.toLocaleString()}</div>
              </div>
              <div className="bg-panel border border-panelBorder rounded-2xl p-6">
                 <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Active Users</span>
                 <div className="text-4xl font-extrabold mt-3 text-green-400">{stats.activeUsers.toLocaleString()}</div>
              </div>
              <div className="bg-panel border border-panelBorder rounded-2xl p-6 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 blur-[50px] rounded-full" />
                 <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider relative z-10">System Status</span>
                 <div className="text-xl font-bold mt-4 text-white flex items-center gap-2 relative z-10">
                   <div className={`w-3 h-3 rounded-full ${stats.status === 'Operational' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} /> {stats.status}
                 </div>
              </div>
            </div>
          ) : (
            <div className="bg-panel border border-panelBorder rounded-2xl p-8 max-w-2xl">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <CreditCard className="w-6 h-6 text-violet-400" /> Subscription Management
              </h2>
              <p className="text-gray-400 leading-relaxed mb-6">
                Stripe Payments have been successfully integrated. 
                Users who exhaust their free Tokens will be prompted to purchase the $2.00 Pro Package. 
              </p>
              <div className="p-4 bg-black/40 border border-panelBorder rounded-xl font-mono text-sm text-violet-200/80">
                To sync live purchases, connect a Stripe Webhook to your Vercel deployment endpoint.
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
