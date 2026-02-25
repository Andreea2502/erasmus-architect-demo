/**
 * VALIDATION RULES - Erasmus+ Compliance Checker
 * ===============================================
 * Umfassende Validierung gegen offizielle EU-Erasmus+ Kriterien
 * Basierend auf Programme Guide 2024
 */

import { PipelineState } from './project-pipeline';
import { Project, ActionType, Sector, BUDGET_TIERS } from '@/store/types';

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationRule {
    id: string;
    category: ValidationCategory;
    severity: 'error' | 'warning' | 'info';
    message: string;
    messageDE: string;
    criterion?: string; // EU criterion reference
    check: (state: PipelineState) => boolean;
}

export interface ProjectValidationRule {
    id: string;
    category: ValidationCategory;
    severity: 'error' | 'warning' | 'info';
    message: string;
    messageDE: string;
    criterion?: string;
    actionTypes?: ActionType[];
    check: (project: Project) => boolean;
}

export type ValidationCategory =
    | 'eligibility'      // Förderfähigkeit (KO-Kriterien)
    | 'consortium'       // Konsortium
    | 'content'          // Inhaltliche Qualität
    | 'workplan'         // Arbeitsplan
    | 'impact'           // Impact & Dissemination
    | 'budget'           // Budget & Finanzen
    | 'formal';          // Formale Anforderungen

export interface ValidationResult {
    ruleId: string;
    category: ValidationCategory;
    severity: 'error' | 'warning' | 'info';
    message: string;
    criterion?: string;
}

export interface ValidationSummary {
    results: ValidationResult[];
    score: number; // 0-100
    status: 'red' | 'yellow' | 'green';
    errors: number;
    warnings: number;
    infos: number;
    categoryScores: Record<ValidationCategory, number>;
}

// ============================================================================
// WORD COUNT LIMITS (Erasmus+ Application Form 2024)
// ============================================================================

export const WORD_LIMITS = {
    // Part B.1 - Relevance
    problemStatement: { min: 100, max: 500, recommended: 300 },
    targetGroupAnalysis: { min: 100, max: 400, recommended: 250 },
    objectives: { min: 50, max: 300, recommended: 150 },
    europeanDimension: { min: 100, max: 400, recommended: 250 },

    // Part B.2 - Work Packages
    wpDescription: { min: 100, max: 500, recommended: 300 },
    activityDescription: { min: 50, max: 200, recommended: 100 },
    resultDescription: { min: 100, max: 400, recommended: 250 },

    // Part B.3 - Impact
    impactStatement: { min: 150, max: 500, recommended: 350 },
    disseminationPlan: { min: 100, max: 400, recommended: 250 },
    sustainabilityPlan: { min: 100, max: 400, recommended: 250 },

    // Partner descriptions
    partnerDescription: { min: 150, max: 500, recommended: 300 },
    partnerExpertise: { min: 50, max: 200, recommended: 100 },
};

// ============================================================================
// PIPELINE VALIDATION RULES
// ============================================================================

export const VALIDATION_RULES: ValidationRule[] = [
    // ========== ELIGIBILITY (KO-Kriterien) ==========
    {
        id: 'missing-title',
        category: 'eligibility',
        severity: 'error',
        message: 'Project title is missing.',
        messageDE: 'Projekttitel fehlt.',
        criterion: 'Eligibility 1.1',
        check: (state) => !!state.projectTitle && state.projectTitle.length > 5
    },
    {
        id: 'missing-acronym',
        category: 'eligibility',
        severity: 'error',
        message: 'Project acronym is missing.',
        messageDE: 'Projektakronym fehlt.',
        criterion: 'Eligibility 1.2',
        check: (state) => !!state.acronym && state.acronym.length >= 2 && state.acronym.length <= 15
    },

    // ========== CONSORTIUM ==========
    {
        id: 'min-partners-ka220',
        category: 'consortium',
        severity: 'error',
        message: 'KA220 requires minimum 3 partners from 3 different countries.',
        messageDE: 'KA220 erfordert mindestens 3 Partner aus 3 verschiedenen Ländern.',
        criterion: 'Eligibility 2.1 (KA220)',
        check: (state) => {
            if (state.configuration?.actionType === 'KA210') return true;
            return state.consortium.length >= 3;
        }
    },
    {
        id: 'min-partners-ka210',
        category: 'consortium',
        severity: 'error',
        message: 'KA210 requires minimum 2 partners from 2 different countries.',
        messageDE: 'KA210 erfordert mindestens 2 Partner aus 2 verschiedenen Ländern.',
        criterion: 'Eligibility 2.1 (KA210)',
        check: (state) => {
            if (state.configuration?.actionType === 'KA220') return true;
            return state.consortium.length >= 2;
        }
    },
    {
        id: 'min-countries',
        category: 'consortium',
        severity: 'error',
        message: 'Partners must be from different eligible countries.',
        messageDE: 'Partner müssen aus verschiedenen förderfähigen Ländern kommen.',
        criterion: 'Eligibility 2.2',
        check: (state) => {
            const minCountries = state.configuration?.actionType === 'KA210' ? 2 : 3;
            const countries = new Set(state.consortium.map(p => p.country));
            return countries.size >= minCountries;
        }
    },
    {
        id: 'missing-coordinator',
        category: 'consortium',
        severity: 'error',
        message: 'No coordinator defined.',
        messageDE: 'Kein Koordinator definiert.',
        criterion: 'Eligibility 2.3',
        check: (state) => state.consortium.some(p => p.isLead)
    },
    {
        id: 'balanced-consortium',
        category: 'consortium',
        severity: 'warning',
        message: 'Consortium should have balanced geographical representation.',
        messageDE: 'Das Konsortium sollte geografisch ausgewogen sein.',
        criterion: 'Quality 3.1',
        check: (state) => {
            // Check if not all partners from same region
            const countries = state.consortium.map(p => p.country);
            const westernEU = ['DE', 'FR', 'NL', 'BE', 'AT', 'LU'];
            const westernCount = countries.filter(c => westernEU.includes(c)).length;
            return westernCount < countries.length; // At least one from other region
        }
    },
    {
        id: 'diverse-org-types',
        category: 'consortium',
        severity: 'info',
        message: 'Consider including different organization types for complementary expertise.',
        messageDE: 'Erwägen Sie verschiedene Organisationstypen für komplementäre Expertise.',
        criterion: 'Quality 3.2',
        check: (state) => {
            const types = new Set(state.consortium.map(p => p.type));
            return types.size >= 2;
        }
    },

    // ========== WORKPLAN ==========
    {
        id: 'min-work-packages',
        category: 'workplan',
        severity: 'error',
        message: 'At least one Work Package must be defined.',
        messageDE: 'Mindestens ein Arbeitspaket muss definiert sein.',
        criterion: 'Quality 4.1',
        check: (state) => {
            if (state.workPackages && state.workPackages.length > 0) return true;
            return Object.keys(state.answers).some(k => k.includes('wp_'));
        }
    },
    {
        id: 'wp-management',
        category: 'workplan',
        severity: 'warning',
        message: 'Consider including a dedicated Project Management Work Package.',
        messageDE: 'Erwägen Sie ein dediziertes Projektmanagement-Arbeitspaket.',
        criterion: 'Quality 4.2',
        check: (state) => {
            const wpAnswers = Object.entries(state.answers)
                .filter(([k]) => k.includes('wp_') && k.includes('title'));
            return wpAnswers.some(([, v]) => {
                const text = typeof v === 'string' ? v : '';
                return text.toLowerCase().includes('management') ||
                       text.toLowerCase().includes('koordination');
            });
        }
    },

    // ========== CONTENT ==========
    {
        id: 'short-problem-statement',
        category: 'content',
        severity: 'warning',
        message: `Problem statement should be at least ${WORD_LIMITS.problemStatement.min} words.`,
        messageDE: `Die Problemstellung sollte mindestens ${WORD_LIMITS.problemStatement.min} Wörter umfassen.`,
        criterion: 'Quality 1.1',
        check: (state) => {
            const answer = state.answers['problem_definition'];
            if (!answer) return true;
            const text = typeof answer === 'string' ? answer : typeof answer === 'object' && 'value' in answer ? answer.value : '';
            return text.split(/\s+/).length >= WORD_LIMITS.problemStatement.min;
        }
    },
    {
        id: 'too-long-problem-statement',
        category: 'content',
        severity: 'info',
        message: `Problem statement exceeds recommended ${WORD_LIMITS.problemStatement.max} words.`,
        messageDE: `Die Problemstellung überschreitet die empfohlenen ${WORD_LIMITS.problemStatement.max} Wörter.`,
        criterion: 'Quality 1.1',
        check: (state) => {
            const answer = state.answers['problem_definition'];
            if (!answer) return true;
            const text = typeof answer === 'string' ? answer : typeof answer === 'object' && 'value' in answer ? answer.value : '';
            return text.split(/\s+/).length <= WORD_LIMITS.problemStatement.max;
        }
    },
    {
        id: 'missing-statistics',
        category: 'content',
        severity: 'warning',
        message: 'Problem statement should include statistical evidence.',
        messageDE: 'Die Problemstellung sollte statistische Belege enthalten.',
        criterion: 'Quality 1.2',
        check: (state) => {
            const answer = state.answers['problem_definition'];
            if (!answer) return true;
            const text = typeof answer === 'string' ? answer : typeof answer === 'object' && 'value' in answer ? answer.value : '';
            // Check for numbers/percentages
            return /\d+%|\d+\.\d+|[0-9]{4}/.test(text);
        }
    },
    {
        id: 'ai-placeholders',
        category: 'content',
        severity: 'warning',
        message: 'Content contains placeholder text.',
        messageDE: 'Inhalt enthält Platzhalter-Text.',
        criterion: 'Formal',
        check: (state) => {
            return !Object.values(state.answers).some(a => {
                const text = typeof a === 'string' ? a : typeof a === 'object' && 'value' in a ? a.value : '';
                return text.includes('...') ||
                       text.includes('[Platzhalter]') ||
                       text.includes('[TODO]') ||
                       text.includes('INSERT') ||
                       text.includes('TBD');
            });
        }
    },
    {
        id: 'missing-horizontal-priorities',
        category: 'content',
        severity: 'warning',
        message: 'Project should address at least one EU horizontal priority.',
        messageDE: 'Das Projekt sollte mindestens eine EU-horizontale Priorität adressieren.',
        criterion: 'Quality 1.3',
        check: (state) => {
            // Check if any answers mention horizontal priorities
            const allText = Object.values(state.answers)
                .map(a => typeof a === 'string' ? a : typeof a === 'object' && 'value' in a ? a.value : '')
                .join(' ')
                .toLowerCase();
            return allText.includes('digital') ||
                   allText.includes('green') ||
                   allText.includes('nachhaltig') ||
                   allText.includes('sustainable') ||
                   allText.includes('inclusion') ||
                   allText.includes('inklusion') ||
                   allText.includes('participat');
        }
    },

    // ========== IMPACT ==========
    {
        id: 'missing-indicators',
        category: 'impact',
        severity: 'warning',
        message: 'Project should define measurable indicators.',
        messageDE: 'Das Projekt sollte messbare Indikatoren definieren.',
        criterion: 'Quality 5.1',
        check: (state) => {
            const allText = Object.values(state.answers)
                .map(a => typeof a === 'string' ? a : typeof a === 'object' && 'value' in a ? a.value : '')
                .join(' ')
                .toLowerCase();
            return allText.includes('indicator') ||
                   allText.includes('indikator') ||
                   allText.includes('kpi') ||
                   allText.includes('measure') ||
                   /\d+\s*(participants|teilnehmer|users|nutzer)/i.test(allText);
        }
    },
    {
        id: 'missing-sustainability',
        category: 'impact',
        severity: 'warning',
        message: 'Sustainability plan should be addressed.',
        messageDE: 'Ein Nachhaltigkeitsplan sollte beschrieben werden.',
        criterion: 'Quality 5.2',
        check: (state) => {
            const allText = Object.values(state.answers)
                .map(a => typeof a === 'string' ? a : typeof a === 'object' && 'value' in a ? a.value : '')
                .join(' ')
                .toLowerCase();
            return allText.includes('sustain') ||
                   allText.includes('nachhaltig') ||
                   allText.includes('long-term') ||
                   allText.includes('langfrist');
        }
    },

    // ========== BUDGET ==========
    {
        id: 'budget-zero',
        category: 'budget',
        severity: 'warning',
        message: 'Total budget is not defined.',
        messageDE: 'Gesamtbudget ist nicht definiert.',
        criterion: 'Eligibility 3.1',
        check: (state) => (state.configuration?.totalBudget || 0) > 0
    },
    {
        id: 'budget-tier-mismatch',
        category: 'budget',
        severity: 'error',
        message: 'Budget does not match eligible tiers for the action type.',
        messageDE: 'Budget entspricht nicht den zulässigen Stufen für den Aktionstyp.',
        criterion: 'Eligibility 3.2',
        check: (state) => {
            const budget = state.configuration?.totalBudget || 0;
            const actionType = state.configuration?.actionType || 'KA220';
            const tiers = BUDGET_TIERS[actionType];
            return tiers.includes(budget) || budget === 0;
        }
    },
];

// ============================================================================
// PROJECT VALIDATION RULES (For Project Store entities)
// ============================================================================

export const PROJECT_VALIDATION_RULES: ProjectValidationRule[] = [
    // Eligibility
    {
        id: 'proj-missing-title',
        category: 'eligibility',
        severity: 'error',
        message: 'Project title is required',
        messageDE: 'Projekttitel ist erforderlich',
        check: (p) => !!p.title && p.title.length > 5
    },
    {
        id: 'proj-missing-acronym',
        category: 'eligibility',
        severity: 'error',
        message: 'Project acronym is required (2-15 characters)',
        messageDE: 'Projektakronym ist erforderlich (2-15 Zeichen)',
        check: (p) => !!p.acronym && p.acronym.length >= 2 && p.acronym.length <= 15
    },

    // Consortium
    {
        id: 'proj-min-partners',
        category: 'consortium',
        severity: 'error',
        message: 'Minimum partner requirement not met',
        messageDE: 'Mindestanzahl an Partnern nicht erfüllt',
        criterion: 'Eligibility',
        check: (p) => {
            const min = p.actionType === 'KA210' ? 2 : 3;
            return p.consortium.length >= min;
        }
    },
    {
        id: 'proj-has-coordinator',
        category: 'consortium',
        severity: 'error',
        message: 'Project must have a coordinator',
        messageDE: 'Projekt muss einen Koordinator haben',
        check: (p) => p.consortium.some(m => m.role === 'COORDINATOR')
    },

    // Content
    {
        id: 'proj-problem-statement',
        category: 'content',
        severity: 'warning',
        message: 'Problem statement is too short',
        messageDE: 'Problemstellung ist zu kurz',
        check: (p) => !p.problemStatement || p.problemStatement.split(/\s+/).length >= 50
    },
    {
        id: 'proj-has-objectives',
        category: 'content',
        severity: 'warning',
        message: 'Project should have defined objectives',
        messageDE: 'Projekt sollte Ziele definiert haben',
        check: (p) => p.objectives.length > 0
    },
    {
        id: 'proj-has-general-objective',
        category: 'content',
        severity: 'warning',
        message: 'Project should have at least one general objective',
        messageDE: 'Projekt sollte mindestens ein allgemeines Ziel haben',
        check: (p) => p.objectives.some(o => o.type === 'GENERAL')
    },
    {
        id: 'proj-has-specific-objectives',
        category: 'content',
        severity: 'info',
        message: 'Consider adding specific objectives (recommended: 3-5)',
        messageDE: 'Erwägen Sie spezifische Ziele hinzuzufügen (empfohlen: 3-5)',
        check: (p) => p.objectives.filter(o => o.type === 'SPECIFIC').length >= 3
    },

    // Workplan
    {
        id: 'proj-has-work-packages',
        category: 'workplan',
        severity: 'warning',
        message: 'Project should have work packages',
        messageDE: 'Projekt sollte Arbeitspakete haben',
        check: (p) => p.workPackages.length > 0
    },
    {
        id: 'proj-wp-duration',
        category: 'workplan',
        severity: 'warning',
        message: 'Work packages should cover the full project duration',
        messageDE: 'Arbeitspakete sollten die gesamte Projektlaufzeit abdecken',
        check: (p) => {
            if (p.workPackages.length === 0) return true;
            const maxEnd = Math.max(...p.workPackages.map(wp => wp.endMonth));
            return maxEnd >= p.duration - 1;
        }
    },
    {
        id: 'proj-has-results',
        category: 'workplan',
        severity: 'warning',
        message: 'Project should have defined results/outputs',
        messageDE: 'Projekt sollte Ergebnisse/Outputs definiert haben',
        check: (p) => p.results.length > 0
    },

    // Impact
    {
        id: 'proj-has-indicators',
        category: 'impact',
        severity: 'warning',
        message: 'Project should have measurable indicators',
        messageDE: 'Projekt sollte messbare Indikatoren haben',
        check: (p) => p.indicators.length > 0
    },
    {
        id: 'proj-has-multiplier-events',
        category: 'impact',
        severity: 'info',
        message: 'Consider adding multiplier events for dissemination',
        messageDE: 'Erwägen Sie Multiplier Events für Verbreitung',
        actionTypes: ['KA220'],
        check: (p) => p.actionType === 'KA210' || p.multiplierEvents.length > 0
    },

    // Budget
    {
        id: 'proj-budget-valid',
        category: 'budget',
        severity: 'error',
        message: 'Budget must match eligible tiers',
        messageDE: 'Budget muss den zulässigen Stufen entsprechen',
        check: (p) => {
            const tiers = BUDGET_TIERS[p.actionType];
            return tiers.includes(p.budgetTier);
        }
    },
    {
        id: 'proj-budget-distribution',
        category: 'budget',
        severity: 'warning',
        message: 'Budget should be distributed among partners',
        messageDE: 'Budget sollte auf Partner verteilt sein',
        check: (p) => {
            const totalShare = p.consortium.reduce((sum, m) => sum + m.budgetShare, 0);
            return totalShare > 0;
        }
    },
];

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

export function validateProject(state: PipelineState): ValidationResult[] {
    const results: ValidationResult[] = [];

    for (const rule of VALIDATION_RULES) {
        try {
            if (!rule.check(state)) {
                results.push({
                    ruleId: rule.id,
                    category: rule.category,
                    severity: rule.severity,
                    message: rule.messageDE,
                    criterion: rule.criterion,
                });
            }
        } catch (e) {
            console.warn(`Validation rule ${rule.id} failed to execute`, e);
        }
    }

    return results;
}

export function validateProjectEntity(project: Project): ValidationResult[] {
    const results: ValidationResult[] = [];

    for (const rule of PROJECT_VALIDATION_RULES) {
        // Skip rules not applicable to this action type
        if (rule.actionTypes && !rule.actionTypes.includes(project.actionType)) {
            continue;
        }

        try {
            if (!rule.check(project)) {
                results.push({
                    ruleId: rule.id,
                    category: rule.category,
                    severity: rule.severity,
                    message: rule.messageDE,
                    criterion: rule.criterion,
                });
            }
        } catch (e) {
            console.warn(`Validation rule ${rule.id} failed to execute`, e);
        }
    }

    return results;
}

export function getValidationSummary(results: ValidationResult[]): ValidationSummary {
    const errors = results.filter(r => r.severity === 'error').length;
    const warnings = results.filter(r => r.severity === 'warning').length;
    const infos = results.filter(r => r.severity === 'info').length;

    // Calculate category scores
    const categories: ValidationCategory[] = ['eligibility', 'consortium', 'content', 'workplan', 'impact', 'budget', 'formal'];
    const categoryScores: Record<ValidationCategory, number> = {} as Record<ValidationCategory, number>;

    for (const cat of categories) {
        const catResults = results.filter(r => r.category === cat);
        const catErrors = catResults.filter(r => r.severity === 'error').length;
        const catWarnings = catResults.filter(r => r.severity === 'warning').length;

        // Score: 100 - (errors * 30) - (warnings * 10), min 0
        categoryScores[cat] = Math.max(0, 100 - (catErrors * 30) - (catWarnings * 10));
    }

    // Overall score
    const avgCategoryScore = Object.values(categoryScores).reduce((a, b) => a + b, 0) / categories.length;
    const score = Math.round(avgCategoryScore);

    // Traffic light status
    let status: 'red' | 'yellow' | 'green' = 'green';
    if (errors > 0) {
        status = 'red';
    } else if (warnings > 0) {
        status = 'yellow';
    }

    return {
        results,
        score,
        status,
        errors,
        warnings,
        infos,
        categoryScores,
    };
}

export function getTrafficLightStatus(results: ValidationResult[]): 'red' | 'yellow' | 'green' {
    if (results.some(r => r.severity === 'error')) return 'red';
    if (results.some(r => r.severity === 'warning')) return 'yellow';
    return 'green';
}

// ============================================================================
// EXPORT HELPERS FOR UI
// ============================================================================

export const CATEGORY_LABELS: Record<ValidationCategory, { en: string; de: string }> = {
    eligibility: { en: 'Eligibility', de: 'Förderfähigkeit' },
    consortium: { en: 'Consortium', de: 'Konsortium' },
    content: { en: 'Content Quality', de: 'Inhaltliche Qualität' },
    workplan: { en: 'Work Plan', de: 'Arbeitsplan' },
    impact: { en: 'Impact & Sustainability', de: 'Impact & Nachhaltigkeit' },
    budget: { en: 'Budget', de: 'Budget' },
    formal: { en: 'Formal Requirements', de: 'Formale Anforderungen' },
};

export const CATEGORY_ICONS: Record<ValidationCategory, string> = {
    eligibility: '✓',
    consortium: '👥',
    content: '📝',
    workplan: '📋',
    impact: '🎯',
    budget: '💰',
    formal: '📄',
};
