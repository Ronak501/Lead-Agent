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
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-bold text-white">Settings & Suppression Management</h1>
        <p className="text-xs text-zinc-400">Workspace guardrails, daily send thresholds, and opt-out suppression</p>
      </div>

      {/* Suppression List Manager */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-6 space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldAlert size={16} className="text-rose-400 shrink-0" /> Suppression List (Blocklist)
            </h3>
            <p className="text-xs text-zinc-500">
              Emails or entire domains added here are strictly blocked before sending.
            </p>
          </div>
        </div>

        {/* Add Suppression Form */}
        <form onSubmit={onSubmitSuppression} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newSuppressionInput}
            onChange={(e) => setNewSuppressionInput(e.target.value)}
            placeholder="Enter email address (e.g. user@domain.com) or domain (e.g. competitor.com)"
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-200 outline-none focus:border-violet-500"
          />
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold w-full sm:w-auto"
          >
            Block Target
          </button>
        </form>

        {/* Suppression Table */}
        <div className="border border-zinc-800/80 rounded-xl overflow-x-auto text-xs">
          <table className="w-full text-left min-w-[500px] sm:min-w-0">
            <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] font-semibold border-b border-zinc-800">
              <tr>
                <th className="px-4 py-2.5">Blocked Target</th>
                <th className="px-4 py-2.5">Reason</th>
                <th className="px-4 py-2.5">Source</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {suppressions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-zinc-500">
                    Suppression list is empty.
                  </td>
                </tr>
              ) : (
                suppressions.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-800/20">
                    <td className="px-4 py-3 font-mono text-zinc-200">{s.email_normalized}</td>
                    <td className="px-4 py-3 text-zinc-400">{s.reason}</td>
                    <td className="px-4 py-3 text-zinc-500">{s.source}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteSuppression(s.id)}
                        className="text-zinc-500 hover:text-rose-400 transition-colors"
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
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-6 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Users size={16} className="text-emerald-400 shrink-0" /> Sender Identity & Email Sign-Off
          </h3>
          <p className="text-xs text-zinc-500">
            The name and title automatically appended to every AI-generated cold email draft.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-3.5 sm:p-4">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
              Sender Full Name
            </span>
            <span className="text-sm font-semibold text-zinc-100 font-mono">Ronak Talaviya</span>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-3.5 sm:p-4">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
              From Email Address
            </span>
            <span className="text-sm font-semibold text-emerald-400 font-mono break-all">founder@ornitech.in</span>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-3.5 sm:p-4">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
              Title & Organization
            </span>
            <span className="text-sm font-semibold text-zinc-100 font-mono">Founder, Ornitech Solutions</span>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-3.5 sm:p-4">
            <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
              Website URL
            </span>
            <span className="text-sm font-semibold text-violet-400 font-mono break-all">https://ornitech.in</span>
          </div>
        </div>
        <div className="p-3 bg-zinc-950 border border-zinc-800/60 rounded-xl text-xs text-zinc-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>Sending as: <strong className="text-zinc-200">Ronak Talaviya &lt;founder@ornitech.in&gt;</strong></span>
          <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium w-fit">Configured & Active</span>
        </div>
      </div>
    </div>
  );
}

