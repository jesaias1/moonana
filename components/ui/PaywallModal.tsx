import React from 'react';
import { CreditCard, Rocket, X, Zap } from 'lucide-react';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PaywallModal({ isOpen, onClose }: PaywallModalProps) {
  if (!isOpen) return null;

  const handleCheckout = async () => {
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' });
      const { url } = await res.json();
      if (url) {
        window.location.href = url; // Redirect to secure Stripe Checkout
      }
    } catch (err) {
      console.error('Failed to initiate checkout', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-panel border border-violet-500/20 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl shadow-violet-500/10 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors z-10"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>

        {/* Hero Header */}
        <div className="bg-gradient-to-b from-violet-500/20 to-transparent p-8 text-center relative">
          <div className="w-16 h-16 bg-violet-500 shadow-[0_0_30px_rgba(139,92,246,0.5)] rounded-full flex items-center justify-center mx-auto mb-6">
            <Zap className="w-8 h-8 text-white fill-white" />
          </div>
          <h2 className="text-3xl font-extrabold mb-2">Out of Tokens!</h2>
          <p className="text-gray-400">You&apos;ve used up your free generations.</p>
        </div>

        {/* Pricing Content */}
        <div className="px-8 pb-8">
          <div className="bg-background border border-panelBorder rounded-2xl p-6 mb-8 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 blur-[50px] rounded-full point-events-none" />
            <div className="text-sm font-bold text-violet-400 uppercase tracking-widest mb-2">Pro Package</div>
            <div className="flex items-baseline justify-center gap-1 mb-4">
              <span className="text-5xl font-black">$5</span>
              <span className="text-gray-400 font-medium">/ 50 Tokens</span>
            </div>
            <ul className="text-sm text-gray-300 space-y-3 mb-6 text-left w-full max-w-[240px] mx-auto">
              <li className="flex items-center gap-2"><Rocket className="w-4 h-4 text-violet-400" /> Ultra-quality GPT Image 2</li>
              <li className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-violet-400" /> Secure one-time payment</li>
            </ul>

            <button 
              onClick={handleCheckout}
              className="w-full bg-violet-500 text-white font-bold text-lg py-4 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:bg-violet-400 transition-colors flex items-center justify-center gap-2"
            >
              Buy 50 Tokens — $5
            </button>
          </div>
          <p className="text-xs text-center text-gray-500">Payments are processed securely via Stripe. You can purchase additional tokens at any time. Prices include a minor 20% platform infrastructure fee.</p>
        </div>
      </div>
    </div>
  );
}
