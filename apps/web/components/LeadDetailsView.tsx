'use client';

import React from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ExternalLink,
  Flame,
  Globe2,
  Mail,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  UserCheck,
  Zap,
} from 'lucide-react';
import { Lead } from './types';

interface LeadDetailsViewProps {
  lead: Lead | null;
  onBack: () => void;
  onAuditWebsite: (leadId: string) => void;
  onGenerateDraft: (leadId: string) => void;
  onSelectLeadForDraft?: (lead: Lead) => void;
  loading: boolean;
}

export const LeadDetailsView: React.FC<LeadDetailsViewProps> = ({
  lead,
  onBack,
  onAuditWebsite,
  onGenerateDraft,
  loading,
}) => {
  if (!lead) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-12 text-center space-y-4">
        <Building2 size={40} className="mx-auto text-zinc-600" />
        <h3 className="text-base font-semibold text-zinc-300">No Lead Selected</h3>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          Select a lead from the Discovery table to inspect deep website audit findings, source evidence, and contact provenance.
        </p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
        >
          <ArrowLeft size={14} /> Back to Leads
        </button>
      </div>
    );
  }

  const audit = lead.audit;
  const observations = audit?.issues_found || [];
  const techStack = audit?.tech_stack || [];

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors w-fit"
        >
          <ArrowLeft size={14} /> Back to Lead Discovery
        </button>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => onAuditWebsite(lead.id)}
            disabled={loading}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-medium border border-zinc-700/60 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            Re-Audit Live Website
          </button>
          <button
            onClick={() => onGenerateDraft(lead.id)}
            disabled={loading}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/20 transition-all disabled:opacity-50"
          >
            <Sparkles size={13} />
            Generate Draft
          </button>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5 sm:gap-4">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg sm:text-xl font-bold text-violet-400 shadow-inner shrink-0">
              {lead.company_name.charAt(0)}
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">{lead.company_name}</h1>
                <span className="text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full bg-violet-950/80 border border-violet-800/80 text-violet-300 font-semibold">
                  Fit Score {lead.fit_score}/100
                </span>
                <span className="text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-medium capitalize">
                  {lead.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Globe2 size={13} className="text-zinc-500 shrink-0" />
                  <span className="truncate max-w-[150px] sm:max-w-none">{lead.domain || 'No domain'}</span>
                </span>
                <span>·</span>
                <span>{lead.industry || 'Technology'}</span>
                <span>·</span>
                <span>{lead.country || 'Global'}</span>
              </div>
            </div>
          </div>

          {lead.website_url && (
            <a
              href={lead.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-700/50 transition-colors w-full sm:w-fit"
            >
              Visit Website <ExternalLink size={12} />
            </a>
          )}
        </div>
      </div>

      {/* Contact Provenance & Decision Maker */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <UserCheck size={14} className="text-violet-400" /> Decision Maker
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono">PROVENANCE</span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-sm font-semibold text-zinc-100">{lead.contact_name || 'Founder / Executive'}</div>
              <div className="text-xs text-zinc-400">{lead.contact_title || 'Chief Executive Officer'}</div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Business Email:</span>
                <span className="font-mono text-zinc-300">{lead.business_email || 'Not enriched'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Verification:</span>
                <span
                  className={`flex items-center gap-1 font-medium ${
                    lead.email_status === 'verified'
                      ? 'text-emerald-400'
                      : lead.email_status === 'valid'
                      ? 'text-blue-400'
                      : 'text-amber-400'
                  }`}
                >
                  {lead.email_status === 'verified' ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                  {lead.email_status}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">Source:</span>
                <span className="text-zinc-400">{lead.source_provider || 'Apollo API / Directory'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Website Audit Overview */}
        <div className="md:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
              <Zap size={14} className="text-amber-400" /> Website Analysis & Diagnostics
            </h3>
            {audit && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                HTTP {audit.status_code}
              </span>
            )}
          </div>

          {audit ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <div className="text-zinc-500 text-[11px]">Performance Score</div>
                  <div className="text-base font-bold text-amber-400 mt-1">{audit.performance_score}/100</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <div className="text-zinc-500 text-[11px]">Identified Tech</div>
                  <div className="text-base font-bold text-zinc-200 mt-1">{techStack.length} frameworks</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <div className="text-zinc-500 text-[11px]">Observations</div>
                  <div className="text-base font-bold text-zinc-200 mt-1">{observations.length} items</div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <div className="text-zinc-500 text-[11px]">Opportunity</div>
                  <div className="text-xs font-semibold text-violet-400 mt-1 truncate capitalize">
                    {lead.opportunity_type.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>

              {/* Detected Tech Stack Tags */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-zinc-400">Detected Tech Stack:</div>
                <div className="flex flex-wrap gap-1.5">
                  {techStack.map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-700/60"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-zinc-500">
              No audit run yet. Click "Re-Audit Live Website" to crawl the site and analyze opportunities.
            </div>
          )}
        </div>
      </div>

      {/* Observed Issues vs Inferred Opportunities (Clearly Labeled Separately) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strictly Observed Factual Issues */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
            <Terminal size={14} /> Observed Technical Observations (Evidence-Backed)
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Directly inspected from live HTTP response headers, DOM tags, and network timing.
          </p>

          <div className="space-y-2 pt-1">
            {observations.length > 0 ? (
              observations.map((issue, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-zinc-950/70 border border-rose-900/30 text-xs text-zinc-300 flex items-start gap-2.5"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                  <span>{issue}</span>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl bg-zinc-950/50 text-xs text-zinc-500 text-center">
                No critical website issues detected on initial crawl.
              </div>
            )}
          </div>
        </div>

        {/* Inferred Service Opportunity */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-violet-400">
            <Sparkles size={14} /> Inferred Development Opportunity
          </div>
          <p className="text-[11px] text-zinc-500 leading-relaxed">
            Hypothesis for client outreach based on target service matches (Website Redesign, Next.js Upgrade, Custom SaaS).
          </p>

          <div className="p-4 rounded-xl bg-zinc-950/70 border border-violet-900/30 text-xs text-zinc-300 space-y-2">
            <div className="font-semibold text-violet-300 capitalize">
              Recommended Pitch: {lead.opportunity_type.replace(/_/g, ' ')}
            </div>
            <p className="text-zinc-400 leading-relaxed">
              {audit?.opportunity_summary ||
                'Modernize existing web presence, improve Core Web Vitals, implement responsive lead capture, and migrate to Next.js.'}
            </p>
          </div>
        </div>
      </div>

      {/* Source Evidence Cards */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h3 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-400 shrink-0" /> Stored Source Evidence ({lead.evidence.length})
          </h3>
          <span className="text-[11px] text-zinc-500">Every claim in AI drafts MUST quote from here</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          {lead.evidence.map((ev) => (
            <div key={ev.id} className="p-3.5 sm:p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                  {ev.evidence_type}
                </span>
                <span className="text-zinc-500 font-mono">Confidence {(ev.confidence * 100).toFixed(0)}%</span>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed italic">"{ev.excerpt}"</p>
              <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/80 gap-2">
                <a
                  href={ev.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-violet-400 flex items-center gap-1 truncate max-w-[180px] sm:max-w-[220px]"
                >
                  {ev.source_url} <ExternalLink size={10} className="shrink-0" />
                </a>
                <span className="shrink-0">{new Date(ev.observed_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
