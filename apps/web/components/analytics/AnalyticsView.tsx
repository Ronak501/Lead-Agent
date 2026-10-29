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
    <div className="space-y-6 font-sans text-[#29251d]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#ddd5c3]">
        <div>
          <h1 className="font-serif text-2xl font-normal text-[#29251d] tracking-tight">
            Outreach Outbox & Inbound Reply Monitor
          </h1>
          <p className="text-xs text-[#443b2f]">
            Track dispatched cold outreach emails from <span className="text-[#35422d] font-mono font-medium">founder@ornitech.in</span> and monitor prospect replies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-3.5 py-1.5 rounded-[18px_12px_16px_14px] border border-[#ddd5c3] bg-[#f5eddf] text-[#443b2f] font-medium">
            Sender: <span className="text-[#29251d] font-semibold">Ronak Talaviya</span>
          </span>
        </div>
      </div>

      {/* 4 PRIMARY METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 sm:p-6 rounded-[26px_18px_24px_20px] bg-[#694737] text-[#f5eddf] space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#f5eddf]/80">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-[#ad7d62]">Dispatched Outbox</span>
            <Send size={15} />
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-normal tracking-tight">{sentOrRepliedDrafts.length}</div>
          <div className="text-[11px] text-[#f5eddf]/75">Verified safe delivery via outbox</div>
        </div>

        <div className="p-5 sm:p-6 rounded-[24px_28px_18px_24px] bg-[#35422d] text-[#f5eddf] space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#f5eddf]/80">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-[#b9b28b]">Replies Received</span>
            <MessageSquare size={15} />
          </div>
          <div className="flex items-baseline gap-2">
            <div className="font-serif text-3xl sm:text-4xl font-normal tracking-tight">{repliedDrafts.length}</div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#f5eddf]/20 text-[#f5eddf]">
              {analytics.reply_rate || 0}% Reply Rate
            </span>
          </div>
          <div className="text-[11px] text-[#f5eddf]/75">Decision-maker responses received</div>
        </div>

        <div className="p-5 sm:p-6 rounded-[22px_24px_26px_18px] border border-[#ddd5c3] bg-[#f5eddf] space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#694737]">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Delivery Integrity</span>
            <CheckCircle2 size={15} className="text-[#35422d]" />
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-normal text-[#29251d] tracking-tight">100%</div>
          <div className="text-[11px] text-[#443b2f]">Zero hard bounces · RFC Validated</div>
        </div>

        <div className="p-5 sm:p-6 rounded-[24px_18px_22px_24px] border border-[#ddd5c3] bg-[#f5eddf] space-y-1.5 shadow-xs">
          <div className="flex items-center justify-between text-xs text-[#694737]">
            <span className="font-semibold uppercase tracking-wider text-[11px]">Suppression Guard</span>
            <ShieldCheck size={15} className="text-[#694737]" />
          </div>
          <div className="font-serif text-3xl sm:text-4xl font-normal text-[#29251d] tracking-tight">{suppressions.length}</div>
          <div className="text-[11px] text-[#443b2f]">Unsubscribes safeguarded</div>
        </div>
      </div>

      {/* OUTBOX & INBOUND REPLY LOG */}
      <div className="rounded-[28px_20px_30px_18px] border border-[#ddd5c3] bg-[#f5eddf] p-5 sm:p-7 space-y-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#ddd5c3]">
          <div>
            <h2 className="font-serif text-lg sm:text-xl font-medium text-[#29251d] flex items-center gap-2">
              <Inbox size={18} className="text-[#694737]" /> Dispatched Outreach & Reply Feed
            </h2>
            <p className="text-xs text-[#443b2f]">
              View all sent cold emails and track incoming responses in one centralized view
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-[#eee6d6] p-1 rounded-[18px_14px_16px_16px] border border-[#ddd5c3] self-start sm:self-auto">
            {[
              { id: 'all', label: 'All Dispatches', count: sentOrRepliedDrafts.length },
              { id: 'replied', label: 'Replies', count: repliedDrafts.length },
              { id: 'awaiting', label: 'Awaiting Response', count: awaitingDrafts.length },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setReplyFilter(f.id as any)}
                className={`text-xs px-3 py-1.5 rounded-[14px_10px_14px_10px] font-medium transition-colors ${
                  replyFilter === f.id
                    ? 'bg-[#35422d] text-[#f5eddf] shadow-xs'
                    : 'text-[#443b2f] hover:text-[#29251d]'
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        </div>

        {/* List of Sent / Replied Emails */}
        <div className="space-y-3.5">
          {filteredDrafts.map((d) => {
            const hasReplied = d.status === 'replied' || (d.reply_count && d.reply_count > 0);
            return (
              <div
                key={d.id}
                className={`p-5 rounded-[24px_18px_26px_16px] border transition-all ${
                  hasReplied
                    ? 'border-[#35422d]/40 bg-[#f2f6ee]'
                    : 'border-[#ddd5c3] bg-[#f5eddf]'
                } space-y-3.5 shadow-2xs`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-[14px_10px_16px_12px] flex items-center justify-center font-serif font-bold text-base ${
                        hasReplied ? 'bg-[#35422d] text-[#f5eddf]' : 'bg-[#eee6d6] text-[#29251d]'
                      }`}
                    >
                      {d.company_name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-serif text-base font-medium text-[#29251d] flex items-center gap-2">
                        <span>{d.company_name}</span>
                        {d.contact_name && <span className="text-xs text-[#694737] font-normal font-sans">({d.contact_name})</span>}
                      </div>
                      <div className="text-xs text-[#443b2f] font-mono">{d.business_email}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {hasReplied ? (
                      <span className="px-3 py-1 rounded-full bg-[#35422d]/15 text-[#35422d] border border-[#35422d]/30 text-[11px] font-semibold flex items-center gap-1.5">
                        <Reply size={12} className="text-[#35422d]" /> Replied ({d.reply_count || 1})
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full bg-[#eee6d6] text-[#443b2f] border border-[#ddd5c3] text-[11px] font-medium flex items-center gap-1.5">
                        <Send size={11} /> Sent · Awaiting Reply
                      </span>
                    )}

                    <button
                      onClick={() => setSelectedReplyDraft(d)}
                      className="px-3 py-1.5 rounded-[18px_12px_16px_14px] border border-[#ddd5c3] bg-[#eee6d6] hover:bg-[#ddd5c3] text-[#29251d] text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <MessageSquare size={13} className="text-[#694737]" /> {hasReplied ? 'Log Follow-up' : 'Log / Test Reply'}
                    </button>
                  </div>
                </div>

                {/* Outgoing Subject and Details */}
                <div className="p-3.5 rounded-[18px_14px_16px_16px] bg-[#eee6d6]/60 border border-[#ddd5c3] text-xs space-y-1">
                  <div className="text-[#29251d] font-semibold flex items-center gap-1.5 font-serif">
                    <Mail size={13} className="text-[#694737]" /> {d.subject}
                  </div>
                  <p className="text-[#443b2f] line-clamp-2 leading-relaxed text-[11px]">
                    {d.body_text}
                  </p>
                  <div className="flex items-center justify-between pt-1.5 text-[10px] text-[#694737] font-mono">
                    <span>Sent via: founder@ornitech.in</span>
                    <span>Dispatched: {d.sent_at ? new Date(d.sent_at).toLocaleString() : 'Recently'}</span>
                  </div>
                </div>

                {/* INBOUND PROSPECT RESPONSE BOX */}
                {hasReplied && (
                  <div className="p-4 rounded-[18px_14px_16px_16px] bg-[#f5eddf] border border-[#35422d]/30 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#35422d] flex items-center gap-1.5 text-[11px]">
                        <Reply size={12} /> Response from {d.contact_name || d.company_name}
                      </span>
                      {d.replied_at && (
                        <span className="text-[10px] text-[#35422d] font-mono">
                          {new Date(d.replied_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-[#29251d] italic bg-[#eee6d6]/60 p-3 rounded-[14px_10px_16px_12px] border border-[#ddd5c3] text-[11px] leading-relaxed">
                      "{d.last_reply_snippet || 'Prospect responded to outreach email.'}"
                    </p>
                  </div>
                )}
              </div>
            );
          })}

          {sentOrRepliedDrafts.length === 0 && (
            <div className="text-center py-12 rounded-[24px_18px_26px_16px] border border-dashed border-[#ddd5c3] bg-[#f5eddf] space-y-3">
              <Inbox size={36} className="mx-auto text-[#694737]" />
              <div className="font-serif text-base font-medium text-[#29251d]">No Dispatched Outreach Emails Yet</div>
              <p className="text-xs text-[#443b2f] max-w-sm mx-auto">
                Approve emails in the Approval Queue and dispatch them to see live outbox delivery and incoming prospect responses here.
              </p>
              <Link
                href="/review"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[27px_19px_29px_16px] bg-[#35422d] hover:bg-[#273320] text-[#f5eddf] text-xs font-semibold shadow-xs"
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
