import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { BUDGET_TIERS } from '@/store/types';
import { BENCHMARKS } from '@/lib/wp-templates';

// ============================================================================
// TYPES
// ============================================================================

export type CostCategory = 'staff' | 'travel' | 'equipment' | 'subcontracting' | 'other';

export const COST_CATEGORIES: { key: CostCategory; labelDE: string; labelEN: string }[] = [
    { key: 'staff', labelDE: 'Personalkosten', labelEN: 'Staff Costs' },
    { key: 'travel', labelDE: 'Reise & Aufenthalt', labelEN: 'Travel & Subsistence' },
    { key: 'equipment', labelDE: 'Ausstattung', labelEN: 'Equipment' },
    { key: 'subcontracting', labelDE: 'Unterauftraege', labelEN: 'Subcontracting' },
    { key: 'other', labelDE: 'Sonstige Kosten', labelEN: 'Other Direct Costs' },
];

export interface BudgetPartner {
    id: string;
    name: string;
    country: string;
    role: 'coordinator' | 'partner';
    appStorePartnerId?: string;
}

export interface BudgetWorkPackage {
    id: string;
    number: number;
    title: string;
    titleDE: string;
    targetPercent?: number;
}

// Flat cell key: "wpId__partnerId__category"
export type CellKey = string;

function makeCellKey(wpId: string, partnerId: string, category: CostCategory): CellKey {
    return `${wpId}__${partnerId}__${category}`;
}

// ============================================================================
// CALCULATION HELPERS (pure functions)
// ============================================================================

export function getCellAmount(cells: Record<CellKey, number>, wpId: string, partnerId: string, category: CostCategory): number {
    return cells[makeCellKey(wpId, partnerId, category)] || 0;
}

export function getWPPartnerTotal(cells: Record<CellKey, number>, wpId: string, partnerId: string): number {
    return COST_CATEGORIES.reduce((sum, cat) => sum + getCellAmount(cells, wpId, partnerId, cat.key), 0);
}

export function getWPTotal(cells: Record<CellKey, number>, wpId: string, partners: BudgetPartner[]): number {
    return partners.reduce((sum, p) => sum + getWPPartnerTotal(cells, wpId, p.id), 0);
}

export function getCategoryRowTotal(cells: Record<CellKey, number>, wpId: string, category: CostCategory, partners: BudgetPartner[]): number {
    return partners.reduce((sum, p) => sum + getCellAmount(cells, wpId, p.id, category), 0);
}

export function getPartnerGrandTotal(cells: Record<CellKey, number>, partnerId: string, workPackages: BudgetWorkPackage[]): number {
    return workPackages.reduce((sum, wp) => sum + getWPPartnerTotal(cells, wp.id, partnerId), 0);
}

export function getGrandTotal(cells: Record<CellKey, number>, workPackages: BudgetWorkPackage[], partners: BudgetPartner[]): number {
    return workPackages.reduce((sum, wp) => sum + getWPTotal(cells, wp.id, partners), 0);
}

// ============================================================================
// STANDARD WP TEMPLATES
// ============================================================================

const STANDARD_WPS_KA220: Omit<BudgetWorkPackage, 'id'>[] = [
    { number: 1, title: 'Project Management', titleDE: 'Projektmanagement', targetPercent: 18 },
    { number: 2, title: 'Research & Analysis', titleDE: 'Forschung & Analyse', targetPercent: 20 },
    { number: 3, title: 'Development', titleDE: 'Entwicklung', targetPercent: 30 },
    { number: 4, title: 'Piloting & Testing', titleDE: 'Erprobung & Testing', targetPercent: 16 },
    { number: 5, title: 'Dissemination & Exploitation', titleDE: 'Verbreitung & Verwertung', targetPercent: 16 },
];

const STANDARD_WPS_KA210: Omit<BudgetWorkPackage, 'id'>[] = [
    { number: 1, title: 'Project Management', titleDE: 'Projektmanagement', targetPercent: 20 },
    { number: 2, title: 'Development & Implementation', titleDE: 'Entwicklung & Umsetzung', targetPercent: 50 },
    { number: 3, title: 'Dissemination & Follow-up', titleDE: 'Verbreitung & Nachhaltigkeit', targetPercent: 30 },
];

// ============================================================================
// VALIDATION
// ============================================================================

export interface BudgetValidation {
    type: 'error' | 'warning';
    messageDE: string;
    messageEN: string;
}

export function validateBudget(
    cells: Record<CellKey, number>,
    workPackages: BudgetWorkPackage[],
    partners: BudgetPartner[],
    budgetTier: number
): BudgetValidation[] {
    const results: BudgetValidation[] = [];
    const grandTotal = getGrandTotal(cells, workPackages, partners);

    // 1. Grand total vs budget tier
    if (grandTotal > 0 && grandTotal !== budgetTier) {
        const diff = budgetTier - grandTotal;
        results.push({
            type: 'error',
            messageDE: `Gesamtsumme (${grandTotal.toLocaleString('de-DE')} EUR) stimmt nicht mit Budget (${budgetTier.toLocaleString('de-DE')} EUR) ueberein. Differenz: ${diff.toLocaleString('de-DE')} EUR`,
            messageEN: `Grand total (${grandTotal.toLocaleString()} EUR) does not match budget (${budgetTier.toLocaleString()} EUR). Difference: ${diff.toLocaleString()} EUR`,
        });
    }

    // 2. WP1 Management > 20%
    const wp1 = workPackages.find(wp => wp.number === 1);
    if (wp1 && grandTotal > 0) {
        const wp1Total = getWPTotal(cells, wp1.id, partners);
        const wp1Pct = (wp1Total / budgetTier) * 100;
        if (wp1Pct > 20) {
            results.push({
                type: 'error',
                messageDE: `WP1 Management bei ${wp1Pct.toFixed(1)}% ueberschreitet das 20%-Maximum`,
                messageEN: `WP1 Management at ${wp1Pct.toFixed(1)}% exceeds the 20% maximum`,
            });
        }
    }

    // 3. Coordinator > 40%
    const coordinator = partners.find(p => p.role === 'coordinator');
    if (coordinator && grandTotal > 0) {
        const coordTotal = getPartnerGrandTotal(cells, coordinator.id, workPackages);
        const coordPct = (coordTotal / budgetTier) * 100;
        if (coordPct > 40) {
            results.push({
                type: 'warning',
                messageDE: `Koordinator "${coordinator.name}" hat ${coordPct.toFixed(1)}% des Budgets (empfohlen max. 40%)`,
                messageEN: `Coordinator "${coordinator.name}" has ${coordPct.toFixed(1)}% of budget (recommended max 40%)`,
            });
        }
    }

    // 4. Partner with 0 budget
    if (grandTotal > 0) {
        for (const p of partners) {
            const pTotal = getPartnerGrandTotal(cells, p.id, workPackages);
            if (pTotal === 0) {
                results.push({
                    type: 'warning',
                    messageDE: `${p.name} hat kein Budget zugewiesen`,
                    messageEN: `${p.name} has no budget allocated`,
                });
            }
        }
    }

    // 5. Development < Management
    const devWP = workPackages.find(wp =>
        wp.title.toLowerCase().includes('develop') || wp.titleDE.toLowerCase().includes('entwicklung')
    );
    if (wp1 && devWP && grandTotal > 0) {
        const wp1Total = getWPTotal(cells, wp1.id, partners);
        const devTotal = getWPTotal(cells, devWP.id, partners);
        if (devTotal > 0 && devTotal < wp1Total) {
            results.push({
                type: 'error',
                messageDE: `Development-WP hat weniger Budget als Management-WP`,
                messageEN: `Development WP has less budget than Management WP`,
            });
        }
    }

    return results;
}

// ============================================================================
// STORE
// ============================================================================

interface BudgetCalculatorState {
    actionType: 'KA210' | 'KA220';
    budgetTier: number;
    partners: BudgetPartner[];
    workPackages: BudgetWorkPackage[];
    cells: Record<CellKey, number>;
    isSetupComplete: boolean;
}

interface BudgetCalculatorActions {
    setActionType: (type: 'KA210' | 'KA220') => void;
    setBudgetTier: (tier: number) => void;
    addPartner: (name: string, country: string, role?: 'coordinator' | 'partner') => void;
    removePartner: (id: string) => void;
    updatePartner: (id: string, updates: Partial<BudgetPartner>) => void;
    importPartners: (partners: { name: string; country: string; id?: string }[]) => void;
    addWorkPackage: (title: string, titleDE?: string) => void;
    removeWorkPackage: (id: string) => void;
    updateWorkPackage: (id: string, updates: Partial<BudgetWorkPackage>) => void;
    loadStandardWPs: () => void;
    setCellAmount: (wpId: string, partnerId: string, category: CostCategory, amount: number) => void;
    autoDistribute: () => void;
    setSetupComplete: (complete: boolean) => void;
    clearAllCells: () => void;
    resetAll: () => void;
}

export type BudgetCalculatorStore = BudgetCalculatorState & BudgetCalculatorActions;

const initialState: BudgetCalculatorState = {
    actionType: 'KA220',
    budgetTier: 250000,
    partners: [],
    workPackages: [],
    cells: {},
    isSetupComplete: false,
};

function uid(): string {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export const useBudgetCalculatorStore = create<BudgetCalculatorStore>()(
    persist(
        (set, get) => ({
            ...initialState,

            setActionType: (type) => {
                const tiers = BUDGET_TIERS[type];
                set({ actionType: type, budgetTier: tiers[tiers.length - 1] });
            },

            setBudgetTier: (tier) => set({ budgetTier: tier }),

            addPartner: (name, country, role) => {
                const state = get();
                const isFirst = state.partners.length === 0;
                set({
                    partners: [...state.partners, {
                        id: `bp_${uid()}`,
                        name,
                        country,
                        role: role || (isFirst ? 'coordinator' : 'partner'),
                    }],
                });
            },

            removePartner: (id) => {
                const state = get();
                // Remove partner and all their cells
                const newCells = { ...state.cells };
                for (const key of Object.keys(newCells)) {
                    if (key.includes(`__${id}__`)) {
                        delete newCells[key];
                    }
                }
                set({
                    partners: state.partners.filter(p => p.id !== id),
                    cells: newCells,
                });
            },

            updatePartner: (id, updates) => set((state) => ({
                partners: state.partners.map(p => p.id === id ? { ...p, ...updates } : p),
            })),

            importPartners: (imported) => {
                const state = get();
                const existing = state.partners;
                const newPartners: BudgetPartner[] = imported.map((p, i) => ({
                    id: `bp_${uid()}_${i}`,
                    name: p.name,
                    country: p.country,
                    role: (existing.length === 0 && i === 0) ? 'coordinator' as const : 'partner' as const,
                    appStorePartnerId: p.id,
                }));
                set({ partners: [...existing, ...newPartners] });
            },

            addWorkPackage: (title, titleDE) => {
                const state = get();
                const maxNum = state.workPackages.reduce((max, wp) => Math.max(max, wp.number), 0);
                set({
                    workPackages: [...state.workPackages, {
                        id: `wp_${uid()}`,
                        number: maxNum + 1,
                        title,
                        titleDE: titleDE || title,
                    }],
                });
            },

            removeWorkPackage: (id) => {
                const state = get();
                const newCells = { ...state.cells };
                for (const key of Object.keys(newCells)) {
                    if (key.startsWith(`${id}__`)) {
                        delete newCells[key];
                    }
                }
                // Renumber remaining WPs
                const remaining = state.workPackages.filter(wp => wp.id !== id);
                const renumbered = remaining.map((wp, i) => ({ ...wp, number: i + 1 }));
                set({ workPackages: renumbered, cells: newCells });
            },

            updateWorkPackage: (id, updates) => set((state) => ({
                workPackages: state.workPackages.map(wp => wp.id === id ? { ...wp, ...updates } : wp),
            })),

            loadStandardWPs: () => {
                const state = get();
                const templates = state.actionType === 'KA210' ? STANDARD_WPS_KA210 : STANDARD_WPS_KA220;
                const wps: BudgetWorkPackage[] = templates.map((t, i) => ({
                    ...t,
                    id: `wp_${uid()}_${i}`,
                }));
                set({ workPackages: wps, cells: {} });
            },

            setCellAmount: (wpId, partnerId, category, amount) => {
                const key = makeCellKey(wpId, partnerId, category);
                set((state) => ({
                    cells: { ...state.cells, [key]: Math.max(0, Math.round(amount)) },
                }));
            },

            autoDistribute: () => {
                const state = get();
                const { budgetTier, workPackages, partners } = state;
                if (partners.length === 0 || workPackages.length === 0) return;

                const newCells: Record<CellKey, number> = {};

                // Calculate total target percent
                const totalTarget = workPackages.reduce((s, wp) => s + (wp.targetPercent || 0), 0);

                for (const wp of workPackages) {
                    const wpPercent = wp.targetPercent || (totalTarget > 0 ? 0 : (100 / workPackages.length));
                    if (wpPercent === 0) continue;

                    const wpBudget = Math.round(budgetTier * wpPercent / 100);
                    const perPartner = Math.floor(wpBudget / partners.length);
                    const remainder = wpBudget - (perPartner * partners.length);

                    const isManagement = wp.number === 1;
                    const splits = isManagement
                        ? { staff: 0.70, travel: 0.20, equipment: 0, subcontracting: 0, other: 0.10 }
                        : { staff: 0.55, travel: 0.20, equipment: 0.05, subcontracting: 0.05, other: 0.15 };

                    partners.forEach((partner, idx) => {
                        const partnerBudget = perPartner + (idx === 0 ? remainder : 0);

                        let allocated = 0;
                        const entries = Object.entries(splits);
                        entries.forEach(([cat, pct], catIdx) => {
                            const isLast = catIdx === entries.length - 1;
                            const amount = isLast
                                ? partnerBudget - allocated // last category gets remainder
                                : Math.round(partnerBudget * pct);
                            if (amount > 0) {
                                newCells[makeCellKey(wp.id, partner.id, cat as CostCategory)] = amount;
                            }
                            allocated += amount;
                        });
                    });
                }

                set({ cells: newCells });
            },

            setSetupComplete: (complete) => set({ isSetupComplete: complete }),

            clearAllCells: () => set({ cells: {} }),

            resetAll: () => set(initialState),
        }),
        {
            name: 'erasmus-budget-calculator-v1',
            storage: createJSONStorage(() => localStorage),
        }
    )
);
