/**
 * Erasmus+ Knowledge Base
 *
 * Diese Datei aggregiert alle Erasmus+ Regelwerke und Richtlinien
 * für die zuverlässige Integration in die AI-Generierung.
 *
 * Die Inhalte sind direkt im Code eingebettet, um sicherzustellen,
 * dass sie bei jeder Generierung verfügbar sind.
 */

import { BUDGET_RULES } from './budget-rules';
import { EVALUATION_CRITERIA } from './evaluation-criteria';
import { HORIZONTAL_PRIORITIES } from './horizontal-priorities';
import { SECTOR_PRIORITIES } from './sector-priorities';
import { ELIGIBLE_ACTIVITIES } from './eligible-activities';
import { NO_GOS } from './no-gos';
import { WORK_PACKAGE_GUIDELINES } from './work-package-guidelines';

// Re-export all modules
export {
  BUDGET_RULES,
  EVALUATION_CRITERIA,
  HORIZONTAL_PRIORITIES,
  SECTOR_PRIORITIES,
  ELIGIBLE_ACTIVITIES,
  NO_GOS,
  WORK_PACKAGE_GUIDELINES
};

/**
 * Vollständiger Erasmus+ Kontext für AI-Prompts
 * Wird in Konzeptentwickler und Projektgenerator verwendet
 */
export const FULL_ERASMUS_CONTEXT = `
# ERASMUS+ PROGRAMMLEITFADEN - WISSENSGRUNDLAGE

${BUDGET_RULES}

${EVALUATION_CRITERIA}

${HORIZONTAL_PRIORITIES}

${SECTOR_PRIORITIES}

${ELIGIBLE_ACTIVITIES}

${NO_GOS}

${WORK_PACKAGE_GUIDELINES}
`;

/**
 * Kompakter Kontext für schnelle Generierungen
 * Enthält nur die wichtigsten Regeln
 */
export const COMPACT_ERASMUS_CONTEXT = `
# ERASMUS+ KERNREGELN

${BUDGET_RULES}

${NO_GOS}

${WORK_PACKAGE_GUIDELINES}
`;

/**
 * Kontext für Konzeptentwicklung
 * Fokus auf strategische Ausrichtung und Prioritäten
 */
export const CONCEPT_DEVELOPMENT_CONTEXT = `
# ERASMUS+ KONZEPTENTWICKLUNG

${HORIZONTAL_PRIORITIES}

${SECTOR_PRIORITIES}

${EVALUATION_CRITERIA}

${ELIGIBLE_ACTIVITIES}
`;
