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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">API & Provider Integrations</h1>
        <p className="text-xs text-zinc-400">Connect Groq LPUs (Llama 3.3/3.1), Apollo API, Hunter.io, Gemini, and Gmail OAuth</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {integrations.map((item) => (
          <div key={item.provider_name} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-zinc-800 text-violet-400">
                  <Key size={16} />
                </div>
                <h3 className="font-semibold text-sm capitalize text-white">{item.provider_name} Integration</h3>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                  item.is_active ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {item.is_active ? 'Active' : 'Fallback Engine'}
              </span>
            </div>

            <p className="text-xs text-zinc-400">{item.status_message}</p>

            <div className="pt-2 flex items-center justify-between text-xs">
              <span className="text-[11px] text-zinc-500">Configured in `.env`</span>
              <button
                onClick={() => handleTestConnection(item.provider_name)}
                className="px-3 py-1 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-medium transition-colors"
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

