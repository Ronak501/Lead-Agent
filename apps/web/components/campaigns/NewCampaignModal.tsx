'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, Rocket, Globe, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface NewCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewCampaignModal({ isOpen, onClose }: NewCampaignModalProps) {
  const { handleCreateCampaign, loading } = useApp();
  const [formData, setFormData] = useState({
    name: 'India & Global Startups — Next.js Upgrades',
    target_country: 'India',
    target_city: 'Bangalore',
    company_type: 'B2B SaaS',
    max_lead_count: 50,
    qualification_criteria: 'Active domain, detected speed/tech issues, verified decision-maker email',
    target_markets: ['India', 'Global'],
    industries: ['Startups', 'SaaS', 'Logistics'],
    services: ['Website redesign'],
    company_sizes: ['1-10', '11-50'],
    notes: 'Prioritize founders facing slow page speed or legacy WordPress stacks.',
  });

  // Lock body scroll when modal is open
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
    const success = await handleCreateCampaign(formData);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#29251d]/45 backdrop-blur-xs p-4 font-sans text-[#29251d] select-none">
      <div className="w-full max-w-2xl rounded-[28px_20px_30px_18px] border border-[#ddd5c3] bg-[#f5eddf] p-6 sm:p-7 shadow-2xl overflow-hidden relative">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[#ddd5c3]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#eee6d6] text-[#35422d]">
              <Sparkles size={16} />
            </div>
            <h2 className="font-serif text-lg font-medium text-[#29251d]">
              {loading ? 'Launching Autonomous Campaign' : 'Create Autonomous Outreach Campaign'}
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

        {/* ACTIVE AUTONOMOUS LAUNCH STATE */}
        {loading ? (
          <div className="py-8 px-2 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative flex items-center justify-center">
              <div className="w-14 h-14 rounded-full border-2 border-[#ddd5c3] border-t-[#35422d] animate-spin" />
              <Rocket size={20} className="absolute text-[#ad7d62] animate-bounce" />
            </div>

            <div className="space-y-1.5">
              <h3 className="font-serif text-base font-medium text-[#29251d]">
                Autonomous Pipeline Running
              </h3>
              <p className="text-xs text-[#443b2f] max-w-md leading-relaxed">
                LeadPilot AI is discovering prospects matching your criteria, performing live website performance audits, and generating personalized cold outreach...
              </p>
            </div>

            <div className="w-full max-w-sm space-y-2 pt-2 text-[11px] text-[#694737] font-medium">
              <div className="flex items-center gap-2 bg-[#eee6d6]/70 px-3 py-1.5 rounded-xl border border-[#ddd5c3]">
                <Globe size={13} className="text-[#35422d]" />
                <span>Auditing target website speeds &amp; tech stacks</span>
              </div>
              <div className="flex items-center gap-2 bg-[#eee6d6]/70 px-3 py-1.5 rounded-xl border border-[#ddd5c3]">
                <ShieldCheck size={13} className="text-[#35422d]" />
                <span>Auto-signing pitches with SHA-256 for safe dispatch</span>
              </div>
            </div>
          </div>
        ) : (
          /* BALANCED 2-COLUMN FORM (NO INNER SCROLLBAR) */
          <form onSubmit={handleSubmit} className="space-y-4 pt-3 text-xs">
            {/* Top row: Campaign Name */}
            <div>
              <label className="block text-[#29251d] font-semibold mb-1">Campaign Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-[14px_10px_12px_14px] border border-[#ddd5c3] bg-[#eee6d6]/60 px-3.5 py-2 text-[#29251d] outline-none focus:border-[#35422d]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#29251d] font-semibold mb-1">Target Country</label>
                    <select
                      value={formData.target_country}
                      onChange={(e) => setFormData({ ...formData, target_country: e.target.value })}
                      className="w-full rounded-[12px_8px_10px_12px] border border-[#ddd5c3] bg-[#eee6d6]/60 px-2.5 py-1.5 text-[#29251d] outline-none focus:border-[#35422d]"
                    >
                      <option value="India">India</option>
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="Global">Global</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#29251d] font-semibold mb-1">City / Region</label>
                    <input
                      type="text"
                      value={formData.target_city}
                      onChange={(e) => setFormData({ ...formData, target_city: e.target.value })}
                      placeholder="e.g. Bangalore"
                      className="w-full rounded-[12px_8px_10px_12px] border border-[#ddd5c3] bg-[#eee6d6]/60 px-2.5 py-1.5 text-[#29251d] outline-none focus:border-[#35422d]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#29251d] font-semibold mb-1">Company Type</label>
                    <select
                      value={formData.company_type}
                      onChange={(e) => setFormData({ ...formData, company_type: e.target.value })}
                      className="w-full rounded-[12px_8px_10px_12px] border border-[#ddd5c3] bg-[#eee6d6]/60 px-2.5 py-1.5 text-[#29251d] outline-none focus:border-[#35422d]"
                    >
                      <option value="B2B SaaS">B2B SaaS</option>
                      <option value="Early-stage Startup">Early-stage Startup</option>
                      <option value="Local Business">Local Business</option>
                      <option value="E-commerce">E-commerce</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#29251d] font-semibold mb-1">Max Leads</label>
                    <input
                      type="number"
                      min={5}
                      max={100}
                      value={formData.max_lead_count}
                      onChange={(e) => setFormData({ ...formData, max_lead_count: Number(e.target.value) })}
                      className="w-full rounded-[12px_8px_10px_12px] border border-[#ddd5c3] bg-[#eee6d6]/60 px-2.5 py-1.5 text-[#29251d] outline-none focus:border-[#35422d]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#29251d] font-semibold mb-1">Service Offering</label>
                  <select
                    value={formData.services[0] || 'Website redesign'}
                    onChange={(e) => setFormData({ ...formData, services: [e.target.value] })}
                    className="w-full rounded-[12px_8px_10px_12px] border border-[#ddd5c3] bg-[#eee6d6]/60 px-2.5 py-1.5 text-[#29251d] outline-none focus:border-[#35422d]"
                  >
                    <option value="Website redesign">Website redesign (Next.js / Performance)</option>
                    <option value="Website development">New website development (MVP)</option>
                    <option value="Custom SaaS development">Custom SaaS development</option>
                    <option value="Landing page optimization">Landing page &amp; Conversion</option>
                  </select>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-3">
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
                    placeholder="e.g. 1-10, 11-50"
                    className="w-full rounded-[12px_8px_10px_12px] border border-[#ddd5c3] bg-[#eee6d6]/60 px-2.5 py-1.5 text-[#29251d] outline-none focus:border-[#35422d]"
                  />
                </div>

                <div>
                  <label className="block text-[#29251d] font-semibold mb-1">Qualification Criteria</label>
                  <textarea
                    rows={2}
                    value={formData.qualification_criteria}
                    onChange={(e) => setFormData({ ...formData, qualification_criteria: e.target.value })}
                    className="w-full rounded-[12px_8px_10px_12px] border border-[#ddd5c3] bg-[#eee6d6]/60 px-2.5 py-1.5 text-[#29251d] outline-none focus:border-[#35422d] resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[#29251d] font-semibold mb-1">Strategy &amp; Angles</label>
                  <textarea
                    rows={2}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full rounded-[12px_8px_10px_12px] border border-[#ddd5c3] bg-[#eee6d6]/60 px-2.5 py-1.5 text-[#29251d] outline-none focus:border-[#35422d] resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-[#ddd5c3] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <p className="text-[11px] text-[#694737] italic">
                🤖 Fully Autonomous: AI will find leads, audit websites &amp; send cold emails.
              </p>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2 rounded-[20px_14px_18px_12px] border border-[#ddd5c3] bg-[#eee6d6] text-[#443b2f] hover:bg-[#ddd5c3] text-center font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2 rounded-[27px_19px_29px_16px] bg-[#35422d] hover:bg-[#273320] text-[#f5eddf] font-semibold text-center active:scale-[0.98] shadow-sm flex items-center justify-center gap-1.5 transition-all"
                >
                  <Rocket size={14} />
                  <span>Launch Autonomous Campaign</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
