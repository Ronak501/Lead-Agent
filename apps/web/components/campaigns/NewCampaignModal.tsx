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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6 space-y-4 shadow-2xl"
      >
        <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
          <h2 className="text-base font-bold text-white">Create Prospecting Campaign</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-xs max-h-[70vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Campaign Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-violet-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Target Country</label>
              <select
                value={formData.target_country}
                onChange={(e) => setFormData({ ...formData, target_country: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-violet-500"
              >
                <option value="India">India</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Global">Global</option>
              </select>
            </div>
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Target City / Region</label>
              <input
                type="text"
                value={formData.target_city}
                onChange={(e) => setFormData({ ...formData, target_city: e.target.value })}
                placeholder="e.g. Bangalore, Mumbai, Remote"
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Company Type</label>
              <select
                value={formData.company_type}
                onChange={(e) => setFormData({ ...formData, company_type: e.target.value })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-violet-500"
              >
                <option value="B2B SaaS">B2B SaaS</option>
                <option value="Early-stage Startup">Early-stage Startup</option>
                <option value="Local Business">Local Business</option>
                <option value="Custom Software Buyer">Custom Software Buyer</option>
                <option value="E-commerce">E-commerce</option>
              </select>
            </div>
            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Max Lead Volume</label>
              <input
                type="number"
                min={5}
                max={500}
                value={formData.max_lead_count}
                onChange={(e) => setFormData({ ...formData, max_lead_count: Number(e.target.value) })}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Development Service Offered</label>
            <select
              value={formData.services[0] || 'Website redesign'}
              onChange={(e) => setFormData({ ...formData, services: [e.target.value] })}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-violet-500"
            >
              <option value="Website redesign">Website redesign (Next.js / Performance)</option>
              <option value="Website development">New website development (MVP / Product)</option>
              <option value="Custom SaaS development">Custom SaaS development & Internal tools</option>
              <option value="Landing page optimization">Landing page & Conversion optimization</option>
            </select>
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Target Company Size</label>
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
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Qualification Criteria</label>
            <textarea
              rows={2}
              value={formData.qualification_criteria}
              onChange={(e) => setFormData({ ...formData, qualification_criteria: e.target.value })}
              placeholder="e.g. Sourced founder contact, verified domain, detected website speed or mobile usability issue"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-zinc-300 font-semibold mb-1">Campaign Strategy & Notes</label>
            <textarea
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-violet-500"
            />
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
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-center"
          >
            Create Campaign
          </button>
        </div>
      </form>
    </div>
  );
}

