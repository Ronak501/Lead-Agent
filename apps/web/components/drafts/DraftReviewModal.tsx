'use client';

import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Draft } from '../types';
import { useApp } from '../../context/AppContext';

interface DraftReviewModalProps {
  draft: Draft | null;
  onClose: () => void;
}

export function DraftReviewModal({ draft, onClose }: DraftReviewModalProps) {
  const { handleSaveDraftEdit, handleApproveDraft, handleGenerateDraft, notify } = useApp();
  const [editingSubject, setEditingSubject] = useState(draft?.subject || '');
  const [editingBody, setEditingBody] = useState(draft?.body_text || '');
  const [recipientEmail, setRecipientEmail] = useState(draft?.business_email || '');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [confirmSafetyCheck, setConfirmSafetyCheck] = useState(false);

  if (!draft) return null;

  const handleApprove = async () => {
    if (!confirmSafetyCheck) {
      notify('Please check the confirmation box verifying recipient and content accuracy.', 'error');
      return;
    }
    await handleApproveDraft(draft.id, 'Ronak Talaviya (Reviewer)', recipientEmail.trim() || undefined);
    onClose();
  };

  const handleSave = async () => {
    await handleSaveDraftEdit(draft.id, editingSubject, editingBody);
  };

  const handleRegenerate = async () => {
    onClose();
    await handleGenerateDraft(draft.lead_id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4">
      <div className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start sm:items-center justify-between pb-3 border-b border-zinc-800 gap-2">
          <div className="flex items-start sm:items-center gap-2">
            <ShieldCheck className="text-violet-400 shrink-0 mt-0.5 sm:mt-0" size={20} />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white">Review & Approve Email Draft</h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 mt-1">
                <span className="text-xs text-zinc-400">Recipient Email:</span>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="e.g. founder@domain.com"
                  className="w-full sm:w-auto px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-xs text-emerald-300 font-mono outline-none focus:border-violet-500"
                />
                {!recipientEmail && (
                  <span className="text-[10px] text-rose-400 font-semibold shrink-0">Required for approval</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-200 p-1">
            ✕
          </button>
        </div>

        {/* Desktop / Mobile Preview Mode Toggle */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
          <span className="text-xs font-semibold text-zinc-300">Preview Device:</span>
          <div className="flex rounded-xl bg-zinc-900 border border-zinc-800 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              className={`px-3 py-1 rounded-lg transition-all ${
                previewDevice === 'desktop'
                  ? 'bg-violet-600 text-white font-semibold shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Desktop View
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              className={`px-3 py-1 rounded-lg transition-all ${
                previewDevice === 'mobile'
                  ? 'bg-violet-600 text-white font-semibold shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Mobile View (Phone)
            </button>
          </div>
        </div>

        {previewDevice === 'mobile' ? (
          <div className="flex justify-center py-2">
            <div className="w-full max-w-sm rounded-[2.5rem] border-4 border-zinc-700 bg-zinc-950 p-4 shadow-2xl space-y-3">
              <div className="mx-auto w-16 h-1 bg-zinc-700 rounded-full mb-2" />
              <div className="border-b border-zinc-800 pb-2">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Mail Preview · iOS/Android</div>
                <div className="font-semibold text-xs text-zinc-100 truncate">{editingSubject}</div>
                <div className="text-[11px] text-violet-400 truncate">To: {draft.business_email}</div>
              </div>
              <div className="text-[11px] text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                {editingBody}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Subject Line</label>
              <input
                type="text"
                value={editingSubject}
                onChange={(e) => setEditingSubject(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-violet-500"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Email Body Text</label>
              <textarea
                rows={8}
                value={editingBody}
                onChange={(e) => setEditingBody(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-zinc-200 outline-none focus:border-violet-500 font-sans leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* Mandatory Human Review Checkbox */}
        <div className="p-3.5 sm:p-4 rounded-xl border border-violet-900/60 bg-violet-950/20 space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmSafetyCheck}
              onChange={(e) => setConfirmSafetyCheck(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-violet-600 focus:ring-0 shrink-0"
            />
            <div className="text-xs text-zinc-300 leading-snug">
              <span className="font-semibold text-white">I explicitly approve this exact email.</span> I have
              verified the recipient identity, confirmed that the cited website observations are accurate, and verified
              the recipient is not on a suppression list.
            </div>
          </label>
        </div>

        <div className="pt-3 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-medium text-center"
            >
              Save Edits
            </button>
            <button
              type="button"
              onClick={handleRegenerate}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-violet-800/60 bg-violet-950/30 text-violet-300 font-medium hover:bg-violet-900/40 text-center"
            >
              Regenerate
            </button>
            <button
              type="button"
              onClick={() => {
                notify('Draft rejected and archived.', 'info');
                onClose();
              }}
              className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-rose-900/60 bg-rose-950/30 text-rose-300 font-medium hover:bg-rose-900/40 text-center"
            >
              Reject
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 font-medium text-center"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={!confirmSafetyCheck}
              className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-white font-semibold transition-all text-center ${
                confirmSafetyCheck
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              Approve Draft
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

