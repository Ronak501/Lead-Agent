'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, AlertCircle, ArrowRight, Building2, CheckCircle2 } from 'lucide-react';

interface AuthGateProps {
  apiBaseUrl: string;
  onAuthenticated: (user: { id: string; email: string; full_name: string; domain: string }) => void;
}

export function AuthGate({ apiBaseUrl, onAuthenticated }: AuthGateProps) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize Google Sign-In if available
  useEffect(() => {
    const handleGoogleCredentialResponse = async (response: any) => {
      try {
        setLoading(true);
        setErrorMessage(null);
        const res = await fetch(`${apiBaseUrl}/api/auth/google/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ credential: response.credential }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.detail || 'Access Denied: Only @ornitech.in accounts are permitted.');
        }

        localStorage.setItem('ornitech_token', data.access_token);
        localStorage.setItem('ornitech_user', JSON.stringify(data.user));
        onAuthenticated(data.user);
      } catch (err: any) {
        setErrorMessage(err.message || 'Authentication failed');
      } finally {
        setLoading(false);
      }
    };

    if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: '822012759095-hs71lski4v2itkf2ooqs5hdmuvnjprk7.apps.googleusercontent.com',
          callback: handleGoogleCredentialResponse,
          hosted_domain: 'ornitech.in',
        });

        const btnContainer = document.getElementById('googleSignInBtn');
        if (btnContainer) {
          (window as any).google.accounts.id.renderButton(btnContainer, {
            theme: 'filled_black',
            size: 'large',
            shape: 'pill',
            text: 'continue_with',
            width: '100%',
          });
        }
      } catch (e) {
        console.error('GIS Init Error:', e);
      }
    }
  }, [apiBaseUrl, onAuthenticated]);

  const handleCorporateLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.endsWith('@ornitech.in')) {
      setErrorMessage('⛔ Access Denied: Only @ornitech.in company accounts are authorized.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl}/api/auth/ornitech/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          full_name: fullName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Access denied.');
      }

      localStorage.setItem('ornitech_token', data.access_token);
      localStorage.setItem('ornitech_user', JSON.stringify(data.user));
      onAuthenticated(data.user);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold">
            <ShieldCheck size={14} /> Domain Protected: @ornitech.in
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <Building2 className="text-violet-400" size={24} /> Ornitech Solutions
          </h1>
          <p className="text-xs text-zinc-400">
            LeadPilot AI Prospecting & Automated Outbound Platform
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Google Workspace One-Tap Sign In */}
        <div className="space-y-3">
          <div id="googleSignInBtn" className="flex justify-center w-full min-h-[44px]" />
          
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-zinc-800" />
            <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-zinc-500 font-medium">
              or sign in with corporate email
            </span>
            <div className="flex-grow border-t border-zinc-800" />
          </div>
        </div>

        {/* Corporate Form Login */}
        <form onSubmit={handleCorporateLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 block">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Ronak Talaviya"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-300 block">Company Email (@ornitech.in)</label>
            <input
              type="email"
              required
              placeholder="yourname@ornitech.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs placeholder:text-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !email}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block animate-spin mr-2">⏳</span>
            ) : (
              <Lock size={14} />
            )}
            Sign In with @ornitech.in
          </button>
        </form>

        {/* Security Notice Footer */}
        <div className="pt-2 border-t border-zinc-800/80 text-center">
          <p className="text-[11px] text-zinc-500 flex items-center justify-center gap-1.5">
            <CheckCircle2 size={12} className="text-emerald-400" />
            Internal tool strictly reserved for Ornitech Solutions team members.
          </p>
        </div>
      </div>
    </div>
  );
}

