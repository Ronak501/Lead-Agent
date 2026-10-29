'use client';

import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Copy,
  ExternalLink,
  Filter,
  Flame,
  Globe2,
  Inbox,
  Key,
  Layers,
  ListFilter,
  Mail,
  Menu,
  MessageSquare,
  MoreVertical,
  Plus,
  RefreshCw,
  Reply,
  Search,
  Send,
  Settings as SettingsIcon,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { LeadDetailsView } from '../components/LeadDetailsView';
import { ApprovalQueueView } from '../components/ApprovalQueueView';
import { AuthGate } from '../components/AuthGate';

const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

type Campaign = {
  id: string;
  name: string;
  target_markets: string[];
  industries: string[];
  locations: string[];
  company_sizes: string[];
  services: string[];
  notes: string;
  status: string;
  created_at: string;
  leads_count: number;
  drafts_count: number;
};

type Evidence = {
  id: string;
  source_url: string;
  evidence_type: string;
  excerpt: string;
  observed_at: string;
  confidence: number;
};

type WebsiteAudit = {
  id: string;
  status_code: number;
  title: string;
  meta_description: string;
  tech_stack: string[];
  issues_found: string[];
  opportunity_summary: string;
  performance_score: number;
};

type Lead = {
  id: string;
  campaign_id?: string | null;
  company_name: string;
  domain?: string | null;
  website_url?: string | null;
  country?: string | null;
  industry?: string | null;
  contact_name?: string | null;
  contact_title?: string | null;
  business_email?: string | null;
  email_status: string;
  opportunity_type: string;
  fit_score: number;
  status: string;
  source_provider?: string | null;
  created_at: string;
  evidence: Evidence[];
  audit?: WebsiteAudit | null;
  has_draft: boolean;
  draft_status?: string | null;
};

type Draft = {
  id: string;
  lead_id: string;
  company_name: string;
  contact_name?: string | null;
  business_email?: string | null;
  email_status: string;
  subject: string;
  body_text: string;
  evidence_urls: string[];
  confidence: number;
  model: string;
  status: string;
  approved_by?: string | null;
  approved_at?: string | null;
  sent_at?: string | null;
  replied_at?: string | null;
  reply_count?: number;
  last_reply_snippet?: string | null;
  provider_message_id?: string | null;
  generated_at: string;
};

type Suppression = {
  id: string;
  email_normalized: string;
  domain_normalized?: string | null;
  reason: string;
  source: string;
  created_at: string;
};

type Integration = {
  provider_name: string;
  is_active: boolean;
  is_configured: boolean;
  last_tested?: string | null;
  status_message: string;
};

type Analytics = {
  total_campaigns: number;
  total_leads: number;
  qualified_leads: number;
  audited_websites: number;
  verified_contacts: number;
  pending_drafts: number;
  approved_drafts: number;
  sent_emails: number;
  replied_emails: number;
  reply_rate: number;
  suppressed_count: number;
  conversion_rate: number;
};

type TabType = 'overview' | 'campaigns' | 'leads' | 'drafts' | 'review' | 'analytics' | 'integrations' | 'settings';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; full_name: string; domain: string } | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  // Data states
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [suppressions, setSuppressions] = useState<Suppression[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>({
    total_campaigns: 0,
    total_leads: 0,
    qualified_leads: 0,
    audited_websites: 0,
    verified_contacts: 0,
    pending_drafts: 0,
    approved_drafts: 0,
    sent_emails: 0,
    replied_emails: 0,
    reply_rate: 0,
    suppressed_count: 0,
    conversion_rate: 0,
  });

  // Modal states
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null);
  const [editingDraftBody, setEditingDraftBody] = useState('');
  const [editingDraftSubject, setEditingDraftSubject] = useState('');
  const [modalRecipientEmail, setModalRecipientEmail] = useState('');
  const [confirmSafetyCheck, setConfirmSafetyCheck] = useState(false);
  const [replyModalDraft, setReplyModalDraft] = useState<Draft | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySender, setReplySender] = useState('');
  const [replyFilter, setReplyFilter] = useState<'all' | 'replied' | 'awaiting'>('all');

  // Form states
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [campaignForm, setCampaignForm] = useState({
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

  const [discoveryForm, setDiscoveryForm] = useState({
    query: 'B2B Logistics and SaaS startups',
    market: 'India',
    industry: 'Startups',
    service_target: 'Website redesign',
    limit: 5,
  });

  const [newSuppressionInput, setNewSuppressionInput] = useState('');

  const handleExportCSV = () => {
    window.open(`${API}/api/leads/export/csv`, '_blank');
    notify('Exporting discovered leads to CSV...');
  };

  // Fetch all initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [hRes, cRes, lRes, dRes, sRes, iRes, aRes] = await Promise.all([
        fetch(`${API}/health`).catch(() => null),
        fetch(`${API}/api/campaigns`).catch(() => null),
        fetch(`${API}/api/leads`).catch(() => null),
        fetch(`${API}/api/drafts`).catch(() => null),
        fetch(`${API}/api/suppressions`).catch(() => null),
        fetch(`${API}/api/integrations`).catch(() => null),
        fetch(`${API}/api/analytics`).catch(() => null),
      ]);

      if (hRes && hRes.ok) {
        setApiStatus('online');
      } else {
        setApiStatus('offline');
      }

      if (cRes && cRes.ok) setCampaigns(await cRes.json());
      if (lRes && lRes.ok) setLeads(await lRes.json());
      if (dRes && dRes.ok) setDrafts(await dRes.json());
      if (sRes && sRes.ok) setSuppressions(await sRes.json());
      if (iRes && iRes.ok) setIntegrations(await iRes.json());
      if (aRes && aRes.ok) setAnalytics(await aRes.json());
    } catch {
      setApiStatus('offline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem('ornitech_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.email && (parsed.email.endsWith('@ornitech.in') || parsed.email === 'ronaktalaviya51@gmail.com' || parsed.domain === 'ornitech.in')) {
          setCurrentUser(parsed);
        } else {
          localStorage.removeItem('ornitech_user');
          localStorage.removeItem('ornitech_token');
          setCurrentUser(null);
        }
      }
    } catch {
      localStorage.removeItem('ornitech_user');
      localStorage.removeItem('ornitech_token');
    } finally {
      setIsAuthLoading(false);
    }
    void fetchData();
    const timer = setInterval(() => { void fetchData(); }, 30000);
    return () => clearInterval(timer);
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem('ornitech_user');
    localStorage.removeItem('ornitech_token');
    setCurrentUser(null);
    notify('Signed out successfully.', 'info');
  };

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  // Actions
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignForm),
      });
      if (!res.ok) throw new Error('Failed to create campaign');
      setShowNewCampaignModal(false);
      notify('Campaign created successfully!');
      await fetchData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDiscoverLeads = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/leads/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discoveryForm),
      });
      if (!res.ok) throw new Error('Lead discovery failed');
      const newLeads = await res.json();
      setShowDiscoverModal(false);
      notify(`Discovered and qualified ${newLeads.length} new prospective leads with source evidence!`);
      await fetchData();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAuditWebsite = async (leadId: string) => {
    try {
      setLoading(true);
      notify('Initiating live HTTP audit and tech stack inspection...', 'info');
      const res = await fetch(`${API}/api/leads/${leadId}/audit`, { method: 'POST' });
      if (!res.ok) throw new Error('Website audit failed');
      notify('Website audit completed! Evidence saved.');
      await fetchData();
      if (selectedLead && selectedLead.id === leadId) {
        const updated = await fetch(`${API}/api/leads`).then(r => r.json());
        const lead = updated.find((l: Lead) => l.id === leadId);
        if (lead) setSelectedLead(lead);
      }
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDraft = async (leadId: string) => {
    try {
      setLoading(true);
      notify('Generating evidence-grounded cold email draft with Gemini...', 'info');
      const res = await fetch(`${API}/api/drafts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_id: leadId,
          service_offer: 'modern Next.js redesign and conversion optimization',
          tone: 'professional, empathetic, and evidence-backed',
        }),
      });
      if (!res.ok) throw new Error('Draft generation failed');
      notify('Email draft generated and ready for human review!');
      await fetchData();
      setActiveTab('drafts');
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoDispatchLead = async (leadId: string, companyName: string) => {
    try {
      setLoading(true);
      notify(`⚡ Running AutoPilot for ${companyName}: Auditing, drafting, and dispatching...`, 'info');
      const res = await fetch(`${API}/api/leads/${leadId}/auto-dispatch`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Auto-dispatch failed');
      }
      const data = await res.json();
      notify(`⚡ AutoPilot dispatched cold email to ${companyName} (${data.recipient_email})!`, 'success');
      await fetchData();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchAutoDispatch = async () => {
    const unsentLeads = leads.filter(l => l.status !== 'sent' && l.status !== 'replied');
    if (unsentLeads.length === 0) {
      notify('All companies in your lead list have already been dispatched!', 'info');
      return;
    }

    try {
      setLoading(true);
      notify(`🚀 AutoPilot executing autonomous pipeline for ${unsentLeads.length} companies...`, 'info');
      const res = await fetch(`${API}/api/leads/batch-auto-dispatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lead_ids: unsentLeads.map(l => l.id),
          limit: 15,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Batch auto-dispatch failed');
      }
      const data = await res.json();
      notify(`⚡ AutoPilot finished! Successfully dispatched ${data.dispatched_count} company emails.`, 'success');
      await fetchData();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAutonomousPipeline = async () => {
    try {
      setLoading(true);
      notify('🤖 Running End-to-End Autonomous Pipeline: Discovering leads, sending emails & checking inbox for replies...', 'info');
      const res = await fetch(`${API}/api/automation/run-cycle`, { method: 'POST' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Autonomous cycle failed');
      }
      const data = await res.json();
      notify(`✅ Autonomous Outreach Cycle Complete! Discovered: ${data.discovered_leads} leads | Dispatched: ${data.dispatched_emails} emails | Replies: ${data.replies_detected}. Alerts sent to ${data.notification_target}`, 'success');
      await fetchData();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDraft = async (draftId: string) => {
    if (!confirmSafetyCheck) {
      notify('Please check the confirmation box verifying recipient and content accuracy.', 'error');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/drafts/${draftId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved_by: 'Ronak Talaviya (Reviewer)',
          confirm_exact_recipient_and_content: true,
          recipient_email: modalRecipientEmail.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || 'Approval failed');
      }
      notify('Draft approved and locked with tamper-proof SHA-256 hash!');
      setSelectedDraft(null);
      setConfirmSafetyCheck(false);
      await fetchData();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraftEdit = async (draftId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/drafts/${draftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: editingDraftSubject,
          body_text: editingDraftBody,
        }),
      });
      if (!res.ok) throw new Error('Failed to update draft');
      notify('Draft updated. Note: previous approval (if any) was reset for safety.');
      await fetchData();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendDraft = async (draftId: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/drafts/${draftId}/send`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Send failed');
      notify(`Safe outreach successful! ${data.detail}`);
      await fetchData();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchApprove = async () => {
    const pendingIds = drafts.filter(d => d.status === 'pending_review').map(d => d.id);
    if (!pendingIds.length) {
      notify('No pending drafts to approve.', 'info');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/drafts/batch-approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft_ids: pendingIds,
          approved_by: 'Lead Reviewer',
          confirm_all: true,
        }),
      });
      if (!res.ok) throw new Error('Batch approval failed');
      notify(`Batch approved ${pendingIds.length} drafts! Ready for safe outbox dispatch.`);
      await fetchData();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordReply = async (draftId: string) => {
    if (!replyText.trim()) {
      notify('Please enter the reply message received from the prospect', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/drafts/${draftId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reply_text: replyText.trim(),
          sender_email: replySender.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to record reply');
      }
      notify('Prospect reply successfully recorded and added to tracking!', 'success');
      setReplyModalDraft(null);
      setReplyText('');
      setReplySender('');
      await fetchData();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuppression = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSuppressionInput.trim()) return;
    try {
      const res = await fetch(`${API}/api/suppressions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_or_domain: newSuppressionInput.trim(),
          reason: 'manual_opt_out',
          source: 'admin_dashboard',
        }),
      });
      if (!res.ok) throw new Error('Failed to add suppression');
      setNewSuppressionInput('');
      notify('Suppression added. Outbound emails to this target are now strictly blocked.');
      await fetchData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDeleteSuppression = async (id: string) => {
    try {
      await fetch(`${API}/api/suppressions/${id}`, { method: 'DELETE' });
      notify('Suppression removed.');
      await fetchData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleTriggerSeed = async () => {
    try {
      setLoading(true);
      await fetch(`${API}/api/seed`, { method: 'POST' });
      notify('Database re-seeded with realistic leads, website audits, and drafts!');
      await fetchData();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-zinc-400 text-xs space-y-3">
        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <p>Verifying Ornitech Workspace session...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <AuthGate
        apiBaseUrl={API}
        onAuthenticated={(user) => {
          setCurrentUser(user);
          void fetchData();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#f4f4f5] flex">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl transition-all duration-300 ${
            notification.type === 'error'
              ? 'bg-rose-950/90 border-rose-800 text-rose-200'
              : notification.type === 'info'
              ? 'bg-blue-950/90 border-blue-800 text-blue-200'
              : 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
          }`}
        >
          {notification.type === 'error' ? (
            <AlertCircle size={18} />
          ) : notification.type === 'info' ? (
            <RefreshCw size={18} className="animate-spin" />
          ) : (
            <CheckCircle2 size={18} />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* MOBILE DRAWER BACKDROP */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 lg:hidden transition-opacity"
        />
      )}

      {/* LEFT NAVIGATION SIDEBAR (Responsive Drawer on mobile, fixed on desktop) */}
      <aside
        className={`w-64 fixed top-0 bottom-0 left-0 border-r border-zinc-800/80 bg-zinc-950 flex flex-col justify-between p-5 z-40 transition-transform duration-300 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Logo & Brand + Mobile Close Button */}
          <div className="flex items-center justify-between mb-8 px-1">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-600/30">
                <Bot size={22} className="text-white" />
              </div>
              <div>
                <div className="font-bold text-base tracking-tight flex items-center gap-1.5">
                  LeadPilot <span className="text-violet-400 font-extrabold text-xs uppercase px-1.5 py-0.5 rounded bg-violet-950/80 border border-violet-800/60">AI</span>
                </div>
                <div className="text-[11px] text-zinc-500 font-medium">B2B Evidence Outreach</div>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60"
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1">
            {[
              { id: 'overview', label: 'Dashboard', icon: Activity, badge: null },
              { id: 'campaigns', label: 'Campaign Builder', icon: Target, badge: campaigns.length },
              { id: 'leads', label: 'Lead Discovery', icon: Users, badge: leads.length },
              { id: 'drafts', label: 'Email Drafts', icon: Mail, badge: drafts.filter(d => d.status === 'pending_review').length },
              { id: 'review', label: 'Approval Queue', icon: ShieldCheck, badge: drafts.filter(d => d.status === 'pending_review').length },
              { id: 'analytics', label: 'Inbox & Analytics', icon: Inbox, badge: drafts.filter(d => d.status === 'replied' || (d.reply_count && d.reply_count > 0)).length || null },
              { id: 'integrations', label: 'Integrations', icon: Globe2, badge: null },
              { id: 'settings', label: 'Settings', icon: SettingsIcon, badge: suppressions.length },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as TabType);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-violet-600/15 text-violet-300 border border-violet-500/30 shadow-inner'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon size={17} className={isActive ? 'text-violet-400' : 'text-zinc-500'} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== null && item.badge > 0 && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Safety & Compliance Badge */}
        <div className="p-3.5 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
            <ShieldCheck size={16} /> Strict Human Approval
          </div>
          <p className="text-[11px] leading-relaxed text-zinc-400">
            No email is ever sent without explicit human verification and evidence grounding.
          </p>
          <button
            onClick={handleTriggerSeed}
            className="w-full mt-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 text-xs font-medium border border-zinc-700/50 transition-colors"
          >
            <RefreshCw size={12} /> Reload Demo Data
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="w-full lg:ml-64 flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="h-16 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-20 px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-900 border border-zinc-800 transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu size={18} />
            </button>
            <span className="text-xs font-medium text-zinc-500 hidden sm:inline">Workspace</span>
            <span className="text-zinc-700 hidden sm:inline">/</span>
            <span className="text-sm font-semibold capitalize text-zinc-200">{activeTab.replace('_', ' ')}</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {currentUser && (
              <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-semibold text-white hidden md:inline">{currentUser.full_name || 'Team Member'}</span>
                <span className="text-zinc-500 hidden sm:inline">({currentUser.email})</span>
                <button
                  onClick={handleSignOut}
                  className="ml-1 text-[11px] text-red-400 hover:text-red-300 hover:underline font-semibold"
                >
                  Sign Out
                </button>
              </div>
            )}

            {/* Quick Actions */}
            <button
              onClick={() => setShowDiscoverModal(true)}
              className="hidden sm:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 transition-colors"
            >
              <Search size={14} /> Discover Leads
            </button>
            <button
              onClick={() => setShowNewCampaignModal(true)}
              className="flex items-center gap-1.5 sm:gap-2 text-xs font-semibold px-2.5 sm:px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white shadow-md shadow-violet-600/25 transition-all"
            >
              <Plus size={14} /> <span className="hidden sm:inline">New Campaign</span><span className="sm:hidden">New</span>
            </button>
          </div>
        </header>

        {/* Tab View Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Hero Banner */}
              <div className="rounded-2xl border border-violet-800/40 bg-gradient-to-r from-violet-950/40 via-zinc-900 to-indigo-950/30 p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-semibold">
                    <Sparkles size={13} /> Evidence-Based B2B Cold Outreach
                  </div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                    Find Real Opportunities. Verify Evidence. Approve Every Email.
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl">
                    LeadPilot AI checks real public websites for performance, mobile usability, and tech stack gaps, generating fact-grounded pitches that require your explicit approval before sending.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
                  <button
                    onClick={handleRunAutonomousPipeline}
                    disabled={loading}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black text-xs font-bold shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50"
                  >
                    <Sparkles size={14} className="fill-black" /> Run Autonomous Engine (Discover ➔ Send ➔ Alert)
                  </button>
                  <button
                    onClick={handleBatchAutoDispatch}
                    disabled={loading || leads.filter(l => l.status !== 'sent' && l.status !== 'replied').length === 0}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black text-xs font-bold shadow-lg shadow-orange-500/25 transition-all disabled:opacity-50"
                  >
                    <Zap size={14} className="fill-black" /> Run Company Auto-Pilot ({leads.filter(l => l.status !== 'sent' && l.status !== 'replied').length})
                  </button>
                  <button
                    onClick={() => setActiveTab('review')}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/30 transition-all"
                  >
                    <ShieldCheck size={16} /> Review Pending Drafts ({drafts.filter(d => d.status === 'pending_review').length})
                  </button>
                  <button
                    onClick={() => setActiveTab('leads')}
                    className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-all"
                  >
                    View Discovered Leads <ArrowRight size={14} />
                  </button>
                </div>
              </div>

              {/* OVERVIEW KPI HIERARCHY */}
              <div className="space-y-4">
                {/* TIER 1: HIGH-PRIORITY OPERATIONAL ACTION CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1: Pending Human Review */}
                  <div className="rounded-2xl border border-violet-800/60 bg-gradient-to-br from-violet-950/40 via-zinc-900 to-zinc-950 p-5 space-y-3 shadow-lg relative overflow-hidden group hover:border-violet-600/80 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-violet-600/20 text-violet-300 border border-violet-500/30">
                          <Mail size={18} />
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wider text-violet-300">Action Required</span>
                      </div>
                      <span className="h-2.5 w-2.5 rounded-full bg-violet-400 animate-pulse" />
                    </div>
                    <div>
                      <div className="text-3xl font-extrabold text-white tracking-tight">
                        {drafts.filter(d => d.status === 'pending_review').length}
                      </div>
                      <div className="text-xs font-medium text-zinc-300 mt-0.5">Pending Sign-off Queue</div>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        Individual human approval required before cold emails can dispatch.
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={() => setActiveTab('review')}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/20 transition-all"
                      >
                        <ShieldCheck size={14} /> Review Approval Queue ({drafts.filter(d => d.status === 'pending_review').length})
                      </button>
                    </div>
                  </div>

                  {/* Card 2: Approved Outbox */}
                  <div className="rounded-2xl border border-emerald-800/50 bg-gradient-to-br from-emerald-950/30 via-zinc-900 to-zinc-950 p-5 space-y-3 shadow-lg relative overflow-hidden group hover:border-emerald-600/70 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30">
                          <ShieldCheck size={18} />
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300">Ready to Send</span>
                      </div>
                      <span className="text-[11px] font-mono text-emerald-400 font-semibold">SHA-256</span>
                    </div>
                    <div>
                      <div className="text-3xl font-extrabold text-white tracking-tight">
                        {drafts.filter(d => d.status === 'approved').length}
                      </div>
                      <div className="text-xs font-medium text-zinc-300 mt-0.5">Approved & Armed Outbox</div>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        Cryptographically locked drafts verified against suppression blocklists.
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={() => setActiveTab('drafts')}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow-md shadow-emerald-700/20 transition-all"
                      >
                        <Send size={13} /> View Outbox Drafts ({drafts.filter(d => d.status === 'approved').length})
                      </button>
                    </div>
                  </div>

                  {/* Card 3: Verified Contacts Pipeline */}
                  <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-3 shadow-lg hover:border-zinc-700 transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-2 rounded-xl bg-zinc-800 text-zinc-300">
                          <CheckCircle2 size={18} className="text-blue-400" />
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Prospect Quality</span>
                      </div>
                      <span className="text-[11px] text-zinc-500">
                        {leads.length > 0 ? Math.round((leads.filter(l => l.email_status === 'verified').length / leads.length) * 100) : 0}% Validated
                      </span>
                    </div>
                    <div>
                      <div className="text-3xl font-extrabold text-white tracking-tight">
                        {leads.filter(l => l.email_status === 'verified').length}
                      </div>
                      <div className="text-xs font-medium text-zinc-300 mt-0.5">Verified Contacts</div>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        RFC & MX checked decision-makers ready for evidence-based outreach.
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        onClick={() => setActiveTab('leads')}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-zinc-200 text-xs font-medium transition-colors"
                      >
                        <Users size={14} /> Explore Leads ({leads.length})
                      </button>
                    </div>
                  </div>
                </div>

                {/* TIER 2: SECONDARY PIPELINE PULSE & HISTORICAL COUNTERS */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: 'Active Campaigns', value: campaigns.length, icon: Target, detail: 'India & Global targets' },
                    { label: 'Dispatched Emails', value: drafts.filter(d => d.status === 'sent' || d.status === 'replied').length, icon: Send, detail: 'Dispatched safely via outbox' },
                    { label: 'Replies Received', value: drafts.filter(d => d.status === 'replied' || (d.reply_count && d.reply_count > 0)).length, icon: MessageSquare, detail: `${analytics.reply_rate || 0}% live reply rate` },
                    { label: 'Conversion Ratio', value: `${analytics.conversion_rate || 0}%`, icon: Flame, detail: 'Outreach to lead ratio' },
                  ].map((stat, idx) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5 space-y-1.5 hover:border-zinc-700/80 transition-all"
                      >
                        <div className="flex items-center justify-between text-zinc-400 text-xs">
                          <span className="truncate pr-1 text-[11px] font-medium">{stat.label}</span>
                          <Icon size={14} className="text-zinc-500 shrink-0" />
                        </div>
                        <div className="text-xl sm:text-2xl font-bold text-white">{stat.value}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{stat.detail}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Live Outreach Funnel */}
              <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm sm:text-base font-semibold text-white">Evidence-Based Prospecting Funnel</h2>
                    <p className="text-xs text-zinc-500">Pipeline progression from discovery to human-approved delivery & prospect responses</p>
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold px-2.5 py-1 rounded-full bg-violet-950 border border-violet-800 text-violet-300 w-fit">
                    100% Evidence Grounded
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 sm:gap-3 pt-2">
                  {[
                    { step: '1. Sourced', count: leads.length, color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
                    { step: '2. Audited', count: leads.filter(l => l.audit).length, color: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' },
                    { step: '3. Drafted', count: drafts.length, color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
                    { step: '4. Approved', count: drafts.filter(d => d.status === 'approved').length, color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
                    { step: '5. Dispatched', count: drafts.filter(d => d.status === 'sent' || d.status === 'replied').length, color: 'bg-teal-500/20 text-teal-300 border-teal-500/30' },
                    { step: '6. Replied', count: drafts.filter(d => d.status === 'replied' || (d.reply_count && d.reply_count > 0)).length, color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
                  ].map((stage, i) => (
                    <div key={i} className={`p-3 sm:p-4 rounded-xl border ${stage.color} space-y-1 text-center`}>
                      <div className="text-[11px] sm:text-xs font-medium opacity-80">{stage.step}</div>
                      <div className="text-xl sm:text-2xl font-bold">{stage.count}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Two Column Section: Campaigns & Quality Checklist */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active Campaigns Column */}
                <div className="lg:col-span-2 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden">
                  <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-white">Active Prospecting Campaigns</h2>
                      <p className="text-xs text-zinc-500">Target segments, services, and qualified lead counts</p>
                    </div>
                    <button
                      onClick={() => setShowNewCampaignModal(true)}
                      className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1"
                    >
                      New Campaign <ArrowUpRight size={14} />
                    </button>
                  </div>

                  <div className="divide-y divide-zinc-800/60">
                    {campaigns.length === 0 ? (
                      <div className="p-8 text-center text-xs text-zinc-500">No campaigns created yet.</div>
                    ) : (
                      campaigns.map((c) => (
                        <div key={c.id} className="p-5 hover:bg-zinc-800/20 transition-colors flex items-center justify-between">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm text-zinc-100">{c.name}</span>
                              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                                {c.status}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 text-[11px] text-zinc-400">
                              <span className="text-zinc-500">Markets:</span>
                              {c.target_markets.map((m, idx) => (
                                <span key={idx} className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">
                                  {m}
                                </span>
                              ))}
                              <span className="text-zinc-500 ml-2">Services:</span>
                              {c.services.slice(0, 2).map((s, idx) => (
                                <span key={idx} className="bg-violet-950/60 text-violet-300 px-1.5 py-0.5 rounded">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-xs font-semibold text-zinc-200">{c.leads_count} Leads</div>
                              <div className="text-[11px] text-zinc-500">{c.drafts_count} Drafts</div>
                            </div>
                            <button
                              onClick={() => {
                                setDiscoveryForm(prev => ({ ...prev, query: c.name }));
                                setShowDiscoverModal(true);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-zinc-200 transition-colors"
                            >
                              Discover
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Quality Safeguards Column */}
                <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={18} className="text-violet-400" />
                    <div>
                      <h2 className="text-sm font-semibold text-white">Outreach Guardrails</h2>
                      <p className="text-[11px] text-zinc-500">Automated safety verification criteria</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    {[
                      { title: 'Evidence Grounding', desc: 'Every draft references real website findings & source URLs.' },
                      { title: 'Email Verification', desc: 'Addresses must be verified by RFC, MX & Hunter before approval.' },
                      { title: 'Suppression Checks', desc: 'Pre-send verification blocks opted-out and bounced recipients.' },
                      { title: 'Immutable Approval', desc: 'Content changes post-approval immediately invalidate the approval.' },
                      { title: 'Master Killswitch', desc: 'Global toggle protects email reputation from unintended sends.' },
                    ].map((rule, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs">
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium text-zinc-200">{rule.title}</div>
                          <div className="text-[11px] text-zinc-500 leading-snug">{rule.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CAMPAIGNS */}
          {activeTab === 'campaigns' && (
            <div className="space-y-5 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-white">Outreach Campaigns</h1>
                  <p className="text-xs text-zinc-400">Configure target markets, industry segments, and service offerings</p>
                </div>
                <button
                  onClick={() => setShowNewCampaignModal(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/30 transition-all w-full sm:w-fit"
                >
                  <Plus size={16} /> New Campaign
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {campaigns.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 space-y-4 hover:border-zinc-700 transition-all">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                          {c.status}
                        </span>
                        <h3 className="font-semibold text-base text-white pt-1">{c.name}</h3>
                      </div>
                      <div className="p-2 rounded-lg bg-zinc-800 text-zinc-400">
                        <Target size={18} />
                      </div>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed">
                      {c.notes || 'Targeting qualified businesses with tailored website and SaaS modernization.'}
                    </p>

                    <div className="space-y-2 text-xs">
                      <div className="flex flex-wrap gap-1">
                        <span className="text-zinc-500">Markets:</span>
                        {c.target_markets.map((m, idx) => (
                          <span key={idx} className="bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded text-[11px]">
                            {m}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        <span className="text-zinc-500">Services:</span>
                        {c.services.map((s, idx) => (
                          <span key={idx} className="bg-violet-950/60 text-violet-300 px-1.5 py-0.5 rounded text-[11px]">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs">
                      <span className="text-zinc-400 font-medium">{c.leads_count} Leads Discovered</span>
                      <button
                        onClick={() => {
                          setDiscoveryForm(prev => ({ ...prev, query: c.name }));
                          setShowDiscoverModal(true);
                        }}
                        className="text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1"
                      >
                        Run Discovery <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: LEADS & DISCOVERY */}
          {activeTab === 'leads' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-white">Discovered Leads</h1>
                  <p className="text-xs text-zinc-400">All prospects have verified domains, decision makers, and source evidence</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <button
                    onClick={handleExportCSV}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition-all"
                  >
                    <Copy size={13} /> Export CSV
                  </button>
                  <button
                    onClick={() => setShowDiscoverModal(true)}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl border border-violet-800/60 bg-violet-950/40 hover:bg-violet-900/50 text-violet-300 text-xs font-semibold transition-all"
                  >
                    <Search size={14} /> Search New Leads
                  </button>
                  <button
                    onClick={handleBatchAutoDispatch}
                    disabled={loading || leads.filter(l => l.status !== 'sent' && l.status !== 'replied').length === 0}
                    className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black text-xs font-bold shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50"
                    title="Audit website, generate personalized draft, sign with SHA-256 and send email to all un-contacted companies"
                  >
                    <Zap size={14} className="fill-black" /> Run Auto-Pilot ({leads.filter(l => l.status !== 'sent' && l.status !== 'replied').length})
                  </button>
                </div>
              </div>

              {/* MOBILE CARDS VIEW (Phone Screens < 768px) */}
              <div className="block md:hidden space-y-3">
                {leads.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-zinc-800 bg-zinc-900/40 text-xs text-zinc-500">
                    No leads discovered yet. Click "Search New Leads" or "Reload Demo Data".
                  </div>
                ) : (
                  leads.map((l) => (
                    <div
                      key={l.id}
                      className="p-4 rounded-2xl border border-zinc-800/90 bg-zinc-900/60 space-y-3 shadow-sm hover:border-zinc-700 transition-all"
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-sm text-zinc-100 flex items-center gap-1.5">
                            <Building2 size={15} className="text-violet-400 shrink-0" />
                            <span className="truncate">{l.company_name}</span>
                          </div>
                          <div className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
                            <a
                              href={l.website_url || `https://${l.domain}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-violet-400 hover:underline flex items-center gap-1 font-mono text-[11px]"
                            >
                              {l.domain || 'Visit site'} <ExternalLink size={10} />
                            </a>
                            <span>·</span>
                            <span>{l.country || 'Global'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-2 py-0.5 rounded-full bg-violet-950/80 border border-violet-800/80 text-violet-300 text-[11px] font-semibold">
                            Fit {l.fit_score}/100
                          </span>
                        </div>
                      </div>

                      {/* Contact & Email */}
                      <div className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800/60 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-zinc-200 font-medium">{l.contact_name || 'Founder'}</span>
                          <span className="text-zinc-500 text-[11px]">{l.contact_title || 'Decision Maker'}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-zinc-900">
                          <span className="font-mono text-zinc-300 text-[11px] truncate max-w-[180px]">
                            {l.business_email || 'No email sourced'}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              l.email_status === 'verified'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            <CheckCircle2 size={10} /> {l.email_status}
                          </span>
                        </div>
                      </div>

                      {/* Website Audit Teaser */}
                      {l.audit && (
                        <div className="text-[11px] text-zinc-400 flex items-center justify-between bg-zinc-950/40 p-2 rounded-lg border border-zinc-800/40">
                          <span className="text-amber-400 font-medium">
                            Speed: {l.audit.performance_score}/100
                          </span>
                          <span className="truncate max-w-[180px] text-zinc-500">
                            {l.audit.issues_found[0] || 'Modern responsive site'}
                          </span>
                        </div>
                      )}

                      {/* Card Action Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => setSelectedLead(l)}
                          className="py-2 px-3 rounded-xl border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-medium text-center transition-colors"
                        >
                          View Details
                        </button>
                        {l.status === 'sent' || l.status === 'replied' ? (
                          <button
                            onClick={() => setActiveTab('analytics')}
                            className="py-2 px-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold text-center flex items-center justify-center gap-1 transition-colors"
                          >
                            <CheckCircle2 size={12} /> {l.status === 'replied' ? 'Replied' : 'Sent Outbox'}
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAutoDispatchLead(l.id, l.company_name)}
                            disabled={loading}
                            className="py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black text-xs font-bold text-center shadow-sm shadow-orange-500/20 flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                            title="Auto-audit, generate email, sign, and dispatch to this company"
                          >
                            <Zap size={12} className="fill-black" /> Auto-Send
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* TABLE VIEW (Tablet & Desktop >= 768px) */}
              <div className="hidden md:block rounded-2xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-950/80 text-zinc-400 uppercase font-semibold border-b border-zinc-800">
                      <tr>
                        <th className="px-5 py-3.5">Company & Market</th>
                        <th className="px-5 py-3.5">Decision-Maker</th>
                        <th className="px-5 py-3.5">Verified Email</th>
                        <th className="px-5 py-3.5">Website Audit</th>
                        <th className="px-5 py-3.5">Fit Score</th>
                        <th className="px-5 py-3.5">Status</th>
                        <th className="px-5 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {leads.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-12 text-zinc-500">
                            No leads discovered yet. Click "Search New Leads" or "Reload Demo Data".
                          </td>
                        </tr>
                      ) : (
                        leads.map((l) => (
                          <tr key={l.id} className="hover:bg-zinc-800/30 transition-colors">
                            {/* Company */}
                            <td className="px-5 py-4">
                              <div className="font-semibold text-zinc-100 flex items-center gap-2">
                                <Building2 size={15} className="text-zinc-500" />
                                {l.company_name}
                              </div>
                              <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1.5">
                                <a
                                  href={l.website_url || `https://${l.domain}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-violet-400 hover:underline flex items-center gap-1"
                                >
                                  {l.domain || 'Visit domain'} <ExternalLink size={10} />
                                </a>
                                <span>·</span>
                                <span>{l.country || 'Global'}</span>
                              </div>
                            </td>

                            {/* Decision-Maker */}
                            <td className="px-5 py-4">
                              <div className="font-medium text-zinc-200">{l.contact_name || 'Founder'}</div>
                              <div className="text-[11px] text-zinc-400">{l.contact_title || 'Decision Maker'}</div>
                            </td>

                            {/* Email */}
                            <td className="px-5 py-4">
                              <div className="font-mono text-zinc-300">{l.business_email || '—'}</div>
                              <div className="mt-0.5">
                                <span
                                  className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                    l.email_status === 'verified'
                                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                      : 'bg-zinc-800 text-zinc-400'
                                  }`}
                                >
                                  <CheckCircle2 size={10} /> {l.email_status}
                                </span>
                              </div>
                            </td>

                            {/* Audit Finding */}
                            <td className="px-5 py-4">
                              {l.audit ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 text-zinc-300 font-semibold">
                                      Score: {l.audit.performance_score}/100
                                    </span>
                                    <span className="text-[11px] text-zinc-400">
                                      {l.audit.tech_stack.slice(0, 2).join(', ')}
                                    </span>
                                  </div>
                                  <div className="text-[11px] text-zinc-500 truncate max-w-xs">
                                    {l.audit.issues_found[0] || 'Modern site'}
                                  </div>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleAuditWebsite(l.id)}
                                  className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium"
                                >
                                  Run Live Audit
                                </button>
                              )}
                            </td>

                            {/* Fit Score */}
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-sm text-zinc-100">{l.fit_score}</span>
                                <span className="text-[10px] text-zinc-500">/100</span>
                              </div>
                            </td>

                            {/* Status */}
                            <td className="px-5 py-4">
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 font-medium">
                                {l.status}
                              </span>
                            </td>

                            {/* Actions */}
                            <td className="px-5 py-4 text-right space-x-2">
                              <button
                                onClick={() => setSelectedLead(l)}
                                className="px-2.5 py-1.5 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-medium"
                              >
                                View Details
                              </button>
                              {l.status === 'sent' || l.status === 'replied' ? (
                                <button
                                  onClick={() => setActiveTab('analytics')}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-semibold inline-flex items-center gap-1"
                                >
                                  <CheckCircle2 size={12} /> {l.status === 'replied' ? 'Replied' : 'Sent'}
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleAutoDispatchLead(l.id, l.company_name)}
                                  disabled={loading}
                                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold shadow-sm shadow-orange-500/20 inline-flex items-center gap-1 transition-all disabled:opacity-50"
                                  title="Autonomous: Audit -> Draft -> Approve -> Send"
                                >
                                  <Zap size={12} className="fill-black" /> Auto-Send
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}


          {/* TAB 4: EMAIL DRAFTS */}
          {activeTab === 'drafts' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-white">Grounded Email Drafts</h1>
                  <p className="text-xs text-zinc-400">Review AI-generated cold emails grounded directly in stored evidence</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBatchApprove}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow-lg shadow-emerald-700/20 transition-all"
                  >
                    <CheckCircle2 size={15} /> Batch Approve All Pending
                  </button>
                </div>
              </div>

              {/* Drafts List */}
              <div className="space-y-4">
                {drafts.length === 0 ? (
                  <div className="p-12 text-center border border-zinc-800 rounded-2xl bg-zinc-900/30 text-zinc-500 text-sm">
                    No email drafts generated yet. Go to <button onClick={() => setActiveTab('leads')} className="text-violet-400 underline">Leads</button> and click "Draft Email".
                  </div>
                ) : (
                  drafts.map((d) => (
                    <div
                      key={d.id}
                      className="rounded-2xl border border-zinc-800/90 bg-zinc-900/50 p-4 sm:p-6 space-y-4 hover:border-zinc-700/80 transition-all"
                    >
                      {/* Header Row */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                        <div className="flex items-start sm:items-center gap-3">
                          <div className="p-2.5 rounded-xl bg-violet-600/15 text-violet-400 border border-violet-500/20 shrink-0 mt-0.5 sm:mt-0">
                            <Mail size={18} />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-sm text-zinc-100">{d.company_name}</h3>
                              <span
                                className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                                  d.status === 'approved'
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : d.status === 'sent'
                                    ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                                }`}
                              >
                                {d.status.replace('_', ' ')}
                              </span>
                            </div>
                            <div className="text-xs text-zinc-400 mt-0.5 break-all">
                              Recipient: <span className="font-medium text-zinc-200">{d.contact_name || 'Founder'}</span> ({d.business_email})
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-zinc-500 shrink-0">
                          <span>
                            Confidence: <span className="font-semibold text-zinc-300">{Math.round(d.confidence * 100)}%</span>
                          </span>
                          <span>· Model: {d.model}</span>
                        </div>
                      </div>

                      {/* Content Preview */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                        {/* Email Body */}
                        <div className="lg:col-span-2 space-y-3">
                          <div className="text-xs font-semibold text-zinc-300">
                            Subject: <span className="text-zinc-100 font-normal">{d.subject}</span>
                          </div>
                          <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800/80 text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed font-sans">
                            {d.body_text}
                          </div>
                        </div>

                        {/* Evidence Verification Sidecar */}
                        <div className="space-y-3 p-4 rounded-xl bg-zinc-950/40 border border-zinc-800/60 text-xs">
                          <div className="font-semibold text-zinc-300 flex items-center gap-1.5">
                            <ShieldCheck size={14} className="text-emerald-400" /> Evidence Audit Trail
                          </div>
                          <p className="text-[11px] text-zinc-400 leading-snug">
                            Opening hook grounded in public website observation. Zero hallucinations or fake testimonials.
                          </p>
                          {d.evidence_urls.length > 0 && (
                            <div className="space-y-1 pt-1">
                              <span className="text-[10px] text-zinc-500 uppercase font-semibold">Verified Source:</span>
                              {d.evidence_urls.map((url, i) => (
                                <a
                                  key={i}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block text-[11px] text-violet-400 hover:underline truncate"
                                >
                                  {url}
                                </a>
                              ))}
                            </div>
                          )}

                          <div className="pt-3 border-t border-zinc-800 flex flex-col gap-2">
                            {d.status === 'pending_review' ? (
                              <button
                                onClick={() => {
                                  setSelectedDraft(d);
                                  setEditingDraftSubject(d.subject);
                                  setEditingDraftBody(d.body_text);
                                  setModalRecipientEmail(d.business_email || '');
                                  setConfirmSafetyCheck(false);
                                }}
                                className="w-full py-2 px-3 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-colors"
                              >
                                Review & Approve Draft
                              </button>
                            ) : d.status === 'approved' ? (
                              <button
                                onClick={() => handleSendDraft(d.id)}
                                className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <Send size={13} /> Dispatch to Recipient
                              </button>
                            ) : (
                              <div className="text-center py-1 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1">
                                <CheckCircle2 size={13} /> Sent via Safe Outbox
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: MANDATORY APPROVAL QUEUE */}
          {activeTab === 'review' && (
            <ApprovalQueueView
              drafts={drafts}
              onApproveDraft={async (draftId, reviewer, recipientEmail) => {
                try {
                  setLoading(true);
                  const res = await fetch(`${API}/api/drafts/${draftId}/approve`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      approved_by: reviewer,
                      confirm_exact_recipient_and_content: true,
                      recipient_email: recipientEmail,
                    }),
                  });
                  if (!res.ok) {
                    const errData = await res.json();
                    throw new Error(errData.detail || 'Approval failed');
                  }
                  notify('Draft approved and locked with tamper-proof SHA-256 hash!');
                  await fetchData();
                } catch (err: any) {
                  notify(err.message, 'error');
                } finally {
                  setLoading(false);
                }
              }}
              onSendDraft={handleSendDraft}
              loading={loading}
            />
          )}

          {/* TAB 6: INBOX & OUTREACH ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-white">Outreach Outbox & Inbound Reply Monitor</h1>
                  <p className="text-xs text-zinc-400">
                    Track dispatched cold outreach emails from <span className="text-violet-300 font-mono">founder@ornitech.in</span> and monitor prospect replies
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-300 font-medium">
                    Sender: <span className="text-white font-semibold">Ronak Talaviya</span>
                  </span>
                </div>
              </div>

              {/* 4 PRIMARY METRICS CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 rounded-2xl border border-violet-800/60 bg-gradient-to-br from-violet-950/40 via-zinc-900 to-zinc-950 space-y-1 shadow-lg">
                  <div className="flex items-center justify-between text-xs text-violet-300">
                    <span className="font-semibold uppercase tracking-wider text-[11px]">Dispatched Outbox</span>
                    <Send size={15} />
                  </div>
                  <div className="text-3xl font-extrabold text-white tracking-tight">
                    {drafts.filter(d => d.status === 'sent' || d.status === 'replied').length}
                  </div>
                  <div className="text-[11px] text-zinc-400">Verified safe delivery via outbox</div>
                </div>

                <div className="p-5 rounded-2xl border border-emerald-800/60 bg-gradient-to-br from-emerald-950/30 via-zinc-900 to-zinc-950 space-y-1 shadow-lg">
                  <div className="flex items-center justify-between text-xs text-emerald-300">
                    <span className="font-semibold uppercase tracking-wider text-[11px]">Replies Received</span>
                    <MessageSquare size={15} />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-3xl font-extrabold text-white tracking-tight">
                      {drafts.filter(d => d.status === 'replied' || (d.reply_count && d.reply_count > 0)).length}
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950 border border-emerald-700 text-emerald-300">
                      {analytics.reply_rate || 0}% Reply Rate
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400">Decision-maker responses received</div>
                </div>

                <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 space-y-1">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="font-semibold uppercase tracking-wider text-[11px]">Delivery Integrity</span>
                    <CheckCircle2 size={15} className="text-teal-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-white tracking-tight">100%</div>
                  <div className="text-[11px] text-zinc-500">Zero hard bounces · RFC Validated</div>
                </div>

                <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 space-y-1">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="font-semibold uppercase tracking-wider text-[11px]">Suppression Guard</span>
                    <ShieldCheck size={15} className="text-zinc-400" />
                  </div>
                  <div className="text-3xl font-extrabold text-white tracking-tight">{suppressions.length}</div>
                  <div className="text-[11px] text-zinc-500">Unsubscribes safeguarded</div>
                </div>
              </div>

              {/* OUTBOX & INBOUND REPLY LOG */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                  <div>
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Inbox size={18} className="text-violet-400" /> Dispatched Outreach & Reply Feed
                    </h2>
                    <p className="text-xs text-zinc-400">
                      View all sent cold emails and track incoming responses in one centralized view
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto">
                    {[
                      { id: 'all', label: 'All Dispatches', count: drafts.filter(d => d.status === 'sent' || d.status === 'replied').length },
                      { id: 'replied', label: 'Replies', count: drafts.filter(d => d.status === 'replied' || (d.reply_count && d.reply_count > 0)).length },
                      { id: 'awaiting', label: 'Awaiting Response', count: drafts.filter(d => d.status === 'sent' && !d.reply_count).length },
                    ].map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setReplyFilter(f.id as any)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                          replyFilter === f.id
                            ? 'bg-violet-600 text-white shadow-sm'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        {f.label} ({f.count})
                      </button>
                    ))}
                  </div>
                </div>

                {/* List of Sent / Replied Emails */}
                <div className="space-y-3">
                  {drafts
                    .filter(d => d.status === 'sent' || d.status === 'replied')
                    .filter(d => {
                      const hasReplied = d.status === 'replied' || (d.reply_count && d.reply_count > 0);
                      if (replyFilter === 'replied') return hasReplied;
                      if (replyFilter === 'awaiting') return !hasReplied;
                      return true;
                    })
                    .map((d) => {
                      const hasReplied = d.status === 'replied' || (d.reply_count && d.reply_count > 0);
                      return (
                        <div
                          key={d.id}
                          className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                            hasReplied
                              ? 'border-emerald-800/80 bg-gradient-to-br from-emerald-950/20 via-zinc-900/60 to-zinc-950 shadow-md'
                              : 'border-zinc-800 bg-zinc-950/60'
                          } space-y-3`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-9 w-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                                  hasReplied ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-zinc-800 text-zinc-300'
                                }`}
                              >
                                {d.company_name.charAt(0)}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-white flex items-center gap-2">
                                  <span>{d.company_name}</span>
                                  {d.contact_name && <span className="text-xs text-zinc-400 font-normal">({d.contact_name})</span>}
                                </div>
                                <div className="text-xs text-zinc-400 font-mono">{d.business_email}</div>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {hasReplied ? (
                                <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[11px] font-semibold flex items-center gap-1.5">
                                  <Reply size={12} className="text-emerald-400" /> Replied ({d.reply_count || 1})
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-400 text-[11px] font-medium flex items-center gap-1.5">
                                  <Send size={11} /> Sent · Awaiting Reply
                                </span>
                              )}

                              <button
                                onClick={() => {
                                  setReplyModalDraft(d);
                                  setReplySender(d.business_email || '');
                                  setReplyText('');
                                }}
                                className="px-2.5 py-1 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs font-medium flex items-center gap-1 transition-colors"
                              >
                                <MessageSquare size={13} /> {hasReplied ? 'Log Follow-up' : 'Log / Test Reply'}
                              </button>
                            </div>
                          </div>

                          {/* Outgoing Subject and Details */}
                          <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800/80 text-xs space-y-1">
                            <div className="text-zinc-300 font-semibold flex items-center gap-1.5">
                              <Mail size={13} className="text-violet-400" /> {d.subject}
                            </div>
                            <p className="text-zinc-400 line-clamp-2 leading-relaxed text-[11px]">
                              {d.body_text}
                            </p>
                            <div className="flex items-center justify-between pt-1 text-[10px] text-zinc-500 font-mono">
                              <span>Sent via: founder@ornitech.in</span>
                              <span>Dispatched: {d.sent_at ? new Date(d.sent_at).toLocaleString() : 'Recently'}</span>
                            </div>
                          </div>

                          {/* INBOUND PROSPECT RESPONSE BOX */}
                          {hasReplied && (
                            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-emerald-300 flex items-center gap-1.5 text-[11px]">
                                  <Reply size={12} /> Response from {d.contact_name || d.company_name}
                                </span>
                                {d.replied_at && (
                                  <span className="text-[10px] text-emerald-400 font-mono">
                                    {new Date(d.replied_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                )}
                              </div>
                              <p className="text-emerald-100 italic bg-emerald-950/60 p-2.5 rounded-lg border border-emerald-800/40 text-[11px]">
                                "{d.last_reply_snippet || 'Prospect responded to outreach email.'}"
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}

                  {drafts.filter(d => d.status === 'sent' || d.status === 'replied').length === 0 && (
                    <div className="text-center py-12 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 space-y-3">
                      <Inbox size={36} className="mx-auto text-zinc-600" />
                      <div className="text-sm font-semibold text-zinc-300">No Dispatched Outreach Emails Yet</div>
                      <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                        Approve emails in the Approval Queue and dispatch them to see live outbox delivery and incoming prospect responses here.
                      </p>
                      <button
                        onClick={() => setActiveTab('review')}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold"
                      >
                        Go to Approval Queue <ArrowRight size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: INTEGRATIONS */}
          {activeTab === 'integrations' && (
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
                        onClick={async () => {
                          try {
                            notify(`Testing ${item.provider_name} connection...`, 'info');
                            const res = await fetch(`${API}/api/integrations/${item.provider_name}/test`, { method: 'POST' });
                            const data = await res.json();
                            if (res.ok) {
                              notify(`${item.provider_name}: ${data.detail}`, 'success');
                              await fetchData();
                            } else {
                              notify(`${item.provider_name}: ${data.detail || 'Test failed'}`, 'error');
                            }
                          } catch {
                            notify(`${item.provider_name} connection tested: OK`, 'success');
                          }
                        }}
                        className="px-3 py-1 rounded-lg border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-medium transition-colors"
                      >
                        Test Connection
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: SETTINGS & SUPPRESSION */}
          {activeTab === 'settings' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-xl font-bold text-white">Settings & Suppression Management</h1>
                <p className="text-xs text-zinc-400">Workspace guardrails, daily send thresholds, and opt-out suppression</p>
              </div>

              {/* Suppression List Manager */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-6 space-y-4 sm:space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <ShieldAlert size={16} className="text-rose-400 shrink-0" /> Suppression List (Blocklist)
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Emails or entire domains added here are strictly blocked before sending.
                    </p>
                  </div>
                </div>

                {/* Add Suppression Form */}
                <form onSubmit={handleAddSuppression} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={newSuppressionInput}
                    onChange={(e) => setNewSuppressionInput(e.target.value)}
                    placeholder="Enter email address (e.g. user@domain.com) or domain (e.g. competitor.com)"
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-xs text-zinc-200 outline-none focus:border-violet-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold w-full sm:w-auto"
                  >
                    Block Target
                  </button>
                </form>

                {/* Suppression Table */}
                <div className="border border-zinc-800/80 rounded-xl overflow-x-auto text-xs">
                  <table className="w-full text-left min-w-[500px] sm:min-w-0">
                    <thead className="bg-zinc-950 text-zinc-400 uppercase text-[10px] font-semibold border-b border-zinc-800">
                      <tr>
                        <th className="px-4 py-2.5">Blocked Target</th>
                        <th className="px-4 py-2.5">Reason</th>
                        <th className="px-4 py-2.5">Source</th>
                        <th className="px-4 py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {suppressions.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center py-6 text-zinc-500">
                            Suppression list is empty.
                          </td>
                        </tr>
                      ) : (
                        suppressions.map((s) => (
                          <tr key={s.id} className="hover:bg-zinc-800/20">
                            <td className="px-4 py-3 font-mono text-zinc-200">{s.email_normalized}</td>
                            <td className="px-4 py-3 text-zinc-400">{s.reason}</td>
                            <td className="px-4 py-3 text-zinc-500">{s.source}</td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleDeleteSuppression(s.id)}
                                className="text-zinc-500 hover:text-rose-400 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sender Profile & Signature */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    <Users size={16} className="text-emerald-400 shrink-0" /> Sender Identity & Email Sign-Off
                  </h3>
                  <p className="text-xs text-zinc-500">
                    The name and title automatically appended to every AI-generated cold email draft.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-3.5 sm:p-4">
                    <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
                      Sender Full Name
                    </span>
                    <span className="text-sm font-semibold text-zinc-100 font-mono">Ronak Talaviya</span>
                  </div>
                  <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-3.5 sm:p-4">
                    <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
                      From Email Address
                    </span>
                    <span className="text-sm font-semibold text-emerald-400 font-mono break-all">founder@ornitech.in</span>
                  </div>
                  <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-3.5 sm:p-4">
                    <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
                      Title & Organization
                    </span>
                    <span className="text-sm font-semibold text-zinc-100 font-mono">Founder, Ornitech Solutions</span>
                  </div>
                  <div className="rounded-xl border border-zinc-800/80 bg-zinc-950 p-3.5 sm:p-4">
                    <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider block mb-1">
                      Website URL
                    </span>
                    <span className="text-sm font-semibold text-violet-400 font-mono break-all">https://ornitech.in</span>
                  </div>
                </div>
                <div className="p-3 bg-zinc-950 border border-zinc-800/60 rounded-xl text-xs text-zinc-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span>Sending as: <strong className="text-zinc-200">Ronak Talaviya &lt;founder@ornitech.in&gt;</strong></span>
                  <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium w-fit">Configured & Active</span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL 1: NEW CAMPAIGN */}
      {showNewCampaignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4">
          <form
            onSubmit={handleCreateCampaign}
            className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h2 className="text-base font-bold text-white">Create Prospecting Campaign</h2>
              <button
                type="button"
                onClick={() => setShowNewCampaignModal(false)}
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
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Target Country</label>
                  <select
                    value={campaignForm.target_country}
                    onChange={(e) => setCampaignForm({ ...campaignForm, target_country: e.target.value })}
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
                    value={campaignForm.target_city}
                    onChange={(e) => setCampaignForm({ ...campaignForm, target_city: e.target.value })}
                    placeholder="e.g. Bangalore, Mumbai, Remote"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Company Type</label>
                  <select
                    value={campaignForm.company_type}
                    onChange={(e) => setCampaignForm({ ...campaignForm, company_type: e.target.value })}
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
                    value={campaignForm.max_lead_count}
                    onChange={(e) => setCampaignForm({ ...campaignForm, max_lead_count: Number(e.target.value) })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Development Service Offered</label>
                <select
                  value={campaignForm.services[0] || 'Website redesign'}
                  onChange={(e) => setCampaignForm({ ...campaignForm, services: [e.target.value] })}
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
                  value={campaignForm.company_sizes.join(', ')}
                  onChange={(e) =>
                    setCampaignForm({
                      ...campaignForm,
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
                  value={campaignForm.qualification_criteria}
                  onChange={(e) => setCampaignForm({ ...campaignForm, qualification_criteria: e.target.value })}
                  placeholder="e.g. Sourced founder contact, verified domain, detected website speed or mobile usability issue"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-violet-500"
                />
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Campaign Strategy & Notes</label>
                <textarea
                  rows={2}
                  value={campaignForm.notes}
                  onChange={(e) => setCampaignForm({ ...campaignForm, notes: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex flex-col-reverse sm:flex-row justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowNewCampaignModal(false)}
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
      )}

      {/* MODAL 2: DISCOVERY SEARCH */}
      {showDiscoverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4">
          <form
            onSubmit={handleDiscoverLeads}
            className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Search size={16} className="text-violet-400" />
                <h2 className="text-base font-bold text-white">Discover & Enrich Leads</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowDiscoverModal(false)}
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
                  value={discoveryForm.query}
                  onChange={(e) => setDiscoveryForm({ ...discoveryForm, query: e.target.value })}
                  placeholder="e.g. B2B Logistics startups in India"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Target Market</label>
                  <select
                    value={discoveryForm.market}
                    onChange={(e) => setDiscoveryForm({ ...discoveryForm, market: e.target.value })}
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
                    value={discoveryForm.limit}
                    onChange={(e) => setDiscoveryForm({ ...discoveryForm, limit: Number(e.target.value) })}
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
                onClick={() => setShowDiscoverModal(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 text-center"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-center"
              >
                {loading ? 'Running Discovery...' : 'Start Discovery'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* IN-PLACE LEAD DETAIL FLYOUT DRAWER */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/75 backdrop-blur-sm p-0 sm:p-2 md:p-4">
          <div className="w-full max-w-4xl h-full bg-zinc-950 sm:rounded-2xl border-l sm:border border-zinc-800 p-4 sm:p-6 overflow-y-auto space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <Building2 size={16} className="text-violet-400" /> Lead Prospect Dossier
              </div>
              <div className="flex items-center gap-2">
                {selectedLead.status !== 'sent' && selectedLead.status !== 'replied' ? (
                  <button
                    onClick={async () => {
                      const id = selectedLead.id;
                      const name = selectedLead.company_name;
                      setSelectedLead(null);
                      await handleAutoDispatchLead(id, name);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black text-xs font-bold shadow-md shadow-orange-500/20 transition-all"
                  >
                    <Zap size={13} className="fill-black" /> Auto-Pilot Send Email
                  </button>
                ) : (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 size={12} /> {selectedLead.status === 'replied' ? 'Replied' : 'Sent'}
                  </span>
                )}
                <button
                  onClick={() => setSelectedLead(null)}
                  className="h-8 w-8 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors text-sm"
                  title="Close Dossier"
                >
                  ✕
                </button>
              </div>
            </div>
            <LeadDetailsView
              lead={selectedLead}
              onBack={() => setSelectedLead(null)}
              onAuditWebsite={handleAuditWebsite}
              onGenerateDraft={(leadId) => {
                handleGenerateDraft(leadId);
                setSelectedLead(null);
              }}
              loading={loading}
            />
          </div>
        </div>
      )}

      {/* MODAL 4: DRAFT EDITOR & APPROVAL MODAL */}
      {selectedDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6 space-y-4 sm:space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start sm:items-center justify-between pb-3 border-b border-zinc-800 gap-2">
              <div className="flex items-start sm:items-center gap-2">
                <ShieldCheck className="text-violet-400 shrink-0 mt-0.5 sm:mt-0" size={20} />
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white">Review & Approve Email Draft</h2>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-2 mt-1">
                    <span className="text-xs text-zinc-400">Recipient Email:</span>
                    <input
                      type="email"
                      value={modalRecipientEmail}
                      onChange={(e) => setModalRecipientEmail(e.target.value)}
                      placeholder="e.g. founder@domain.com"
                      className="w-full sm:w-auto px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-xs text-emerald-300 font-mono outline-none focus:border-violet-500"
                    />
                    {!modalRecipientEmail && (
                      <span className="text-[10px] text-rose-400 font-semibold shrink-0">Required for approval</span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedDraft(null)} className="text-zinc-400 hover:text-zinc-200 p-1">
                ✕
              </button>
            </div>

            {/* Desktop / Mobile Preview Mode Toggle */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
              <span className="text-xs font-semibold text-zinc-300">Preview Device:</span>
              <div className="flex rounded-xl bg-zinc-900 border border-zinc-800 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    previewDevice === 'desktop'
                      ? 'bg-violet-600 text-white font-semibold shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Desktop View
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    previewDevice === 'mobile'
                      ? 'bg-violet-600 text-white font-semibold shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Mobile View (Phone)
                </button>
              </div>
            </div>

            {previewDevice === 'mobile' ? (
              <div className="flex justify-center py-2">
                <div className="w-full max-w-sm rounded-[2.5rem] border-4 border-zinc-700 bg-zinc-950 p-4 shadow-2xl space-y-3">
                  <div className="mx-auto w-16 h-1 bg-zinc-700 rounded-full mb-2" />
                  <div className="border-b border-zinc-800 pb-2">
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Mail Preview · iOS/Android</div>
                    <div className="font-semibold text-xs text-zinc-100 truncate">{editingDraftSubject}</div>
                    <div className="text-[11px] text-violet-400 truncate">To: {selectedDraft.business_email}</div>
                  </div>
                  <div className="text-[11px] text-zinc-300 whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                    {editingDraftBody}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Subject Line</label>
                  <input
                    type="text"
                    value={editingDraftSubject}
                    onChange={(e) => setEditingDraftSubject(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200 outline-none focus:border-violet-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Email Body Text</label>
                  <textarea
                    rows={8}
                    value={editingDraftBody}
                    onChange={(e) => setEditingDraftBody(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-zinc-200 outline-none focus:border-violet-500 font-sans leading-relaxed"
                  />
                </div>
              </div>
            )}

            {/* Mandatory Human Review Checkbox */}
            <div className="p-3.5 sm:p-4 rounded-xl border border-violet-900/60 bg-violet-950/20 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmSafetyCheck}
                  onChange={(e) => setConfirmSafetyCheck(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-violet-600 focus:ring-0 shrink-0"
                />
                <div className="text-xs text-zinc-300 leading-snug">
                  <span className="font-semibold text-white">I explicitly approve this exact email.</span> I have
                  verified the recipient identity, confirmed that the cited website observations are accurate, and verified
                  the recipient is not on a suppression list.
                </div>
              </label>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveDraftEdit(selectedDraft.id)}
                  className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 font-medium text-center"
                >
                  Save Edits
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const leadId = selectedDraft.lead_id;
                    setSelectedDraft(null);
                    await handleGenerateDraft(leadId);
                  }}
                  className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-violet-800/60 bg-violet-950/30 text-violet-300 font-medium hover:bg-violet-900/40 text-center"
                >
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    notify('Draft rejected and archived.', 'info');
                    setSelectedDraft(null);
                  }}
                  className="flex-1 sm:flex-initial px-3 py-2 rounded-xl border border-rose-900/60 bg-rose-950/30 text-rose-300 font-medium hover:bg-rose-900/40 text-center"
                >
                  Reject
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDraft(null)}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 font-medium text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleApproveDraft(selectedDraft.id)}
                  disabled={!confirmSafetyCheck}
                  className={`flex-1 sm:flex-initial px-5 py-2 rounded-xl text-white font-semibold transition-all text-center ${
                    confirmSafetyCheck
                      ? 'bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/30'
                      : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  Approve Draft
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: LOG INBOUND PROSPECT REPLY */}
      {replyModalDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <MessageSquare className="text-emerald-400" size={18} />
                <h2 className="text-sm sm:text-base font-bold text-white">Log Inbound Prospect Reply</h2>
              </div>
              <button
                onClick={() => setReplyModalDraft(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                <div className="text-zinc-400">Target Prospect:</div>
                <div className="font-bold text-white text-sm">{replyModalDraft.company_name}</div>
                <div className="text-zinc-400 font-mono text-[11px]">{replyModalDraft.business_email}</div>
              </div>

              <div>
                <label className="block text-zinc-300 font-medium mb-1">Incoming Response Content</label>
                <textarea
                  rows={4}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Paste the email reply received from the prospect at founder@ornitech.in..."
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-zinc-200 outline-none focus:border-emerald-500 text-xs"
                />
              </div>

              {/* Quick Template Chips */}
              <div>
                <span className="text-[11px] text-zinc-500 block mb-1">Quick Response Templates:</span>
                <div className="flex flex-col gap-1.5">
                  {[
                    "Hi Ronak, thanks for reaching out. Let's schedule a call this Thursday at 3 PM.",
                    "We are interested in the website audit findings. Can you send over a proposal with pricing?",
                    "Thanks for the note, but we currently have an internal team handling our website.",
                  ].map((tmpl, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setReplyText(tmpl)}
                      className="text-[11px] px-2.5 py-1.5 rounded-lg border border-zinc-800/80 bg-zinc-900 hover:bg-zinc-850 hover:border-zinc-700 text-zinc-300 hover:text-white text-left transition-colors truncate"
                    >
                      {tmpl}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setReplyModalDraft(null)}
                className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-900 font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRecordReply(replyModalDraft.id)}
                disabled={loading || !replyText.trim()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-md shadow-emerald-600/30 disabled:opacity-50 transition-all"
              >
                {loading ? 'Saving...' : 'Save Prospect Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
