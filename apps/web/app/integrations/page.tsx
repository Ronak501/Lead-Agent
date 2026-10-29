'use client';

import React from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { IntegrationsView } from '../../components/integrations/IntegrationsView';

export default function IntegrationsPage() {
  return (
    <AppLayout>
      <IntegrationsView />
    </AppLayout>
  );
}

