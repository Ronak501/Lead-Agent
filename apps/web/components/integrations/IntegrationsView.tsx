'use client';

import React, { useState, useEffect } from 'react';
import {
  Key,
  Send,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  RefreshCw,
  Globe,
  Server,
  Mail,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface DnsCheckItem {
  record_type: string;
  status: 'pass' | 'warning' | 'fail';
  title: string;
  detail: string;
  raw_data: string[];
}

interface DnsHealthData {
  domain: string;
  overall_score: number;
  overall_status: 'excellent' | 'good' | 'fair' | 'critical';
  verdict: string;
  checks: DnsCheckItem[];
  recommendations: string[];
}

export function IntegrationsView() {
  const { integrations, API, notify, fetchData, handleCheckDnsHealth } = useApp();
  const [testEmail, setTestEmail] = useState('founder@ornitech.in');
  const [sendingTest, setSendingTest] = useState(false);

  // Deliverability Scanner State
  const [scanDomain, setScanDomain] = useState('ornitech.in');
  const [scanningDns, setScanningDns] = useState(false);
  const [dnsResult, setDnsResult] = useState<DnsHealthData | null>(null);
  const [showRawData, setShowRawData] = useState(false);

  const runDnsScan = async (domainToScan: string) => {
    if (!domainToScan.trim()) return;
    try {
      setScanningDns(true);
      const data = await handleCheckDnsHealth(domainToScan.trim());
      if (data) {
        setDnsResult(data);
        notify(`DNS scan complete: ${data.domain} scored ${data.overall_score}/100 (${data.overall_status.toUpperCase()})`, 'success');
      }
    } finally {
      setScanningDns(false);
    }
  };

  // Run initial scan for ornitech.in
  useEffect(() => {
    runDnsScan('ornitech.in');
  }, []);

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

      {/* Deliverability & DNS Health Scanner Card */}
      <div className="rounded-[28px_20px_30px_18px] border border-[#ddd5c3] bg-[#f5eddf] p-5 sm:p-6 space-y-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-3 rounded-[16px_12px_14px_12px] bg-[#35422d] text-[#f5eddf] shadow-xs shrink-0">
              <ShieldCheck size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-lg font-medium text-[#29251d]">Domain Deliverability &amp; DNS Security Scanner</h2>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#35422d]/15 text-[#35422d] border border-[#35422d]/30">
                  Live DoH
                </span>
              </div>
              <p className="text-xs text-[#443b2f] mt-0.5">
                Inspect SPF, DKIM, DMARC, and MX records to prevent cold emails from landing in the spam folder.
              </p>
            </div>
          </div>

          {/* Domain Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runDnsScan(scanDomain);
            }}
            className="flex items-center gap-2 shrink-0"
          >
            <div className="relative">
              <Globe size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#694737]" />
              <input
                type="text"
                value={scanDomain}
                onChange={(e) => setScanDomain(e.target.value)}
                placeholder="Domain e.g. ornitech.in"
                className="pl-8 pr-3 py-1.5 rounded-[16px_12px_14px_12px] border border-[#ddd5c3] bg-[#ffffff] text-xs font-mono text-[#29251d] focus:outline-none focus:border-[#35422d] w-48 sm:w-56"
              />
            </div>
            <button
              type="submit"
              disabled={scanningDns || !scanDomain.trim()}
              className="px-3.5 py-1.5 rounded-[16px_12px_14px_12px] bg-[#35422d] hover:bg-[#273320] text-[#f5eddf] text-xs font-semibold shadow-xs disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0"
            >
              <RefreshCw size={12} className={scanningDns ? 'animate-spin' : ''} />
              {scanningDns ? 'Scanning...' : 'Scan Health'}
            </button>
          </form>
        </div>

        {/* DNS Scan Results */}
        {dnsResult && (
          <div className="space-y-4 pt-3 border-t border-[#ddd5c3]">
            {/* Top Score Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-[20px_14px_18px_14px] bg-[#eee6d6] border border-[#ddd5c3] gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-serif text-sm font-semibold text-[#29251d]">Health Status:</span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full capitalize ${
                      dnsResult.overall_score >= 90
                        ? 'bg-[#10b981]/20 text-[#047857] border border-[#10b981]/40'
                        : dnsResult.overall_score >= 70
                        ? 'bg-[#3b82f6]/20 text-[#1d4ed8] border border-[#3b82f6]/40'
                        : 'bg-[#f59e0b]/20 text-[#b45309] border border-[#f59e0b]/40'
                    }`}
                  >
                    {dnsResult.overall_status} ({dnsResult.overall_score}/100)
                  </span>
                </div>
                <p className="text-xs text-[#443b2f] leading-relaxed">{dnsResult.verdict}</p>
              </div>

              {/* Score Meter */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right">
                  <div className="font-serif text-2xl font-bold text-[#29251d]">{dnsResult.overall_score}</div>
                  <div className="text-[10px] text-[#694737] uppercase tracking-wider font-semibold">Deliverability Score</div>
                </div>
                <div className="w-12 h-12 rounded-full border-4 border-[#35422d] flex items-center justify-center font-bold text-xs bg-[#ffffff] text-[#35422d] shadow-2xs">
                  {dnsResult.overall_score}%
                </div>
              </div>
            </div>

            {/* Individual Records Checks Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {dnsResult.checks.map((c) => {
                const isPass = c.status === 'pass';
                const isWarning = c.status === 'warning';
                return (
                  <div
                    key={c.record_type}
                    className="p-3.5 rounded-[18px_14px_16px_14px] border border-[#ddd5c3] bg-[#ffffff] space-y-2 shadow-2xs flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#eee6d6] text-[#694737] border border-[#ddd5c3]">
                          {c.record_type}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            isPass
                              ? 'bg-[#10b981]/15 text-[#047857]'
                              : isWarning
                              ? 'bg-[#f59e0b]/15 text-[#b45309]'
                              : 'bg-[#ef4444]/15 text-[#b91c1c]'
                          }`}
                        >
                          {isPass ? <CheckCircle2 size={10} /> : isWarning ? <AlertTriangle size={10} /> : <ShieldAlert size={10} />}
                          {c.status.toUpperCase()}
                        </span>
                      </div>
                      <h4 className="font-serif text-xs font-semibold text-[#29251d]">{c.title}</h4>
                      <p className="text-[11px] text-[#443b2f] mt-1 leading-snug">{c.detail}</p>
                    </div>

                    {c.raw_data && c.raw_data.length > 0 && showRawData && (
                      <div className="mt-2 pt-2 border-t border-[#eee6d6] font-mono text-[9px] text-[#694737] break-all bg-[#f8fafc] p-1.5 rounded">
                        {c.raw_data.slice(0, 2).map((r, idx) => (
                          <div key={idx}>{r}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Recommendations or Raw Data Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <button
                type="button"
                onClick={() => setShowRawData(!showRawData)}
                className="flex items-center gap-1 text-[11px] font-medium text-[#694737] hover:text-[#29251d] transition-colors"
              >
                {showRawData ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                {showRawData ? 'Hide Raw DNS Records' : 'Show Raw DNS Records'}
              </button>

              {dnsResult.recommendations.length > 0 && (
                <div className="text-[11px] text-[#b45309] font-medium flex items-center gap-1">
                  <AlertTriangle size={12} /> {dnsResult.recommendations.length} Optimization Recommended
                </div>
              )}
            </div>

            {dnsResult.recommendations.length > 0 && (
              <div className="p-3 rounded-[16px_12px_14px_12px] bg-[#fef3c7]/60 border border-[#fde68a] text-xs text-[#92400e] space-y-1">
                <span className="font-semibold block">DNS Recommendations:</span>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  {dnsResult.recommendations.map((rec, i) => (
                    <li key={i}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Integration Cards Grid */}
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
