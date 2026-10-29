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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#29251d]/40 backdrop-blur-xs p-3 sm:p-4 font-sans text-[#29251d]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-[28px_20px_30px_18px] border border-[#ddd5c3] bg-[#f5eddf] p-5 sm:p-7 space-y-4 shadow-xl"
      >
        <div className="flex items-center justify-between pb-3 border-b border-[#ddd5c3]">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-[#35422d]" />
            <h2 className="font-serif text-lg font-medium text-[#29251d]">Discover & Enrich Leads</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#694737] hover:text-[#29251d] p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-[#443b2f] leading-relaxed">
          Searches approved business directories, Apollo API, and verified registry catalogs for decision makers and website evidence.
        </p>

        <div className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[#29251d] font-semibold mb-1">Search Keywords / Industry</label>
            <input
              type="text"
              required
              value={formData.query}
              onChange={(e) => setFormData({ ...formData, query: e.target.value })}
              placeholder="e.g. B2B Logistics startups in India"
              className="w-full rounded-[16px_12px_14px_18px] border border-[#ddd5c3] bg-[#eee6d6]/60 px-3.5 py-2 text-[#29251d] outline-none focus:border-[#35422d]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#29251d] font-semibold mb-1">Target Market</label>
              <select
                value={formData.market}
                onChange={(e) => setFormData({ ...formData, market: e.target.value })}
                className="w-full rounded-[16px_12px_14px_18px] border border-[#ddd5c3] bg-[#eee6d6]/60 px-3.5 py-2 text-[#29251d] outline-none focus:border-[#35422d]"
              >
                <option value="India">India</option>
                <option value="Global">Global</option>
                <option value="United States">United States</option>
              </select>
            </div>
            <div>
              <label className="block text-[#29251d] font-semibold mb-1">Lead Volume</label>
              <select
                value={formData.limit}
                onChange={(e) => setFormData({ ...formData, limit: Number(e.target.value) })}
                className="w-full rounded-[16px_12px_14px_18px] border border-[#ddd5c3] bg-[#eee6d6]/60 px-3.5 py-2 text-[#29251d] outline-none focus:border-[#35422d]"
              >
                <option value={3}>3 verified leads</option>
                <option value={5}>5 verified leads</option>
                <option value={10}>10 verified leads</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-[#ddd5c3] flex flex-col-reverse sm:flex-row justify-end gap-2 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-[20px_14px_18px_12px] border border-[#ddd5c3] bg-[#eee6d6] text-[#443b2f] hover:bg-[#ddd5c3] text-center font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-4 py-2 rounded-[27px_19px_29px_16px] bg-[#35422d] hover:bg-[#273320] text-[#f5eddf] font-semibold text-center disabled:opacity-50 active:scale-[0.98]"
          >
            {loading ? 'Running Discovery...' : 'Start Discovery'}
          </button>
        </div>
      </form>
    </div>
  );
}
