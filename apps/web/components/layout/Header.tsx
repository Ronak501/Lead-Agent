'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Search, Plus, Sparkles, Building2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  onOpenMobileMenu: () => void;
  onOpenDiscoverModal?: () => void;
  onOpenNewCampaignModal?: () => void;
}

export function Header({
  onOpenMobileMenu,
  onOpenDiscoverModal,
  onOpenNewCampaignModal,
}: HeaderProps) {
  const pathname = usePathname();
  const { currentUser, signOut } = useApp();

  const getPageTitle = (path: string) => {
    if (path === '/') return 'Overview';
    return path.replace('/', '').replace('_', ' ');
  };

  return (
    <header className="h-16 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-8 flex items-center justify-between">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800 transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu size={18} />
        </button>
        <span className="text-xs font-medium text-zinc-500 hidden sm:inline">Workspace</span>
        <span className="text-zinc-700 hidden sm:inline">/</span>
        <span className="text-sm font-semibold capitalize text-zinc-200">{getPageTitle(pathname)}</span>
      </div>

      {/* Right: User Profile & Actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        {currentUser && (
          <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span className="font-semibold text-white hidden md:inline">
              {currentUser.full_name || 'Team Member'}
            </span>
            <span className="text-zinc-500 hidden sm:inline">({currentUser.email})</span>
            {currentUser.email === 'ronaktalaviya51@gmail.com' && (
              <span className="text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-1.5 py-0.5 rounded-full font-mono font-bold">
                Admin
              </span>
            )}
            <button
              onClick={signOut}
              className="ml-1 text-[11px] text-red-400 hover:text-red-300 hover:underline font-semibold"
            >
              Sign Out
            </button>
          </div>
        )}

        {onOpenDiscoverModal && (
          <button
            onClick={onOpenDiscoverModal}
            className="hidden sm:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 transition-colors"
          >
            <Search size={14} /> Discover Leads
          </button>
        )}

        {onOpenNewCampaignModal && (
          <button
            onClick={onOpenNewCampaignModal}
            className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md shadow-violet-600/25 transition-all"
          >
            <Plus size={14} /> <span className="hidden sm:inline">New Campaign</span>
            <span className="sm:hidden">New</span>
          </button>
        )}
      </div>
    </header>
  );
}

