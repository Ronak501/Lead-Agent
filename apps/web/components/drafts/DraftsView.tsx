'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Mail,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { Draft } from '../types';
import { useApp } from '../../context/AppContext';
import { DraftReviewModal } from './DraftReviewModal';

export function DraftsView() {
  const { drafts, handleBatchApprove, handleSendDraft } = useApp();
  const [selectedReviewDraft, setSelectedReviewDraft] = useState<Draft | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Grounded Email Drafts</h1>
          <p className="text-xs text-zinc-400">Review AI-generated cold emails grounded directly in stored evidence</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleBatchApprove}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow-lg shadow-emerald-700/20 transition-all"
          >
            <CheckCircle2 size={15} /> Batch Approve All Pending
          </button>
        </div>
      </div>

      {/* Drafts List */}
      <div className="space-y-4">
        {drafts.length === 0 ? (
          <div className="p-12 text-center border border-zinc-800 rounded-2xl bg-zinc-900/30 text-zinc-500 text-sm">
            No email drafts generated yet. Go to{' '}
            <Link href="/leads" className="text-violet-400 underline">
              Leads
            </Link>{' '}
            and click "Draft Email" or run Auto-Pilot.
          </div>
        ) : (
          drafts.map((d) => (
            <div
              key={d.id}
              className="rounded-2xl border border-zinc-800/90 bg-zinc-900/50 p-4 sm:p-6 space-y-4 hover:border-zinc-700/80 transition-all"
            >
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-violet-600/15 text-violet-400 border border-violet-500/20 shrink-0 mt-0.5 sm:mt-0">
                    <Mail size={18} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-sm text-zinc-100">{d.company_name}</h3>
                      <span
                        className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                          d.status === 'approved'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            : d.status === 'sent'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : 'bg-amber-950 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {d.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5 break-all">
                      Recipient: <span className="font-medium text-zinc-200">{d.contact_name || 'Founder'}</span> ({d.business_email})
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-zinc-500 shrink-0">
                  <span>
                    Confidence: <span className="font-semibold text-zinc-300">{Math.round(d.confidence * 100)}%</span>
                  </span>
                  <span>· Model: {d.model}</span>
                </div>
              </div>

              {/* Content Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                {/* Email Body */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="text-xs font-semibold text-zinc-300">
                    Subject: <span className="text-zinc-100 font-normal">{d.subject}</span>
                  </div>
                  <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed font-sans">
                    {d.body_text}
                  </div>
                </div>

                {/* Evidence Verification Sidecar */}
                <div className="space-y-3 p-4 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-xs">
                  <div className="font-semibold text-zinc-300 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-400" /> Evidence Audit Trail
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-snug">
                    Opening hook grounded in public website observation. Zero hallucinations or fake testimonials.
                  </p>
                  {d.evidence_urls.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] text-zinc-500 uppercase font-semibold">Verified Source:</span>
                      {d.evidence_urls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-[11px] text-violet-400 hover:underline truncate"
                        >
                          {url}
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="pt-3 border-t border-zinc-800 flex flex-col gap-2">
                    {d.status === 'pending_review' ? (
                      <button
                        onClick={() => setSelectedReviewDraft(d)}
                        className="w-full py-2 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-colors"
                      >
                        Review & Approve Draft
                      </button>
                    ) : d.status === 'approved' ? (
                      <button
                        onClick={() => handleSendDraft(d.id)}
                        className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Send size={13} /> Dispatch to Recipient
                      </button>
                    ) : (
                      <div className="text-center py-1 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1">
                        <CheckCircle2 size={13} /> Sent via Safe Outbox
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <DraftReviewModal
        draft={selectedReviewDraft}
        onClose={() => setSelectedReviewDraft(null)}
      />
    </div>
  );
}

