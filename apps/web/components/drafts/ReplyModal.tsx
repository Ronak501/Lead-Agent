'use client';

import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { Draft } from '../types';
import { useApp } from '../../context/AppContext';

interface ReplyModalProps {
  draft: Draft | null;
  onClose: () => void;
}

export function ReplyModal({ draft, onClose }: ReplyModalProps) {
  const { handleRecordReply, loading } = useApp();
  const [replyText, setReplyText] = useState('');
  const [replySender, setReplySender] = useState(draft?.business_email || '');

  if (!draft) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleRecordReply(draft.id, replyText, replySender);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#29251d]/40 backdrop-blur-xs p-3 sm:p-4 font-sans text-[#29251d]">
      <div className="w-full max-w-lg rounded-[28px_20px_30px_18px] border border-[#ddd5c3] bg-[#f5eddf] p-5 sm:p-7 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#ddd5c3]">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-[#35422d]" size={18} />
            <h2 className="font-serif text-base sm:text-lg font-medium text-[#29251d]">Log Inbound Prospect Reply</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#694737] hover:text-[#29251d] p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="p-3.5 rounded-[18px_14px_16px_16px] bg-[#eee6d6]/70 border border-[#ddd5c3] space-y-1">
            <div className="text-[#694737] font-medium">Target Prospect:</div>
            <div className="font-serif font-medium text-[#29251d] text-sm">{draft.company_name}</div>
            <div className="text-[#443b2f] font-mono text-[11px]">{draft.business_email}</div>
          </div>

          <div>
            <label className="block text-[#29251d] font-semibold mb-1">Incoming Response Content</label>
            <textarea
              rows={4}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Paste the email reply received from the prospect at founder@ornitech.in..."
              className="w-full rounded-[18px_14px_16px_16px] border border-[#ddd5c3] bg-[#eee6d6]/60 p-3.5 text-[#29251d] outline-none focus:border-[#35422d] text-xs font-sans leading-relaxed"
            />
          </div>

          {/* Quick Template Chips */}
          <div>
            <span className="text-[11px] text-[#694737] font-medium block mb-1.5">Quick Response Templates:</span>
            <div className="flex flex-col gap-1.5">
              {[
                "Hi Ronak, thanks for reaching out. Let's schedule a call this Thursday at 3 PM.",
                "We are interested in the website audit findings. Can you send over a proposal with pricing?",
                "Thanks for the note, but we currently have an internal team handling our website.",
              ].map((tmpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setReplyText(tmpl)}
                  className="text-[11px] px-3 py-1.5 rounded-[16px_12px_14px_14px] border border-[#ddd5c3] bg-[#eee6d6]/50 hover:bg-[#ddd5c3] text-[#29251d] text-left transition-colors truncate"
                >
                  {tmpl}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#ddd5c3] flex justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[20px_14px_18px_12px] border border-[#ddd5c3] bg-[#eee6d6] text-[#443b2f] hover:bg-[#ddd5c3] font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !replyText.trim()}
              className="px-4 py-2 rounded-[27px_19px_29px_16px] bg-[#35422d] hover:bg-[#273320] text-[#f5eddf] font-semibold shadow-xs disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {loading ? 'Saving...' : 'Save Prospect Reply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
