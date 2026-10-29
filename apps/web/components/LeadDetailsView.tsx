'use client';

import React from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ExternalLink,
  Globe2,
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
      <div className="rounded-[28px_20px_30px_18px] border border-[#ddd5c3] bg-[#f5eddf] p-12 text-center space-y-4 font-sans text-[#29251d]">
        <Building2 size={40} className="mx-auto text-[#694737]" />
        <h3 className="font-serif text-lg font-medium text-[#29251d]">No Lead Selected</h3>
        <p className="text-xs text-[#443b2f] max-w-sm mx-auto">
          Select a lead from the Discovery table to inspect deep website audit findings, source evidence, and contact provenance.
        </p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[27px_19px_29px_16px] bg-[#35422d] hover:bg-[#273320] text-[#f5eddf] text-xs font-semibold shadow-xs"
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
    <div className="space-y-5 sm:space-y-6 font-sans text-[#29251d]">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs font-medium text-[#443b2f] hover:text-[#29251d] transition-colors w-fit"
        >
          <ArrowLeft size={14} /> Back to Lead Discovery
        </button>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => onAuditWebsite(lead.id)}
            disabled={loading}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-[20px_14px_18px_12px] bg-[#eee6d6] hover:bg-[#ddd5c3] text-[#29251d] text-xs font-medium border border-[#ddd5c3] transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={`text-[#694737] ${loading ? 'animate-spin' : ''}`} />
            Re-Audit Live Website
          </button>
          <button
            onClick={() => onGenerateDraft(lead.id)}
            disabled={loading}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-[27px_19px_29px_16px] bg-[#35422d] hover:bg-[#273320] text-[#f5eddf] text-xs font-semibold shadow-xs transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            <Sparkles size={13} className="text-[#b9b28b]" />
            Generate Draft
          </button>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="rounded-[28px_20px_30px_18px] border border-[#ddd5c3] bg-[#f5eddf] p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-[20px_14px_18px_16px] bg-[#eee6d6] border border-[#ddd5c3] flex items-center justify-center font-serif text-xl sm:text-2xl font-bold text-[#694737] shadow-xs shrink-0">
              {lead.company_name.charAt(0)}
            </div>
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <h1 className="font-serif text-xl sm:text-2xl font-normal text-[#29251d] tracking-tight">{lead.company_name}</h1>
                <span className="text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full bg-[#694737]/10 border border-[#694737]/25 text-[#694737] font-semibold">
                  Fit Score {lead.fit_score}/100
                </span>
                <span className="text-[11px] sm:text-xs px-2.5 py-0.5 rounded-full bg-[#eee6d6] border border-[#ddd5c3] text-[#443b2f] font-medium capitalize">
                  {lead.status}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#443b2f]">
                <span className="flex items-center gap-1.5 font-mono text-[11px]">
                  <Globe2 size={13} className="text-[#694737] shrink-0" />
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
              className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-[18px_12px_16px_14px] bg-[#eee6d6] hover:bg-[#ddd5c3] text-[#29251d] text-xs font-medium border border-[#ddd5c3] transition-colors w-full sm:w-fit"
            >
              Visit Website <ExternalLink size={12} className="text-[#694737]" />
            </a>
          )}
        </div>
      </div>

      {/* Contact Provenance & Decision Maker */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="rounded-[24px_18px_26px_16px] border border-[#ddd5c3] bg-[#f5eddf] p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[#694737] uppercase tracking-wider flex items-center gap-2">
              <UserCheck size={14} className="text-[#35422d]" /> Decision Maker
            </h3>
            <span className="text-[10px] text-[#694737] font-mono">PROVENANCE</span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="font-serif text-base font-medium text-[#29251d]">{lead.contact_name || 'Founder / Executive'}</div>
              <div className="text-xs text-[#443b2f]">{lead.contact_title || 'Chief Executive Officer'}</div>
            </div>

            <div className="p-3.5 rounded-[18px_14px_16px_16px] bg-[#eee6d6]/60 border border-[#ddd5c3] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#443b2f]">Business Email:</span>
                <span className="font-mono text-[#29251d] text-[11px]">{lead.business_email || 'Not enriched'}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#443b2f]">Verification:</span>
                <span
                  className={`flex items-center gap-1 font-medium ${
                    lead.email_status === 'verified'
                      ? 'text-[#35422d]'
                      : lead.email_status === 'valid'
                      ? 'text-[#35422d]'
                      : 'text-[#694737]'
                  }`}
                >
                  {lead.email_status === 'verified' ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                  {lead.email_status}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#443b2f]">Source:</span>
                <span className="text-[#694737]">{lead.source_provider || 'Apollo API / Directory'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Website Audit Overview */}
        <div className="md:col-span-2 rounded-[24px_18px_26px_16px] border border-[#ddd5c3] bg-[#f5eddf] p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-[#694737] uppercase tracking-wider flex items-center gap-2">
              <Zap size={14} className="text-[#ad7d62]" /> Website Analysis & Diagnostics
            </h3>
            {audit && (
              <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-[#eee6d6] border border-[#ddd5c3] text-[#29251d]">
                HTTP {audit.status_code}
              </span>
            )}
          </div>

          {audit ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3.5 rounded-[18px_14px_16px_16px] bg-[#eee6d6]/60 border border-[#ddd5c3]">
                  <div className="text-[#694737] text-[11px] font-medium">Performance Score</div>
                  <div className="font-serif text-xl font-normal text-[#694737] mt-1">{audit.performance_score}/100</div>
                </div>
                <div className="p-3.5 rounded-[18px_14px_16px_16px] bg-[#eee6d6]/60 border border-[#ddd5c3]">
                  <div className="text-[#694737] text-[11px] font-medium">Identified Tech</div>
                  <div className="font-serif text-xl font-normal text-[#29251d] mt-1">{techStack.length} frameworks</div>
                </div>
                <div className="p-3.5 rounded-[18px_14px_16px_16px] bg-[#eee6d6]/60 border border-[#ddd5c3]">
                  <div className="text-[#694737] text-[11px] font-medium">Observations</div>
                  <div className="font-serif text-xl font-normal text-[#29251d] mt-1">{observations.length} items</div>
                </div>
                <div className="p-3.5 rounded-[18px_14px_16px_16px] bg-[#eee6d6]/60 border border-[#ddd5c3]">
                  <div className="text-[#694737] text-[11px] font-medium">Opportunity</div>
                  <div className="text-xs font-semibold text-[#35422d] mt-1 truncate capitalize">
                    {lead.opportunity_type.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>

              {/* Detected Tech Stack Tags */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold text-[#694737]">Detected Tech Stack:</div>
                <div className="flex flex-wrap gap-1.5">
                  {techStack.map((tech, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-0.5 rounded-md bg-[#eee6d6] text-[#29251d] text-xs font-medium border border-[#ddd5c3]"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-xs text-[#443b2f]">
              No audit run yet. Click "Re-Audit Live Website" to crawl the site and analyze opportunities.
            </div>
          )}
        </div>
      </div>

      {/* Observed Issues vs Inferred Opportunities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Strictly Observed Factual Issues */}
        <div className="rounded-[24px_18px_26px_16px] border border-[#ddd5c3] bg-[#f5eddf] p-5 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#694737]">
            <Terminal size={14} /> Observed Technical Observations (Evidence-Backed)
          </div>
          <p className="text-[11px] text-[#443b2f] leading-relaxed">
            Directly inspected from live HTTP response headers, DOM tags, and network timing.
          </p>

          <div className="space-y-2 pt-1">
            {observations.length > 0 ? (
              observations.map((issue, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-[18px_14px_16px_16px] bg-[#eee6d6]/60 border border-[#ddd5c3] text-xs text-[#29251d] flex items-start gap-2.5"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#694737] mt-1.5 shrink-0" />
                  <span>{issue}</span>
                </div>
              ))
            ) : (
              <div className="p-4 rounded-xl bg-[#eee6d6]/40 text-xs text-[#443b2f] text-center">
                No critical website issues detected on initial crawl.
              </div>
            )}
          </div>
        </div>

        {/* Inferred Service Opportunity */}
        <div className="rounded-[24px_18px_26px_16px] border border-[#ddd5c3] bg-[#f5eddf] p-5 space-y-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#35422d]">
            <Sparkles size={14} className="text-[#35422d]" /> Inferred Development Opportunity
          </div>
          <p className="text-[11px] text-[#443b2f] leading-relaxed">
            Hypothesis for client outreach based on target service matches (Website Redesign, Next.js Upgrade, Custom SaaS).
          </p>

          <div className="p-4 rounded-[18px_14px_16px_16px] bg-[#eee6d6]/60 border border-[#ddd5c3] text-xs text-[#29251d] space-y-2">
            <div className="font-serif font-medium text-[#29251d] capitalize">
              Recommended Pitch: {lead.opportunity_type.replace(/_/g, ' ')}
            </div>
            <p className="text-[#443b2f] leading-relaxed">
              {audit?.opportunity_summary ||
                'Modernize existing web presence, improve Core Web Vitals, implement responsive lead capture, and migrate to Next.js.'}
            </p>
          </div>
        </div>
      </div>

      {/* Source Evidence Cards */}
      <div className="rounded-[28px_20px_30px_18px] border border-[#ddd5c3] bg-[#f5eddf] p-5 sm:p-6 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <h3 className="text-xs font-semibold text-[#694737] uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 size={14} className="text-[#35422d] shrink-0" /> Stored Source Evidence ({lead.evidence.length})
          </h3>
          <span className="text-[11px] text-[#443b2f]">Every claim in AI drafts MUST quote from here</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {lead.evidence.map((ev) => (
            <div key={ev.id} className="p-4 rounded-[20px_14px_18px_16px] bg-[#eee6d6]/60 border border-[#ddd5c3] space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="px-2 py-0.5 rounded bg-[#f5eddf] text-[#694737] font-mono border border-[#ddd5c3]">
                  {ev.evidence_type}
                </span>
                <span className="text-[#443b2f] font-mono">Confidence {(ev.confidence * 100).toFixed(0)}%</span>
              </div>
              <p className="text-xs text-[#29251d] leading-relaxed italic">"{ev.excerpt}"</p>
              <div className="flex items-center justify-between text-[10px] text-[#443b2f] pt-1.5 border-t border-[#ddd5c3] gap-2">
                <a
                  href={ev.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#35422d] flex items-center gap-1 truncate max-w-[180px] sm:max-w-[220px]"
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
