"use client";

import { AppShell } from "@/components/layout/AppShell";
import { PartnerList } from "@/components/partners/PartnerList";

export default function PartnersPage() {
  return (
    <AppShell>
      <PartnerList />
    </AppShell>
  );
}
