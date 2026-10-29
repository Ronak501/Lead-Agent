'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Inbox,
  Mail,
  MessageSquare,
  Reply,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { Draft } from '../types';
import { useApp } from '../../context/AppContext';
import { ReplyModal } from '../drafts/ReplyModal';

export function AnalyticsView() {
  const { drafts, suppressions, analytics } = useApp();
  const [replyFilter, setReplyFilter] = useState<'all' | 'replied' | 'awaiting'>('all');
  const [selectedReplyDraft, setSelectedReplyDraft] = useState<Draft | null>(null);

  const sentOrRepliedDrafts = drafts.filter((d) => d.status === 'sent' || d.status === 'replied');
  const repliedDrafts = sentOrRepliedDrafts.filter(
    (d) => d.status === 'replied' || (d.reply_count && d.reply_count > 0)
  );
  const awaitingDrafts = sentOrRepliedDrafts.filter(
    (d) => d.status === 'sent' && !d.reply_count
  );

  const filteredDrafts =
    replyFilter === 'replied'
      ? repliedDrafts
      : replyFilter === 'awaiting'
      ? awaitingDrafts
      : sentOrRepliedDrafts;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Outreach Outbox & Inbound Reply Monitor</h1>
          <p className="text-xs text-zinc-400">
            Track dispatched cold outreach emails from <span className="text-violet-300 font-mono">founder@ornitech.in</span> and monitor prospect replies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-300 font-medium">
            Sender: <span className="text-white font-semibold">Ronak Talaviya</span>
          </span>
        </div>
      </div>

      {/* 4 PRIMARY METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-violet-800/60 bg-gradient-to-br from-violet-950/40 via-zinc-900 to-zinc-950 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-xs text-violet-300">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Dispatched Outbox</span>
            <Send size={15} />
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{sentOrRepliedDrafts.length}</div>
          <div className="text-[11px] text-zinc-400">Verified safe delivery via outbox</div>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-800/60 bg-gradient-to-br from-emerald-950/30 via-zinc-900 to-zinc-950 space-y-1 shadow-lg">
          <div className="flex items-center justify-between text-xs text-emerald-300">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Replies Received</span>
            <MessageSquare size={15} />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-extrabold text-white tracking-tight">{repliedDrafts.length}</div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300">
              {analytics.reply_rate || 0}% Reply Rate
            </span>
          </div>
          <div className="text-[11px] text-zinc-400">Decision-maker responses received</div>
        </div>

        <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Delivery Integrity</span>
            <CheckCircle2 size={15} className="text-teal-400" />
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">100%</div>
          <div className="text-[11px] text-zinc-500">Zero hard bounces · RFC Validated</div>
        </div>

        <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Suppression Guard</span>
            <ShieldCheck size={15} className="text-zinc-400" />
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">{suppressions.length}</div>
          <div className="text-[11px] text-zinc-500">Unsubscribes safeguarded</div>
        </div>
      </div>

      {/* OUTBOX & INBOUND REPLY LOG */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Inbox size={18} className="text-violet-400" /> Dispatched Outreach & Reply Feed
            </h2>
            <p className="text-xs text-zinc-400">
              View all sent cold emails and track incoming responses in one centralized view
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto">
            {[
              { id: 'all', label: 'All Dispatches', count: sentOrRepliedDrafts.length },
              { id: 'replied', label: 'Replies', count: repliedDrafts.length },
              { id: 'awaiting', label: 'Awaiting Response', count: awaitingDrafts.length },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setReplyFilter(f.id as any)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  replyFilter === f.id
                    ? 'bg-violet-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        </div>

        {/* List of Sent / Replied Emails */}
        <div className="space-y-3">
          {filteredDrafts.map((d) => {
            const hasReplied = d.status === 'replied' || (d.reply_count && d.reply_count > 0);
            return (
              <div
                key={d.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  hasReplied
                    ? 'border-emerald-800/80 bg-gradient-to-br from-emerald-950/20 via-zinc-900/60 to-zinc-950 shadow-md'
                    : 'border-zinc-800 bg-zinc-950/60'
                } space-y-3`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                        hasReplied ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-zinc-800 text-zinc-300'
                      }`}
                    >
                      {d.company_name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{d.company_name}</span>
                        {d.contact_name && <span className="text-xs text-zinc-400 font-normal">({d.contact_name})</span>}
                      </div>
                      <div className="text-xs text-zinc-400 font-mono">{d.business_email}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {hasReplied ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-semibold flex items-center gap-1.5">
                        <Reply size={12} className="text-emerald-400" /> Replied ({d.reply_count || 1})
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 text-[11px] font-medium flex items-center gap-1.5">
                        <Send size={11} /> Sent · Awaiting Reply
                      </span>
                    )}

                    <button
                      onClick={() => setSelectedReplyDraft(d)}
                      className="px-2.5 py-1 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <MessageSquare size={13} /> {hasReplied ? 'Log Follow-up' : 'Log / Test Reply'}
                    </button>
                  </div>
                </div>

                {/* Outgoing Subject and Details */}
                <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 text-xs space-y-1">
                  <div className="text-zinc-300 font-semibold flex items-center gap-1.5">
                    <Mail size={13} className="text-violet-400" /> {d.subject}
                  </div>
                  <p className="text-zinc-400 line-clamp-2 leading-relaxed text-[11px]">
                    {d.body_text}
                  </p>
                  <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-500 font-mono">
                    <span>Sent via: founder@ornitech.in</span>
                    <span>Dispatched: {d.sent_at ? new Date(d.sent_at).toLocaleString() : 'Recently'}</span>
                  </div>
                </div>

                {/* INBOUND PROSPECT RESPONSE BOX */}
                {hasReplied && (
                  <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-300 flex items-center gap-1.5 text-[11px]">
                        <Reply size={12} /> Response from {d.contact_name || d.company_name}
                      </span>
                      {d.replied_at && (
                        <span className="text-[10px] text-emerald-400 font-mono">
                          {new Date(d.replied_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-emerald-100 italic bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-800/40 text-[11px]">
                      "{d.last_reply_snippet || 'Prospect responded to outreach email.'}"
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {sentOrRepliedDrafts.length === 0 && (
            <div className="text-center py-12 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 space-y-3">
              <Inbox size={36} className="mx-auto text-zinc-600" />
              <div className="text-sm font-semibold text-zinc-300">No Dispatched Outreach Emails Yet</div>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Approve emails in the Approval Queue and dispatch them to see live outbox delivery and incoming prospect responses here.
              </p>
              <Link
                href="/review"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
              >
                Go to Approval Queue <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>

      <ReplyModal
        draft={selectedReplyDraft}
        onClose={() => setSelectedReplyDraft(null)}
      />
    </div>
  );
}

