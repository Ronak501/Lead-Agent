'use client';

import React, { useState } from 'react';
import { Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface DiscoverLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export function DiscoverLeadsModal({ isOpen, onClose, initialQuery = 'B2B Logistics and SaaS startups' }: DiscoverLeadsModalProps) {
  const { handleDiscoverLeads, loading } = useApp();
  const [formData, setFormData] = useState({
    query: initialQuery,
    market: 'India',
    industry: 'Startups',
    service_target: 'Website redesign',
    limit: 5,
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await handleDiscoverLeads(formData);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6 space-y-4 shadow-2xl"
      >
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-violet-400" />
            <h2 className="text-base font-bold text-white">Discover & Enrich Leads</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-zinc-400">
          Searches approved business directories, Apollo API, and verified registry catalogs for decision makers and website evidence.
        </p>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Search Keywords / Industry</label>
            <input
              type="text"
              required
              value={formData.query}
              onChange={(e) => setFormData({ ...formData, query: e.target.value })}
              placeholder="e.g. B2B Logistics startups in India"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-violet-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Target Market</label>
              <select
                value={formData.market}
                onChange={(e) => setFormData({ ...formData, market: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-violet-500"
              >
                <option value="India">India</option>
                <option value="Global">Global</option>
                <option value="United States">United States</option>
              </select>
            </div>
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Lead Volume</label>
              <select
                value={formData.limit}
                onChange={(e) => setFormData({ ...formData, limit: Number(e.target.value) })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-violet-500"
              >
                <option value={3}>3 verified leads</option>
                <option value={5}>5 verified leads</option>
                <option value={10}>10 verified leads</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-zinc-800 flex flex-col-reverse sm:flex-row justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 text-center"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-center disabled:opacity-50"
          >
            {loading ? 'Running Discovery...' : 'Start Discovery'}
          </button>
        </div>
      </form>
    </div>
  );
}

