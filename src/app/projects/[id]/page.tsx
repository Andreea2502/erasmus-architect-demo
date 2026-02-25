"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { ProjectEditor } from "@/components/project/ProjectEditor";

export default function EditProjectPage() {
  const params = useParams();
  const projectId = params.id as string;

  return (
    <AppShell>
      <ProjectEditor projectId={projectId} />
    </AppShell>
  );
}
