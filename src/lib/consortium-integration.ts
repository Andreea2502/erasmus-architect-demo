/**
 * CONSORTIUM INTEGRATION
 * ======================
 * Intelligent integration of Partner CRM data with Project Generator
 * - Role assignment based on concept/idea
 * - Expertise matching
 * - WP Lead suggestions
 */

import { Partner } from '@/store/types';
import { ConsortiumPartner, PipelineState, ProjectIdea } from './project-pipeline';
import { SavedConcept } from '@/store/types';

// ============================================================================
// TYPES
// ============================================================================

export interface PartnerRoleAssignment {
  partnerId: string;
  partnerName: string;
  suggestedRole: 'COORDINATOR' | 'TECHNICAL_LEAD' | 'CONTENT_EXPERT' | 'DISSEMINATION_LEAD' | 'QUALITY_ASSURANCE' | 'PARTNER';
  roleRationale: string;
  matchScore: number; // 0-100
  matchedExpertise: string[];
  suggestedWPLeads: number[]; // WP numbers this partner could lead
  strengths: string[];
  gaps: string[];
}

export interface ConsortiumAnalysis {
  overallScore: number;
  geographicCoverage: {
    countries: string[];
    regions: string[];
    euCoverage: 'EXCELLENT' | 'GOOD' | 'ADEQUATE' | 'INSUFFICIENT';
  };
  expertiseCoverage: {
    covered: string[];
    missing: string[];
    score: number;
  };
  partnerTypeBalance: {
    hasUniversity: boolean;
    hasSME: boolean;
    hasNGO: boolean;
    hasPublicBody: boolean;
    isBalanced: boolean;
  };
  recommendations: string[];
  warnings: string[];
}

export interface RoleSuggestion {
  role: PartnerRoleAssignment['suggestedRole'];
  label: string;
  labelDE: string;
  description: string;
  descriptionDE: string;
  requiredExpertise: string[];
}

// ============================================================================
// ROLE DEFINITIONS
// ============================================================================

export const CONSORTIUM_ROLES: RoleSuggestion[] = [
  {
    role: 'COORDINATOR',
    label: 'Project Coordinator',
    labelDE: 'Projektkoordinator',
    description: 'Leads the entire project, manages consortium, responsible for reporting',
    descriptionDE: 'Leitet das gesamte Projekt, verwaltet das Konsortium, verantwortlich für Berichterstattung',
    requiredExpertise: ['project_management', 'eu_projects', 'coordination']
  },
  {
    role: 'TECHNICAL_LEAD',
    label: 'Technical Lead',
    labelDE: 'Technischer Leiter',
    description: 'Leads technical development, responsible for outputs/results',
    descriptionDE: 'Leitet technische Entwicklung, verantwortlich für Ergebnisse/Outputs',
    requiredExpertise: ['technical', 'development', 'digital', 'methodology']
  },
  {
    role: 'CONTENT_EXPERT',
    label: 'Content Expert',
    labelDE: 'Inhaltsexperte',
    description: 'Provides domain expertise, develops content and materials',
    descriptionDE: 'Liefert Fachexpertise, entwickelt Inhalte und Materialien',
    requiredExpertise: ['education', 'training', 'curriculum', 'research']
  },
  {
    role: 'DISSEMINATION_LEAD',
    label: 'Dissemination Lead',
    labelDE: 'Verbreitungsleiter',
    description: 'Leads communication, dissemination and exploitation activities',
    descriptionDE: 'Leitet Kommunikation, Verbreitung und Verwertungsaktivitäten',
    requiredExpertise: ['communication', 'marketing', 'networking', 'events']
  },
  {
    role: 'QUALITY_ASSURANCE',
    label: 'Quality Assurance',
    labelDE: 'Qualitätssicherung',
    description: 'Monitors quality, conducts evaluation, ensures standards',
    descriptionDE: 'Überwacht Qualität, führt Evaluation durch, sichert Standards',
    requiredExpertise: ['evaluation', 'quality', 'research', 'assessment']
  },
  {
    role: 'PARTNER',
    label: 'Project Partner',
    labelDE: 'Projektpartner',
    description: 'Contributes to activities, provides specific expertise',
    descriptionDE: 'Trägt zu Aktivitäten bei, liefert spezifische Expertise',
    requiredExpertise: []
  }
];

// ============================================================================
// EXPERTISE MAPPING
// ============================================================================

// Map common expertise areas to normalized keys
const EXPERTISE_KEYWORDS: Record<string, string[]> = {
  'project_management': ['management', 'koordination', 'coordination', 'leitung', 'führung', 'projektmanagement'],
  'eu_projects': ['erasmus', 'eu', 'european', 'horizon', 'förderung', 'funding'],
  'technical': ['technical', 'technisch', 'it', 'software', 'digital', 'development'],
  'education': ['education', 'bildung', 'training', 'schulung', 'lernen', 'learning', 'pädagogik'],
  'research': ['research', 'forschung', 'wissenschaft', 'science', 'study', 'studie'],
  'communication': ['communication', 'kommunikation', 'pr', 'marketing', 'social media', 'öffentlichkeitsarbeit'],
  'networking': ['networking', 'netzwerk', 'community', 'stakeholder', 'events', 'veranstaltungen'],
  'evaluation': ['evaluation', 'evaluierung', 'assessment', 'bewertung', 'quality', 'qualität'],
  'youth': ['youth', 'jugend', 'young', 'jung'],
  'adult': ['adult', 'erwachsene', 'weiterbildung', 'continuing education'],
  'vet': ['vocational', 'beruflich', 'ausbildung', 'apprentice'],
  'inclusion': ['inclusion', 'inklusion', 'diversity', 'vielfalt', 'disability', 'behinderung'],
  'green': ['green', 'grün', 'environment', 'umwelt', 'sustainability', 'nachhaltigkeit', 'climate', 'klima'],
  'digital': ['digital', 'online', 'elearning', 'e-learning', 'ict', 'technology', 'technologie']
};

function normalizeExpertise(expertise: string[]): string[] {
  const normalized: Set<string> = new Set();

  for (const exp of expertise) {
    const expLower = exp.toLowerCase();
    for (const [key, keywords] of Object.entries(EXPERTISE_KEYWORDS)) {
      if (keywords.some(kw => expLower.includes(kw))) {
        normalized.add(key);
      }
    }
  }

  return Array.from(normalized);
}

// ============================================================================
// PARTNER ROLE ASSIGNMENT
// ============================================================================

/**
 * Analyze a single partner and suggest their role based on the project concept
 */
export function analyzePartnerForRole(
  partner: Partner | ConsortiumPartner,
  idea: ProjectIdea,
  concept?: SavedConcept,
  existingAssignments: PartnerRoleAssignment[] = []
): PartnerRoleAssignment {
  // Normalize partner data (handle both Partner and ConsortiumPartner types)
  const partnerName = 'organizationName' in partner ? partner.organizationName : partner.name;
  const partnerId = partner.id;
  const country = partner.country;
  const partnerType = 'organizationType' in partner ? partner.organizationType : partner.type;

  // Get expertise - handle different data structures
  let expertise: string[] = [];
  if ('expertiseAreas' in partner && partner.expertiseAreas) {
    expertise = partner.expertiseAreas.map(e => e.domain);
  } else if ('expertise' in partner && partner.expertise) {
    expertise = partner.expertise;
  }

  // Get previous projects
  let previousProjects: any[] = [];
  if ('previousProjects' in partner && partner.previousProjects) {
    previousProjects = partner.previousProjects;
  }

  // Check if already assigned as lead/coordinator
  const isLead = 'isLead' in partner ? partner.isLead : false;

  // Normalize expertise for matching
  const normalizedExpertise = normalizeExpertise(expertise);

  // Build concept keywords for matching
  const conceptKeywords: string[] = [];
  if (concept) {
    conceptKeywords.push(
      ...concept.innovation.toLowerCase().split(/\s+/),
      ...concept.problemStatement.toLowerCase().split(/\s+/)
    );
  }
  conceptKeywords.push(
    ...idea.targetGroups.map(t => t.toLowerCase()),
    idea.sector.toLowerCase(),
    idea.mainObjective.toLowerCase()
  );

  // Calculate match scores for each role
  const roleScores: { role: PartnerRoleAssignment['suggestedRole']; score: number; matched: string[] }[] = [];

  for (const roleDef of CONSORTIUM_ROLES) {
    let score = 0;
    const matched: string[] = [];

    // Check expertise match
    for (const reqExp of roleDef.requiredExpertise) {
      if (normalizedExpertise.includes(reqExp)) {
        score += 20;
        matched.push(reqExp);
      }
    }

    // Bonus for coordinator: previous EU projects
    if (roleDef.role === 'COORDINATOR') {
      const hasEUExperience = previousProjects.some(p =>
        typeof p === 'string'
          ? p.toLowerCase().includes('erasmus') || p.toLowerCase().includes('eu')
          : (p.programme || '').toLowerCase().includes('erasmus')
      );
      if (hasEUExperience) {
        score += 30;
        matched.push('eu_experience');
      }
      // Coordinator should not be a newcomer ideally
      const isNewcomer = 'isNewcomer' in partner ? partner.isNewcomer : previousProjects.length === 0;
      if (!isNewcomer) {
        score += 15;
      }
    }

    // Bonus for technical lead: universities/research institutions
    if (roleDef.role === 'TECHNICAL_LEAD') {
      if (partnerType?.toLowerCase().includes('university') || partnerType?.toLowerCase().includes('research')) {
        score += 20;
        matched.push('research_institution');
      }
    }

    // Bonus for dissemination: NGOs and networks
    if (roleDef.role === 'DISSEMINATION_LEAD') {
      if (partnerType?.toLowerCase().includes('ngo') || partnerType?.toLowerCase().includes('network') || partnerType?.toLowerCase().includes('association')) {
        score += 20;
        matched.push('network_organization');
      }
    }

    // Check if this role is already taken
    const roleTaken = existingAssignments.some(a => a.suggestedRole === roleDef.role && roleDef.role !== 'PARTNER');
    if (roleTaken && roleDef.role !== 'PARTNER') {
      score = Math.max(0, score - 50); // Penalize but don't exclude
    }

    roleScores.push({ role: roleDef.role, score, matched });
  }

  // Sort by score and get best match
  roleScores.sort((a, b) => b.score - a.score);
  const bestRole = isLead ? { role: 'COORDINATOR' as const, score: 100, matched: ['designated_lead'] } : roleScores[0];

  // Generate rationale
  const roleLabel = CONSORTIUM_ROLES.find(r => r.role === bestRole.role)?.labelDE || bestRole.role;
  const rationale = generateRoleRationale(partnerName, bestRole.role, bestRole.matched, expertise, idea);

  // Suggest WP leads based on expertise
  const suggestedWPLeads = suggestWPLeads(normalizedExpertise, bestRole.role);

  // Identify strengths and gaps
  const strengths: string[] = [];
  const gaps: string[] = [];

  if (previousProjects.length > 0) {
    strengths.push(`${previousProjects.length} bisherige Projekte`);
  } else {
    gaps.push('Keine dokumentierten Vorprojekte (Newcomer)');
  }

  if (expertise.length > 3) {
    strengths.push('Breites Expertise-Profil');
  }

  if (normalizedExpertise.includes('eu_projects')) {
    strengths.push('EU-Projekterfahrung');
  }

  return {
    partnerId,
    partnerName,
    suggestedRole: bestRole.role,
    roleRationale: rationale,
    matchScore: Math.min(100, bestRole.score),
    matchedExpertise: bestRole.matched,
    suggestedWPLeads,
    strengths,
    gaps
  };
}

function generateRoleRationale(
  partnerName: string,
  role: PartnerRoleAssignment['suggestedRole'],
  matchedExpertise: string[],
  expertise: string[],
  idea: ProjectIdea
): string {
  const roleLabels: Record<string, string> = {
    'COORDINATOR': 'Projektkoordinator',
    'TECHNICAL_LEAD': 'Technischer Leiter',
    'CONTENT_EXPERT': 'Inhaltsexperte',
    'DISSEMINATION_LEAD': 'Verbreitungsleiter',
    'QUALITY_ASSURANCE': 'Qualitätssicherung',
    'PARTNER': 'Projektpartner'
  };

  let rationale = `${partnerName} wird als **${roleLabels[role]}** vorgeschlagen`;

  if (matchedExpertise.length > 0) {
    rationale += ` aufgrund der Expertise in: ${matchedExpertise.join(', ')}`;
  }

  if (role === 'COORDINATOR') {
    rationale += `. Als Koordinator übernimmt die Organisation die Gesamtleitung, das Finanzmanagement und die Berichterstattung an die EU.`;
  } else if (role === 'TECHNICAL_LEAD') {
    rationale += `. Die technische Leitung umfasst die Entwicklung der Projektergebnisse und methodischen Ansätze.`;
  } else if (role === 'DISSEMINATION_LEAD') {
    rationale += `. Die Verbreitungsleitung koordiniert alle Kommunikations- und Verbreitungsaktivitäten.`;
  }

  return rationale;
}

function suggestWPLeads(normalizedExpertise: string[], role: PartnerRoleAssignment['suggestedRole']): number[] {
  const wpLeads: number[] = [];

  // WP1 (Management) - always coordinator
  if (role === 'COORDINATOR') {
    wpLeads.push(1);
  }

  // WP for development/technical work
  if (normalizedExpertise.includes('technical') || normalizedExpertise.includes('digital') || role === 'TECHNICAL_LEAD') {
    wpLeads.push(3); // Typically WP3 is development
  }

  // WP for content/methodology
  if (normalizedExpertise.includes('education') || normalizedExpertise.includes('research') || role === 'CONTENT_EXPERT') {
    wpLeads.push(2); // Typically WP2 is research/analysis
  }

  // WP for dissemination
  if (normalizedExpertise.includes('communication') || normalizedExpertise.includes('networking') || role === 'DISSEMINATION_LEAD') {
    wpLeads.push(5); // Typically last WP is dissemination
  }

  // WP for piloting/testing
  if (normalizedExpertise.includes('evaluation') || role === 'QUALITY_ASSURANCE') {
    wpLeads.push(4); // Typically WP4 is piloting
  }

  return wpLeads;
}

// ============================================================================
// CONSORTIUM ANALYSIS
// ============================================================================

/**
 * Analyze the entire consortium for completeness and balance
 */
export function analyzeConsortium(
  partners: (Partner | ConsortiumPartner)[],
  idea: ProjectIdea,
  concept?: SavedConcept
): ConsortiumAnalysis {
  // Geographic coverage
  const countries = [...new Set(partners.map(p => p.country))];
  const regions = categorizeCountries(countries);

  let euCoverage: ConsortiumAnalysis['geographicCoverage']['euCoverage'] = 'INSUFFICIENT';
  if (countries.length >= 4 && regions.size >= 2) {
    euCoverage = 'EXCELLENT';
  } else if (countries.length >= 3) {
    euCoverage = 'GOOD';
  } else if (countries.length >= 2) {
    euCoverage = 'ADEQUATE';
  }

  // Expertise coverage
  const allExpertise: string[] = [];
  for (const partner of partners) {
    if ('expertiseAreas' in partner && partner.expertiseAreas) {
      allExpertise.push(...partner.expertiseAreas.map(e => e.domain));
    } else if ('expertise' in partner && partner.expertise) {
      allExpertise.push(...partner.expertise);
    }
  }
  const normalizedExpertise = normalizeExpertise(allExpertise);

  // Required expertise based on sector
  const requiredExpertise = getRequiredExpertise(idea.sector, concept);
  const covered = requiredExpertise.filter(e => normalizedExpertise.includes(e));
  const missing = requiredExpertise.filter(e => !normalizedExpertise.includes(e));

  // Partner type balance
  const partnerTypes = partners.map(p =>
    ('organizationType' in p ? p.organizationType : p.type)?.toLowerCase() || ''
  );

  const hasUniversity = partnerTypes.some(t => t.includes('university') || t.includes('hochschule') || t.includes('research'));
  const hasSME = partnerTypes.some(t => t.includes('sme') || t.includes('kmu') || t.includes('company') || t.includes('unternehmen'));
  const hasNGO = partnerTypes.some(t => t.includes('ngo') || t.includes('association') || t.includes('verein') || t.includes('foundation'));
  const hasPublicBody = partnerTypes.some(t => t.includes('public') || t.includes('government') || t.includes('municipality') || t.includes('behörde'));

  const typeCount = [hasUniversity, hasSME, hasNGO, hasPublicBody].filter(Boolean).length;
  const isBalanced = typeCount >= 2;

  // Generate recommendations
  const recommendations: string[] = [];
  const warnings: string[] = [];

  if (countries.length < 3) {
    warnings.push('Mindestens 3 Länder sind für KA220 erforderlich');
  }

  if (missing.length > 0) {
    recommendations.push(`Fehlende Expertise: ${missing.join(', ')} - erwägen Sie einen zusätzlichen Partner`);
  }

  if (!isBalanced) {
    recommendations.push('Mehr Diversität bei Organisationstypen würde das Konsortium stärken');
  }

  if (!hasUniversity && idea.sector !== 'YOU') {
    recommendations.push('Eine Hochschule/Forschungseinrichtung würde die wissenschaftliche Fundierung stärken');
  }

  // Check for coordinator
  const hasCoordinator = partners.some(p => 'isLead' in p ? p.isLead : false);
  if (!hasCoordinator) {
    warnings.push('Kein Koordinator definiert - bitte wählen Sie einen Projektkoordinator');
  }

  // Calculate overall score
  const geoScore = euCoverage === 'EXCELLENT' ? 25 : euCoverage === 'GOOD' ? 20 : euCoverage === 'ADEQUATE' ? 15 : 5;
  const expertiseScore = (covered.length / Math.max(requiredExpertise.length, 1)) * 40;
  const typeScore = isBalanced ? 25 : 15;
  const coordinatorScore = hasCoordinator ? 10 : 0;

  const overallScore = Math.round(geoScore + expertiseScore + typeScore + coordinatorScore);

  return {
    overallScore,
    geographicCoverage: {
      countries,
      regions: Array.from(regions),
      euCoverage
    },
    expertiseCoverage: {
      covered,
      missing,
      score: Math.round((covered.length / Math.max(requiredExpertise.length, 1)) * 100)
    },
    partnerTypeBalance: {
      hasUniversity,
      hasSME,
      hasNGO,
      hasPublicBody,
      isBalanced
    },
    recommendations,
    warnings
  };
}

function categorizeCountries(countries: string[]): Set<string> {
  const regions = new Set<string>();

  const regionMap: Record<string, string> = {
    // Western Europe
    'DE': 'Western', 'AT': 'Western', 'CH': 'Western', 'NL': 'Western', 'BE': 'Western', 'LU': 'Western', 'FR': 'Western',
    // Southern Europe
    'IT': 'Southern', 'ES': 'Southern', 'PT': 'Southern', 'GR': 'Southern', 'MT': 'Southern', 'CY': 'Southern',
    // Northern Europe
    'SE': 'Northern', 'DK': 'Northern', 'FI': 'Northern', 'NO': 'Northern', 'IS': 'Northern', 'IE': 'Northern',
    // Eastern Europe
    'PL': 'Eastern', 'CZ': 'Eastern', 'SK': 'Eastern', 'HU': 'Eastern', 'RO': 'Eastern', 'BG': 'Eastern',
    'SI': 'Eastern', 'HR': 'Eastern', 'EE': 'Eastern', 'LV': 'Eastern', 'LT': 'Eastern'
  };

  for (const country of countries) {
    const region = regionMap[country.toUpperCase()];
    if (region) {
      regions.add(region);
    }
  }

  return regions;
}

function getRequiredExpertise(sector: string, concept?: SavedConcept): string[] {
  const base = ['project_management', 'communication'];

  const sectorExpertise: Record<string, string[]> = {
    'ADU': ['adult', 'education', 'evaluation'],
    'VET': ['vet', 'education', 'technical'],
    'SCH': ['education', 'youth', 'digital'],
    'YOU': ['youth', 'inclusion', 'networking']
  };

  const expertise = [...base, ...(sectorExpertise[sector] || [])];

  // Add based on concept priorities
  if (concept) {
    if (concept.innovation.toLowerCase().includes('digital')) {
      expertise.push('digital');
    }
    if (concept.innovation.toLowerCase().includes('green') || concept.innovation.toLowerCase().includes('nachhaltig')) {
      expertise.push('green');
    }
  }

  return [...new Set(expertise)];
}

// ============================================================================
// CONVERT CRM PARTNERS TO CONSORTIUM PARTNERS
// ============================================================================

/**
 * Convert CRM Partner to ConsortiumPartner with enriched data
 */
export function convertToConsortiumPartner(
  partner: Partner,
  roleAssignment?: PartnerRoleAssignment
): ConsortiumPartner {
  return {
    id: partner.id,
    crmId: partner.id,
    name: partner.organizationName,
    country: partner.country,
    type: partner.organizationType,
    expertise: partner.expertiseAreas?.map(e => e.domain) || [],
    targetGroups: partner.targetGroups?.map(t => t.group) || [],
    previousProjects: partner.previousProjects || [],
    isLead: roleAssignment?.suggestedRole === 'COORDINATOR',
    role: roleAssignment
      ? CONSORTIUM_ROLES.find(r => r.role === roleAssignment.suggestedRole)?.labelDE
      : 'Projektpartner',
    costPerDay: getDefaultDayRate(partner.country),
    generatedDescriptions: partner.generatedDescriptions?.map(d => ({
      title: d.title,
      content: d.content
    })),
    uploadedDocuments: partner.uploadedDocuments?.map(d => ({
      name: d.name,
      type: d.type,
      description: d.description,
      summary: d.summary
    }))
  };
}

function getDefaultDayRate(country: string): number {
  // Based on EU country cost categories
  const highCost = ['DE', 'AT', 'BE', 'DK', 'FI', 'FR', 'IE', 'IT', 'LU', 'NL', 'SE', 'NO', 'IS', 'LI'];
  const mediumCost = ['CY', 'CZ', 'EE', 'GR', 'ES', 'PT', 'SI', 'MT'];
  // Low cost: rest

  if (highCost.includes(country.toUpperCase())) {
    return 450;
  } else if (mediumCost.includes(country.toUpperCase())) {
    return 350;
  } else {
    return 280;
  }
}

// ============================================================================
// GENERATE COMPREHENSIVE PARTNER DESCRIPTION FOR STEP 2
// ============================================================================

/**
 * Generate a comprehensive partner profile combining CRM data with concept context
 */
export function generatePartnerContextForAI(
  partner: Partner | ConsortiumPartner,
  roleAssignment: PartnerRoleAssignment,
  idea: ProjectIdea,
  concept?: SavedConcept
): string {
  const partnerName = 'organizationName' in partner ? partner.organizationName : partner.name;
  const partnerType = 'organizationType' in partner ? partner.organizationType : partner.type;

  let expertise: string[] = [];
  if ('expertiseAreas' in partner && partner.expertiseAreas) {
    expertise = partner.expertiseAreas.map(e => `${e.domain} (${e.level})`);
  } else if ('expertise' in partner && partner.expertise) {
    expertise = partner.expertise;
  }

  let targetGroups: string[] = [];
  if ('targetGroups' in partner) {
    if (Array.isArray(partner.targetGroups)) {
      targetGroups = partner.targetGroups.map(t => typeof t === 'string' ? t : t.group);
    }
  }

  let previousProjects: any[] = [];
  if ('previousProjects' in partner && partner.previousProjects) {
    previousProjects = partner.previousProjects;
  }

  // Build comprehensive context
  let context = `
=== PARTNER-PROFIL: ${partnerName} ===

GRUNDDATEN:
- Name: ${partnerName}
- Land: ${partner.country}
- Organisationstyp: ${partnerType}
- Rolle im Projekt: ${roleAssignment.suggestedRole === 'COORDINATOR' ? 'Projektkoordinator' : CONSORTIUM_ROLES.find(r => r.role === roleAssignment.suggestedRole)?.labelDE || 'Projektpartner'}

EXPERTISE-BEREICHE:
${expertise.length > 0 ? expertise.map(e => `- ${e}`).join('\n') : '- Nicht spezifiziert'}

ZIELGRUPPEN:
${targetGroups.length > 0 ? targetGroups.map(t => `- ${t}`).join('\n') : '- Nicht spezifiziert'}

BISHERIGE PROJEKTE:
${previousProjects.length > 0
  ? previousProjects.map(p => {
      if (typeof p === 'string') return `- ${p}`;
      return `- ${p.title || p.name || 'Projekt'} (${p.programme || 'unbekanntes Programm'}, ${p.role || 'Partner'})`;
    }).join('\n')
  : '- Newcomer (keine dokumentierten Vorprojekte)'}

STÄRKEN FÜR DIESES PROJEKT:
${roleAssignment.strengths.map(s => `- ${s}`).join('\n')}

BEGRÜNDUNG DER ROLLENZUWEISUNG:
${roleAssignment.roleRationale}
`;

  // Add generated descriptions if available
  if ('generatedDescriptions' in partner && partner.generatedDescriptions && partner.generatedDescriptions.length > 0) {
    context += `
VORHANDENE ORGANISATIONSBESCHREIBUNG:
${partner.generatedDescriptions[0].content}
`;
  }

  // Add mission statement if available
  if ('missionStatement' in partner && partner.missionStatement) {
    context += `
LEITBILD/MISSION:
${partner.missionStatement}
`;
  }

  // Add internet research if available
  if ('internetResearch' in partner && partner.internetResearch) {
    context += `
ZUSÄTZLICHE RECHERCHE-INFORMATIONEN:
${partner.internetResearch}
`;
  }

  // Add uploaded document summaries with FULL details for AI context
  if ('uploadedDocuments' in partner && partner.uploadedDocuments && partner.uploadedDocuments.length > 0) {
    context += `
=== DOKUMENTIERTE NACHWEISE & ERFAHRUNGEN ===
`;
    for (const doc of partner.uploadedDocuments) {
      context += `
--- ${doc.name} (${doc.type}) ---`;

      if (doc.summary) {
        // Executive Summary
        if (doc.summary.executiveSummary) {
          context += `
ZUSAMMENFASSUNG: ${doc.summary.executiveSummary}`;
        }

        // Key Findings - wichtig für Glaubwürdigkeit!
        if (doc.summary.keyFindings && doc.summary.keyFindings.length > 0) {
          context += `
WICHTIGSTE ERKENNTNISSE:`;
          for (const finding of doc.summary.keyFindings.slice(0, 5)) {
            context += `
  • ${finding.topic}: ${finding.finding}`;
          }
        }

        // Methodology - zeigt methodische Kompetenz
        if (doc.summary.methodology) {
          context += `
METHODISCHER ANSATZ: ${doc.summary.methodology}`;
        }

        // Recommendations - können als Projektideen dienen
        if (doc.summary.recommendations && doc.summary.recommendations.length > 0) {
          context += `
EMPFEHLUNGEN AUS DEM DOKUMENT:`;
          for (const rec of doc.summary.recommendations.slice(0, 3)) {
            context += `
  → ${rec}`;
          }
        }

        // Keywords/Expertise areas
        if (doc.summary.keyTerms && doc.summary.keyTerms.length > 0) {
          context += `
THEMENFELDER: ${doc.summary.keyTerms.join(', ')}`;
        }
      }
      context += '\n';
    }

    // Add instruction for AI to use this content
    context += `
WICHTIG FÜR DIE TEXTGENERIERUNG:
Die oben genannten Erkenntnisse, Methodiken und Empfehlungen aus den Dokumenten
sind REALE ERFAHRUNGEN dieses Partners. Nutze diese spezifischen Details,
um die Partnerbeschreibung und Projekttexte AUTHENTISCH und NICHT-GENERISCH zu gestalten.
Verweise wo passend auf konkrete frühere Erfahrungen und Ergebnisse.
`;
  }

  // Add concept context
  if (concept) {
    context += `
=== PROJEKT-KONZEPT ===
Titel: ${concept.title}
Innovation: ${concept.innovation}
Problemstellung: ${concept.problemStatement}
Zielgruppen: ${idea.targetGroups.join(', ')}

WIE DIESER PARTNER ZUM KONZEPT BEITRÄGT:
Basierend auf der Expertise in ${roleAssignment.matchedExpertise.join(', ')} kann ${partnerName}
folgende Aspekte des Projekts unterstützen:
`;

    // Match expertise to concept
    if (roleAssignment.matchedExpertise.includes('technical') || roleAssignment.matchedExpertise.includes('digital')) {
      context += `- Technische Entwicklung und digitale Umsetzung der Projektergebnisse\n`;
    }
    if (roleAssignment.matchedExpertise.includes('education') || roleAssignment.matchedExpertise.includes('research')) {
      context += `- Inhaltliche Entwicklung und methodische Fundierung\n`;
    }
    if (roleAssignment.matchedExpertise.includes('communication') || roleAssignment.matchedExpertise.includes('networking')) {
      context += `- Verbreitung und Netzwerkaktivitäten\n`;
    }
    if (roleAssignment.matchedExpertise.includes('evaluation') || roleAssignment.matchedExpertise.includes('quality')) {
      context += `- Qualitätssicherung und Evaluation\n`;
    }
  }

  return context;
}
