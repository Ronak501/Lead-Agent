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
    <div className="space-y-6 font-sans text-[#29251d]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#ddd5c3]">
        <div>
          <h1 className="font-serif text-2xl font-normal text-[#29251d] tracking-tight">Grounded Email Drafts</h1>
          <p className="text-xs text-[#443b2f]">Review AI-generated cold emails grounded directly in stored evidence</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleBatchApprove}
            className="flex items-center gap-2 px-4 py-2 rounded-[27px_19px_29px_16px] bg-[#35422d] hover:bg-[#273320] text-[#f5eddf] text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
          >
            <CheckCircle2 size={15} /> Batch Approve All Pending
          </button>
        </div>
      </div>

      {/* Drafts List */}
      <div className="space-y-4">
        {drafts.length === 0 ? (
          <div className="p-12 text-center border border-[#ddd5c3] rounded-[28px_20px_30px_18px] bg-[#f5eddf] text-[#443b2f] text-sm">
            No email drafts generated yet. Go to{' '}
            <Link href="/leads" className="text-[#35422d] font-semibold underline">
              Leads
            </Link>{' '}
            and click "Draft Email" or run Auto-Pilot.
          </div>
        ) : (
          drafts.map((d) => (
            <div
              key={d.id}
              className="rounded-[28px_20px_30px_18px] border border-[#ddd5c3] bg-[#f5eddf] p-5 sm:p-7 space-y-4 shadow-2xs hover:border-[#ad7d62] transition-all"
            >
              {/* Header Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#ddd5c3]">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="p-2.5 rounded-[16px_12px_14px_16px] bg-[#eee6d6] text-[#694737] border border-[#ddd5c3] shrink-0 mt-0.5 sm:mt-0">
                    <Mail size={18} />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-serif font-medium text-base text-[#29251d]">{d.company_name}</h3>
                      <span
                        className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full ${
                          d.status === 'approved'
                            ? 'bg-[#35422d]/15 text-[#35422d] border border-[#35422d]/30'
                            : d.status === 'sent'
                            ? 'bg-[#35422d] text-[#f5eddf]'
                            : 'bg-[#694737]/15 text-[#694737] border border-[#694737]/30'
                        }`}
                      >
                        {d.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-[#443b2f] mt-0.5 break-all">
                      Recipient: <span className="font-medium text-[#29251d]">{d.contact_name || 'Founder'}</span> ({d.business_email})
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs text-[#694737] shrink-0 font-sans">
                  <span>
                    Confidence: <span className="font-serif font-semibold text-[#29251d]">{Math.round(d.confidence * 100)}%</span>
                  </span>
                  <span>· Model: {d.model}</span>
                </div>
              </div>

              {/* Content Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
                {/* Email Body */}
                <div className="lg:col-span-2 space-y-3">
                  <div className="text-xs font-semibold text-[#29251d]">
                    Subject: <span className="text-[#443b2f] font-normal">{d.subject}</span>
                  </div>
                  <div className="p-4 sm:p-5 rounded-[22px_18px_24px_16px] bg-[#eee6d6]/70 border border-[#ddd5c3] text-xs text-[#29251d] whitespace-pre-wrap leading-relaxed font-sans">
                    {d.body_text}
                  </div>
                </div>

                {/* Evidence Verification Sidecar */}
                <div className="space-y-3 p-4 rounded-[22px_18px_24px_16px] bg-[#eee6d6]/40 border border-[#ddd5c3] text-xs">
                  <div className="font-semibold text-[#29251d] flex items-center gap-1.5 font-serif">
                    <ShieldCheck size={14} className="text-[#35422d]" /> Evidence Audit Trail
                  </div>
                  <p className="text-[11px] text-[#443b2f] leading-snug">
                    Opening hook grounded in public website observation. Zero hallucinations or fake testimonials.
                  </p>
                  {d.evidence_urls.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] text-[#694737] uppercase font-semibold">Verified Source:</span>
                      {d.evidence_urls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-[11px] text-[#35422d] hover:underline truncate"
                        >
                          {url}
                        </a>
                      ))}
                    </div>
                  )}

                  <div className="pt-3 border-t border-[#ddd5c3] flex flex-col gap-2">
                    {d.status === 'pending_review' ? (
                      <button
                        onClick={() => setSelectedReviewDraft(d)}
                        className="w-full py-2.5 px-3 rounded-[24px_18px_26px_16px] bg-[#694737] hover:bg-[#53372a] text-[#f5eddf] font-semibold text-xs transition-colors shadow-xs active:scale-[0.98]"
                      >
                        Review & Approve Draft
                      </button>
                    ) : d.status === 'approved' ? (
                      <button
                        onClick={() => handleSendDraft(d.id)}
                        className="w-full py-2.5 px-3 rounded-[27px_19px_29px_16px] bg-[#35422d] hover:bg-[#273320] text-[#f5eddf] font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs active:scale-[0.98]"
                      >
                        <Send size={13} /> Dispatch to Recipient
                      </button>
                    ) : (
                      <div className="text-center py-1 text-[#35422d] text-xs font-semibold flex items-center justify-center gap-1">
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
