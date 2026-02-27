"use client";

import { AppShell } from "@/components/layout/AppShell";
import { BudgetCalculator } from "@/components/budget-calculator/BudgetCalculator";

export default function BudgetPage() {
    return (
        <AppShell>
            <BudgetCalculator />
        </AppShell>
    );
}
