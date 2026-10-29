'use client';

import React from 'react';
import { AppLayout } from '../../components/layout/AppLayout';
import { ApprovalQueueView } from '../../components/ApprovalQueueView';
import { useApp } from '../../context/AppContext';

export default function ReviewPage() {
  const { drafts, handleApproveDraft, handleSendDraft, loading } = useApp();

  return (
    <AppLayout>
      <ApprovalQueueView
        drafts={drafts}
        onApproveDraft={handleApproveDraft}
        onSendDraft={handleSendDraft}
        loading={loading}
      />
    </AppLayout>
  );
}

