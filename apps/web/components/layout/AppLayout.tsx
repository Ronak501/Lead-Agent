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
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 text-xs space-y-3">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p>Verifying Ornitech Workspace session...</p>
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
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl transition-all duration-300 ${
            notification.type === 'error'
              ? 'bg-rose-950/90 border-rose-800 text-rose-200'
              : notification.type === 'info'
              ? 'bg-blue-950/90 border-blue-800 text-blue-200'
              : 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertCircle size={18} />
          ) : notification.type === 'info' ? (
            <RefreshCw size={18} className="animate-spin" />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
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

