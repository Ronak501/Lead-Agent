'use client';

import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (draft) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [draft]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#29251d]/40 backdrop-blur-xs p-3 sm:p-4 font-sans text-[#29251d]">
      <div className="w-full max-w-3xl rounded-[28px_20px_30px_18px] border border-[#ddd5c3] bg-[#f5eddf] p-5 sm:p-7 space-y-4 sm:space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start sm:items-center justify-between pb-3 border-b border-[#ddd5c3] gap-2">
          <div className="flex items-start sm:items-center gap-2.5">
            <ShieldCheck className="text-[#35422d] shrink-0 mt-0.5 sm:mt-0" size={20} />
            <div>
              <h2 className="font-serif text-base sm:text-lg font-medium text-[#29251d]">Review & Approve Email Draft</h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 mt-1">
                <span className="text-xs text-[#443b2f]">Recipient Email:</span>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="e.g. founder@domain.com"
                  className="w-full sm:w-auto px-2.5 py-1 rounded-lg bg-[#eee6d6] border border-[#ddd5c3] text-xs text-[#29251d] font-mono outline-none focus:border-[#35422d]"
                />
                {!recipientEmail && (
                  <span className="text-[10px] text-[#ad7d62] font-semibold shrink-0">Required for approval</span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-[#694737] hover:text-[#29251d] p-1 rounded-lg">
            ✕
          </button>
        </div>

        {/* Desktop / Mobile Preview Mode Toggle */}
        <div className="flex items-center justify-between pb-2 border-b border-[#ddd5c3]">
          <span className="text-xs font-semibold text-[#29251d]">Preview Device:</span>
          <div className="flex rounded-[18px_14px_16px_16px] bg-[#eee6d6] border border-[#ddd5c3] p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              className={`px-3 py-1 rounded-[14px_10px_14px_10px] transition-all ${
                previewDevice === 'desktop'
                  ? 'bg-[#35422d] text-[#f5eddf] font-semibold shadow-xs'
                  : 'text-[#443b2f] hover:text-[#29251d]'
              }`}
            >
              Desktop View
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              className={`px-3 py-1 rounded-[14px_10px_14px_10px] transition-all ${
                previewDevice === 'mobile'
                  ? 'bg-[#35422d] text-[#f5eddf] font-semibold shadow-xs'
                  : 'text-[#443b2f] hover:text-[#29251d]'
              }`}
            >
              Mobile View (Phone)
            </button>
          </div>
        </div>

        {previewDevice === 'mobile' ? (
          <div className="flex justify-center py-2">
            <div className="w-full max-w-sm rounded-[2.5rem] border-4 border-[#ddd5c3] bg-[#f5eddf] p-4 shadow-lg space-y-3">
              <div className="mx-auto w-16 h-1 bg-[#ddd5c3] rounded-full mb-2" />
              <div className="border-b border-[#ddd5c3] pb-2">
                <div className="text-[10px] text-[#694737] uppercase tracking-wider font-sans">Mail Preview · iOS/Android</div>
                <div className="font-serif font-medium text-xs text-[#29251d] truncate">{editingSubject}</div>
                <div className="text-[11px] text-[#35422d] truncate font-mono">To: {draft.business_email}</div>
              </div>
              <div className="text-[11px] text-[#29251d] whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto font-sans">
                {editingBody}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-[#29251d] font-semibold mb-1">Subject Line</label>
              <input
                type="text"
                value={editingSubject}
                onChange={(e) => setEditingSubject(e.target.value)}
                className="w-full rounded-[16px_12px_14px_18px] border border-[#ddd5c3] bg-[#eee6d6]/60 px-3.5 py-2 text-[#29251d] outline-none focus:border-[#35422d]"
              />
            </div>

            <div>
              <label className="block text-[#29251d] font-semibold mb-1">Email Body Text</label>
              <textarea
                rows={8}
                value={editingBody}
                onChange={(e) => setEditingBody(e.target.value)}
                className="w-full rounded-[18px_14px_16px_16px] border border-[#ddd5c3] bg-[#eee6d6]/60 p-3.5 text-[#29251d] outline-none focus:border-[#35422d] font-sans leading-relaxed"
              />
            </div>
          </div>
        )}

        {/* Mandatory Human Review Checkbox */}
        <div className="p-4 rounded-[20px_16px_22px_14px] border border-[#35422d]/30 bg-[#35422d]/8 space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmSafetyCheck}
              onChange={(e) => setConfirmSafetyCheck(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-[#ddd5c3] bg-[#eee6d6] text-[#35422d] focus:ring-0 shrink-0 accent-[#35422d]"
            />
            <div className="text-xs text-[#29251d] leading-snug">
              <span className="font-semibold text-[#29251d]">I explicitly approve this exact email.</span> I have
              verified the recipient identity, confirmed that the cited website observations are accurate, and verified
              the recipient is not on a suppression list.
            </div>
          </label>
        </div>

        <div className="pt-3 border-t border-[#ddd5c3] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-[18px_12px_16px_14px] border border-[#ddd5c3] hover:bg-[#ddd5c3] text-[#29251d] font-medium text-center transition-colors"
            >
              Save Edits
            </button>
            <button
              type="button"
              onClick={handleRegenerate}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-[18px_12px_16px_14px] border border-[#694737]/30 bg-[#694737]/10 text-[#694737] font-medium hover:bg-[#694737]/20 text-center transition-colors"
            >
              Regenerate
            </button>
            <button
              type="button"
              onClick={() => {
                notify('Draft rejected and archived.', 'info');
                onClose();
              }}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-[18px_12px_16px_14px] border border-[#ad7d62]/40 bg-[#fdf2ee] text-[#694737] font-medium hover:bg-[#fbdad0] text-center transition-colors"
            >
              Reject
            </button>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-[20px_14px_18px_12px] border border-[#ddd5c3] bg-[#eee6d6] text-[#443b2f] font-medium text-center"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={!confirmSafetyCheck}
              className={`flex-1 sm:flex-initial px-5 py-2 rounded-[27px_19px_29px_16px] text-[#f5eddf] font-semibold transition-all text-center ${
                confirmSafetyCheck
                  ? 'bg-[#35422d] hover:bg-[#273320] shadow-sm active:scale-[0.98]'
                  : 'bg-[#ddd5c3] text-[#694737] cursor-not-allowed'
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
