'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Campaign, Lead, Draft, Suppression, Integration, Analytics } from '../components/types';

export const API = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export interface UserSession {
  id: string;
  email: string;
  full_name: string;
  domain: string;
  is_admin?: boolean;
}

interface AppContextType {
  API: string;
  currentUser: UserSession | null;
  isAuthLoading: boolean;
  setCurrentUser: (user: UserSession | null) => void;
  signOut: () => void;
  apiStatus: 'checking' | 'online' | 'offline';
  loading: boolean;
  setLoading: (l: boolean) => void;
  notification: { type: 'success' | 'error' | 'info'; message: string } | null;
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
  campaigns: Campaign[];
  leads: Lead[];
  drafts: Draft[];
  suppressions: Suppression[];
  integrations: Integration[];
  analytics: Analytics;
  fetchData: () => Promise<void>;
  handleRunAutonomousPipeline: () => Promise<void>;
  handleBatchAutoDispatch: () => Promise<void>;
  handleAutoDispatchLead: (leadId: string, companyName: string) => Promise<void>;
  handleAuditWebsite: (leadId: string) => Promise<void>;
  handleGenerateDraft: (leadId: string) => Promise<void>;
  handleApproveDraft: (draftId: string, reviewerName?: string, recipientEmail?: string) => Promise<void>;
  handleSaveDraftEdit: (draftId: string, subject: string, bodyText: string) => Promise<void>;
  handleSendDraft: (draftId: string) => Promise<void>;
  handleBatchApprove: () => Promise<void>;
  handleRecordReply: (draftId: string, replyText: string, senderEmail?: string) => Promise<void>;
  handleAddSuppression: (emailOrDomain: string) => Promise<void>;
  handleDeleteSuppression: (id: string) => Promise<void>;
  handleExportCSV: () => void;
  handleCreateCampaign: (formData: any) => Promise<boolean>;
  handleDiscoverLeads: (formData: any) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

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

  const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const signOut = () => {
    localStorage.removeItem('ornitech_user');
    localStorage.removeItem('ornitech_token');
    setCurrentUser(null);
    notify('Signed out successfully.', 'info');
  };

  // Restore authenticated session
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ornitech_user');
      if (stored) {
        const parsed = JSON.parse(stored);
        const isWhitelisted = parsed?.email === 'ronaktalaviya51@gmail.com';
        if (parsed?.email && (parsed.email.endsWith('@ornitech.in') || isWhitelisted || parsed.domain === 'ornitech.in')) {
          setCurrentUser(parsed);
        } else {
          localStorage.removeItem('ornitech_user');
          localStorage.removeItem('ornitech_token');
        }
      }
    } catch {
      localStorage.removeItem('ornitech_user');
      localStorage.removeItem('ornitech_token');
    } finally {
      setIsAuthLoading(false);
    }
  }, []);

  const fetchData = async () => {
    try {
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
    }
  };

  useEffect(() => {
    void fetchData();
    const interval = setInterval(() => {
      void fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRunAutonomousPipeline = async () => {
    try {
      setLoading(true);
      notify('🤖 Running End-to-End Autonomous Pipeline: Discovering leads, sending emails & checking inbox...', 'info');
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

  const handleAuditWebsite = async (leadId: string) => {
    try {
      setLoading(true);
      notify('Initiating live HTTP audit and tech stack inspection...', 'info');
      const res = await fetch(`${API}/api/leads/${leadId}/audit`, { method: 'POST' });
      if (!res.ok) throw new Error('Website audit failed');
      notify('Website audit completed! Evidence saved.');
      await fetchData();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateDraft = async (leadId: string) => {
    try {
      setLoading(true);
      notify('Generating evidence-grounded cold email draft with AI...', 'info');
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
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDraft = async (draftId: string, reviewerName: string = 'Ronak Talaviya (Reviewer)', recipientEmail?: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/drafts/${draftId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approved_by: reviewerName,
          confirm_exact_recipient_and_content: true,
          recipient_email: recipientEmail?.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Approval failed');
      }
      notify('Draft approved and locked with tamper-proof SHA-256 hash!');
      await fetchData();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraftEdit = async (draftId: string, subject: string, bodyText: string) => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/drafts/${draftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject,
          body_text: bodyText,
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || 'Send failed');
      notify(`Safe outreach successful! ${data.detail || 'Email sent.'}`);
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

  const handleRecordReply = async (draftId: string, replyText: string, senderEmail?: string) => {
    if (!replyText.trim()) {
      notify('Please enter the reply message received from the prospect', 'error');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/drafts/${draftId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reply_text: replyText.trim(),
          sender_email: senderEmail?.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to record reply');
      }
      notify('Prospect reply successfully recorded and added to tracking!', 'success');
      await fetchData();
    } catch (err: any) {
      notify(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuppression = async (emailOrDomain: string) => {
    if (!emailOrDomain.trim()) return;
    try {
      const res = await fetch(`${API}/api/suppressions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_or_domain: emailOrDomain.trim(),
          reason: 'manual_opt_out',
          source: 'admin_dashboard',
        }),
      });
      if (!res.ok) throw new Error('Failed to add suppression');
      notify('Suppression added. Outbound emails to this target are now strictly blocked.');
      await fetchData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleDeleteSuppression = async (id: string) => {
    try {
      await fetch(`${API}/api/suppressions/${id}`, { method: 'DELETE' });
      notify('Suppression removed from blocklist.');
      await fetchData();
    } catch (err: any) {
      notify(err.message, 'error');
    }
  };

  const handleExportCSV = () => {
    window.open(`${API}/api/leads/export/csv`, '_blank');
    notify('Exporting discovered leads to CSV...');
  };

  const handleCreateCampaign = async (formData: any): Promise<boolean> => {
    try {
      setLoading(true);
      notify('🤖 Creating campaign & launching Autonomous AI Outbound Pipeline...', 'info');
      const res = await fetch(`${API}/api/campaigns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Failed to create campaign');
      }
      const data = await res.json();
      notify(`🚀 Campaign created! Autonomous AI found leads, audited websites, and dispatched cold emails.`, 'success');
      await fetchData();
      return true;
    } catch (err: any) {
      notify(err.message, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleDiscoverLeads = async (formData: any): Promise<boolean> => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/leads/discover`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Lead discovery failed');
      const newLeads = await res.json();
      notify(`Discovered and qualified ${newLeads.length} new prospective leads with source evidence!`);
      await fetchData();
      return true;
    } catch (err: any) {
      notify(err.message, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppContext.Provider
      value={{
        API,
        currentUser,
        isAuthLoading,
        setCurrentUser,
        signOut,
        apiStatus,
        loading,
        setLoading,
        notification,
        notify,
        campaigns,
        leads,
        drafts,
        suppressions,
        integrations,
        analytics,
        fetchData,
        handleRunAutonomousPipeline,
        handleBatchAutoDispatch,
        handleAutoDispatchLead,
        handleAuditWebsite,
        handleGenerateDraft,
        handleApproveDraft,
        handleSaveDraftEdit,
        handleSendDraft,
        handleBatchApprove,
        handleRecordReply,
        handleAddSuppression,
        handleDeleteSuppression,
        handleExportCSV,
        handleCreateCampaign,
        handleDiscoverLeads,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
