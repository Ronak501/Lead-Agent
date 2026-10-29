'use client';

import React, { useState } from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { LeadsView } from '../../components/leads/LeadsView';
import { NewCampaignModal } from '../../components/campaigns/NewCampaignModal';
import { DiscoverLeadsModal } from '../../components/leads/DiscoverLeadsModal';

export default function LeadsPage() {
  const [showNewCampaignModal, setShowNewCampaignModal] = useState(false);
  const [showDiscoverModal, setShowDiscoverModal] = useState(false);

  return (
    <AppLayout
      onOpenDiscoverModal={() => setShowDiscoverModal(true)}
      onOpenNewCampaignModal={() => setShowNewCampaignModal(true)}
    >
      <LeadsView
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
