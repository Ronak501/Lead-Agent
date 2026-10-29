'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Menu, Search, Plus } from 'lucide-react';
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
    <header className="h-16 border-b border-[#ddd5c3] bg-[#f5eddf]/90 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-8 flex items-center justify-between">
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-[#443b2f] hover:text-[#29251d] hover:bg-[#ddd5c3]/50 border border-[#ddd5c3] transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu size={18} />
        </button>
        <span className="text-xs font-medium text-[#694737] hidden sm:inline font-sans">Workspace</span>
        <span className="text-[#b9b28b] hidden sm:inline">/</span>
        <span className="font-serif text-base font-semibold capitalize text-[#29251d] tracking-tight">
          {getPageTitle(pathname)}
        </span>
      </div>

      {/* Right: User Profile & Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {currentUser && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-[18px_12px_16px_14px] bg-[#eee6d6] border border-[#ddd5c3] text-xs">
            <span className="w-2 h-2 rounded-full bg-[#35422d] shrink-0" />
            <span className="font-medium text-[#29251d] hidden md:inline">
              {currentUser.full_name || 'Team Member'}
            </span>
            <span className="text-[#694737] hidden sm:inline text-[11px]">({currentUser.email})</span>
            {currentUser.email === 'ronaktalaviya51@gmail.com' && (
              <span className="text-[10px] bg-[#694737]/15 text-[#694737] border border-[#694737]/30 px-1.5 py-0.5 rounded-full font-bold">
                Admin
              </span>
            )}
            <button
              onClick={signOut}
              className="ml-1 text-[11px] text-[#ad7d62] hover:text-[#694737] hover:underline font-semibold"
            >
              Sign Out
            </button>
          </div>
        )}

        {onOpenDiscoverModal && (
          <button
            onClick={onOpenDiscoverModal}
            className="hidden sm:flex items-center gap-2 text-xs font-medium px-3.5 py-2 rounded-[20px_14px_18px_12px] border border-[#ddd5c3] bg-[#f5eddf] hover:bg-[#ddd5c3]/60 text-[#29251d] transition-all"
          >
            <Search size={14} className="text-[#694737]" /> Discover Leads
          </button>
        )}

        {onOpenNewCampaignModal && (
          <button
            onClick={onOpenNewCampaignModal}
            className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold px-3.5 sm:px-4 py-2 rounded-[27px_19px_29px_16px] bg-[#35422d] hover:bg-[#273320] text-[#f5eddf] shadow-sm transition-all"
          >
            <Plus size={14} /> <span className="hidden sm:inline">New Campaign</span>
            <span className="sm:hidden">New</span>
          </button>
        )}
      </div>
    </header>
  );
}
