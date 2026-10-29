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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <MessageSquare className="text-emerald-400" size={18} />
            <h2 className="text-sm sm:text-base font-bold text-white">Log Inbound Prospect Reply</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
            <div className="text-zinc-400">Target Prospect:</div>
            <div className="font-bold text-white text-sm">{draft.company_name}</div>
            <div className="text-zinc-400 font-mono text-[11px]">{draft.business_email}</div>
          </div>

          <div>
            <label className="block text-zinc-300 font-medium mb-1">Incoming Response Content</label>
            <textarea
              rows={4}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Paste the email reply received from the prospect at founder@ornitech.in..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-zinc-200 outline-none focus:border-emerald-500 text-xs"
            />
          </div>

          {/* Quick Template Chips */}
          <div>
            <span className="text-[11px] text-zinc-500 block mb-1">Quick Response Templates:</span>
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
                  className="text-[11px] px-2.5 py-1.5 rounded-lg border border-zinc-800/80 bg-zinc-900 hover:bg-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-white text-left transition-colors truncate"
                >
                  {tmpl}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2 text-xs">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-900 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !replyText.trim()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/30 disabled:opacity-50 transition-all"
            >
              {loading ? 'Saving...' : 'Save Prospect Reply'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

