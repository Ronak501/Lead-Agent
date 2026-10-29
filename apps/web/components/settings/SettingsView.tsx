'use client';

import React, { useState } from 'react';
import { ShieldAlert, Trash2, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function SettingsView() {
  const { suppressions, handleAddSuppression, handleDeleteSuppression } = useApp();
  const [newSuppressionInput, setNewSuppressionInput] = useState('');

  const onSubmitSuppression = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuppressionInput.trim()) return;
    await handleAddSuppression(newSuppressionInput);
    setNewSuppressionInput('');
  };

  return (
    <div className="space-y-8 font-sans text-[#29251d]">
      <div className="pb-2 border-b border-[#ddd5c3]">
        <h1 className="font-serif text-2xl font-normal text-[#29251d] tracking-tight">Settings & Suppression Management</h1>
        <p className="text-xs text-[#443b2f]">Workspace guardrails, daily send thresholds, and opt-out suppression</p>
      </div>

      {/* Suppression List Manager */}
      <div className="rounded-[28px_20px_30px_18px] border border-[#ddd5c3] bg-[#f5eddf] p-5 sm:p-7 space-y-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-base sm:text-lg font-medium text-[#29251d] flex items-center gap-2">
              <ShieldAlert size={16} className="text-[#694737] shrink-0" /> Suppression List (Blocklist)
            </h3>
            <p className="text-xs text-[#443b2f]">
              Emails or entire domains added here are strictly blocked before sending.
            </p>
          </div>
        </div>

        {/* Add Suppression Form */}
        <form onSubmit={onSubmitSuppression} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={newSuppressionInput}
            onChange={(e) => setNewSuppressionInput(e.target.value)}
            placeholder="Enter email address (e.g. user@domain.com) or domain (e.g. competitor.com)"
            className="flex-1 bg-[#eee6d6]/60 border border-[#ddd5c3] rounded-[18px_14px_16px_16px] px-4 py-2.5 text-xs text-[#29251d] outline-none focus:border-[#35422d]"
          />
          <button
            type="submit"
            className="px-5 py-2.5 rounded-[27px_19px_29px_16px] bg-[#694737] hover:bg-[#53372a] text-[#f5eddf] text-xs font-semibold w-full sm:w-auto shadow-xs active:scale-[0.98]"
          >
            Block Target
          </button>
        </form>

        {/* Suppression Table */}
        <div className="border border-[#ddd5c3] rounded-[22px_18px_24px_16px] overflow-x-auto text-xs bg-[#f5eddf]">
          <table className="w-full text-left min-w-[500px] sm:min-w-0">
            <thead className="bg-[#eee6d6] text-[#443b2f] uppercase text-[10px] font-semibold tracking-wider border-b border-[#ddd5c3]">
              <tr>
                <th className="px-5 py-3">Blocked Target</th>
                <th className="px-5 py-3">Reason</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ddd5c3]/70">
              {suppressions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-8 text-[#443b2f]">
                    Suppression list is empty.
                  </td>
                </tr>
              ) : (
                suppressions.map((s) => (
                  <tr key={s.id} className="hover:bg-[#eee6d6]/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono text-[#29251d] text-[11px]">{s.email_normalized}</td>
                    <td className="px-5 py-3.5 text-[#443b2f]">{s.reason}</td>
                    <td className="px-5 py-3.5 text-[#694737]">{s.source}</td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDeleteSuppression(s.id)}
                        className="text-[#694737] hover:text-[#ad7d62] transition-colors p-1"
                        title="Remove suppression"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sender Profile & Signature */}
      <div className="rounded-[28px_20px_30px_18px] border border-[#ddd5c3] bg-[#f5eddf] p-5 sm:p-7 space-y-5 shadow-sm">
        <div>
          <h3 className="font-serif text-base sm:text-lg font-medium text-[#29251d] flex items-center gap-2">
            <Users size={16} className="text-[#35422d] shrink-0" /> Sender Identity & Email Sign-Off
          </h3>
          <p className="text-xs text-[#443b2f]">
            The name and title automatically appended to every AI-generated cold email draft.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-[20px_16px_22px_14px] border border-[#ddd5c3] bg-[#eee6d6]/60 p-4">
            <span className="text-[10px] font-medium text-[#694737] uppercase tracking-wider block mb-1 font-sans">
              Sender Full Name
            </span>
            <span className="font-serif text-base font-medium text-[#29251d]">Ronak Talaviya</span>
          </div>
          <div className="rounded-[20px_16px_22px_14px] border border-[#ddd5c3] bg-[#eee6d6]/60 p-4">
            <span className="text-[10px] font-medium text-[#694737] uppercase tracking-wider block mb-1 font-sans">
              From Email Address
            </span>
            <span className="text-xs font-mono font-medium text-[#35422d] break-all">founder@ornitech.in</span>
          </div>
          <div className="rounded-[20px_16px_22px_14px] border border-[#ddd5c3] bg-[#eee6d6]/60 p-4">
            <span className="text-[10px] font-medium text-[#694737] uppercase tracking-wider block mb-1 font-sans">
              Title & Organization
            </span>
            <span className="font-serif text-base font-medium text-[#29251d]">Founder, Ornitech Solutions</span>
          </div>
          <div className="rounded-[20px_16px_22px_14px] border border-[#ddd5c3] bg-[#eee6d6]/60 p-4">
            <span className="text-[10px] font-medium text-[#694737] uppercase tracking-wider block mb-1 font-sans">
              Website URL
            </span>
            <span className="text-xs font-mono font-medium text-[#694737] break-all">https://ornitech.in</span>
          </div>
        </div>
        <div className="p-3.5 bg-[#eee6d6] border border-[#ddd5c3] rounded-[18px_14px_16px_16px] text-xs text-[#443b2f] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>Sending as: <strong className="text-[#29251d]">Ronak Talaviya &lt;founder@ornitech.in&gt;</strong></span>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#35422d]/15 text-[#35422d] border border-[#35422d]/30 font-semibold w-fit">
            Configured & Active
          </span>
        </div>
      </div>
    </div>
  );
}
