'use client';

import React, { useState, useEffect } from 'react';
import { Search, Sparkles, Loader2, Globe, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface DiscoverLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

export function DiscoverLeadsModal({
  isOpen,
  onClose,
  initialQuery = 'B2B Logistics and SaaS startups',
}: DiscoverLeadsModalProps) {
  const { handleDiscoverLeads, loading } = useApp();
  const [formData, setFormData] = useState({
    query: initialQuery,
    market: 'India',
    industry: 'Startups',
    service_target: 'Website redesign',
    limit: 5,
  });

  // Lock body scroll when modal is active to prevent any background scrolling
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await handleDiscoverLeads(formData);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#29251d]/45 backdrop-blur-xs p-4 font-sans text-[#29251d] select-none">
      <div
        className="w-full max-w-lg rounded-[28px_20px_30px_18px] border border-[#ddd5c3] bg-[#f5eddf] p-6 sm:p-7 shadow-2xl overflow-hidden relative"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#ddd5c3]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#eee6d6] text-[#35422d]">
              <Search size={16} />
            </div>
            <h2 className="font-serif text-lg font-medium text-[#29251d]">
              {loading ? 'AI Discovery In Progress' : 'Discover & Enrich Leads'}
            </h2>
          </div>
          {!loading && (
            <button
              type="button"
              onClick={onClose}
              className="text-[#694737] hover:text-[#29251d] p-1 rounded-lg transition-colors text-base"
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>

        {/* ACTIVE DISCOVERY STATE */}
        {loading ? (
          <div className="py-8 px-2 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative flex items-center justify-center">
              <div className="w-14 h-14 rounded-full border-2 border-[#ddd5c3] border-t-[#35422d] animate-spin" />
              <Sparkles size={20} className="absolute text-[#ad7d62] animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-serif text-base font-medium text-[#29251d]">
                Discovering Verified Prospects
              </h3>
              <p className="text-xs text-[#443b2f] max-w-sm leading-relaxed">
                Scanning business registries, identifying verified decision-makers, and testing domain responsiveness in real-time.
              </p>
            </div>

            <div className="w-full max-w-xs space-y-2 pt-2 text-[11px] text-[#694737] font-medium">
              <div className="flex items-center gap-2 bg-[#eee6d6]/70 px-3 py-1.5 rounded-xl border border-[#ddd5c3]">
                <Globe size={13} className="text-[#35422d]" />
                <span>Validating public company domains</span>
              </div>
              <div className="flex items-center gap-2 bg-[#eee6d6]/70 px-3 py-1.5 rounded-xl border border-[#ddd5c3]">
                <ShieldCheck size={13} className="text-[#35422d]" />
                <span>Checking deliverability &amp; verification status</span>
              </div>
            </div>
          </div>
        ) : (
          /* FORM STATE */
          <form onSubmit={handleSubmit} className="space-y-4 pt-3">
            <p className="text-xs text-[#443b2f] leading-relaxed">
              Find high-fit prospects with active domains, verified founder contacts, and live website evidence.
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
                  className="w-full rounded-[16px_12px_14px_18px] border border-[#ddd5c3] bg-[#eee6d6]/60 px-3.5 py-2 text-[#29251d] outline-none focus:border-[#35422d] transition-all"
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
                    <option value="United Kingdom">United Kingdom</option>
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
                className="w-full sm:w-auto px-4 py-2 rounded-[20px_14px_18px_12px] border border-[#ddd5c3] bg-[#eee6d6] text-[#443b2f] hover:bg-[#ddd5c3] text-center font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2 rounded-[27px_19px_29px_16px] bg-[#35422d] hover:bg-[#273320] text-[#f5eddf] font-semibold text-center active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Search size={13} />
                <span>Start Discovery</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
