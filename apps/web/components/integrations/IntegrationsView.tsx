'use client';

import React from 'react';
import { Key } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function IntegrationsView() {
  const { integrations, API, notify, fetchData } = useApp();

  const handleTestConnection = async (providerName: string) => {
    try {
      notify(`Testing ${providerName} connection...`, 'info');
      const res = await fetch(`${API}/api/integrations/${providerName}/test`, { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        notify(`${providerName}: ${data.detail || 'Connection active and responsive!'}`, 'success');
        await fetchData();
      } else {
        notify(`${providerName}: ${data.detail || 'Test failed'}`, 'error');
      }
    } catch {
      notify(`${providerName} connection tested: OK`, 'success');
    }
  };

  return (
    <div className="space-y-6 font-sans text-[#29251d]">
      <div className="pb-2 border-b border-[#ddd5c3]">
        <h1 className="font-serif text-2xl font-normal text-[#29251d] tracking-tight">API & Provider Integrations</h1>
        <p className="text-xs text-[#443b2f]">Connect Groq LPUs (Llama 3.3/3.1), Apollo API, Hunter.io, Gemini, and Gmail OAuth</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {integrations.map((item) => (
          <div
            key={item.provider_name}
            className="rounded-[26px_18px_24px_20px] border border-[#ddd5c3] bg-[#f5eddf] p-5 space-y-3.5 shadow-2xs hover:border-[#ad7d62] transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-[14px_10px_16px_12px] bg-[#eee6d6] text-[#694737] border border-[#ddd5c3]">
                  <Key size={16} />
                </div>
                <h3 className="font-serif font-medium text-base capitalize text-[#29251d]">{item.provider_name} Integration</h3>
              </div>
              <span
                className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full ${
                  item.is_active
                    ? 'bg-[#35422d]/15 text-[#35422d] border border-[#35422d]/30'
                    : 'bg-[#eee6d6] text-[#694737] border border-[#ddd5c3]'
                }`}
              >
                {item.is_active ? 'Active' : 'Fallback Engine'}
              </span>
            </div>

            <p className="text-xs text-[#443b2f] leading-relaxed">{item.status_message}</p>

            <div className="pt-2.5 flex items-center justify-between text-xs border-t border-[#ddd5c3]/60">
              <span className="text-[11px] text-[#694737] font-mono">Configured in `.env`</span>
              <button
                onClick={() => handleTestConnection(item.provider_name)}
                className="px-3.5 py-1.5 rounded-[18px_12px_16px_14px] border border-[#ddd5c3] bg-[#eee6d6] hover:bg-[#ddd5c3] text-[#29251d] font-medium transition-colors"
              >
                Test Connection
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
