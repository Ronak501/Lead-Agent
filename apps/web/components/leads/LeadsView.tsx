'use client';

import React, { useState } from 'react';
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

export function LeadsView() {
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
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);

  const unsentCount = leads.filter((l) => l.status !== 'sent' && l.status !== 'replied').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white">Discovered Leads</h1>
          <p className="text-xs text-zinc-400">All prospects have verified domains, decision makers, and source evidence</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-all"
          >
            <Copy size={13} /> Export CSV
          </button>
          <button
            onClick={() => setShowDiscoverModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-violet-800/60 bg-violet-950/40 hover:bg-violet-900/50 text-violet-300 text-xs font-semibold transition-all"
          >
            <Search size={14} /> Search New Leads
          </button>
          <button
            onClick={handleBatchAutoDispatch}
            disabled={loading || unsentCount === 0}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black text-xs font-bold shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50"
            title="Audit website, generate personalized draft, sign with SHA-256 and send email to all un-contacted companies"
          >
            <Zap size={14} className="fill-black" /> Run Auto-Pilot ({unsentCount})
          </button>
        </div>
      </div>

      {/* MOBILE CARDS VIEW (Phone Screens < 768px) */}
      <div className="block md:hidden space-y-3">
        {leads.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-zinc-800 bg-zinc-900/40 text-xs text-zinc-500">
            No leads discovered yet. Click "Search New Leads" to begin discovery.
          </div>
        ) : (
          leads.map((l) => (
            <div
              key={l.id}
              className="p-4 rounded-2xl border border-zinc-800/90 bg-zinc-900/60 space-y-3 shadow-sm hover:border-zinc-700 transition-all"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-sm text-zinc-100 flex items-center gap-1.5">
                    <Building2 size={15} className="text-violet-400 shrink-0" />
                    <span className="truncate">{l.company_name}</span>
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
                    <a
                      href={l.website_url || `https://${l.domain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-violet-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                    >
                      {l.domain || 'Visit site'} <ExternalLink size={10} />
                    </a>
                    <span>·</span>
                    <span>{l.country || 'Global'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2 py-0.5 rounded-full bg-violet-950/80 border border-violet-800/80 text-violet-300 text-[11px] font-semibold">
                    Fit {l.fit_score}/100
                  </span>
                </div>
              </div>

              {/* Contact & Email */}
              <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/60 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-200 font-medium">{l.contact_name || 'Founder'}</span>
                  <span className="text-zinc-500 text-[11px]">{l.contact_title || 'Decision Maker'}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-zinc-900">
                  <span className="font-mono text-zinc-300 text-[11px] truncate max-w-[180px]">
                    {l.business_email || 'No email sourced'}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      l.email_status === 'verified'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    <CheckCircle2 size={10} /> {l.email_status}
                  </span>
                </div>
              </div>

              {/* Website Audit Teaser */}
              {l.audit && (
                <div className="text-[11px] text-zinc-400 flex items-center justify-between bg-zinc-950/40 p-2 rounded-lg border border-zinc-800/40">
                  <span className="text-amber-400 font-medium">
                    Speed: {l.audit.performance_score}/100
                  </span>
                  <span className="truncate max-w-[180px] text-zinc-500">
                    {l.audit.issues_found[0] || 'Modern responsive site'}
                  </span>
                </div>
              )}

              {/* Card Action Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setSelectedLead(l)}
                  className="py-2 px-3 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium text-center transition-colors"
                >
                  View Details
                </button>
                {l.status === 'sent' || l.status === 'replied' ? (
                  <Link
                    href="/analytics"
                    className="py-2 px-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold text-center flex items-center justify-center gap-1 transition-colors"
                  >
                    <CheckCircle2 size={12} /> {l.status === 'replied' ? 'Replied' : 'Sent Outbox'}
                  </Link>
                ) : (
                  <button
                    onClick={() => handleAutoDispatchLead(l.id, l.company_name)}
                    disabled={loading}
                    className="py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black text-xs font-bold text-center shadow-sm shadow-orange-500/20 flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                    title="Auto-audit, generate email, sign, and dispatch to this company"
                  >
                    <Zap size={12} className="fill-black" /> Auto-Send
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* TABLE VIEW (Tablet & Desktop >= 768px) */}
      <div className="hidden md:block rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 text-zinc-400 uppercase font-semibold border-b border-zinc-800">
              <tr>
                <th className="px-5 py-3.5">Company & Market</th>
                <th className="px-5 py-3.5">Decision-Maker</th>
                <th className="px-5 py-3.5">Verified Email</th>
                <th className="px-5 py-3.5">Website Audit</th>
                <th className="px-5 py-3.5">Fit Score</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-zinc-500">
                    No leads discovered yet. Click "Search New Leads" to begin discovery.
                  </td>
                </tr>
              ) : (
                leads.map((l) => (
                  <tr key={l.id} className="hover:bg-zinc-800/30 transition-colors">
                    {/* Company */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-zinc-100 flex items-center gap-2">
                        <Building2 size={15} className="text-zinc-500" />
                        {l.company_name}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1.5">
                        <a
                          href={l.website_url || `https://${l.domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-violet-400 hover:underline flex items-center gap-1"
                        >
                          {l.domain || 'Visit domain'} <ExternalLink size={10} />
                        </a>
                        <span>·</span>
                        <span>{l.country || 'Global'}</span>
                      </div>
                    </td>

                    {/* Decision-Maker */}
                    <td className="px-5 py-4">
                      <div className="font-medium text-zinc-200">{l.contact_name || 'Founder'}</div>
                      <div className="text-[11px] text-zinc-400">{l.contact_title || 'Decision Maker'}</div>
                    </td>

                    {/* Email */}
                    <td className="px-5 py-4">
                      <div className="font-mono text-zinc-300">{l.business_email || '—'}</div>
                      <div className="mt-0.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            l.email_status === 'verified'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          <CheckCircle2 size={10} /> {l.email_status}
                        </span>
                      </div>
                    </td>

                    {/* Audit Finding */}
                    <td className="px-5 py-4">
                      {l.audit ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300 font-semibold">
                              Score: {l.audit.performance_score}/100
                            </span>
                            <span className="text-[11px] text-zinc-400">
                              {l.audit.tech_stack.slice(0, 2).join(', ')}
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-500 truncate max-w-xs">
                            {l.audit.issues_found[0] || 'Modern site'}
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAuditWebsite(l.id)}
                          className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium"
                        >
                          Run Live Audit
                        </button>
                      )}
                    </td>

                    {/* Fit Score */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-sm text-zinc-100">{l.fit_score}</span>
                        <span className="text-[10px] text-zinc-500">/100</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-medium">
                        {l.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedLead(l)}
                        className="px-2.5 py-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-medium"
                      >
                        View Details
                      </button>
                      {l.status === 'sent' || l.status === 'replied' ? (
                        <Link
                          href="/analytics"
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-semibold inline-flex items-center gap-1"
                        >
                          <CheckCircle2 size={12} /> {l.status === 'replied' ? 'Replied' : 'Sent'}
                        </Link>
                      ) : (
                        <button
                          onClick={() => handleAutoDispatchLead(l.id, l.company_name)}
                          disabled={loading}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold shadow-sm shadow-orange-500/20 inline-flex items-center gap-1 transition-all disabled:opacity-50"
                          title="Autonomous: Audit -> Draft -> Approve -> Send"
                        >
                          <Zap size={12} className="fill-black" /> Auto-Send
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
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/75 backdrop-blur-sm p-0 sm:p-2 md:p-4">
          <div className="w-full max-w-4xl h-full bg-zinc-950 sm:rounded-2xl border-l sm:border border-zinc-800 p-4 sm:p-6 overflow-y-auto space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Building2 size={16} className="text-violet-400" /> Lead Prospect Dossier
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
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black text-xs font-bold shadow-md shadow-orange-500/20 transition-all"
                  >
                    <Zap size={13} className="fill-black" /> Auto-Pilot Send Email
                  </button>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 size={12} /> {selectedLead.status === 'replied' ? 'Replied' : 'Sent'}
                  </span>
                )}
                <button
                  onClick={() => setSelectedLead(null)}
                  className="h-8 w-8 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors text-sm"
                  title="Close Dossier"
                >
                  ✕
                </button>
              </div>
            </div>
            <LeadDetailsView
              lead={selectedLead}
              onBack={() => setSelectedLead(null)}
              onAuditWebsite={handleAuditWebsite}
              onGenerateDraft={(leadId) => {
                handleGenerateDraft(leadId);
                setSelectedLead(null);
              }}
              loading={loading}
            />
          </div>
        </div>
      )}

      <DiscoverLeadsModal
        isOpen={showDiscoverModal}
        onClose={() => setShowDiscoverModal(false)}
      />
    </div>
  );
}

