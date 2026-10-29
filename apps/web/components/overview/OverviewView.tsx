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
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="rounded-2xl border border-violet-800/40 bg-gradient-to-r from-violet-950/40 via-zinc-900 to-indigo-950/30 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-semibold">
            <Sparkles size={13} /> Evidence-Based B2B Cold Outreach
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Find Real Opportunities. Verify Evidence. Approve Every Email.
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl">
            LeadPilot AI checks real public websites for performance, mobile usability, and tech stack gaps, generating fact-grounded pitches that require your explicit approval before sending.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
          <button
            onClick={handleRunAutonomousPipeline}
            disabled={loading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black text-xs font-bold shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
          >
            <Sparkles size={14} className="fill-black" /> Run Autonomous Engine (Discover ➔ Send ➔ Alert)
          </button>
          <button
            onClick={handleBatchAutoDispatch}
            disabled={loading || unsentCount === 0}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black text-xs font-bold shadow-lg shadow-orange-500/25 transition-all disabled:opacity-50"
          >
            <Zap size={14} className="fill-black" /> Run Company Auto-Pilot ({unsentCount})
          </button>
          <Link
            href="/review"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/30 transition-all text-center"
          >
            <ShieldCheck size={16} /> Review Pending Drafts ({pendingReviewCount})
          </Link>
          <Link
            href="/leads"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-all text-center"
          >
            View Discovered Leads <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* OVERVIEW KPI HIERARCHY */}
      <div className="space-y-4">
        {/* TIER 1: HIGH-PRIORITY OPERATIONAL ACTION CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Pending Human Review */}
          <div className="rounded-2xl border border-violet-800/60 bg-gradient-to-br from-violet-950/40 via-zinc-900 to-zinc-950 p-5 space-y-3 shadow-lg relative overflow-hidden group hover:border-violet-600/80 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-violet-600/20 text-violet-300 border border-violet-500/30">
                  <Mail size={18} />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-violet-300">Action Required</span>
              </div>
              <span className="h-2.5 w-2.5 rounded-full bg-violet-400 animate-pulse" />
            </div>
            <div>
              <div className="text-3xl font-extrabold text-white tracking-tight">{pendingReviewCount}</div>
              <div className="text-xs font-medium text-zinc-300 mt-0.5">Pending Sign-off Queue</div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Individual human approval required before cold emails can dispatch.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/review"
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/20 transition-all text-center"
              >
                <ShieldCheck size={14} /> Review Approval Queue ({pendingReviewCount})
              </Link>
            </div>
          </div>

          {/* Card 2: Approved Outbox */}
          <div className="rounded-2xl border border-emerald-800/50 bg-gradient-to-br from-emerald-950/30 via-zinc-900 to-zinc-950 p-5 space-y-3 shadow-lg relative overflow-hidden group hover:border-emerald-600/70 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30">
                  <ShieldCheck size={18} />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Ready to Send</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-semibold">SHA-256</span>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-white tracking-tight">{approvedCount}</div>
              <div className="text-xs font-medium text-zinc-300 mt-0.5">Approved & Armed Outbox</div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Cryptographically locked drafts verified against suppression blocklists.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/drafts"
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow-md shadow-emerald-700/20 transition-all text-center"
              >
                <Send size={13} /> View Outbox Drafts ({approvedCount})
              </Link>
            </div>
          </div>

          {/* Card 3: Verified Contacts Pipeline */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3 shadow-lg hover:border-zinc-700 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-zinc-800 text-zinc-300">
                  <CheckCircle2 size={18} className="text-blue-400" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Prospect Quality</span>
              </div>
              <span className="text-[11px] text-zinc-500">
                {leads.length > 0 ? Math.round((verifiedContactsCount / leads.length) * 100) : 0}% Validated
              </span>
            </div>
            <div>
              <div className="text-3xl font-extrabold text-white tracking-tight">{verifiedContactsCount}</div>
              <div className="text-xs font-medium text-zinc-300 mt-0.5">Verified Contacts</div>
              <p className="text-[11px] text-zinc-400 mt-1">
                RFC & MX checked decision-makers ready for evidence-based outreach.
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/leads"
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-medium transition-colors text-center"
              >
                <Users size={14} /> Explore Leads ({leads.length})
              </Link>
            </div>
          </div>
        </div>

        {/* TIER 2: SECONDARY PIPELINE PULSE & HISTORICAL COUNTERS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
                className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5 space-y-1.5 hover:border-zinc-700/80 transition-all"
              >
                <div className="flex items-center justify-between text-zinc-400 text-xs">
                  <span className="truncate pr-1 text-[11px] font-medium">{stat.label}</span>
                  <Icon size={14} className="text-zinc-500 shrink-0" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-[10px] text-zinc-500 truncate">{stat.detail}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Live Outreach Funnel */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-white">Evidence-Based Prospecting Funnel</h2>
            <p className="text-xs text-zinc-500">Pipeline progression from discovery to human-approved delivery & prospect responses</p>
          </div>
          <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-950 border border-violet-800 text-violet-300 w-fit">
            100% Evidence Grounded
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 sm:gap-3 pt-2">
          {[
            { step: '1. Sourced', count: leads.length, color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
            { step: '2. Audited', count: leads.filter((l) => l.audit).length, color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
            { step: '3. Drafted', count: drafts.length, color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
            { step: '4. Approved', count: approvedCount, color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
            { step: '5. Dispatched', count: dispatchedCount, color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
            { step: '6. Replied', count: repliedCount, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
          ].map((stage, i) => (
            <div key={i} className={`p-3 sm:p-4 rounded-xl border ${stage.color} space-y-1 text-center`}>
              <div className="text-[11px] sm:text-xs font-medium opacity-80">{stage.step}</div>
              <div className="text-xl sm:text-2xl font-bold">{stage.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Section: Campaigns & Quality Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Campaigns Column */}
        <div className="lg:col-span-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden">
          <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Active Prospecting Campaigns</h2>
              <p className="text-xs text-zinc-500">Target segments, services, and qualified lead counts</p>
            </div>
            {onOpenNewCampaignModal ? (
              <button
                onClick={onOpenNewCampaignModal}
                className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1"
              >
                New Campaign <ArrowUpRight size={14} />
              </button>
            ) : (
              <Link
                href="/campaigns"
                className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1"
              >
                View All <ArrowUpRight size={14} />
              </Link>
            )}
          </div>

          <div className="divide-y divide-zinc-800/60">
            {campaigns.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500">No campaigns created yet.</div>
            ) : (
              campaigns.map((c) => (
                <div key={c.id} className="p-5 hover:bg-zinc-800/20 transition-colors flex items-center justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-zinc-100">{c.name}</span>
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                        {c.status}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 text-[11px] text-zinc-400">
                      <span className="text-zinc-500">Markets:</span>
                      {c.target_markets.map((m, idx) => (
                        <span key={idx} className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">
                          {m}
                        </span>
                      ))}
                      <span className="text-zinc-500 ml-2">Services:</span>
                      {c.services.slice(0, 2).map((s, idx) => (
                        <span key={idx} className="bg-violet-950/60 text-violet-300 px-1.5 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-semibold text-zinc-200">{c.leads_count} Leads</div>
                      <div className="text-[11px] text-zinc-500">{c.drafts_count} Drafts</div>
                    </div>
                    <Link
                      href="/leads"
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors"
                    >
                      Leads
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quality Safeguards Column */}
        <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert size={18} className="text-violet-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">Outreach Guardrails</h2>
              <p className="text-[11px] text-zinc-500">Automated safety verification criteria</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { title: 'Evidence Grounding', desc: 'Every draft references real website findings & source URLs.' },
              { title: 'Email Verification', desc: 'Addresses must be verified by RFC, MX & Hunter before approval.' },
              { title: 'Suppression Checks', desc: 'Pre-send verification blocks opted-out and bounced recipients.' },
              { title: 'Immutable Approval', desc: 'Content changes post-approval immediately invalidate the approval.' },
              { title: 'Master Killswitch', desc: 'Global toggle protects email reputation from unintended sends.' },
            ].map((rule, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs">
                <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-zinc-200">{rule.title}</div>
                  <div className="text-[11px] text-zinc-500 leading-snug">{rule.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

