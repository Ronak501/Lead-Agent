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
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

function formatTimeAgo(dateString?: string | null) {
  if (!dateString) return 'Just now';
  const date = new Date(dateString);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffSec < 60) return `${Math.max(1, diffSec)}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${Math.floor(diffHour / 24)}d ago`;
}

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
    agentActivities,
    agentStatus,
    agentLastRun,
    dailyPace,
    fetchAgentActivities,
    loading,
    handleRunAutonomousPipeline,
  } = useApp();

  const pendingReviewCount = drafts.filter((d) => d.status === 'pending_review').length;
  const approvedCount = drafts.filter((d) => d.status === 'approved').length;
  const verifiedContactsCount = leads.filter((l) => l.email_status === 'verified').length;
  const dispatchedCount = drafts.filter((d) => d.status === 'sent' || d.status === 'replied').length;
  const repliedCount = drafts.filter((d) => d.status === 'replied' || (d.reply_count && d.reply_count > 0)).length;

  return (
    <div className="space-y-6 font-sans text-[#29251d]">
      {/* AUTOPILOT ENGINE LIVE STATUS BANNER */}
      <div className="rounded-[24px_18px_22px_16px] border border-[#ddd5c3] bg-[#eee6d6]/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#35422d] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#35422d]"></span>
          </span>
          <div>
            <span className="font-semibold text-[#29251d]">Autonomous Prospecting Engine: Active</span>
            <span className="text-[#443b2f] ml-2 hidden md:inline">
              Running every 15 mins &bull; Live SMTP: <strong className="text-[#29251d]">founder@ornitech.in</strong> &bull; Anti-Spam De-duplication Active
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/integrations"
            className="px-3 py-1.5 rounded-[14px_10px_12px_10px] bg-[#f5eddf] hover:bg-[#ddd5c3] text-[#29251d] text-xs font-medium border border-[#ddd5c3] transition-colors"
          >
            Integrations
          </Link>
          <button
            onClick={handleRunAutonomousPipeline}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-[14px_10px_12px_10px] bg-[#35422d] hover:bg-[#273320] text-[#f5eddf] text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Sparkles size={12} className="text-[#b9b28b]" /> Run Cycle Now
          </button>
        </div>
      </div>

      {/* DAILY SENDING PACE & WARMUP SAFEGUARD */}
      {dailyPace && (
        <div className="rounded-[24px_18px_22px_16px] border border-[#ddd5c3] bg-[#f5eddf] p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#35422d]/10 text-[#35422d]">
                <ShieldCheck size={16} />
              </span>
              <div>
                <span className="text-xs font-semibold text-[#29251d]">Daily Warmup &amp; Deliverability Safeguard</span>
                <span className="text-[11px] text-[#443b2f] ml-2">
                  Sender: <strong className="text-[#29251d]">{dailyPace.sender_email}</strong> ({dailyPace.warmup_mode ? 'Safe Warmup Pacing' : 'Standard Rate'})
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="font-semibold text-[#29251d]">{dailyPace.sent_today} / {dailyPace.daily_limit} Sent Today</span>
              <span className="text-[#35422d] bg-[#35422d]/10 px-2.5 py-0.5 rounded-full font-medium">
                {dailyPace.safe_remaining} Safe Remaining
              </span>
            </div>
          </div>

          <div className="w-full bg-[#eee6d6] rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                dailyPace.percentage > 90 ? 'bg-[#ad7d62]' : 'bg-[#35422d]'
              }`}
              style={{ width: `${dailyPace.percentage}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#443b2f]">
            <div className="flex items-center gap-4">
              <span>🚀 Stagger Interval: <strong>{dailyPace.stagger_delay_seconds}s between dispatches</strong></span>
              <span>🔒 Status: <strong className="text-[#35422d] capitalize">{dailyPace.status}</strong></span>
              <span className="hidden md:inline">📅 Calendar Booking Auto-Responder: <strong className="text-[#35422d]">https://cal.com/ornitech/intro</strong></span>
            </div>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-[#694737]">
              Zero Spam Flag Guarantee
            </span>
          </div>
        </div>
      )}

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

      {/* 24/7 AUTONOMOUS AGENT LIVE STREAM (EXPLEE-STYLE REAL-TIME PULSE) */}
      <div className="rounded-[28px_20px_30px_18px] border border-[#ddd5c3] bg-[#f5eddf] p-5 sm:p-6 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#ddd5c3] pb-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#35422d] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#35422d]"></span>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg font-medium text-[#29251d]">Autonomous Agent Live Stream</h2>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-[#35422d]/15 text-[#35422d] border border-[#35422d]/30">
                  {agentStatus.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-[#443b2f]">
                Live feed of automated prospect discoveries, website audits, AI pitches, and inbound meeting bookings
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] text-[#443b2f] hidden lg:inline">
              Cycle runs every 15 min {agentLastRun && `(Last: ${formatTimeAgo(agentLastRun)})`}
            </span>
            <button
              onClick={() => fetchAgentActivities()}
              className="p-1.5 rounded-[12px] bg-[#eee6d6] hover:bg-[#ddd5c3] text-[#29251d] text-xs font-medium border border-[#ddd5c3] transition-colors"
              title="Refresh Activity Feed"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={handleRunAutonomousPipeline}
              disabled={loading}
              className="px-3 py-1.5 rounded-[14px_10px_12px_10px] bg-[#35422d] hover:bg-[#273320] text-[#f5eddf] text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Sparkles size={12} className="text-[#b9b28b]" /> Run Cycle Now
            </button>
          </div>
        </div>

        {agentActivities.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#443b2f]">
            Waiting for agent activity. The background worker evaluates active campaigns every 15 minutes.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
            {agentActivities.slice(0, 10).map((act) => {
              const isDispatch = act.type === 'dispatch';
              const isAudit = act.type === 'audit';
              const isDiscovery = act.type === 'discovery';
              const isReply = act.type === 'reply';
              const isSuppression = act.type === 'suppression';

              return (
                <div
                  key={act.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-[16px_12px_14px_10px] bg-[#eee6d6]/60 border border-[#ddd5c3]/80 hover:bg-[#eee6d6] transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`p-2 rounded-xl shrink-0 mt-0.5 text-xs ${
                        isDispatch
                          ? 'bg-[#35422d]/15 text-[#35422d]'
                          : isAudit
                          ? 'bg-[#694737]/15 text-[#694737]'
                          : isDiscovery
                          ? 'bg-[#ad7d62]/15 text-[#ad7d62]'
                          : isReply
                          ? 'bg-[#35422d] text-[#f5eddf]'
                          : 'bg-[#443b2f]/15 text-[#443b2f]'
                      }`}
                    >
                      {isDispatch && <Send size={14} />}
                      {isAudit && <CheckCircle2 size={14} />}
                      {isDiscovery && <Target size={14} />}
                      {isReply && <Flame size={14} />}
                      {isSuppression && <ShieldAlert size={14} />}
                    </span>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-[#29251d]">{act.title}</span>
                        {act.badge && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#f5eddf] border border-[#ddd5c3] text-[#443b2f]">
                            {act.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#443b2f] leading-relaxed">{act.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-[10px] text-[#694737] font-medium whitespace-nowrap">
                      {formatTimeAgo(act.timestamp)}
                    </span>
                    {act.link && (
                      <Link
                        href={act.link}
                        className="text-[11px] text-[#35422d] hover:text-[#273320] font-medium inline-flex items-center gap-0.5"
                      >
                        View <ArrowUpRight size={11} />
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
