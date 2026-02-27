"use client";

import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectList } from "@/components/project/ProjectList";

export default function ProjectsPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-6 text-gray-400">Laden...</div>}>
        <ProjectList />
      </Suspense>
    </AppShell>
  );
}
