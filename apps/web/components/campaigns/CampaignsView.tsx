'use client';

import React, { useState } from 'react';
import { ArrowRight, Plus, Target } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NewCampaignModal } from './NewCampaignModal';
import { DiscoverLeadsModal } from '../leads/DiscoverLeadsModal';

export function CampaignsView() {
  const { campaigns } = useApp();
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [discoverQuery, setDiscoverQuery] = useState('');

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white">Outreach Campaigns</h1>
          <p className="text-xs text-zinc-400">Configure target markets, industry segments, and service offerings</p>
        </div>
        <button
          onClick={() => setShowNewCampaignModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/30 transition-all w-full sm:w-fit"
        >
          <Plus size={16} /> New Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {campaigns.map((c) => (
          <div key={c.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 space-y-4 hover:border-zinc-700 transition-all">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                  {c.status}
                </span>
                <h3 className="font-semibold text-base text-white pt-1">{c.name}</h3>
              </div>
              <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400">
                <Target size={18} />
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              {c.notes || 'Targeting qualified businesses with tailored website and SaaS modernization.'}
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex flex-wrap gap-1">
                <span className="text-zinc-500">Markets:</span>
                {c.target_markets.map((m, idx) => (
                  <span key={idx} className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded text-[11px]">
                    {m}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                <span className="text-zinc-500">Services:</span>
                {c.services.map((s, idx) => (
                  <span key={idx} className="bg-violet-950/60 text-violet-300 px-1.5 py-0.5 rounded text-[11px]">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium">{c.leads_count} Leads Discovered</span>
              <button
                onClick={() => {
                  setDiscoverQuery(c.name);
                  setShowDiscoverModal(true);
                }}
                className="text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1"
              >
                Run Discovery <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <NewCampaignModal
        isOpen={showNewCampaignModal}
        onClose={() => setShowNewCampaignModal(false)}
      />

      <DiscoverLeadsModal
        isOpen={showDiscoverModal}
        initialQuery={discoverQuery}
        onClose={() => setShowDiscoverModal(false)}
      />
    </div>
  );
}

