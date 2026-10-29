'use client';

import React from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { DraftsView } from '../../components/drafts/DraftsView';

export default function DraftsPage() {
  return (
    <AppLayout>
      <DraftsView />
    </AppLayout>
  );
}

