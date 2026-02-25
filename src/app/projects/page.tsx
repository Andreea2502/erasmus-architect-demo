"use client";

import { AppShell } from "@/components/layout/AppShell";
import { ProjectList } from "@/components/project/ProjectList";

export default function ProjectsPage() {
  return (
    <AppShell>
      <ProjectList />
    </AppShell>
  );
}
