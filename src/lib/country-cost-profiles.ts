/**
 * COUNTRY COST PROFILES
 * =====================
 * Erasmus+ Ländergruppen mit Kostenmultiplikatoren
 * Basierend auf den offiziellen Erasmus+ Unit Costs und Lebenshaltungskosten
 *
 * Gruppen:
 *   A = Nordeuropa (hohe Kosten)
 *   B = Westeuropa (hohe Kosten)
 *   C = Südeuropa (mittlere Kosten)
 *   D = Osteuropa / Balkan (niedrige Kosten)
 *
 * Der Multiplikator bestimmt anteilig die Kosten pro Partner bei der
 * automatischen Budgetverteilung. Beispiel:
 *   AT (1.0) vs RS (0.6) → Serbischer Partner bekommt 60% der Personalkostenrate
 */

// ============================================================================
// COUNTRY → GROUP MAPPING
// ============================================================================

export type CostGroup = 'A' | 'B' | 'C' | 'D';

export interface CountryProfile {
    code: string;
    name: string;
    nameDE: string;
    group: CostGroup;
    /** Staff cost multiplier relative to base (1.0 = Western Europe average) */
    staffMultiplier: number;
    /** Travel/subsistence multiplier */
    travelMultiplier: number;
}

/**
 * All Erasmus+ eligible countries with cost profiles.
 * Multipliers are relative — 1.0 = Western Europe baseline (AT, DE, FR, etc.)
 */
export const COUNTRY_PROFILES: Record<string, CountryProfile> = {
    // ── Group A: Northern Europe (highest costs) ────────────────────────────
    DK: { code: 'DK', name: 'Denmark', nameDE: 'Dänemark', group: 'A', staffMultiplier: 1.20, travelMultiplier: 1.15 },
    SE: { code: 'SE', name: 'Sweden', nameDE: 'Schweden', group: 'A', staffMultiplier: 1.15, travelMultiplier: 1.15 },
    FI: { code: 'FI', name: 'Finland', nameDE: 'Finnland', group: 'A', staffMultiplier: 1.10, travelMultiplier: 1.10 },
    NO: { code: 'NO', name: 'Norway', nameDE: 'Norwegen', group: 'A', staffMultiplier: 1.25, travelMultiplier: 1.20 },
    IS: { code: 'IS', name: 'Iceland', nameDE: 'Island', group: 'A', staffMultiplier: 1.20, travelMultiplier: 1.20 },
    IE: { code: 'IE', name: 'Ireland', nameDE: 'Irland', group: 'A', staffMultiplier: 1.15, travelMultiplier: 1.10 },
    LU: { code: 'LU', name: 'Luxembourg', nameDE: 'Luxemburg', group: 'A', staffMultiplier: 1.20, travelMultiplier: 1.10 },
    LI: { code: 'LI', name: 'Liechtenstein', nameDE: 'Liechtenstein', group: 'A', staffMultiplier: 1.20, travelMultiplier: 1.15 },

    // ── Group B: Western Europe (baseline costs = 1.0) ──────────────────────
    AT: { code: 'AT', name: 'Austria', nameDE: 'Österreich', group: 'B', staffMultiplier: 1.0, travelMultiplier: 1.0 },
    DE: { code: 'DE', name: 'Germany', nameDE: 'Deutschland', group: 'B', staffMultiplier: 1.0, travelMultiplier: 1.0 },
    FR: { code: 'FR', name: 'France', nameDE: 'Frankreich', group: 'B', staffMultiplier: 1.0, travelMultiplier: 1.0 },
    NL: { code: 'NL', name: 'Netherlands', nameDE: 'Niederlande', group: 'B', staffMultiplier: 1.05, travelMultiplier: 1.0 },
    BE: { code: 'BE', name: 'Belgium', nameDE: 'Belgien', group: 'B', staffMultiplier: 1.0, travelMultiplier: 1.0 },
    IT: { code: 'IT', name: 'Italy', nameDE: 'Italien', group: 'B', staffMultiplier: 0.90, travelMultiplier: 0.90 },

    // ── Group C: Southern / Mediterranean Europe (medium costs) ─────────────
    ES: { code: 'ES', name: 'Spain', nameDE: 'Spanien', group: 'C', staffMultiplier: 0.80, travelMultiplier: 0.85 },
    PT: { code: 'PT', name: 'Portugal', nameDE: 'Portugal', group: 'C', staffMultiplier: 0.75, travelMultiplier: 0.80 },
    GR: { code: 'GR', name: 'Greece', nameDE: 'Griechenland', group: 'C', staffMultiplier: 0.75, travelMultiplier: 0.80 },
    CY: { code: 'CY', name: 'Cyprus', nameDE: 'Zypern', group: 'C', staffMultiplier: 0.80, travelMultiplier: 0.85 },
    MT: { code: 'MT', name: 'Malta', nameDE: 'Malta', group: 'C', staffMultiplier: 0.80, travelMultiplier: 0.85 },
    SI: { code: 'SI', name: 'Slovenia', nameDE: 'Slowenien', group: 'C', staffMultiplier: 0.75, travelMultiplier: 0.80 },
    HR: { code: 'HR', name: 'Croatia', nameDE: 'Kroatien', group: 'C', staffMultiplier: 0.70, travelMultiplier: 0.75 },
    CZ: { code: 'CZ', name: 'Czech Republic', nameDE: 'Tschechien', group: 'C', staffMultiplier: 0.70, travelMultiplier: 0.75 },
    EE: { code: 'EE', name: 'Estonia', nameDE: 'Estland', group: 'C', staffMultiplier: 0.70, travelMultiplier: 0.75 },
    LV: { code: 'LV', name: 'Latvia', nameDE: 'Lettland', group: 'C', staffMultiplier: 0.65, travelMultiplier: 0.70 },
    LT: { code: 'LT', name: 'Lithuania', nameDE: 'Litauen', group: 'C', staffMultiplier: 0.65, travelMultiplier: 0.70 },
    SK: { code: 'SK', name: 'Slovakia', nameDE: 'Slowakei', group: 'C', staffMultiplier: 0.65, travelMultiplier: 0.70 },
    PL: { code: 'PL', name: 'Poland', nameDE: 'Polen', group: 'C', staffMultiplier: 0.65, travelMultiplier: 0.70 },
    HU: { code: 'HU', name: 'Hungary', nameDE: 'Ungarn', group: 'C', staffMultiplier: 0.65, travelMultiplier: 0.70 },

    // ── Group D: Balkan / Eastern Europe / Third Countries (lowest costs) ───
    RS: { code: 'RS', name: 'Serbia', nameDE: 'Serbien', group: 'D', staffMultiplier: 0.55, travelMultiplier: 0.60 },
    BA: { code: 'BA', name: 'Bosnia and Herzegovina', nameDE: 'Bosnien u. Herzegowina', group: 'D', staffMultiplier: 0.50, travelMultiplier: 0.55 },
    AL: { code: 'AL', name: 'Albania', nameDE: 'Albanien', group: 'D', staffMultiplier: 0.45, travelMultiplier: 0.50 },
    ME: { code: 'ME', name: 'Montenegro', nameDE: 'Montenegro', group: 'D', staffMultiplier: 0.50, travelMultiplier: 0.55 },
    MK: { code: 'MK', name: 'North Macedonia', nameDE: 'Nordmazedonien', group: 'D', staffMultiplier: 0.45, travelMultiplier: 0.50 },
    XK: { code: 'XK', name: 'Kosovo', nameDE: 'Kosovo', group: 'D', staffMultiplier: 0.45, travelMultiplier: 0.50 },
    BG: { code: 'BG', name: 'Bulgaria', nameDE: 'Bulgarien', group: 'D', staffMultiplier: 0.50, travelMultiplier: 0.55 },
    RO: { code: 'RO', name: 'Romania', nameDE: 'Rumänien', group: 'D', staffMultiplier: 0.55, travelMultiplier: 0.60 },
    TR: { code: 'TR', name: 'Turkey', nameDE: 'Türkei', group: 'D', staffMultiplier: 0.50, travelMultiplier: 0.55 },
    MD: { code: 'MD', name: 'Moldova', nameDE: 'Moldau', group: 'D', staffMultiplier: 0.40, travelMultiplier: 0.45 },
    GE: { code: 'GE', name: 'Georgia', nameDE: 'Georgien', group: 'D', staffMultiplier: 0.40, travelMultiplier: 0.45 },
    UA: { code: 'UA', name: 'Ukraine', nameDE: 'Ukraine', group: 'D', staffMultiplier: 0.40, travelMultiplier: 0.45 },
    AM: { code: 'AM', name: 'Armenia', nameDE: 'Armenien', group: 'D', staffMultiplier: 0.40, travelMultiplier: 0.45 },
    AZ: { code: 'AZ', name: 'Azerbaijan', nameDE: 'Aserbaidschan', group: 'D', staffMultiplier: 0.40, travelMultiplier: 0.45 },
};

// ============================================================================
// COST GROUP META
// ============================================================================

export const COST_GROUP_META: Record<CostGroup, { label: string; labelDE: string; color: string; bgColor: string }> = {
    A: { label: 'Northern Europe', labelDE: 'Nordeuropa', color: 'text-blue-700', bgColor: 'bg-blue-100' },
    B: { label: 'Western Europe', labelDE: 'Westeuropa', color: 'text-green-700', bgColor: 'bg-green-100' },
    C: { label: 'Southern/Central Europe', labelDE: 'Süd-/Mitteleuropa', color: 'text-amber-700', bgColor: 'bg-amber-100' },
    D: { label: 'Balkans/Eastern Europe', labelDE: 'Balkan/Osteuropa', color: 'text-purple-700', bgColor: 'bg-purple-100' },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the country profile for a given country code (case-insensitive, trimmed).
 * Falls back to Group B (Western Europe, multiplier 1.0) for unknown countries.
 */
export function getCountryProfile(countryCode: string): CountryProfile {
    const code = countryCode.trim().toUpperCase();
    return COUNTRY_PROFILES[code] || {
        code,
        name: code,
        nameDE: code,
        group: 'B' as CostGroup,
        staffMultiplier: 1.0,
        travelMultiplier: 1.0,
    };
}

/**
 * Given a list of partners with countries and budget percentages,
 * distribute a total budget considering country cost differences.
 *
 * The logic:
 * 1. Each partner has a budgetPercent (their share of total budget)
 * 2. Within each partner's share, costs are adjusted by country multipliers
 * 3. Staff costs are scaled by staffMultiplier
 * 4. Travel costs are scaled by travelMultiplier
 * 5. Equipment/Subcontracting/Other are NOT scaled (same rates everywhere)
 */
export interface PartnerBudgetShare {
    partnerId: string;
    name: string;
    country: string;
    isCoordinator: boolean;
    budgetPercent: number; // User-selected percentage (e.g., 35%)
}

export interface CategorySplit {
    staff: number;
    travel: number;
    equipment: number;
    subcontracting: number;
    other: number;
}

/**
 * Default category splits by WP type.
 * Management WPs have higher staff/admin ratio.
 * Development WPs have more equipment/subcontracting.
 */
export const WP_CATEGORY_SPLITS: Record<string, CategorySplit> = {
    management: { staff: 0.70, travel: 0.20, equipment: 0.0, subcontracting: 0.0, other: 0.10 },
    research: { staff: 0.55, travel: 0.15, equipment: 0.10, subcontracting: 0.05, other: 0.15 },
    development: { staff: 0.50, travel: 0.10, equipment: 0.15, subcontracting: 0.10, other: 0.15 },
    piloting: { staff: 0.45, travel: 0.25, equipment: 0.05, subcontracting: 0.05, other: 0.20 },
    dissemination: { staff: 0.40, travel: 0.25, equipment: 0.05, subcontracting: 0.10, other: 0.20 },
    default: { staff: 0.55, travel: 0.20, equipment: 0.05, subcontracting: 0.05, other: 0.15 },
};

/**
 * Detect WP type from its title for category split selection.
 */
export function detectWPType(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('management') || lower.includes('projektmanagement') || lower.includes('koordination')) return 'management';
    if (lower.includes('research') || lower.includes('forschung') || lower.includes('analyse') || lower.includes('analysis')) return 'research';
    if (lower.includes('develop') || lower.includes('entwicklung') || lower.includes('creation') || lower.includes('erstellung')) return 'development';
    if (lower.includes('pilot') || lower.includes('test') || lower.includes('erprobung') || lower.includes('validation')) return 'piloting';
    if (lower.includes('dissemination') || lower.includes('verbreitung') || lower.includes('exploitation') || lower.includes('verwertung') || lower.includes('multiplier')) return 'dissemination';
    return 'default';
}

/**
 * Suggest budget percentages for partners based on:
 * 1. Coordinator gets a bonus (typically +10-15%)
 * 2. Remaining budget split proportionally by country cost level
 *
 * Returns suggested percentages that sum to 100%.
 */
export function suggestPartnerPercentages(
    partners: { id: string; country: string; isCoordinator: boolean }[]
): Record<string, number> {
    if (partners.length === 0) return {};
    if (partners.length === 1) return { [partners[0].id]: 100 };

    const COORDINATOR_BONUS = 12; // Coordinator gets 12% extra (absolute)
    const remaining = 100 - COORDINATOR_BONUS;

    // Weight each partner by their country's staff multiplier
    const weights: Record<string, number> = {};
    let totalWeight = 0;

    for (const p of partners) {
        const profile = getCountryProfile(p.country);
        const weight = profile.staffMultiplier;
        weights[p.id] = weight;
        totalWeight += weight;
    }

    // Distribute remaining proportionally
    const result: Record<string, number> = {};
    let allocated = 0;

    partners.forEach((p, i) => {
        const isLast = i === partners.length - 1;
        const baseShare = isLast
            ? remaining - allocated
            : Math.round((weights[p.id] / totalWeight) * remaining);

        result[p.id] = baseShare + (p.isCoordinator ? COORDINATOR_BONUS : 0);
        allocated += baseShare;
    });

    return result;
}

/**
 * Distribute a WP budget across partners considering:
 * 1. Each partner's budget percentage
 * 2. Country cost multipliers for staff & travel
 * 3. WP-type-specific category splits
 *
 * Returns cell amounts: { [partnerId]: { staff, travel, equipment, subcontracting, other } }
 */
export function distributeWPBudget(
    wpBudget: number,
    wpTitle: string,
    partners: PartnerBudgetShare[]
): Record<string, CategorySplit> {
    const wpType = detectWPType(wpTitle);
    const baseSplit = WP_CATEGORY_SPLITS[wpType] || WP_CATEGORY_SPLITS.default;
    const result: Record<string, CategorySplit> = {};

    for (const partner of partners) {
        const partnerBudget = Math.round(wpBudget * partner.budgetPercent / 100);
        const profile = getCountryProfile(partner.country);

        // Calculate raw amounts with country multipliers
        const rawStaff = partnerBudget * baseSplit.staff * profile.staffMultiplier;
        const rawTravel = partnerBudget * baseSplit.travel * profile.travelMultiplier;
        const rawEquipment = partnerBudget * baseSplit.equipment;
        const rawSubcontracting = partnerBudget * baseSplit.subcontracting;
        const rawOther = partnerBudget * baseSplit.other;

        // Normalize so that total = partnerBudget
        const rawTotal = rawStaff + rawTravel + rawEquipment + rawSubcontracting + rawOther;
        const scale = rawTotal > 0 ? partnerBudget / rawTotal : 0;

        const staff = Math.round(rawStaff * scale);
        const travel = Math.round(rawTravel * scale);
        const equipment = Math.round(rawEquipment * scale);
        const subcontracting = Math.round(rawSubcontracting * scale);
        const other = partnerBudget - staff - travel - equipment - subcontracting; // Remainder

        result[partner.partnerId] = { staff, travel, equipment, subcontracting, other: Math.max(0, other) };
    }

    return result;
}

/**
 * All country codes sorted alphabetically for dropdowns.
 */
export const COUNTRY_LIST = Object.values(COUNTRY_PROFILES)
    .sort((a, b) => a.nameDE.localeCompare(b.nameDE, 'de'));
