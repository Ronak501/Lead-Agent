'use client';

import React, { useState, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AuthGate } from '../AuthGate';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  children: ReactNode;
  onOpenDiscoverModal?: () => void;
  onOpenNewCampaignModal?: () => void;
}

export function AppLayout({
  children,
  onOpenDiscoverModal,
  onOpenNewCampaignModal,
}: AppLayoutProps) {
  const { currentUser, isAuthLoading, setCurrentUser, notification, API, fetchData } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#eee6d6] flex flex-col items-center justify-center text-[#443b2f] text-sm space-y-3 font-sans">
        <div className="w-8 h-8 border-2 border-[#35422d] border-t-transparent rounded-full animate-spin" />
        <p className="font-medium">Opening Ornitech Workspace on sand table...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthGate
        apiBaseUrl={API}
        onAuthenticated={(user) => {
          setCurrentUser(user);
          void fetchData();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#eee6d6] text-[#29251d] flex selection:bg-[#ad7d62]/30 selection:text-[#29251d] font-sans">
      {/* Toast Notification */}
      {notification && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-lg transition-all duration-300 font-sans text-sm ${
            notification.type === 'error'
              ? 'bg-[#fdf2ee] border-[#ad7d62] text-[#694737]'
              : notification.type === 'info'
              ? 'bg-[#f5eddf] border-[#b9b28b] text-[#35422d]'
              : 'bg-[#f2f6ee] border-[#35422d]/40 text-[#35422d]'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertCircle size={18} className="shrink-0 text-[#ad7d62]" />
          ) : notification.type === 'info' ? (
            <RefreshCw size={18} className="shrink-0 text-[#694737] animate-spin" />
          ) : (
            <CheckCircle2 size={18} className="shrink-0 text-[#35422d]" />
          )}
          <span className="font-medium leading-snug">{notification.message}</span>
        </div>
      )}

      {/* Main Navigation Sidebar */}
      <Sidebar
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Content Area */}
      <div className="w-full lg:ml-64 flex-1 flex flex-col min-h-screen">
        <Header
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenDiscoverModal={onOpenDiscoverModal}
          onOpenNewCampaignModal={onOpenNewCampaignModal}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8">
          {children}
        </main>
      </div>
    </div>
  );
}
