export type Campaign = {
  id: string;
  workspace_id?: string;
  name: string;
  target_country: string;
  target_city: string;
  company_type: string;
  max_lead_count: number;
  qualification_criteria: string;
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

export type Evidence = {
  id: string;
  source_url: string;
  evidence_type: string;
  excerpt: string;
  observed_at: string;
  confidence: number;
};

export type WebsiteAudit = {
  id: string;
  status_code: number;
  title: string;
  meta_description: string;
  tech_stack: string[];
  issues_found: string[];
  opportunity_summary: string;
  performance_score: number;
};

export type Lead = {
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

export type Draft = {
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
  approval_hash?: string | null;
  approved_by?: string | null;
  approved_at?: string | null;
  sent_at?: string | null;
  replied_at?: string | null;
  reply_count?: number;
  last_reply_snippet?: string | null;
  provider_message_id?: string | null;
  generated_at: string;
};

export type Suppression = {
  id: string;
  workspace_id?: string;
  email_normalized: string;
  domain_normalized?: string | null;
  reason: string;
  source: string;
  created_at: string;
};

export type Integration = {
  provider_name: string;
  is_active: boolean;
  is_configured: boolean;
  last_tested?: string | null;
  status_message: string;
};

export type Analytics = {
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

export type TabType =
  | 'overview'
  | 'campaigns'
  | 'leads'
  | 'lead_details'
  | 'drafts'
  | 'review'
  | 'analytics'
  | 'integrations'
  | 'settings';
