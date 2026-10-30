'use client';

import React, { useState } from 'react';
import { Key, Send, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function IntegrationsView() {
  const { integrations, API, notify, fetchData } = useApp();
  const [testEmail, setTestEmail] = useState('founder@ornitech.in');
  const [sendingTest, setSendingTest] = useState(false);

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
    } catch (err: any) {
      notify(`Connection error testing ${providerName}: ${err.message || 'Network request failed'}`, 'error');
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail || !testEmail.includes('@')) {
      notify('Please enter a valid recipient email address.', 'error');
      return;
    }
    try {
      setSendingTest(true);
      notify(`Dispatching live test email to ${testEmail}...`, 'info');
      const res = await fetch(`${API}/api/integrations/smtp/test-send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_email: testEmail.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        notify(`🎉 Test email sent successfully to ${testEmail}! Check your inbox.`, 'success');
      } else {
        notify(`Failed to send test email: ${data.detail || 'SMTP send error'}`, 'error');
      }
    } catch (err: any) {
      notify(`Network error sending test email: ${err.message}`, 'error');
    } finally {
      setSendingTest(false);
    }
  };

  return (
    <div className="space-y-6 font-sans text-[#29251d]">
      <div className="pb-2 border-b border-[#ddd5c3]">
        <h1 className="font-serif text-2xl font-normal text-[#29251d] tracking-tight">API &amp; Provider Integrations</h1>
        <p className="text-xs text-[#443b2f]">Connect Groq LPUs, Apollo API, Hunter.io, Gmail SMTP, and IMAP Reply Monitoring</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {integrations.map((item) => (
          <div
            key={item.provider_name}
            className="rounded-[26px_18px_24px_20px] border border-[#ddd5c3] bg-[#f5eddf] p-5 space-y-3.5 shadow-2xs hover:border-[#ad7d62] transition-all flex flex-col justify-between"
          >
            <div className="space-y-3">
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

              {/* Special interactive card for SMTP live testing */}
              {item.provider_name === 'smtp' && item.is_active && (
                <div className="p-3 rounded-[16px_12px_14px_12px] bg-[#eee6d6]/70 border border-[#ddd5c3] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#29251d] text-[11px] flex items-center gap-1.5">
                      <Send size={12} className="text-[#35422d]" /> Live Inbox Test Send
                    </span>
                    <span className="text-[10px] text-[#35422d] font-semibold flex items-center gap-1">
                      <CheckCircle2 size={10} /> TLS Verified
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="Enter test recipient email"
                      className="flex-1 px-3 py-1.5 rounded-[12px] border border-[#ddd5c3] bg-[#ffffff] text-xs text-[#29251d] focus:outline-none focus:border-[#35422d]"
                    />
                    <button
                      onClick={handleSendTestEmail}
                      disabled={sendingTest}
                      className="px-3 py-1.5 rounded-[14px_10px_12px_10px] bg-[#35422d] hover:bg-[#273320] text-[#f5eddf] text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors shrink-0 flex items-center gap-1"
                    >
                      <Send size={11} /> {sendingTest ? 'Sending...' : 'Send Test'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2.5 flex items-center justify-between text-xs border-t border-[#ddd5c3]/60 mt-auto">
              <span className="text-[11px] text-[#694737] font-mono">Configured in `.env`</span>
              <button
                onClick={() => handleTestConnection(item.provider_name)}
                className="px-3.5 py-1.5 rounded-[18px_12px_16px_14px] border border-[#ddd5c3] bg-[#eee6d6] hover:bg-[#ddd5c3] text-[#29251d] font-medium transition-colors"
              >
                Test Handshake
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
