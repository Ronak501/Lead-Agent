'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Flame,
  Mail,
  MessageSquare,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface OverviewViewProps {
  onOpenDiscoverModal?: () => void;
  onOpenNewCampaignModal?: () => void;
}

export function OverviewView({ onOpenDiscoverModal, onOpenNewCampaignModal }: OverviewViewProps) {
  const {
    campaigns,
    leads,
    drafts,
    analytics,
    loading,
    handleRunAutonomousPipeline,
    handleBatchAutoDispatch,
  } = useApp();

  const unsentCount = leads.filter((l) => l.status !== 'sent' && l.status !== 'replied').length;
  const pendingReviewCount = drafts.filter((d) => d.status === 'pending_review').length;
  const approvedCount = drafts.filter((d) => d.status === 'approved').length;
  const verifiedContactsCount = leads.filter((l) => l.email_status === 'verified').length;
  const dispatchedCount = drafts.filter((d) => d.status === 'sent' || d.status === 'replied').length;
  const repliedCount = drafts.filter((d) => d.status === 'replied' || (d.reply_count && d.reply_count > 0)).length;

  return (
    <div className="space-y-8 font-sans text-[#29251d]">
      {/* Generous Split Opening (Organic Opening) */}
      <div className="rounded-[32px_22px_36px_18px] border border-[#ddd5c3] bg-[#f5eddf] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm relative overflow-hidden">
        {/* Subtle decorative terracotta and moss organic shapes in background */}
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-[40px_60px_35px_55px] bg-[#ad7d62]/10 pointer-events-none transform rotate-12" />
        <div className="absolute -bottom-16 right-40 w-44 h-44 rounded-[55px_35px_60px_40px] bg-[#35422d]/8 pointer-events-none transform -rotate-6" />

        <div className="space-y-3 max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#35422d]/10 border border-[#35422d]/25 text-[#35422d] text-xs font-semibold">
            <Sparkles size={13} className="text-[#35422d]" /> 100% Autonomous B2B Cold Outreach
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl md:text-4xl font-normal tracking-tight text-[#29251d] leading-tight">
            Find Prospects. Audit Sites. Dispatch Cold Emails Automatically.
          </h1>
          <p className="text-sm text-[#443b2f] leading-relaxed max-w-xl">
            LeadPilot AI automatically discovers qualified prospects, audits their live domains for tech gaps, composes evidence-grounded pitches, and dispatches emails directly. You only check in when high-value replies arrive!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0 relative z-10">
          <button
            onClick={handleRunAutonomousPipeline}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-[27px_19px_29px_16px] bg-[#35422d] hover:bg-[#273320] text-[#f5eddf] text-xs font-semibold shadow-sm transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            <Sparkles size={14} className="fill-[#b9b28b] text-[#b9b28b]" /> Run Autonomous Engine (Discover ➔ Send ➔ Alert)
          </button>
          <button
            onClick={handleBatchAutoDispatch}
            disabled={loading || unsentCount === 0}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-[22px_26px_19px_29px] bg-[#694737] hover:bg-[#53372a] text-[#f5eddf] text-xs font-semibold shadow-sm transition-all disabled:opacity-50 active:scale-[0.98]"
          >
            <Zap size={14} className="fill-[#ad7d62] text-[#ad7d62]" /> Run Company Auto-Pilot ({unsentCount})
          </button>
          <Link
            href="/review"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-[24px_18px_26px_16px] border border-[#35422d]/40 bg-[#eee6d6] hover:bg-[#ddd5c3] text-[#29251d] text-xs font-semibold transition-all text-center"
          >
            <ShieldCheck size={16} className="text-[#35422d]" /> Review Pending Drafts ({pendingReviewCount})
          </Link>
          <Link
            href="/leads"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-[20px_16px_22px_14px] border border-[#ddd5c3] bg-transparent hover:bg-[#ddd5c3]/50 text-[#443b2f] text-xs font-medium transition-all text-center"
          >
            View Discovered Leads <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* OVERVIEW KPI HIERARCHY */}
      <div className="space-y-4">
        {/* TIER 1: HIGH-PRIORITY OPERATIONAL ACTION CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Card 1: Fired Clay Field for Pending Sign-off */}
          <div className="rounded-[28px_20px_30px_18px] bg-[#694737] text-[#f5eddf] p-6 space-y-3.5 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#f5eddf]/15 text-[#f5eddf]">
                  <Mail size={18} />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#ad7d62]">Action Required</span>
              </div>
              <span className="h-2.5 w-2.5 rounded-full bg-[#ad7d62] animate-pulse" />
            </div>
            <div>
              <div className="font-serif text-4xl font-normal tracking-tight text-[#f5eddf]">
                {pendingReviewCount}
              </div>
              <div className="text-sm font-medium text-[#f5eddf]/90 mt-1 font-serif">Pending Sign-off Queue</div>
              <p className="text-xs text-[#f5eddf]/75 mt-1 leading-relaxed">
                Auto-pilot auto-signs &amp; dispatches; manual review is available anytime for verification.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/review"
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-[27px_19px_29px_16px] bg-[#f5eddf] hover:bg-[#eee6d6] text-[#29251d] text-xs font-semibold shadow-xs transition-all text-center"
              >
                <ShieldCheck size={14} className="text-[#694737]" /> Review Approval Queue ({pendingReviewCount})
              </Link>
            </div>
          </div>

          {/* Card 2: Continuous Moss Basin for Ready to Send Outbox */}
          <div className="rounded-[24px_30px_18px_26px] bg-[#35422d] text-[#f5eddf] p-6 space-y-3.5 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#f5eddf]/15 text-[#f5eddf]">
                  <ShieldCheck size={18} />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#b9b28b]">Ready to Send</span>
              </div>
              <span className="text-xs font-mono text-[#b9b28b] font-semibold">SHA-256</span>
            </div>
            <div>
              <div className="font-serif text-4xl font-normal tracking-tight text-[#f5eddf]">
                {approvedCount}
              </div>
              <div className="text-sm font-medium text-[#f5eddf]/90 mt-1 font-serif">Approved & Armed Outbox</div>
              <p className="text-xs text-[#f5eddf]/75 mt-1 leading-relaxed">
                Cryptographically locked drafts verified against suppression blocklists.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/drafts"
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-[27px_19px_29px_16px] bg-[#f5eddf] hover:bg-[#eee6d6] text-[#29251d] text-xs font-semibold shadow-xs transition-all text-center"
              >
                <Send size={13} className="text-[#35422d]" /> View Outbox Drafts ({approvedCount})
              </Link>
            </div>
          </div>

          {/* Card 3: Raised Paper Sheet for Quality Leads */}
          <div className="rounded-[22px_26px_28px_18px] border border-[#ddd5c3] bg-[#f5eddf] p-6 space-y-3.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#eee6d6] text-[#35422d]">
                  <CheckCircle2 size={18} className="text-[#35422d]" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#694737]">Prospect Quality</span>
              </div>
              <span className="text-xs text-[#694737] font-medium">
                {leads.length > 0 ? Math.round((verifiedContactsCount / leads.length) * 100) : 0}% Validated
              </span>
            </div>
            <div>
              <div className="font-serif text-4xl font-normal tracking-tight text-[#29251d]">
                {verifiedContactsCount}
              </div>
              <div className="text-sm font-medium text-[#29251d] mt-1 font-serif">Verified Contacts</div>
              <p className="text-xs text-[#443b2f] mt-1 leading-relaxed">
                RFC & MX checked decision-makers ready for evidence-based outreach.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/leads"
                className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-[27px_19px_29px_16px] border border-[#ddd5c3] bg-[#eee6d6] hover:bg-[#ddd5c3] text-[#29251d] text-xs font-medium transition-colors text-center"
              >
                <Users size={14} className="text-[#694737]" /> Explore Leads ({leads.length})
              </Link>
            </div>
          </div>
        </div>

        {/* TIER 2: PALE FACTS TRAY */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {[
            { label: 'Active Campaigns', value: campaigns.length, icon: Target, detail: 'India & Global targets' },
            { label: 'Dispatched Emails', value: dispatchedCount, icon: Send, detail: 'Dispatched safely via outbox' },
            { label: 'Replies Received', value: repliedCount, icon: MessageSquare, detail: `${analytics.reply_rate || 0}% live reply rate` },
            { label: 'Conversion Ratio', value: `${analytics.conversion_rate || 0}%`, icon: Flame, detail: 'Outreach to lead ratio' },
          ].map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                className="rounded-[20px_16px_22px_14px] border border-[#ddd5c3] bg-[#f5eddf] p-4 space-y-1.5 shadow-2xs hover:border-[#ad7d62]/60 transition-all"
              >
                <div className="flex items-center justify-between text-[#694737] text-xs">
                  <span className="truncate pr-1 text-[11px] font-medium font-sans uppercase tracking-wider">{stat.label}</span>
                  <Icon size={14} className="text-[#ad7d62] shrink-0" />
                </div>
                <div className="font-serif text-2xl sm:text-3xl font-normal text-[#29251d]">{stat.value}</div>
                <div className="text-[11px] text-[#443b2f] truncate">{stat.detail}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Outreach Funnel in Pale Paper Sheet */}
      <div className="rounded-[28px_20px_30px_18px] border border-[#ddd5c3] bg-[#f5eddf] p-5 sm:p-7 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-medium text-[#29251d]">Evidence-Based Prospecting Funnel</h2>
            <p className="text-xs text-[#443b2f]">Pipeline progression from discovery to human-approved delivery & prospect responses</p>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold px-3 py-1 rounded-full bg-[#35422d]/10 border border-[#35422d]/25 text-[#35422d] w-fit">
            100% Evidence Grounded
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-1">
          {[
            { step: '1. Sourced', count: leads.length, color: 'bg-[#eee6d6] text-[#29251d] border-[#ddd5c3]' },
            { step: '2. Audited', count: leads.filter((l) => l.audit).length, color: 'bg-[#eee6d6] text-[#29251d] border-[#ddd5c3]' },
            { step: '3. Drafted', count: drafts.length, color: 'bg-[#eee6d6] text-[#29251d] border-[#ddd5c3]' },
            { step: '4. Approved', count: approvedCount, color: 'bg-[#694737]/15 text-[#694737] border-[#694737]/30' },
            { step: '5. Dispatched', count: dispatchedCount, color: 'bg-[#35422d]/15 text-[#35422d] border-[#35422d]/30' },
            { step: '6. Replied', count: repliedCount, color: 'bg-[#35422d] text-[#f5eddf] border-[#35422d]' },
          ].map((stage, i) => (
            <div key={i} className={`p-3.5 sm:p-4 rounded-[18px_14px_20px_12px] border ${stage.color} space-y-1 text-center`}>
              <div className="text-[11px] sm:text-xs font-medium opacity-90">{stage.step}</div>
              <div className="font-serif text-2xl sm:text-3xl font-normal">{stage.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Section: Campaigns & Quality Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Campaigns Column */}
        <div className="lg:col-span-2 rounded-[28px_20px_30px_18px] border border-[#ddd5c3] bg-[#f5eddf] overflow-hidden shadow-sm">
          <div className="p-5 border-b border-[#ddd5c3] flex items-center justify-between">
            <div>
              <h2 className="font-serif text-base sm:text-lg font-medium text-[#29251d]">Active Prospecting Campaigns</h2>
              <p className="text-xs text-[#443b2f]">Target segments, services, and qualified lead counts</p>
            </div>
            {onOpenNewCampaignModal ? (
              <button
                onClick={onOpenNewCampaignModal}
                className="text-xs text-[#35422d] hover:text-[#273320] font-semibold flex items-center gap-1"
              >
                New Campaign <ArrowUpRight size={14} />
              </button>
            ) : (
              <Link
                href="/campaigns"
                className="text-xs text-[#35422d] hover:text-[#273320] font-semibold flex items-center gap-1"
              >
                View All <ArrowUpRight size={14} />
              </Link>
            )}
          </div>

          <div className="divide-y divide-[#ddd5c3]/70">
            {campaigns.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#443b2f]">No campaigns created yet.</div>
            ) : (
              campaigns.map((c) => (
                <div key={c.id} className="p-5 hover:bg-[#eee6d6]/40 transition-colors flex items-center justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-medium text-base text-[#29251d]">{c.name}</span>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#35422d]/15 text-[#35422d] border border-[#35422d]/30">
                        {c.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[11px] text-[#443b2f]">
                      <span className="text-[#694737] font-medium">Markets:</span>
                      {c.target_markets.map((m, idx) => (
                        <span key={idx} className="bg-[#eee6d6] px-2 py-0.5 rounded-md text-[#29251d]">
                          {m}
                        </span>
                      ))}
                      <span className="text-[#694737] font-medium ml-2">Services:</span>
                      {c.services.slice(0, 2).map((s, idx) => (
                        <span key={idx} className="bg-[#694737]/10 text-[#694737] px-2 py-0.5 rounded-md">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-serif text-sm font-medium text-[#29251d]">{c.leads_count} Leads</div>
                      <div className="text-[11px] text-[#443b2f]">{c.drafts_count} Drafts</div>
                    </div>
                    <Link
                      href="/leads"
                      className="px-3.5 py-1.5 rounded-[18px_12px_16px_14px] bg-[#eee6d6] hover:bg-[#ddd5c3] text-xs font-medium text-[#29251d] border border-[#ddd5c3] transition-colors"
                    >
                      Leads
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quality Safeguards Column in Warm Clay Tone */}
        <div className="rounded-[28px_20px_30px_18px] border border-[#ddd5c3] bg-[#f5eddf] p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#694737]/10 text-[#694737]">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h2 className="font-serif text-base font-medium text-[#29251d]">Outreach Guardrails</h2>
              <p className="text-[11px] text-[#443b2f]">Automated safety verification criteria</p>
            </div>
          </div>

          <div className="space-y-3.5 pt-1">
            {[
              { title: 'Evidence Grounding', desc: 'Every draft references real website findings & source URLs.' },
              { title: 'Email Verification', desc: 'Addresses must be verified by RFC, MX & Hunter before approval.' },
              { title: 'Suppression Checks', desc: 'Pre-send verification blocks opted-out and bounced recipients.' },
              { title: 'Immutable Approval', desc: 'Content changes post-approval immediately invalidate the approval.' },
              { title: 'Master Killswitch', desc: 'Global toggle protects email reputation from unintended sends.' },
            ].map((rule, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs">
                <CheckCircle2 size={16} className="text-[#35422d] shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-[#29251d]">{rule.title}</div>
                  <div className="text-[11px] text-[#443b2f] leading-snug">{rule.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
