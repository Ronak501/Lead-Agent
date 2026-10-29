'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  Copy,
  ExternalLink,
  Search,
  Zap,
} from 'lucide-react';
import { Lead } from '../types';
import { useApp } from '../../context/AppContext';
import { LeadDetailsView } from '../LeadDetailsView';
import { DiscoverLeadsModal } from './DiscoverLeadsModal';

interface LeadsViewProps {
  showDiscoverModal?: boolean;
  setShowDiscoverModal?: (show: boolean) => void;
}

export function LeadsView({
  showDiscoverModal: externalShowDiscoverModal,
  setShowDiscoverModal: externalSetShowDiscoverModal,
}: LeadsViewProps) {
  const {
    leads,
    loading,
    handleExportCSV,
    handleBatchAutoDispatch,
    handleAutoDispatchLead,
    handleAuditWebsite,
    handleGenerateDraft,
  } = useApp();

  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [internalShowDiscoverModal, setInternalShowDiscoverModal] = useState(false);

  // Use external modal control if provided, otherwise internal fallback
  const isDiscoverOpen = externalShowDiscoverModal !== undefined
    ? externalShowDiscoverModal
    : internalShowDiscoverModal;
  const setDiscoverOpen = externalSetShowDiscoverModal !== undefined
    ? externalSetShowDiscoverModal
    : setInternalShowDiscoverModal;

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (selectedLead) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [selectedLead]);

  const unsentCount = leads.filter((l) => l.status !== 'sent' && l.status !== 'replied').length;

  return (
    <div className="space-y-6 font-sans text-[#29251d]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#ddd5c3]">
        <div>
          <h1 className="font-serif text-2xl font-normal text-[#29251d] tracking-tight">Discovered Leads</h1>
          <p className="text-xs text-[#443b2f]">All prospects have verified domains, decision makers, and source evidence</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[20px_14px_18px_12px] border border-[#ddd5c3] bg-[#f5eddf] hover:bg-[#ddd5c3] text-[#29251d] text-xs font-medium transition-all"
          >
            <Copy size={13} className="text-[#694737]" /> Export CSV
          </button>
          <button
            onClick={() => setDiscoverOpen(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-[22px_16px_24px_14px] border border-[#35422d]/40 bg-[#eee6d6] hover:bg-[#ddd5c3] text-[#29251d] text-xs font-semibold transition-all"
          >
            <Search size={14} className="text-[#35422d]" /> Search New Leads
          </button>
          <button
            onClick={handleBatchAutoDispatch}
            disabled={loading || unsentCount === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-[27px_19px_29px_16px] bg-[#694737] hover:bg-[#53372a] text-[#f5eddf] text-xs font-semibold shadow-xs transition-all disabled:opacity-50 active:scale-[0.98]"
            title="Audit website, generate personalized draft, sign with SHA-256 and send email to all un-contacted companies"
          >
            <Zap size={14} className="fill-[#ad7d62] text-[#ad7d62]" /> Run Auto-Pilot ({unsentCount})
          </button>
        </div>
      </div>

      {/* MOBILE CARDS VIEW (Phone Screens < 768px) */}
      <div className="block md:hidden space-y-3.5">
        {leads.length === 0 ? (
          <div className="p-8 text-center rounded-[24px_18px_26px_16px] border border-[#ddd5c3] bg-[#f5eddf] text-xs text-[#443b2f]">
            No leads discovered yet. Click "Search New Leads" to begin discovery.
          </div>
        ) : (
          leads.map((l) => (
            <div
              key={l.id}
              className="p-5 rounded-[24px_18px_26px_16px] border border-[#ddd5c3] bg-[#f5eddf] space-y-3.5 shadow-2xs hover:border-[#ad7d62] transition-all"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-serif font-medium text-base text-[#29251d] flex items-center gap-1.5">
                    <Building2 size={16} className="text-[#694737] shrink-0" />
                    <span className="truncate">{l.company_name}</span>
                  </div>
                  <div className="text-xs text-[#443b2f] mt-0.5 flex items-center gap-1.5 font-sans">
                    <a
                      href={l.website_url || `https://${l.domain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#35422d] hover:underline flex items-center gap-1 font-mono text-[11px]"
                    >
                      {l.domain || 'Visit site'} <ExternalLink size={10} />
                    </a>
                    <span>·</span>
                    <span>{l.country || 'Global'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#694737]/10 border border-[#694737]/25 text-[#694737] text-[11px] font-semibold">
                    Fit {l.fit_score}/100
                  </span>
                </div>
              </div>

              {/* Contact & Email */}
              <div className="p-3.5 rounded-[18px_14px_16px_16px] bg-[#eee6d6]/60 border border-[#ddd5c3] space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#29251d] font-medium">{l.contact_name || 'Founder'}</span>
                  <span className="text-[#694737] text-[11px]">{l.contact_title || 'Decision Maker'}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-[#ddd5c3]">
                  <span className="font-mono text-[#443b2f] text-[11px] truncate max-w-[180px]">
                    {l.business_email || 'No email sourced'}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      l.email_status === 'verified'
                        ? 'bg-[#35422d]/15 text-[#35422d] border border-[#35422d]/30'
                        : 'bg-[#ddd5c3] text-[#443b2f]'
                    }`}
                  >
                    <CheckCircle2 size={10} /> {l.email_status}
                  </span>
                </div>
              </div>

              {/* Website Audit Teaser */}
              {l.audit && (
                <div className="text-[11px] text-[#443b2f] flex items-center justify-between bg-[#eee6d6]/40 p-2.5 rounded-xl border border-[#ddd5c3]">
                  <span className="text-[#694737] font-medium">
                    Speed: {l.audit.performance_score}/100
                  </span>
                  <span className="truncate max-w-[180px] text-[#443b2f]">
                    {l.audit.issues_found[0] || 'Modern responsive site'}
                  </span>
                </div>
              )}

              {/* Card Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setSelectedLead(l)}
                  className="py-2 px-3 rounded-[18px_12px_16px_14px] border border-[#ddd5c3] bg-[#eee6d6] hover:bg-[#ddd5c3] text-[#29251d] text-xs font-medium text-center transition-colors"
                >
                  View Details
                </button>
                {l.status === 'sent' || l.status === 'replied' ? (
                  <Link
                    href="/analytics"
                    className="py-2 px-3 rounded-[18px_12px_16px_14px] bg-[#35422d]/15 border border-[#35422d]/30 text-[#35422d] text-xs font-semibold text-center flex items-center justify-center gap-1 transition-colors"
                  >
                    <CheckCircle2 size={12} /> {l.status === 'replied' ? 'Replied' : 'Sent Outbox'}
                  </Link>
                ) : (
                  <button
                    onClick={() => handleAutoDispatchLead(l.id, l.company_name)}
                    disabled={loading}
                    className="py-2 px-3 rounded-[18px_12px_16px_14px] bg-[#694737] hover:bg-[#53372a] text-[#f5eddf] text-xs font-semibold text-center shadow-xs flex items-center justify-center gap-1 transition-all disabled:opacity-50 active:scale-[0.98]"
                    title="Auto-audit, generate email, sign, and dispatch to this company"
                  >
                    <Zap size={12} className="fill-[#ad7d62] text-[#ad7d62]" /> Auto-Send
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* TABLE VIEW (Tablet & Desktop >= 768px, non-scrollable, perfectly fitted) */}
      <div className="hidden md:block rounded-[28px_20px_30px_18px] border border-[#ddd5c3] bg-[#f5eddf] overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs font-sans table-auto">
            <thead className="bg-[#eee6d6] text-[#443b2f] uppercase text-[10px] font-semibold tracking-wider border-b border-[#ddd5c3]">
              <tr>
                <th className="px-5 py-3.5 w-1/4">Company &amp; Market</th>
                <th className="px-4 py-3.5 w-1/4">Decision Maker &amp; Contact</th>
                <th className="px-4 py-3.5">Website Audit</th>
                <th className="px-4 py-3.5 text-center">Fit Score</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ddd5c3]/70">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[#443b2f]">
                    No leads discovered yet. Click "Search New Leads" to begin discovery.
                  </td>
                </tr>
              ) : (
                leads.map((l) => (
                  <tr key={l.id} className="hover:bg-[#eee6d6]/40 transition-colors">
                    {/* Company */}
                    <td className="px-5 py-3.5">
                      <div className="font-serif font-medium text-sm text-[#29251d] flex items-center gap-2">
                        <Building2 size={15} className="text-[#694737] shrink-0" />
                        <span className="truncate">{l.company_name}</span>
                      </div>
                      <div className="text-[11px] text-[#443b2f] mt-0.5 flex items-center gap-1.5 font-sans">
                        <a
                          href={l.website_url || `https://${l.domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#35422d] hover:underline flex items-center gap-1 font-mono text-[11px]"
                        >
                          {l.domain || 'Visit domain'} <ExternalLink size={10} />
                        </a>
                        <span>·</span>
                        <span>{l.country || 'Global'}</span>
                      </div>
                    </td>

                    {/* Decision-Maker & Verified Email */}
                    <td className="px-4 py-3.5">
                      <div className="font-medium text-[#29251d] flex items-center gap-1.5">
                        <span>{l.contact_name || 'Founder'}</span>
                        <span className="text-[10px] text-[#694737] font-normal">({l.contact_title || 'Decision Maker'})</span>
                      </div>
                      <div className="text-[11px] mt-1 flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[#443b2f] text-[10px]">{l.business_email || '—'}</span>
                        <span
                          className={`inline-flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.2 rounded-full ${
                            l.email_status === 'verified'
                              ? 'bg-[#35422d]/15 text-[#35422d] border border-[#35422d]/30'
                              : 'bg-[#ddd5c3] text-[#443b2f]'
                          }`}
                        >
                          <CheckCircle2 size={9} /> {l.email_status}
                        </span>
                      </div>
                    </td>

                    {/* Audit Finding */}
                    <td className="px-4 py-3.5">
                      {l.audit ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-[#eee6d6] text-[#29251d] font-semibold border border-[#ddd5c3]">
                              Score: {l.audit.performance_score}/100
                            </span>
                            <span className="text-[10px] text-[#443b2f] truncate max-w-[100px]">
                              {l.audit.tech_stack.slice(0, 1).join(', ')}
                            </span>
                          </div>
                          <div className="text-[10px] text-[#694737] truncate max-w-[160px]">
                            {l.audit.issues_found[0] || 'Responsive'}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAuditWebsite(l.id)}
                          className="px-2 py-0.5 rounded-[12px_8px_14px_10px] bg-[#eee6d6] hover:bg-[#ddd5c3] text-[#29251d] border border-[#ddd5c3] text-[10px] font-medium"
                        >
                          Run Audit
                        </button>
                      )}
                    </td>

                    {/* Fit Score */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="inline-flex items-center gap-1 font-serif">
                        <span className="font-semibold text-sm text-[#29251d]">{l.fit_score}</span>
                        <span className="text-[10px] text-[#694737]">/100</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#eee6d6] border border-[#ddd5c3] text-[#443b2f] font-medium uppercase">
                        {l.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right whitespace-nowrap space-x-1.5">
                      <button
                        onClick={() => setSelectedLead(l)}
                        className="px-2.5 py-1 rounded-[14px_10px_12px_10px] border border-[#ddd5c3] bg-[#eee6d6] hover:bg-[#ddd5c3] text-[#29251d] text-xs font-medium transition-colors"
                      >
                        View Details
                      </button>
                      {l.status === 'sent' || l.status === 'replied' ? (
                        <Link
                          href="/analytics"
                          className="px-2.5 py-1 rounded-[14px_10px_12px_10px] bg-[#35422d]/15 border border-[#35422d]/30 text-[#35422d] text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <CheckCircle2 size={11} /> {l.status === 'replied' ? 'Replied' : 'Sent'}
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleAutoDispatchLead(l.id, l.company_name)}
                          disabled={loading}
                          className="px-3 py-1 rounded-[18px_12px_16px_10px] bg-[#694737] hover:bg-[#53372a] text-[#f5eddf] text-xs font-semibold shadow-xs inline-flex items-center gap-1 transition-all disabled:opacity-50 active:scale-[0.98]"
                          title="Autonomous: Audit -> Draft -> Approve -> Send"
                        >
                          <Zap size={11} className="fill-[#ad7d62] text-[#ad7d62]" /> Auto-Send
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* IN-PLACE LEAD DETAIL FLYOUT DRAWER */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-[#29251d]/40 backdrop-blur-xs p-0 sm:p-2 md:p-4">
          <div className="w-full max-w-4xl h-full bg-[#f5eddf] sm:rounded-[32px_20px_28px_24px] border-l sm:border border-[#ddd5c3] p-5 sm:p-7 overflow-y-auto space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-[#ddd5c3]">
              <div className="text-xs font-semibold text-[#694737] uppercase tracking-wider flex items-center gap-2 font-sans">
                <Building2 size={16} className="text-[#35422d]" /> Lead Prospect Dossier
              </div>
              <div className="flex items-center gap-2">
                {selectedLead.status !== 'sent' && selectedLead.status !== 'replied' ? (
                  <button
                    onClick={async () => {
                      const id = selectedLead.id;
                      const name = selectedLead.company_name;
                      setSelectedLead(null);
                      await handleAutoDispatchLead(id, name);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[22px_16px_24px_14px] bg-[#694737] hover:bg-[#53372a] text-[#f5eddf] text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
                  >
                    <Zap size={13} className="fill-[#ad7d62] text-[#ad7d62]" /> Auto-Pilot Send Email
                  </button>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#35422d]/15 border border-[#35422d]/30 text-[#35422d] flex items-center gap-1">
                    <CheckCircle2 size={12} /> {selectedLead.status === 'replied' ? 'Replied' : 'Sent'}
                  </span>
                )}
                <button
                  onClick={() => setSelectedLead(null)}
                  className="h-8 w-8 rounded-xl text-[#443b2f] hover:text-[#29251d] hover:bg-[#ddd5c3]/60 flex items-center justify-center transition-colors text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            <LeadDetailsView
              lead={selectedLead}
              onBack={() => setSelectedLead(null)}
              onAuditWebsite={handleAuditWebsite}
              onGenerateDraft={handleGenerateDraft}
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* Internal modal fallback only if external props not provided */}
      {externalShowDiscoverModal === undefined && (
        <DiscoverLeadsModal
          isOpen={internalShowDiscoverModal}
          onClose={() => setInternalShowDiscoverModal(false)}
        />
      )}
    </div>
  );
}
