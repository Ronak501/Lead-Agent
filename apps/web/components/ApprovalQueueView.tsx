import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
  Hash,
  Mail,
  Send,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  XCircle,
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
  onRejectDraft,
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
    <div className="space-y-5 sm:space-y-6">
      {/* Page Title & Guardrail Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-emerald-400 shrink-0" size={20} />
            Mandatory Human Approval Queue
          </h1>
          <p className="text-xs text-zinc-400">
            Zero automated dispatch. Every email must be individually verified by a human reviewer.
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex flex-wrap items-center gap-1.5 bg-zinc-900 border border-zinc-800 p-1 rounded-xl w-full sm:w-fit">
          <button
            onClick={() => setActiveFilter('pending')}
            className={`flex-1 sm:flex-initial text-center px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeFilter === 'pending' ? 'bg-violet-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Needs Sign-off ({pendingDrafts.length})
          </button>
          <button
            onClick={() => setActiveFilter('approved')}
            className={`flex-1 sm:flex-initial text-center px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeFilter === 'approved' ? 'bg-emerald-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Approved ({approvedDrafts.length})
          </button>
          <button
            onClick={() => setActiveFilter('all')}
            className={`flex-1 sm:flex-initial text-center px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              activeFilter === 'all' ? 'bg-zinc-800 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            All Outbox
          </button>
        </div>
      </div>

      {/* Strict Compliance Warning */}
      <div className="rounded-2xl border border-amber-900/40 bg-amber-950/20 p-3.5 sm:p-4 text-xs text-amber-200/90 flex items-start gap-3">
        <ShieldAlert size={18} className="text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-amber-300">Strict Safety Enforcement Active</div>
          <div className="text-[11px] text-amber-200/70 leading-relaxed">
            Bulk/batch auto-sending is strictly prohibited. Each email is stamped with a SHA-256 fingerprint upon approval.
            Any edit after approval automatically revokes the lock and resets the draft to pending review.
          </div>
        </div>
      </div>

      {/* Main Grid: Queue List + Detailed Sign-off Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Left Column: List of items needing approval (hidden on mobile if inspecting an item) */}
        <div className={`lg:col-span-5 space-y-3 ${selectedReviewDraft ? 'hidden lg:block' : 'block'}`}>
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center justify-between px-1">
            <span>Review Items ({filteredList.length})</span>
            <span className="text-[10px] text-zinc-500 font-normal">Select an item to inspect</span>
          </div>

          <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
            {filteredList.length === 0 ? (
              <div className="p-8 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 text-center text-xs text-zinc-500">
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
                    className={`p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-violet-500 bg-violet-950/20 shadow-md ring-1 ring-violet-500/30'
                        : 'border-zinc-800/80 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                      <span className="font-semibold text-zinc-200 truncate">{draft.company_name}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                          draft.status === 'approved'
                            ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
                            : 'bg-amber-950/80 border border-amber-800 text-amber-300'
                        }`}
                      >
                        {draft.status === 'approved' ? 'Approved' : 'Pending'}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-400 truncate mb-1">
                      <span className="text-zinc-500">To:</span> {draft.business_email || 'No email'}
                    </div>

                    <div className="text-xs text-zinc-300 truncate font-medium">"{draft.subject}"</div>

                    <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-500">
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
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-6 space-y-4 sm:space-y-5 lg:sticky lg:top-24">
              {/* Mobile Back Button to return to list */}
              <div className="lg:hidden pb-3 border-b border-zinc-800/80">
                <button
                  onClick={() => setSelectedReviewDraft(null)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-violet-400 hover:text-violet-300"
                >
                  <ArrowLeft size={14} /> Back to Queue ({filteredList.length})
                </button>
              </div>

              <div className="flex items-start sm:items-center justify-between border-b border-zinc-800/80 pb-4 gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <UserCheck size={18} className="text-violet-400 shrink-0" />
                    Individual Sign-Off Station
                  </h3>
                  <div className="text-xs text-zinc-400 truncate max-w-[220px] sm:max-w-none">
                    Draft ID: <span className="font-mono text-zinc-300">{selectedReviewDraft.id}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-[10px] text-zinc-500">Deliverability</div>
                  <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1 justify-end">
                    <CheckCircle2 size={12} /> {selectedReviewDraft.email_status}
                  </div>
                </div>
              </div>

              {/* Exact Recipient and Sender Identity Table */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-2.5 text-xs">
                <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 pb-2 border-b border-zinc-800/60">
                  <span className="text-zinc-500 text-[11px] sm:text-xs">Sender Identity:</span>
                  <span className="sm:col-span-2 text-zinc-200 font-medium font-mono text-violet-300 break-all">
                    Ronak Talaviya &lt;founder@ornitech.in&gt;
                  </span>
                </div>
                <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 pb-2 border-b border-zinc-800/60">
                  <span className="text-zinc-500 text-[11px] sm:text-xs">Recipient Contact:</span>
                  <span className="sm:col-span-2 text-zinc-200">
                    {selectedReviewDraft.contact_name || 'Founder'} ({selectedReviewDraft.company_name})
                  </span>
                </div>
                <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2 pb-2 border-b border-zinc-800/60 sm:items-center">
                  <span className="text-zinc-500 text-[11px] sm:text-xs">Target Email:</span>
                  <div className="sm:col-span-2 flex flex-col sm:flex-row sm:items-center gap-2">
                    <input
                      type="email"
                      value={recipientEmailInput}
                      onChange={(e) => setRecipientEmailInput(e.target.value)}
                      placeholder="e.g. founder@company.com"
                      className="w-full sm:flex-1 bg-zinc-900 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-mono outline-none focus:border-violet-500"
                    />
                    {!recipientEmailInput && (
                      <span className="text-[10px] text-rose-400 font-semibold shrink-0">Email required</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:grid sm:grid-cols-3 gap-1 sm:gap-2">
                  <span className="text-zinc-500 text-[11px] sm:text-xs">Subject Line:</span>
                  <span className="sm:col-span-2 font-medium text-white">{selectedReviewDraft.subject}</span>
                </div>
              </div>

              {/* Exact Email Body Box */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold text-zinc-400 flex items-center justify-between">
                  <span>Exact Message Body (Grounded in Verified Evidence)</span>
                  <span className="text-[10px] text-zinc-500">
                    {selectedReviewDraft.body_text.split(/\s+/).length} words
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 leading-relaxed whitespace-pre-line font-sans select-text">
                  {selectedReviewDraft.body_text}
                </div>
              </div>

              {/* Evidence Citations */}
              {selectedReviewDraft.evidence_urls && selectedReviewDraft.evidence_urls.length > 0 && (
                <div className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs space-y-1">
                  <span className="text-[11px] font-semibold text-zinc-400">Cited Evidence Source:</span>
                  <div className="text-zinc-400 font-mono text-[11px] truncate">
                    {selectedReviewDraft.evidence_urls.join(', ')}
                  </div>
                </div>
              )}

              {/* Status Action Area */}
              {selectedReviewDraft.status === 'approved' ? (
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-900/60 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-300 font-semibold flex items-center gap-1.5">
                      <ShieldCheck size={16} /> Approved & Locked
                    </span>
                    <span className="text-zinc-400 text-[11px]">
                      By: {selectedReviewDraft.approved_by || 'Reviewer'}
                    </span>
                  </div>
                  {selectedReviewDraft.approval_hash && (
                    <div className="text-[10px] font-mono text-zinc-500 flex items-center gap-1">
                      <Hash size={10} /> Hash: {selectedReviewDraft.approval_hash.slice(0, 24)}...
                    </div>
                  )}
                  <button
                    onClick={() => onSendDraft(selectedReviewDraft.id)}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
                  >
                    <Send size={13} />
                    Dispatch Now (Passes 5 Safety Gates)
                  </button>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold text-zinc-400">Human Reviewer Name / Signer:</label>
                    <input
                      type="text"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-white focus:outline-none focus:border-violet-500"
                    />
                  </div>

                  {/* Mandatory Individual Checkbox */}
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-zinc-300">
                    <input
                      type="checkbox"
                      checked={confirmationChecked}
                      onChange={(e) => setConfirmationChecked(e.target.checked)}
                      className="mt-0.5 rounded border-zinc-700 text-violet-600 focus:ring-0"
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
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <CheckCircle2 size={14} />
                      Approve & Lock With SHA-256 Hash
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 p-16 text-center space-y-3">
              <Eye size={36} className="mx-auto text-zinc-600" />
              <h4 className="text-sm font-semibold text-zinc-300">No Draft Selected for Review</h4>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
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
