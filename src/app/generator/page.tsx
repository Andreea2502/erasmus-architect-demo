'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { ProjectPipeline } from '@/components/pipeline/ProjectPipeline';

function GeneratorContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('project');

  return <ProjectPipeline initialProjectId={projectId || undefined} />;
}

export default function GeneratorPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-center">Laden...</div>}>
        <GeneratorContent />
      </Suspense>
    </AppShell>
  );
}
