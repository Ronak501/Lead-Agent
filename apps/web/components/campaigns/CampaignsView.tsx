'use client';

import React, { useState } from 'react';
import { ArrowRight, Plus, Target, Sparkles, Loader2, Globe, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { NewCampaignModal } from './NewCampaignModal';
import { DiscoverLeadsModal } from '../leads/DiscoverLeadsModal';

interface CampaignsViewProps {
  showNewCampaignModal?: boolean;
  setShowNewCampaignModal?: (show: boolean) => void;
  showDiscoverModal?: boolean;
  setShowDiscoverModal?: (show: boolean) => void;
}

export function CampaignsView({
  showNewCampaignModal: externalShowNewCampaignModal,
  setShowNewCampaignModal: externalSetShowNewCampaignModal,
  showDiscoverModal: externalShowDiscoverModal,
  setShowDiscoverModal: externalSetShowDiscoverModal,
}: CampaignsViewProps) {
  const { campaigns, handleAutoProfileDomain, handleCreateCampaign } = useApp();
  const [internalShowNewCampaignModal, setInternalShowNewCampaignModal] = useState(false);
  const [internalShowDiscoverModal, setInternalShowDiscoverModal] = useState(false);
  const [discoverQuery, setDiscoverQuery] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [isProfiling, setIsProfiling] = useState(false);

  const handleQuickProfileAndLaunch = async () => {
    if (!domainInput.trim()) return;
    setIsProfiling(true);
    try {
      const profile = await handleAutoProfileDomain(domainInput.trim());
      if (profile && profile.suggested_campaign) {
        await handleCreateCampaign(profile.suggested_campaign);
        setDomainInput('');
      }
    } finally {
      setIsProfiling(false);
    }
  };

  const isNewCampaignOpen = externalShowNewCampaignModal !== undefined
    ? externalShowNewCampaignModal
    : internalShowNewCampaignModal;
  const setNewCampaignOpen = externalSetShowNewCampaignModal !== undefined
    ? externalSetShowNewCampaignModal
    : setInternalShowNewCampaignModal;

  const isDiscoverOpen = externalShowDiscoverModal !== undefined
    ? externalShowDiscoverModal
    : internalShowDiscoverModal;
  const setDiscoverOpen = externalSetShowDiscoverModal !== undefined
    ? externalSetShowDiscoverModal
    : setInternalShowDiscoverModal;

  return (
    <div className="space-y-6 font-sans text-[#29251d]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#ddd5c3]">
        <div>
          <h1 className="font-serif text-2xl font-normal text-[#29251d] tracking-tight">Outreach Campaigns</h1>
          <p className="text-xs text-[#443b2f]">Configure target markets, industry segments, and service offerings</p>
        </div>
        <button
          onClick={() => setNewCampaignOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-[27px_19px_29px_16px] bg-[#35422d] hover:bg-[#273320] text-[#f5eddf] text-xs font-semibold shadow-xs transition-all w-full sm:w-fit active:scale-[0.98]"
        >
          <Plus size={16} /> New Campaign
        </button>
      </div>

      {/* Explee-style 1-Click Reverse Domain Profiler & Instant Launch */}
      <div className="rounded-[26px_18px_24px_20px] border border-[#ddd5c3] bg-gradient-to-br from-[#f5eddf] to-[#eee4d0] p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#35422d] font-semibold text-xs tracking-wider uppercase">
            <Sparkles size={14} className="text-[#ad7d62]" /> 1-Click AI Domain Profiler
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#35422d]/10 text-[#35422d]">
            Autonomous Agent
          </span>
        </div>
        <div className="space-y-1">
          <h2 className="font-serif text-base text-[#29251d] font-normal">
            Auto-generate your 24/7 client acquisition campaign
          </h2>
          <p className="text-xs text-[#5c5040]">
            Paste your company website (e.g. <span className="font-mono text-[#35422d] font-medium">ornitech.in</span>). Our AI analyzes your offerings, formulates your Ideal Customer Profile, and initiates autonomous prospecting in seconds.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
          <div className="relative flex-1 w-full">
            <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8c7e6c]" />
            <input
              type="text"
              placeholder="Paste your website, e.g. ornitech.in"
              value={domainInput}
              onChange={(e) => setDomainInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleQuickProfileAndLaunch()}
              className="w-full bg-[#fcfaf7] border border-[#ddd5c3] rounded-[18px] pl-9 pr-3.5 py-2 text-xs text-[#29251d] placeholder:text-[#8c7e6c] focus:outline-none focus:border-[#35422d]"
            />
          </div>
          <button
            onClick={handleQuickProfileAndLaunch}
            disabled={isProfiling || !domainInput.trim()}
            className="w-full sm:w-auto px-4 py-2 rounded-[20px] bg-[#35422d] hover:bg-[#273320] disabled:opacity-50 text-[#f5eddf] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap active:scale-[0.98]"
          >
            {isProfiling ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Analyzing Offerings...
              </>
            ) : (
              <>
                <Sparkles size={13} /> Analyze & Launch Campaign
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {campaigns.length === 0 ? (
          <div className="col-span-full rounded-[26px_18px_24px_20px] border border-dashed border-[#ddd5c3] bg-[#f5eddf]/60 p-12 text-center space-y-3">
            <div className="p-3 w-12 h-12 mx-auto rounded-full bg-[#eee6d6] text-[#694737] flex items-center justify-center">
              <Target size={24} />
            </div>
            <h3 className="font-serif font-medium text-lg text-[#29251d]">No campaigns created yet</h3>
            <p className="text-xs text-[#443b2f] max-w-md mx-auto">
              Create your first campaign to define target industries, target markets, and begin autonomous lead discovery.
            </p>
            <button
              onClick={() => setNewCampaignOpen(true)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-[27px_19px_29px_16px] bg-[#35422d] hover:bg-[#273320] text-[#f5eddf] text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Plus size={16} /> Create Campaign
            </button>
          </div>
        ) : (
          campaigns.map((c) => (
          <div
            key={c.id}
            className="rounded-[26px_18px_24px_20px] border border-[#ddd5c3] bg-[#f5eddf] p-5 space-y-4 hover:border-[#ad7d62] shadow-2xs transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#35422d]/15 text-[#35422d] border border-[#35422d]/30">
                  {c.status}
                </span>
                <h3 className="font-serif font-medium text-lg text-[#29251d] pt-1">{c.name}</h3>
              </div>
              <div className="p-2.5 rounded-[14px_10px_16px_12px] bg-[#eee6d6] text-[#694737]">
                <Target size={18} />
              </div>
            </div>

            <p className="text-xs text-[#443b2f] leading-relaxed">
              {c.notes || 'Targeting qualified businesses with tailored website and SaaS modernization.'}
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[#694737] font-medium">Markets:</span>
                {c.target_markets.map((m, idx) => (
                  <span key={idx} className="bg-[#eee6d6] text-[#29251d] px-2 py-0.5 rounded-md text-[11px]">
                    {m}
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[#694737] font-medium">Services:</span>
                {c.services.map((s, idx) => (
                  <span key={idx} className="bg-[#694737]/10 text-[#694737] px-2 py-0.5 rounded-md text-[11px]">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-[#ddd5c3] flex items-center justify-between text-xs">
              <span className="font-serif text-[#29251d] font-medium">{c.leads_count} Leads Discovered</span>
              <button
                onClick={() => {
                  setDiscoverQuery(c.name);
                  setDiscoverOpen(true);
                }}
                className="text-[#35422d] hover:text-[#273320] font-semibold flex items-center gap-1"
              >
                Run Discovery <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )))}
      </div>

      {externalShowNewCampaignModal === undefined && (
        <NewCampaignModal
          isOpen={internalShowNewCampaignModal}
          onClose={() => setInternalShowNewCampaignModal(false)}
        />
      )}

      {externalShowDiscoverModal === undefined && (
        <DiscoverLeadsModal
          isOpen={internalShowDiscoverModal}
          initialQuery={discoverQuery}
          onClose={() => setInternalShowDiscoverModal(false)}
        />
      )}
    </div>
  );
}
