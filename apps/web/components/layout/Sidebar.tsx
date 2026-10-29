'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Layers,
  Target,
  Users,
  Mail,
  ShieldCheck,
  Activity,
  Key,
  Settings as SettingsIcon,
  Sparkles,
  RefreshCw,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
}

export function Sidebar({ mobileMenuOpen, setMobileMenuOpen }: SidebarProps) {
  const pathname = usePathname();
  const { drafts, leads, apiStatus, fetchData, notify, API } = useApp();

  const navItems = [
    { href: '/', label: 'Overview', icon: Layers },
    { href: '/campaigns', label: 'Campaigns', icon: Target },
    {
      href: '/leads',
      label: 'Discovered Leads',
      icon: Users,
      badge: leads.length,
    },
    {
      href: '/drafts',
      label: 'Outbox Drafts',
      icon: Mail,
      badge: drafts.filter(d => d.status === 'sent').length,
    },
    {
      href: '/review',
      label: 'Approval Queue',
      icon: ShieldCheck,
      badge: drafts.filter(d => d.status === 'pending_review').length,
      badgeColor: 'bg-violet-500/20 text-violet-300 border-violet-500/30',
    },
    { href: '/analytics', label: 'Analytics', icon: Activity },
    { href: '/integrations', label: 'Integrations', icon: Key },
    { href: '/settings', label: 'Settings', icon: SettingsIcon },
  ];

  const handleTriggerSeed = async () => {
    try {
      const res = await fetch(`${API}/api/seed`, { method: 'POST' });
      if (!res.ok) throw new Error('Seeding failed');
      notify('Demo data reloaded successfully!', 'success');
      await fetchData();
    } catch {
      notify('Failed to reload demo data', 'error');
    }
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={`w-64 border-r border-zinc-800/80 bg-zinc-950/95 backdrop-blur-xl flex flex-col justify-between p-4 fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          {/* Logo & Platform Title */}
          <div className="flex items-center justify-between px-2 pt-1">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-violet-600/30 group-hover:scale-105 transition-transform">
                <Sparkles size={18} />
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-white block">LeadPilot AI</span>
                <span className="text-[10px] text-zinc-400 font-mono tracking-wider uppercase block">
                  Ornitech Solutions
                </span>
              </div>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-violet-600/15 text-violet-300 border border-violet-500/30 shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className={isActive ? 'text-violet-400' : 'text-zinc-400'} />
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${
                        item.badgeColor || 'bg-zinc-800 text-zinc-300 border-zinc-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Cloud Run & Database Status Badge */}
          <div className="p-3 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-zinc-400 font-medium">Cloud Engine</span>
              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1.5 ${
                  apiStatus === 'online'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${apiStatus === 'online' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                {apiStatus === 'online' ? 'Connected' : 'Offline'}
              </span>
            </div>
            <p className="text-[10px] text-zinc-500">Neon Postgres · Cloud Run asia-south1</p>
          </div>
        </div>

        {/* Safety & Compliance Badge */}
        <div className="p-3.5 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <ShieldCheck size={16} /> Strict Human Approval
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400">
            Outreach drafts require verification and evidence grounding before dispatch.
          </p>
          <button
            onClick={handleTriggerSeed}
            className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-700/50 transition-colors"
          >
            <RefreshCw size={12} /> Reload Demo Data
          </button>
        </div>
      </aside>
    </>
  );
}

