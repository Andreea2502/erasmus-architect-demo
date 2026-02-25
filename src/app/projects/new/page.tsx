"use client";

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AppShell } from "@/components/layout/AppShell";
import { ConceptDeveloper } from "@/components/concept/ConceptDeveloper";

function NewProjectContent() {
  const searchParams = useSearchParams();
  const resumeId = searchParams.get('resume');

  return (
    <div className="p-6">
      <ConceptDeveloper resumeProjectId={resumeId || undefined} />
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-center text-gray-400">Laden...</div>}>
        <NewProjectContent />
      </Suspense>
    </AppShell>
  );
}
