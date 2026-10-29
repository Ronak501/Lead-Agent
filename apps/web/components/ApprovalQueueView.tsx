'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  Hash,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { Draft } from './types';

interface ApprovalQueueViewProps {
  drafts: Draft[];
  onApproveDraft: (draftId: string, reviewerName: string, recipientEmail?: string) => Promise<void>;
  onRejectDraft?: (draftId: string) => Promise<void>;
  onSendDraft: (draftId: string) => Promise<void>;
  loading: boolean;
}

export const ApprovalQueueView: React.FC<ApprovalQueueViewProps> = ({
  drafts,
  onApproveDraft,
  onSendDraft,
  loading,
}) => {
  const [selectedReviewDraft, setSelectedReviewDraft] = useState<Draft | null>(null);
  const [reviewerName, setReviewerName] = useState('Ronak (Outreach Lead)');
  const [recipientEmailInput, setRecipientEmailInput] = useState('');
  const [confirmationChecked, setConfirmationChecked] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved'>('pending');

  const pendingDrafts = drafts.filter((d) => d.status === 'pending_review');
  const approvedDrafts = drafts.filter((d) => d.status === 'approved');
  const filteredList =
    activeFilter === 'pending'
      ? pendingDrafts
      : activeFilter === 'approved'
      ? approvedDrafts
      : drafts.filter((d) => d.status !== 'sent');

  const handleApprove = async (draftId: string) => {
    if (!confirmationChecked) {
      alert('You must confirm that you have personally inspected the recipient, subject, body, and sender identity.');
      return;
    }
    await onApproveDraft(draftId, reviewerName, recipientEmailInput.trim() || undefined);
    setSelectedReviewDraft(null);
    setConfirmationChecked(false);
  };

  return (
    <div className="space-y-5 sm:space-y-6 font-sans text-[#29251d]">
      {/* Page Title & Guardrail Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-[#ddd5c3]">
        <div>
          <h1 className="font-serif text-2xl font-normal text-[#29251d] tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-[#35422d] shrink-0" size={24} />
            Mandatory Human Approval Queue
          </h1>
          <p className="text-xs text-[#443b2f]">
            Zero automated dispatch. Every email must be individually verified by a human reviewer.
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#eee6d6] border border-[#ddd5c3] p-1 rounded-[20px_14px_18px_16px] w-full sm:w-fit">
          <button
            onClick={() => setActiveFilter('pending')}
            className={`flex-1 sm:flex-initial text-center px-3 py-1.5 rounded-[16px_10px_14px_12px] text-xs font-medium transition-all ${
              activeFilter === 'pending'
                ? 'bg-[#694737] text-[#f5eddf] shadow-xs'
                : 'text-[#443b2f] hover:text-[#29251d]'
            }`}
          >
            Needs Sign-off ({pendingDrafts.length})
          </button>
          <button
            onClick={() => setActiveFilter('approved')}
            className={`flex-1 sm:flex-initial text-center px-3 py-1.5 rounded-[16px_10px_14px_12px] text-xs font-medium transition-all ${
              activeFilter === 'approved'
                ? 'bg-[#35422d] text-[#f5eddf] shadow-xs'
                : 'text-[#443b2f] hover:text-[#29251d]'
            }`}
          >
            Approved ({approvedDrafts.length})
          </button>
          <button
            onClick={() => setActiveFilter('all')}
            className={`flex-1 sm:flex-initial text-center px-3 py-1.5 rounded-[16px_10px_14px_12px] text-xs font-medium transition-all ${
              activeFilter === 'all'
                ? 'bg-[#29251d] text-[#f5eddf] shadow-xs'
                : 'text-[#443b2f] hover:text-[#29251d]'
            }`}
          >
            All Outbox
          </button>
        </div>
      </div>

      {/* Strict Compliance Warning */}
      <div className="rounded-[22px_18px_24px_16px] border border-[#ad7d62]/40 bg-[#fdf2ee] p-4 text-xs text-[#694737] flex items-start gap-3">
        <ShieldAlert size={18} className="text-[#694737] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-[#694737]">Strict Safety Enforcement Active</div>
          <div className="text-[11px] text-[#443b2f] leading-relaxed">
            Bulk/batch auto-sending is strictly prohibited. Each email is stamped with a SHA-256 fingerprint upon approval.
            Any edit after approval automatically revokes the lock and resets the draft to pending review.
          </div>
        </div>
      </div>

      {/* Main Grid: Queue List + Detailed Sign-off Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Left Column: List of items needing approval */}
        <div className={`lg:col-span-5 space-y-3 ${selectedReviewDraft ? 'hidden lg:block' : 'block'}`}>
          <div className="text-xs font-semibold text-[#694737] uppercase tracking-wider flex items-center justify-between px-1">
            <span>Review Items ({filteredList.length})</span>
            <span className="text-[10px] text-[#443b2f] font-normal">Select an item to inspect</span>
          </div>

          <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
            {filteredList.length === 0 ? (
              <div className="p-8 rounded-[24px_18px_26px_16px] border border-[#ddd5c3] bg-[#f5eddf] text-center text-xs text-[#443b2f]">
                No items in this filter queue.
              </div>
            ) : (
              filteredList.map((draft) => {
                const isSelected = selectedReviewDraft?.id === draft.id;
                return (
                  <div
                    key={draft.id}
                    onClick={() => {
                      setSelectedReviewDraft(draft);
                      setRecipientEmailInput(draft.business_email || '');
                      setConfirmationChecked(false);
                    }}
                    className={`p-4 rounded-[20px_16px_22px_14px] border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#35422d] bg-[#f5eddf] shadow-sm ring-2 ring-[#35422d]/20'
                        : 'border-[#ddd5c3] bg-[#f5eddf] hover:border-[#ad7d62]'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                      <span className="font-serif font-medium text-sm text-[#29251d] truncate">{draft.company_name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                          draft.status === 'approved'
                            ? 'bg-[#35422d]/15 border border-[#35422d]/30 text-[#35422d]'
                            : 'bg-[#694737]/15 border border-[#694737]/30 text-[#694737]'
                        }`}
                      >
                        {draft.status === 'approved' ? 'Approved' : 'Pending'}
                      </span>
                    </div>

                    <div className="text-xs text-[#443b2f] truncate mb-1">
                      <span className="text-[#694737]">To:</span> {draft.business_email || 'No email'}
                    </div>

                    <div className="text-xs text-[#29251d] truncate font-medium">"{draft.subject}"</div>

                    <div className="mt-2.5 pt-2 border-t border-[#ddd5c3] flex items-center justify-between text-[10px] text-[#694737]">
                      <span>Model: {draft.model}</span>
                      <span>Confidence: {(draft.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Deep Sign-Off Inspection Station */}
        <div className={`lg:col-span-7 ${!selectedReviewDraft ? 'hidden lg:block' : 'block'}`}>
          {selectedReviewDraft ? (
            <div className="rounded-[28px_20px_30px_18px] border border-[#ddd5c3] bg-[#f5eddf] p-5 sm:p-7 space-y-4 sm:space-y-5 lg:sticky lg:top-24 shadow-sm">
              {/* Mobile Back Button to return to list */}
              <div className="lg:hidden pb-3 border-b border-[#ddd5c3]">
                <button
                  onClick={() => setSelectedReviewDraft(null)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-[#35422d]"
                >
                  <ArrowLeft size={14} /> Back to Queue ({filteredList.length})
                </button>
              </div>

              <div className="flex items-start sm:items-center justify-between border-b border-[#ddd5c3] pb-4 gap-2">
                <div>
                  <h3 className="font-serif text-base sm:text-lg font-medium text-[#29251d] flex items-center gap-2">
                    <UserCheck size={18} className="text-[#35422d] shrink-0" />
                    Individual Sign-Off Station
                  </h3>
                  <div className="text-xs text-[#443b2f] truncate max-w-[220px] sm:max-w-none">
                    Draft ID: <span className="font-mono text-[#29251d]">{selectedReviewDraft.id}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] text-[#694737]">Deliverability</div>
                  <div className="text-xs font-semibold text-[#35422d] flex items-center gap-1 justify-end">
                    <CheckCircle2 size={12} /> {selectedReviewDraft.email_status}
                  </div>
                </div>
              </div>

              {/* Exact Recipient and Sender Identity Table */}
              <div className="p-4 rounded-[20px_16px_22px_14px] bg-[#eee6d6]/70 border border-[#ddd5c3] space-y-2.5 text-xs">
                <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 pb-2 border-b border-[#ddd5c3]">
                  <span className="text-[#694737] text-[11px] sm:text-xs font-medium">Sender Identity:</span>
                  <span className="sm:col-span-2 text-[#29251d] font-mono text-[11px] break-all">
                    Ronak Talaviya &lt;founder@ornitech.in&gt;
                  </span>
                </div>
                <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 pb-2 border-b border-[#ddd5c3]">
                  <span className="text-[#694737] text-[11px] sm:text-xs font-medium">Recipient Contact:</span>
                  <span className="sm:col-span-2 text-[#29251d]">
                    {selectedReviewDraft.contact_name || 'Founder'} ({selectedReviewDraft.company_name})
                  </span>
                </div>
                <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 pb-2 border-b border-[#ddd5c3] sm:items-center">
                  <span className="text-[#694737] text-[11px] sm:text-xs font-medium">Target Email:</span>
                  <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center gap-2">
                    <input
                      type="email"
                      value={recipientEmailInput}
                      onChange={(e) => setRecipientEmailInput(e.target.value)}
                      placeholder="e.g. founder@company.com"
                      className="w-full sm:flex-1 bg-[#f5eddf] border border-[#ddd5c3] rounded-lg px-2.5 py-1.5 text-xs text-[#29251d] font-mono outline-none focus:border-[#35422d]"
                    />
                    {!recipientEmailInput && (
                      <span className="text-[10px] text-[#ad7d62] font-semibold shrink-0">Email required</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2">
                  <span className="text-[#694737] text-[11px] sm:text-xs font-medium">Subject Line:</span>
                  <span className="sm:col-span-2 font-medium text-[#29251d]">{selectedReviewDraft.subject}</span>
                </div>
              </div>

              {/* Exact Email Body Box */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-[#694737] flex items-center justify-between">
                  <span>Exact Message Body (Grounded in Verified Evidence)</span>
                  <span className="text-[10px] text-[#443b2f]">
                    {selectedReviewDraft.body_text.split(/\s+/).length} words
                  </span>
                </div>
                <div className="p-4 sm:p-5 rounded-[20px_16px_22px_14px] bg-[#eee6d6]/60 border border-[#ddd5c3] text-xs text-[#29251d] leading-relaxed whitespace-pre-line font-sans select-text">
                  {selectedReviewDraft.body_text}
                </div>
              </div>

              {/* Evidence Citations */}
              {selectedReviewDraft.evidence_urls && selectedReviewDraft.evidence_urls.length > 0 && (
                <div className="p-3.5 rounded-[18px_14px_16px_16px] bg-[#eee6d6]/40 border border-[#ddd5c3] text-xs space-y-1">
                  <span className="text-[11px] font-semibold text-[#694737]">Cited Evidence Source:</span>
                  <div className="text-[#443b2f] font-mono text-[11px] truncate">
                    {selectedReviewDraft.evidence_urls.join(', ')}
                  </div>
                </div>
              )}

              {/* Status Action Area */}
              {selectedReviewDraft.status === 'approved' ? (
                <div className="p-4 sm:p-5 rounded-[22px_18px_24px_16px] bg-[#35422d]/10 border border-[#35422d]/30 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#35422d] font-semibold flex items-center gap-1.5">
                      <ShieldCheck size={16} /> Approved & Locked
                    </span>
                    <span className="text-[#694737] text-[11px]">
                      By: {selectedReviewDraft.approved_by || 'Reviewer'}
                    </span>
                  </div>
                  {selectedReviewDraft.approval_hash && (
                    <div className="text-[10px] font-mono text-[#443b2f] flex items-center gap-1">
                      <Hash size={10} /> Hash: {selectedReviewDraft.approval_hash.slice(0, 24)}...
                    </div>
                  )}
                  <button
                    onClick={() => onSendDraft(selectedReviewDraft.id)}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-[27px_19px_29px_16px] bg-[#35422d] hover:bg-[#273320] text-[#f5eddf] font-semibold text-xs shadow-xs transition-all disabled:opacity-50 active:scale-[0.98]"
                  >
                    <Send size={13} />
                    Dispatch Now (Passes 5 Safety Gates)
                  </button>
                </div>
              ) : (
                <div className="p-4 sm:p-5 rounded-[22px_18px_24px_16px] bg-[#eee6d6]/70 border border-[#ddd5c3] space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-[#29251d]">Human Reviewer Name / Signer:</label>
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[#f5eddf] border border-[#ddd5c3] text-xs text-[#29251d] focus:outline-none focus:border-[#35422d]"
                    />
                  </div>

                  {/* Mandatory Individual Checkbox */}
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-[#29251d]">
                    <input
                      type="checkbox"
                      checked={confirmationChecked}
                      onChange={(e) => setConfirmationChecked(e.target.checked)}
                      className="mt-0.5 rounded border-[#ddd5c3] text-[#35422d] focus:ring-0 accent-[#35422d]"
                    />
                    <span className="leading-snug">
                      I have reviewed the exact recipient, subject, body, and sender identity. I certify that all claims are
                      factually grounded and compliant with anti-spam policies.
                    </span>
                  </label>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={() => handleApprove(selectedReviewDraft.id)}
                      disabled={loading || !confirmationChecked}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-[27px_19px_29px_16px] bg-[#35422d] hover:bg-[#273320] text-[#f5eddf] text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
                    >
                      <CheckCircle2 size={14} />
                      Approve & Lock With SHA-256 Hash
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-[28px_20px_30px_18px] border border-dashed border-[#ddd5c3] bg-[#f5eddf]/50 p-16 text-center space-y-3">
              <Eye size={36} className="mx-auto text-[#694737]" />
              <h4 className="font-serif text-base font-medium text-[#29251d]">No Draft Selected for Review</h4>
              <p className="text-xs text-[#443b2f] max-w-sm mx-auto">
                Select any draft from the list on the left to review the exact message content, verify contact evidence, and sign
                off individually.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
