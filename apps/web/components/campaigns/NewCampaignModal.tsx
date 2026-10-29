'use client';

import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';

interface NewCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewCampaignModal({ isOpen, onClose }: NewCampaignModalProps) {
  const { handleCreateCampaign } = useApp();
  const [formData, setFormData] = useState({
    name: 'India & Global Startups — Next.js Upgrades',
    target_country: 'India',
    target_city: 'Bangalore',
    company_type: 'B2B SaaS',
    max_lead_count: 50,
    qualification_criteria: 'Has active domain, detected speed/tech issues, verified decision-maker email',
    target_markets: ['India', 'Global'],
    industries: ['Startups', 'SaaS', 'Logistics'],
    services: ['Website redesign', 'Custom SaaS development'],
    company_sizes: ['1-10', '11-50'],
    notes: 'Prioritize founders facing slow page speed or legacy WordPress stacks.',
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await handleCreateCampaign(formData);
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
          <h2 className="font-serif text-lg font-medium text-[#29251d]">Create Prospecting Campaign</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#694737] hover:text-[#29251d] p-1 rounded-lg"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3.5 text-xs max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-[#29251d] font-semibold mb-1">Campaign Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-[16px_12px_14px_18px] border border-[#ddd5c3] bg-[#eee6d6]/60 px-3.5 py-2 text-[#29251d] outline-none focus:border-[#35422d] focus:ring-1 focus:ring-[#35422d]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#29251d] font-semibold mb-1">Target Country</label>
              <select
                value={formData.target_country}
                onChange={(e) => setFormData({ ...formData, target_country: e.target.value })}
                className="w-full rounded-[16px_12px_14px_18px] border border-[#ddd5c3] bg-[#eee6d6]/60 px-3.5 py-2 text-[#29251d] outline-none focus:border-[#35422d]"
              >
                <option value="India">India</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Global">Global</option>
              </select>
            </div>
            <div>
              <label className="block text-[#29251d] font-semibold mb-1">Target City / Region</label>
              <input
                type="text"
                value={formData.target_city}
                onChange={(e) => setFormData({ ...formData, target_city: e.target.value })}
                placeholder="e.g. Bangalore, Mumbai, Remote"
                className="w-full rounded-[16px_12px_14px_18px] border border-[#ddd5c3] bg-[#eee6d6]/60 px-3.5 py-2 text-[#29251d] outline-none focus:border-[#35422d]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#29251d] font-semibold mb-1">Company Type</label>
              <select
                value={formData.company_type}
                onChange={(e) => setFormData({ ...formData, company_type: e.target.value })}
                className="w-full rounded-[16px_12px_14px_18px] border border-[#ddd5c3] bg-[#eee6d6]/60 px-3.5 py-2 text-[#29251d] outline-none focus:border-[#35422d]"
              >
                <option value="B2B SaaS">B2B SaaS</option>
                <option value="Early-stage Startup">Early-stage Startup</option>
                <option value="Local Business">Local Business</option>
                <option value="Custom Software Buyer">Custom Software Buyer</option>
                <option value="E-commerce">E-commerce</option>
              </select>
            </div>
            <div>
              <label className="block text-[#29251d] font-semibold mb-1">Max Lead Volume</label>
              <input
                type="number"
                min={5}
                max={500}
                value={formData.max_lead_count}
                onChange={(e) => setFormData({ ...formData, max_lead_count: Number(e.target.value) })}
                className="w-full rounded-[16px_12px_14px_18px] border border-[#ddd5c3] bg-[#eee6d6]/60 px-3.5 py-2 text-[#29251d] outline-none focus:border-[#35422d]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#29251d] font-semibold mb-1">Development Service Offered</label>
            <select
              value={formData.services[0] || 'Website redesign'}
              onChange={(e) => setFormData({ ...formData, services: [e.target.value] })}
              className="w-full rounded-[16px_12px_14px_18px] border border-[#ddd5c3] bg-[#eee6d6]/60 px-3.5 py-2 text-[#29251d] outline-none focus:border-[#35422d]"
            >
              <option value="Website redesign">Website redesign (Next.js / Performance)</option>
              <option value="Website development">New website development (MVP / Product)</option>
              <option value="Custom SaaS development">Custom SaaS development & Internal tools</option>
              <option value="Landing page optimization">Landing page & Conversion optimization</option>
            </select>
          </div>

          <div>
            <label className="block text-[#29251d] font-semibold mb-1">Target Company Size</label>
            <input
              type="text"
              value={formData.company_sizes.join(', ')}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  company_sizes: e.target.value.split(',').map((s) => s.trim()),
                })
              }
              placeholder="e.g. 1-10, 11-50, 51-200"
              className="w-full rounded-[16px_12px_14px_18px] border border-[#ddd5c3] bg-[#eee6d6]/60 px-3.5 py-2 text-[#29251d] outline-none focus:border-[#35422d]"
            />
          </div>

          <div>
            <label className="block text-[#29251d] font-semibold mb-1">Qualification Criteria</label>
            <textarea
              rows={2}
              value={formData.qualification_criteria}
              onChange={(e) => setFormData({ ...formData, qualification_criteria: e.target.value })}
              placeholder="e.g. Sourced founder contact, verified domain, detected website speed or mobile usability issue"
              className="w-full rounded-[16px_12px_14px_18px] border border-[#ddd5c3] bg-[#eee6d6]/60 px-3.5 py-2 text-[#29251d] outline-none focus:border-[#35422d]"
            />
          </div>

          <div>
            <label className="block text-[#29251d] font-semibold mb-1">Campaign Strategy & Notes</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full rounded-[16px_12px_14px_18px] border border-[#ddd5c3] bg-[#eee6d6]/60 px-3.5 py-2 text-[#29251d] outline-none focus:border-[#35422d]"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-[#ddd5c3] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <p className="text-[11px] text-[#694737] italic">
            🤖 Fully Autonomous: AI will discover leads, audit websites &amp; dispatch cold emails immediately.
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-[20px_14px_18px_12px] border border-[#ddd5c3] bg-[#eee6d6] text-[#443b2f] hover:bg-[#ddd5c3] text-center font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2 rounded-[27px_19px_29px_16px] bg-[#35422d] hover:bg-[#273320] text-[#f5eddf] font-semibold text-center active:scale-[0.98] shadow-sm flex items-center justify-center gap-1.5"
            >
              <span>🚀</span> Launch Autonomous Campaign
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
