'use client';

import React, { useState } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { CampaignsView } from '../../components/campaigns/CampaignsView';
import { NewCampaignModal } from '../../components/campaigns/NewCampaignModal';
import { DiscoverLeadsModal } from '../../components/leads/DiscoverLeadsModal';

export default function CampaignsPage() {
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);

  return (
    <AppLayout
      onOpenDiscoverModal={() => setShowDiscoverModal(true)}
      onOpenNewCampaignModal={() => setShowNewCampaignModal(true)}
    >
      <CampaignsView
        showNewCampaignModal={showNewCampaignModal}
        setShowNewCampaignModal={setShowNewCampaignModal}
        showDiscoverModal={showDiscoverModal}
        setShowDiscoverModal={setShowDiscoverModal}
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
