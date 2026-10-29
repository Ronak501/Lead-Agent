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
      badge: drafts.filter((d) => d.status === 'sent').length,
    },
    {
      href: '/review',
      label: 'Approval Queue',
      icon: ShieldCheck,
      badge: drafts.filter((d) => d.status === 'pending_review').length,
      badgeColor: 'bg-[#694737]/15 text-[#694737] border border-[#694737]/30',
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
          className="fixed inset-0 bg-[#29251d]/40 backdrop-blur-xs z-30 lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Aside */}
      <aside
        className={`w-64 border-r border-[#ddd5c3] bg-[#f5eddf] flex flex-col justify-between p-4 fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-sm ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          {/* Logo & Platform Title */}
          <div className="flex items-center justify-between px-2 pt-1">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-[14px_10px_16px_12px] bg-[#35422d] flex items-center justify-center text-[#f5eddf] shadow-sm group-hover:scale-105 transition-transform">
                <Sparkles size={17} />
              </div>
              <div>
                <span className="font-serif font-bold text-base tracking-tight text-[#29251d] block">
                  LeadPilot AI
                </span>
                <span className="text-[10px] text-[#694737] font-medium tracking-wider uppercase block font-sans">
                  Ornitech Solutions
                </span>
              </div>
            </Link>

            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-xl text-[#443b2f] hover:text-[#29251d] hover:bg-[#ddd5c3]/50 border border-[#ddd5c3] transition-colors"
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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-[16px_12px_18px_14px] text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-[#35422d] text-[#f5eddf] shadow-sm'
                      : 'text-[#443b2f] hover:bg-[#ddd5c3]/50 hover:text-[#29251d]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon size={16} className={isActive ? 'text-[#b9b28b]' : 'text-[#694737]'} />
                    <span className="font-sans font-medium">{item.label}</span>
                  </div>

                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        item.badgeColor || (isActive ? 'bg-[#29251d]/40 text-[#f5eddf]' : 'bg-[#ddd5c3] text-[#29251d]')
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Utility Controls */}
        <div className="space-y-3 pt-4 border-t border-[#ddd5c3]">
          {/* API Health Pill */}
          <div className="flex items-center justify-between px-2 text-xs">
            <span className="text-[11px] text-[#443b2f] font-sans">Cloud Engine</span>
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                apiStatus === 'online'
                  ? 'bg-[#35422d]/15 text-[#35422d] border border-[#35422d]/30'
                  : apiStatus === 'offline'
                  ? 'bg-[#ad7d62]/20 text-[#694737] border border-[#ad7d62]'
                  : 'bg-[#b9b28b]/30 text-[#443b2f]'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  apiStatus === 'online' ? 'bg-[#35422d]' : 'bg-[#ad7d62]'
                }`}
              />
              {apiStatus}
            </span>
          </div>

          {/* Reload Demo Data */}
          <button
            onClick={handleTriggerSeed}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-[16px_12px_14px_18px] border border-[#ddd5c3] bg-[#eee6d6] hover:bg-[#ddd5c3]/80 text-[#29251d] text-xs font-medium transition-colors"
          >
            <RefreshCw size={12} className="text-[#694737]" />
            Reload Demo Data
          </button>
        </div>
      </aside>
    </>
  );
}
