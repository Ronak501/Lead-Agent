'use client';

import React, { useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { OverviewView } from '../components/overview/OverviewView';
import { NewCampaignModal } from '../components/campaigns/NewCampaignModal';
import { DiscoverLeadsModal } from '../components/leads/DiscoverLeadsModal';

export default function HomePage() {
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);

  return (
    <AppLayout
      onOpenDiscoverModal={() => setShowDiscoverModal(true)}
      onOpenNewCampaignModal={() => setShowNewCampaignModal(true)}
    >
      <OverviewView
        onOpenDiscoverModal={() => setShowDiscoverModal(true)}
        onOpenNewCampaignModal={() => setShowNewCampaignModal(true)}
      />

      <NewCampaignModal
        isOpen={showNewCampaignModal}
        onClose={() => setShowNewCampaignModal(false)}
      />

      <DiscoverLeadsModal
        isOpen={showDiscoverModal}
        onClose={() => setShowDiscoverModal(false)}
      />
    </AppLayout>
  );
}
