'use client';

import React, { useState } from 'react';
import { MessageSquare, Sparkles, Copy, Check, ShieldAlert } from 'lucide-react';
import { Draft } from '../types';
import { useApp } from '../../context/AppContext';

interface ReplyModalProps {
  draft: Draft | null;
  onClose: () => void;
}

export function ReplyModal({ draft, onClose }: ReplyModalProps) {
  const { handleRecordReply, handleClassifyReply, handleAddSuppression, notify, loading } = useApp();
  const [replyText, setReplyText] = useState('');
  const [replySender, setReplySender] = useState(draft?.business_email || '');
  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  if (!draft) return null;

  const handleAnalyzeWithAi = async () => {
    if (!replyText.trim()) {
      notify('Please enter or select a reply message to analyze.', 'error');
      return;
    }
    try {
      setAnalyzingAi(true);
      const res = await handleClassifyReply(
        replyText.trim(),
        draft.contact_name || undefined,
        draft.company_name || undefined,
      );
      if (res) {
        setAiResult(res);
        notify(`AI Analyzed: ${res.sentiment.toUpperCase()} sentiment (${res.intent})`, 'success');
      }
    } finally {
      setAnalyzingAi(false);
    }
  };

  const handleCopySuggested = () => {
    if (!aiResult?.suggested_reply) return;
    navigator.clipboard.writeText(aiResult.suggested_reply);
    setCopied(true);
    notify('Suggested reply copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleRecordReply(draft.id, replyText, replySender);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#29251d]/40 backdrop-blur-xs p-3 sm:p-4 font-sans text-[#29251d] overflow-y-auto">
      <div className="w-full max-w-lg rounded-[28px_20px_30px_18px] border border-[#ddd5c3] bg-[#f5eddf] p-5 sm:p-7 space-y-4 shadow-xl my-8">
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
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[#29251d] font-semibold">Incoming Response Content</label>
              <button
                type="button"
                onClick={handleAnalyzeWithAi}
                disabled={analyzingAi || !replyText.trim()}
                className="text-[11px] font-semibold text-[#35422d] hover:text-[#273320] flex items-center gap-1 disabled:opacity-50 transition-colors"
              >
                <Sparkles size={11} className={analyzingAi ? 'animate-spin' : 'text-[#b9b28b]'} />
                {analyzingAi ? 'Classifying...' : 'AI Analyze Intent'}
              </button>
            </div>
            <textarea
              rows={4}
              value={replyText}
              onChange={(e) => {
                setReplyText(e.target.value);
                setAiResult(null);
              }}
              placeholder="Paste the email reply received from the prospect at founder@ornitech.in..."
              className="w-full rounded-[18px_14px_16px_16px] border border-[#ddd5c3] bg-[#eee6d6]/60 p-3.5 text-[#29251d] outline-none focus:border-[#35422d] text-xs font-sans leading-relaxed"
            />
          </div>

          {/* AI Reply Intelligence Output Card */}
          {aiResult && (
            <div className="p-3.5 rounded-[20px_14px_18px_14px] bg-[#ffffff] border border-[#ddd5c3] space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="font-serif text-xs font-semibold text-[#29251d] flex items-center gap-1.5">
                  <Sparkles size={12} className="text-[#35422d]" /> AI Classification
                </span>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                    aiResult.sentiment === 'positive'
                      ? 'bg-[#10b981]/15 text-[#047857]'
                      : aiResult.should_suppress
                      ? 'bg-[#ef4444]/15 text-[#b91c1c]'
                      : 'bg-[#f59e0b]/15 text-[#b45309]'
                  }`}
                >
                  {aiResult.sentiment} • {aiResult.intent.replace('_', ' ')}
                </span>
              </div>

              <p className="text-[11px] text-[#443b2f] leading-snug">{aiResult.summary}</p>

              {aiResult.should_suppress ? (
                <div className="p-2.5 rounded-[12px] bg-[#fee2e2]/60 border border-[#fecaca] text-[11px] text-[#b91c1c] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <ShieldAlert size={14} className="shrink-0" />
                    <span>Opt-out detected. Submitting will auto-suppress this contact.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddSuppression(draft.business_email || draft.company_name)}
                    className="px-2 py-1 rounded bg-[#ef4444] text-white text-[10px] font-semibold shrink-0"
                  >
                    Suppress Now
                  </button>
                </div>
              ) : aiResult.suggested_reply ? (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#694737] uppercase tracking-wider">
                      Suggested Meeting Booking Response:
                    </span>
                    <button
                      type="button"
                      onClick={handleCopySuggested}
                      className="text-[10px] text-[#35422d] font-semibold hover:underline flex items-center gap-1"
                    >
                      {copied ? <Check size={11} className="text-[#10b981]" /> : <Copy size={11} />}
                      {copied ? 'Copied' : 'Copy Text'}
                    </button>
                  </div>
                  <div className="p-2.5 rounded-[14px_10px_12px_10px] bg-[#f8fafc] border border-[#e2e8f0] text-[11px] text-[#1e293b] font-mono leading-relaxed whitespace-pre-wrap">
                    {aiResult.suggested_reply}
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Quick Template Chips */}
          <div>
            <span className="text-[11px] text-[#694737] font-medium block mb-1.5">Quick Response Templates:</span>
            <div className="flex flex-col gap-1.5">
              {[
                "Hi Ronak, thanks for reaching out. Let's schedule a call this Thursday at 3 PM.",
                "We are interested in the website audit findings. Can you send over a proposal with pricing?",
                "Please unsubscribe me and remove our company from your mailing list.",
              ].map((tmpl, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setReplyText(tmpl);
                    setAiResult(null);
                  }}
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
