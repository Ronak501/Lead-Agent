'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, AlertCircle, Building2, CheckCircle2, Eye, EyeOff } from 'lucide-react';

interface AuthGateProps {
  apiBaseUrl: string;
  onAuthenticated: (user: { id: string; email: string; full_name: string; domain: string }) => void;
}

export function AuthGate({ apiBaseUrl, onAuthenticated }: AuthGateProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize Google Sign-In
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
          throw new Error(data.detail || 'Access Denied: Account not authorized for this platform.');
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
        });

        const btnContainer = document.getElementById('googleSignInBtn');
        if (btnContainer) {
          (window as any).google.accounts.id.renderButton(btnContainer, {
            theme: 'outline',
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
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMessage('Please enter both email address and password.');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${apiBaseUrl}/api/auth/ornitech/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Invalid email or password.');
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
    <div className="min-h-screen bg-[#eee6d6] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Organic Subtle Clay & Moss Fields in Background */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[32rem] h-[32rem] bg-[#ad7d62]/10 rounded-[40px_60px_50px_70px] pointer-events-none transform -rotate-3" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#35422d]/10 rounded-[60px_40px_70px_50px] pointer-events-none transform rotate-6" />

      <div className="w-full max-w-md bg-[#f5eddf] border border-[#ddd5c3] rounded-[28px_20px_30px_18px] p-6 sm:p-8 shadow-md relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#35422d]/10 border border-[#35422d]/25 text-[#35422d] text-xs font-semibold">
            <ShieldCheck size={14} /> Enterprise Security Gateway
          </div>
          <h1 className="font-serif text-2xl font-bold tracking-tight text-[#29251d] flex items-center justify-center gap-2">
            <Building2 className="text-[#694737]" size={24} /> Ornitech Solutions
          </h1>
          <p className="text-xs text-[#443b2f] max-w-xs mx-auto">
            LeadPilot AI Prospecting & Automated Outbound Platform
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-[#fdf2ee] border border-[#ad7d62] text-[#694737] text-xs flex items-start gap-2 animate-in fade-in">
            <AlertCircle size={16} className="shrink-0 mt-0.5 text-[#ad7d62]" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Google Workspace One-Tap Sign In */}
        <div className="space-y-3">
          <div id="googleSignInBtn" className="flex justify-center w-full min-h-[44px]" />
          
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-[#ddd5c3]" />
            <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-[#694737] font-medium font-sans">
              or sign in with password
            </span>
            <div className="flex-grow border-t border-[#ddd5c3]" />
          </div>
        </div>

        {/* Corporate Form Login - Clean Inputs with No Exposing Labels */}
        <form onSubmit={handleCorporateLogin} className="space-y-3.5">
          <div className="relative">
            <input
              type="email"
              required
              autoComplete="username"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-[16px_12px_14px_18px] bg-[#eee6d6]/60 border border-[#ddd5c3] text-[#29251d] text-xs placeholder:text-[#694737]/60 focus:outline-none focus:border-[#35422d] focus:ring-1 focus:ring-[#35422d] transition-all"
            />
          </div>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-4 pr-11 py-3 rounded-[16px_12px_14px_18px] bg-[#eee6d6]/60 border border-[#ddd5c3] text-[#29251d] text-xs placeholder:text-[#694737]/60 focus:outline-none focus:border-[#35422d] focus:ring-1 focus:ring-[#35422d] transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#694737]/70 hover:text-[#29251d] transition-colors focus:outline-none p-1"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full py-3 px-4 rounded-[27px_19px_29px_16px] bg-[#35422d] hover:bg-[#273320] text-[#f5eddf] font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50 active:scale-[0.98] cursor-pointer"
          >
            {loading ? (
              <span className="inline-block animate-spin mr-2">⏳</span>
            ) : (
              <Lock size={14} />
            )}
            Sign In to LeadPilot
          </button>
        </form>

        {/* Security Notice Footer */}
        <div className="pt-2 border-t border-[#ddd5c3] text-center">
          <p className="text-[11px] text-[#443b2f] flex items-center justify-center gap-1.5">
            <CheckCircle2 size={12} className="text-[#35422d]" />
            Protected enterprise portal. Authorized credentials required.
          </p>
        </div>
      </div>
    </div>
  );
}
