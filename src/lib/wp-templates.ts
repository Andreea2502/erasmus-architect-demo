/**
 * WORK PACKAGE TEMPLATES
 * ======================
 * Strukturierte Vorlagen für Erasmus+ Arbeitspakete
 * Basierend auf dem Programmleitfaden, NA-Erfahrungswerten und Best Practices
 *
 * WICHTIGE REGELN (Lump-Sum-Modell):
 * - Das "20%-Gesetz": WP1 Management maximal 20% des Gesamtbudgets
 * - Maximal 5 WPs (inkl. Management) empfohlen
 * - Kein Partner (außer Koordinator) sollte mehr als 2 WPs leiten
 * - Jeder Partner sollte mindestens ein WP leiten oder Co-Lead sein
 * - Koordinator MUSS WP1 (Management) leiten
 */

// ============================================================================
// TYPES
// ============================================================================

export interface WPActivity {
  id: string;
  name: string;
  nameDE: string;
  description: string;
  descriptionDE: string;
  typicalDuration: string; // e.g., "M1-M3", "M1", "ongoing"
  mandatory?: boolean;
  category: 'meeting' | 'development' | 'testing' | 'communication' | 'management' | 'research';
}

export interface WPDeliverable {
  id: string;
  name: string;
  nameDE: string;
  type: 'report' | 'tool' | 'curriculum' | 'event' | 'publication' | 'other';
  description: string;
  descriptionDE: string;
}

export interface WPTemplate {
  id: string;
  type: WPType;
  name: string;
  nameDE: string;
  description: string;
  descriptionDE: string;
  typicalLeadType: ('COORDINATOR' | 'UNIVERSITY' | 'NGO' | 'SME' | 'PUBLIC_BODY' | 'ANY')[];
  suggestedActivities: WPActivity[];
  suggestedDeliverables: WPDeliverable[];
  maxBudgetPercent: number;
  order: number; // Recommended position in project
  tips: string[];
  tipsDE: string[];
}

export type WPType =
  | 'MANAGEMENT'
  | 'RESEARCH_ANALYSIS'
  | 'DEVELOPMENT'
  | 'PILOTING'
  | 'DISSEMINATION'
  | 'QUALITY';

// ============================================================================
// BENCHMARKS & SHADOW CALCULATION (Schattenkalkulation)
// ============================================================================
// Diese Werte basieren auf den historischen Unit Costs und NA-Erfahrungen.
// Evaluatoren prüfen implizit gegen diese Werte ("Unit Cost Bias").

export const BENCHMARKS = {
  // Transnationale Projektmeetings (TPMs)
  TPM: {
    costPerPersonPerMeeting: { min: 600, max: 800 }, // € (Reise + Aufenthalt)
    personsPerPartner: { min: 1, max: 2 }, // Typisch: Projektleiter + 1 Experte
    recommendedFrequency: 'Kick-off + 1-2 Interim + Final', // Bei 24 Monaten
    warningThreshold: 4, // >4 Personen pro Partner = "Projekttourismus"
  },

  // Multiplier Events
  MULTIPLIER_EVENTS: {
    costPerLocalParticipant: 100, // € (historische Rate)
    costPerInternationalParticipant: 200, // €
    onlineEventRate: 0.15, // 15% der physischen Rate
    minParticipantsLocalWorkshop: 20, // Minimum für Relevanz
    targetParticipantsNationalConference: { min: 40, max: 60 },
    targetParticipantsFinalConference: { min: 80, max: 120 },
    minEventsPerPartnerCountry: 1, // Jedes Land sollte mindestens 1 Event haben
  },

  // Learning, Teaching, Training Activities (LTTAs)
  LTTA: {
    minDurationDays: 3, // Kürzer als 3 Tage = nicht nachhaltig
    maxDurationDays: 5, // Plus Reisetage
    minParticipantsPerPartner: 2, // Weniger wirkt schwach
    targetGroupSize: { min: 15, max: 25 }, // Didaktisch sinnvoll
    warningSmallGroup: 6, // <6 Teilnehmer wirkt irrelevant
  },

  // Personalkosten (Orientierungswerte nach Land)
  DAILY_RATES: {
    // Westeuropa (DE, AT, FR, NL, BE, etc.)
    western: { manager: { min: 350, max: 450 }, researcher: { min: 280, max: 350 }, admin: { min: 200, max: 280 } },
    // Südeuropa (IT, ES, PT, GR)
    southern: { manager: { min: 300, max: 400 }, researcher: { min: 250, max: 320 }, admin: { min: 180, max: 250 } },
    // Osteuropa (PL, CZ, RO, BG, HU, etc.)
    eastern: { manager: { min: 250, max: 350 }, researcher: { min: 200, max: 280 }, admin: { min: 150, max: 220 } },
    // Nordeuropa (SE, DK, FI, NO)
    northern: { manager: { min: 400, max: 500 }, researcher: { min: 320, max: 400 }, admin: { min: 250, max: 320 } },
  },

  // Budget-Verteilung (Richtwerte)
  BUDGET_DISTRIBUTION: {
    management: { max: 0.20, recommended: 0.18 }, // Max 20%, empfohlen 18%
    research: { min: 0.15, max: 0.25, recommended: 0.20 },
    development: { min: 0.25, max: 0.40, recommended: 0.30 }, // Herzstück!
    piloting: { min: 0.10, max: 0.20, recommended: 0.16 },
    dissemination: { min: 0.10, max: 0.20, recommended: 0.15 },
  },
};

// ============================================================================
// NO-GOS - Häufige Fehler, die zur Ablehnung führen
// ============================================================================

export const NO_GOS = {
  // Budget No-Gos
  budget: [
    { id: 'management_over_20', message: 'Management-WP über 20% des Gesamtbudgets', severity: 'error' as const },
    { id: 'coordinator_concentration', message: 'Mehr als 40% des Budgets beim Koordinator', severity: 'warning' as const },
    { id: 'partner_underfunded', message: 'Partner mit weniger als 10% des Budgets (außer bei spezifischer Rolle)', severity: 'warning' as const },
    { id: 'no_development_core', message: 'Development-WP hat weniger Budget als Management', severity: 'error' as const },
  ],

  // Struktur No-Gos
  structure: [
    { id: 'too_many_wps', message: 'Mehr als 5 WPs (erhöht Komplexität exponentiell)', severity: 'warning' as const },
    { id: 'partner_too_many_leads', message: 'Partner (außer Koordinator) leitet mehr als 2 WPs', severity: 'warning' as const },
    { id: 'no_piloting', message: 'Kein Piloting/Testing-WP (fehlende Validierung)', severity: 'error' as const },
    { id: 'management_not_coordinator', message: 'WP1 wird nicht vom Koordinator geleitet', severity: 'error' as const },
  ],

  // Inhalt No-Gos
  content: [
    { id: 'vague_indicators', message: 'Vage Indikatoren wie "erhöhtes Bewusstsein" statt konkreter Zahlen', severity: 'error' as const },
    { id: 'black_box_budget', message: 'Keine Details zu Aktivitäten (z.B. "Entwicklung App" für 60.000€ ohne Spezifikation)', severity: 'error' as const },
    { id: 'generic_dissemination', message: 'Generische Verbreitung ("auf Social Media teilen") ohne konkrete Strategie', severity: 'warning' as const },
    { id: 'small_events', message: 'Multiplier Events mit weniger als 20 Teilnehmern', severity: 'warning' as const },
  ],
};

// ============================================================================
// SMART INDICATOR TEMPLATES (für TIPP-Anzeige)
// ============================================================================

export const SMART_INDICATOR_TEMPLATES = {
  management: [
    { template: '{n} Steering Committee Meetings (alle {m} Wochen)', example: '4 Steering Committee Meetings (alle 6-8 Wochen)' },
    { template: 'Risk Register mit {n} identifizierten Risiken und Mitigationsstrategien', example: 'Risk Register mit 10 identifizierten Risiken und Mitigationsstrategien' },
    { template: '{n} Progress Reports an die NA', example: '2 Progress Reports an die NA' },
  ],
  research: [
    { template: '{n} Befragte aus {m} Ländern', example: '150 Befragte aus 5 Ländern' },
    { template: 'State-of-the-Art Report ({n} Seiten, {m} Sprachen)', example: 'State-of-the-Art Report (40 Seiten, 5 Sprachen)' },
    { template: 'Competence Framework mit {n} Kompetenzbereichen', example: 'Competence Framework mit 8 Kompetenzbereichen' },
  ],
  development: [
    { template: '{n} Lernmodule à {m} notional learning hours', example: '5 Lernmodule à 8 notional learning hours (40h total)' },
    { template: 'Plattform in {n} Sprachen mit {m} Nutzern (Ziel)', example: 'Plattform in 6 Sprachen mit 500 registrierten Nutzern (Ziel)' },
    { template: '{n} Templates/Werkzeuge für Zielgruppe', example: '7 Templates/Werkzeuge für Berufsschullehrer' },
    { template: 'Train-the-Trainer Curriculum ({n} Stunden)', example: 'Train-the-Trainer Curriculum (16 Stunden)' },
  ],
  piloting: [
    { template: '{n} Trainer in {m} Ländern geschult', example: '30 Trainer in 5 Ländern geschult' },
    { template: '{n}% Zufriedenheitsrate bei Pilotteilnehmern', example: '75% Zufriedenheitsrate bei Pilotteilnehmern' },
    { template: 'User Testing mit {n} Teilnehmern (Phase 1), {m} Teilnehmer (Phase 2)', example: 'User Testing mit 12 Teilnehmern (Phase 1), 92 Teilnehmer (Phase 2)' },
    { template: '{n} Digitale Badges vergeben', example: '92 Digitale Badges vergeben' },
  ],
  dissemination: [
    { template: '{n} Multiplier Events in {m} Ländern mit {p} Teilnehmern total', example: '6 Multiplier Events in 5 Ländern mit 200 Teilnehmern total' },
    { template: '{n} Downloads des Handbuchs/Toolkit', example: '500 Downloads des Handbuchs' },
    { template: 'Social Media Reach: {n} Follower, {m}% Engagement Rate', example: 'LinkedIn: 2.000 Follower, 2% Engagement Rate (400 Interaktionen)' },
    { template: 'Medienkampagne mit {n} Audio- und {m} Video-Dateien', example: 'Medienkampagne mit 3 Audio- und 6 Video-Dateien' },
    { template: 'Abschlusskonferenz mit {n} Teilnehmern', example: 'Abschlusskonferenz mit 80 Teilnehmern' },
  ],
};

// ============================================================================
// EXAMPLE BUDGET DISTRIBUTION (Case Study DIG-I-PACT 250k)
// ============================================================================

export const EXAMPLE_BUDGET_250K = {
  total: 250000,
  wps: [
    { wp: 'WP1', title: 'Projektmanagement', budget: 49000, percent: 19.6, lead: 'Koordinator' },
    { wp: 'WP2', title: 'Curriculum & Framework', budget: 78000, percent: 31.2, lead: 'Universität' },
    { wp: 'WP3', title: 'Digitale Ressourcen', budget: 42000, percent: 16.8, lead: 'Tech-Partner' },
    { wp: 'WP4', title: 'Pilotierung & Badging', budget: 37000, percent: 14.8, lead: 'NGO' },
    { wp: 'WP5', title: 'Dissemination & Impact', budget: 44000, percent: 17.6, lead: 'Verband' },
  ],
  notes: [
    'WP1 unter 20% (19.6%) - Regel eingehalten',
    'WP2 als "Herzstück" mit höchstem Entwicklungsbudget',
    'Jeder Partner hat eine Lead-Rolle',
    'Events nach Pilotierung (Monat 23+) geplant',
  ],
};

// ============================================================================
// ACTIVITIES DATABASE
// ============================================================================

export const STANDARD_ACTIVITIES: Record<string, WPActivity> = {
  // Management Activities
  'kickoff': {
    id: 'kickoff',
    name: 'Kick-off Meeting',
    nameDE: 'Kick-off-Treffen',
    description: 'Initial consortium meeting to align on objectives, work plan and communication',
    descriptionDE: 'Erstes Konsortialtreffen zur Abstimmung von Zielen, Arbeitsplan und Kommunikation',
    typicalDuration: 'M1',
    mandatory: true,
    category: 'meeting'
  },
  'quality_plan': {
    id: 'quality_plan',
    name: 'Quality Assurance Plan',
    nameDE: 'Qualitätssicherungsplan',
    description: 'Development of quality standards and monitoring procedures',
    descriptionDE: 'Entwicklung von Qualitätsstandards und Monitoring-Verfahren',
    typicalDuration: 'M1-M3',
    mandatory: true,
    category: 'management'
  },
  'progress_monitoring': {
    id: 'progress_monitoring',
    name: 'Progress Monitoring',
    nameDE: 'Fortschrittsüberwachung',
    description: 'Continuous monitoring of project progress and milestones',
    descriptionDE: 'Kontinuierliche Überwachung des Projektfortschritts und der Meilensteine',
    typicalDuration: 'ongoing',
    mandatory: true,
    category: 'management'
  },
  'risk_management': {
    id: 'risk_management',
    name: 'Risk Management',
    nameDE: 'Risikomanagement',
    description: 'Identification, assessment and mitigation of project risks',
    descriptionDE: 'Identifikation, Bewertung und Minderung von Projektrisiken',
    typicalDuration: 'ongoing',
    category: 'management'
  },
  'financial_management': {
    id: 'financial_management',
    name: 'Financial Management',
    nameDE: 'Finanzmanagement',
    description: 'Budget monitoring, cost reporting and financial documentation',
    descriptionDE: 'Budgetüberwachung, Kostenberichte und Finanzdokumentation',
    typicalDuration: 'ongoing',
    mandatory: true,
    category: 'management'
  },
  'consortium_meetings': {
    id: 'consortium_meetings',
    name: 'Transnational Partner Meetings',
    nameDE: 'Transnationale Partnertreffen',
    description: 'Regular consortium meetings (typically 2-4 per year)',
    descriptionDE: 'Regelmäßige Konsortialtreffen (typischerweise 2-4 pro Jahr)',
    typicalDuration: 'ongoing',
    mandatory: true,
    category: 'meeting'
  },
  'reporting': {
    id: 'reporting',
    name: 'Progress & Final Reporting',
    nameDE: 'Zwischen- und Abschlussbericht',
    description: 'Preparation of progress and final reports to the EU',
    descriptionDE: 'Erstellung von Zwischen- und Abschlussberichten an die EU',
    typicalDuration: 'M12, M24, final',
    mandatory: true,
    category: 'management'
  },

  // Research & Analysis Activities
  'needs_analysis': {
    id: 'needs_analysis',
    name: 'Needs Analysis',
    nameDE: 'Bedarfsanalyse',
    description: 'Comprehensive analysis of target group needs and existing gaps',
    descriptionDE: 'Umfassende Analyse der Bedarfe der Zielgruppen und bestehender Lücken',
    typicalDuration: 'M1-M4',
    mandatory: true,
    category: 'research'
  },
  'desk_research': {
    id: 'desk_research',
    name: 'Desk Research',
    nameDE: 'Desk-Recherche',
    description: 'Review of existing literature, studies and best practices',
    descriptionDE: 'Sichtung bestehender Literatur, Studien und Best Practices',
    typicalDuration: 'M1-M3',
    category: 'research'
  },
  'field_research': {
    id: 'field_research',
    name: 'Field Research',
    nameDE: 'Feldforschung',
    description: 'Surveys, interviews, focus groups with target groups',
    descriptionDE: 'Umfragen, Interviews, Fokusgruppen mit Zielgruppen',
    typicalDuration: 'M2-M5',
    category: 'research'
  },
  'comparative_analysis': {
    id: 'comparative_analysis',
    name: 'Comparative Analysis',
    nameDE: 'Vergleichende Analyse',
    description: 'Cross-country comparison of practices and approaches',
    descriptionDE: 'Länderübergreifender Vergleich von Praktiken und Ansätzen',
    typicalDuration: 'M3-M6',
    category: 'research'
  },
  'state_of_art': {
    id: 'state_of_art',
    name: 'State of the Art Report',
    nameDE: 'Stand-der-Forschung-Bericht',
    description: 'Comprehensive report on current state of knowledge in the field',
    descriptionDE: 'Umfassender Bericht zum aktuellen Wissensstand im Themenfeld',
    typicalDuration: 'M4-M6',
    category: 'research'
  },

  // Development Activities
  'methodology_development': {
    id: 'methodology_development',
    name: 'Methodology Development',
    nameDE: 'Methodenentwicklung',
    description: 'Development of project methodology and pedagogical approach',
    descriptionDE: 'Entwicklung der Projektmethodik und des pädagogischen Ansatzes',
    typicalDuration: 'M4-M8',
    mandatory: true,
    category: 'development'
  },
  'curriculum_development': {
    id: 'curriculum_development',
    name: 'Curriculum Development',
    nameDE: 'Curriculum-Entwicklung',
    description: 'Development of training curriculum and learning outcomes',
    descriptionDE: 'Entwicklung des Schulungscurriculums und der Lernergebnisse',
    typicalDuration: 'M6-M12',
    category: 'development'
  },
  'content_creation': {
    id: 'content_creation',
    name: 'Content Creation',
    nameDE: 'Inhaltserstellung',
    description: 'Creation of learning materials, modules and resources',
    descriptionDE: 'Erstellung von Lernmaterialien, Modulen und Ressourcen',
    typicalDuration: 'M8-M16',
    category: 'development'
  },
  'tool_development': {
    id: 'tool_development',
    name: 'Tool/Platform Development',
    nameDE: 'Tool-/Plattformentwicklung',
    description: 'Development of digital tools, platforms or applications',
    descriptionDE: 'Entwicklung digitaler Tools, Plattformen oder Anwendungen',
    typicalDuration: 'M8-M18',
    category: 'development'
  },
  'translation_adaptation': {
    id: 'translation_adaptation',
    name: 'Translation & Adaptation',
    nameDE: 'Übersetzung & Anpassung',
    description: 'Translation and cultural adaptation of materials',
    descriptionDE: 'Übersetzung und kulturelle Anpassung der Materialien',
    typicalDuration: 'M14-M18',
    category: 'development'
  },

  // Piloting & Testing Activities
  'pilot_preparation': {
    id: 'pilot_preparation',
    name: 'Pilot Preparation',
    nameDE: 'Pilotvorbereitung',
    description: 'Preparation of pilot activities, trainer training',
    descriptionDE: 'Vorbereitung der Pilotaktivitäten, Trainerschulung',
    typicalDuration: 'M16-M18',
    category: 'testing'
  },
  'pilot_implementation': {
    id: 'pilot_implementation',
    name: 'Pilot Implementation',
    nameDE: 'Pilotdurchführung',
    description: 'Implementation of pilot activities with target groups',
    descriptionDE: 'Durchführung der Pilotaktivitäten mit Zielgruppen',
    typicalDuration: 'M18-M24',
    mandatory: true,
    category: 'testing'
  },
  'feedback_collection': {
    id: 'feedback_collection',
    name: 'Feedback Collection',
    nameDE: 'Feedback-Sammlung',
    description: 'Collection and analysis of participant feedback',
    descriptionDE: 'Sammlung und Analyse von Teilnehmerfeedback',
    typicalDuration: 'M20-M26',
    category: 'testing'
  },
  'refinement': {
    id: 'refinement',
    name: 'Refinement & Finalization',
    nameDE: 'Überarbeitung & Finalisierung',
    description: 'Refinement of outputs based on pilot feedback',
    descriptionDE: 'Überarbeitung der Ergebnisse basierend auf Pilotfeedback',
    typicalDuration: 'M24-M28',
    category: 'development'
  },

  // Dissemination Activities
  'dissemination_plan': {
    id: 'dissemination_plan',
    name: 'Dissemination Plan',
    nameDE: 'Verbreitungsplan',
    description: 'Development of comprehensive dissemination strategy',
    descriptionDE: 'Entwicklung einer umfassenden Verbreitungsstrategie',
    typicalDuration: 'M1-M3',
    mandatory: true,
    category: 'communication'
  },
  'website_social': {
    id: 'website_social',
    name: 'Website & Social Media',
    nameDE: 'Website & Social Media',
    description: 'Project website, social media presence and content',
    descriptionDE: 'Projektwebsite, Social-Media-Präsenz und Inhalte',
    typicalDuration: 'M2-ongoing',
    mandatory: true,
    category: 'communication'
  },
  'newsletter': {
    id: 'newsletter',
    name: 'Newsletter',
    nameDE: 'Newsletter',
    description: 'Regular newsletter to stakeholders',
    descriptionDE: 'Regelmäßiger Newsletter an Stakeholder',
    typicalDuration: 'quarterly',
    category: 'communication'
  },
  'multiplier_events': {
    id: 'multiplier_events',
    name: 'Multiplier Events',
    nameDE: 'Multiplikator-Veranstaltungen',
    description: 'Public events to disseminate project results',
    descriptionDE: 'Öffentliche Veranstaltungen zur Verbreitung der Projektergebnisse',
    typicalDuration: 'M24-M36',
    mandatory: true,
    category: 'communication'
  },
  'conference_participation': {
    id: 'conference_participation',
    name: 'Conference Participation',
    nameDE: 'Konferenzteilnahme',
    description: 'Presentations at relevant conferences',
    descriptionDE: 'Präsentationen auf relevanten Konferenzen',
    typicalDuration: 'ongoing',
    category: 'communication'
  },
  'publications': {
    id: 'publications',
    name: 'Publications',
    nameDE: 'Publikationen',
    description: 'Articles, papers, policy briefs',
    descriptionDE: 'Artikel, Papers, Policy Briefs',
    typicalDuration: 'M12-M36',
    category: 'communication'
  },
  'sustainability_plan': {
    id: 'sustainability_plan',
    name: 'Sustainability Plan',
    nameDE: 'Nachhaltigkeitsplan',
    description: 'Plan for continuation and exploitation of results',
    descriptionDE: 'Plan zur Weiterführung und Verwertung der Ergebnisse',
    typicalDuration: 'M30-M36',
    mandatory: true,
    category: 'communication'
  },
  'final_conference': {
    id: 'final_conference',
    name: 'Final Conference',
    nameDE: 'Abschlusskonferenz',
    description: 'Final event presenting all project results',
    descriptionDE: 'Abschlussveranstaltung mit Präsentation aller Projektergebnisse',
    typicalDuration: 'M34-M36',
    category: 'communication'
  }
};

// ============================================================================
// DELIVERABLES DATABASE
// ============================================================================

export const STANDARD_DELIVERABLES: Record<string, WPDeliverable> = {
  // Reports
  'needs_report': {
    id: 'needs_report',
    name: 'Needs Analysis Report',
    nameDE: 'Bedarfsanalysebericht',
    type: 'report',
    description: 'Comprehensive report on target group needs and gaps',
    descriptionDE: 'Umfassender Bericht zu Bedarfen der Zielgruppen und Lücken'
  },
  'sota_report': {
    id: 'sota_report',
    name: 'State of the Art Report',
    nameDE: 'Stand-der-Forschung-Bericht',
    type: 'report',
    description: 'Report on current practices and research',
    descriptionDE: 'Bericht zum aktuellen Forschungs- und Praxisstand'
  },
  'methodology_guide': {
    id: 'methodology_guide',
    name: 'Methodology Guide',
    nameDE: 'Methodenleitfaden',
    type: 'report',
    description: 'Guide describing the project methodology',
    descriptionDE: 'Leitfaden zur Projektmethodik'
  },
  'quality_report': {
    id: 'quality_report',
    name: 'Quality Report',
    nameDE: 'Qualitätsbericht',
    type: 'report',
    description: 'Report on quality monitoring and evaluation',
    descriptionDE: 'Bericht zu Qualitätsüberwachung und Evaluation'
  },
  'pilot_report': {
    id: 'pilot_report',
    name: 'Pilot Report',
    nameDE: 'Pilotbericht',
    type: 'report',
    description: 'Report on pilot activities and results',
    descriptionDE: 'Bericht zu Pilotaktivitäten und Ergebnissen'
  },

  // Curricula & Materials
  'curriculum': {
    id: 'curriculum',
    name: 'Training Curriculum',
    nameDE: 'Schulungscurriculum',
    type: 'curriculum',
    description: 'Complete training curriculum with learning outcomes',
    descriptionDE: 'Vollständiges Schulungscurriculum mit Lernergebnissen'
  },
  'training_materials': {
    id: 'training_materials',
    name: 'Training Materials',
    nameDE: 'Schulungsmaterialien',
    type: 'curriculum',
    description: 'All training materials and handouts',
    descriptionDE: 'Alle Schulungsmaterialien und Handouts'
  },
  'trainer_guide': {
    id: 'trainer_guide',
    name: 'Trainer Guide',
    nameDE: 'Trainer-Leitfaden',
    type: 'curriculum',
    description: 'Guide for trainers implementing the materials',
    descriptionDE: 'Leitfaden für Trainer zur Umsetzung der Materialien'
  },

  // Tools
  'digital_platform': {
    id: 'digital_platform',
    name: 'Digital Platform',
    nameDE: 'Digitale Plattform',
    type: 'tool',
    description: 'Online learning platform or tool',
    descriptionDE: 'Online-Lernplattform oder Tool'
  },
  'assessment_tool': {
    id: 'assessment_tool',
    name: 'Assessment Tool',
    nameDE: 'Bewertungstool',
    type: 'tool',
    description: 'Tool for competence assessment',
    descriptionDE: 'Tool zur Kompetenzbewertung'
  },

  // Events
  'multiplier_event': {
    id: 'multiplier_event',
    name: 'Multiplier Event',
    nameDE: 'Multiplikator-Veranstaltung',
    type: 'event',
    description: 'Public event for result dissemination',
    descriptionDE: 'Öffentliche Veranstaltung zur Ergebnisverbreitung'
  },
  'final_event': {
    id: 'final_event',
    name: 'Final Conference',
    nameDE: 'Abschlusskonferenz',
    type: 'event',
    description: 'Final project conference',
    descriptionDE: 'Abschluss-Projektkonferenz'
  },

  // Publications
  'policy_brief': {
    id: 'policy_brief',
    name: 'Policy Brief',
    nameDE: 'Policy Brief',
    type: 'publication',
    description: 'Policy recommendations document',
    descriptionDE: 'Dokument mit politischen Empfehlungen'
  },
  'website': {
    id: 'website',
    name: 'Project Website',
    nameDE: 'Projektwebsite',
    type: 'publication',
    description: 'Dedicated project website',
    descriptionDE: 'Dedizierte Projektwebsite'
  }
};

// ============================================================================
// WP TEMPLATES
// ============================================================================

export const WP_TEMPLATES: WPTemplate[] = [
  {
    id: 'management',
    type: 'MANAGEMENT',
    name: 'Project Management',
    nameDE: 'Projektmanagement',
    description: 'Overall project coordination, monitoring, reporting and quality assurance',
    descriptionDE: 'Gesamte Projektkoordination, Monitoring, Berichterstattung und Qualitätssicherung',
    typicalLeadType: ['COORDINATOR'],
    maxBudgetPercent: 20, // Maximum 20% per Programme Guide!
    order: 1,
    suggestedActivities: [
      STANDARD_ACTIVITIES['kickoff'],
      STANDARD_ACTIVITIES['quality_plan'],
      STANDARD_ACTIVITIES['progress_monitoring'],
      STANDARD_ACTIVITIES['risk_management'],
      STANDARD_ACTIVITIES['financial_management'],
      STANDARD_ACTIVITIES['consortium_meetings'],
      STANDARD_ACTIVITIES['reporting']
    ],
    suggestedDeliverables: [
      STANDARD_DELIVERABLES['quality_report']
    ],
    tips: [
      'CRITICAL: Must not exceed 20% of total budget (NA "golden rule")',
      'MUST be led by the coordinator - no exceptions',
      'Include Kick-off (M1-2, physical), 1-2 Interim Meetings, Final Meeting',
      'TPM: 1-2 persons per partner max. More = "project tourism" warning',
      'Budget ca. 600-800€ per person per meeting (travel + accommodation)',
      'Do NOT include content workshops here - move them to Development WP',
      'Steering Committee every 6-8 weeks (online is fine)',
      'Include honest risk analysis with mitigation strategies'
    ],
    tipsDE: [
      'KRITISCH: Maximal 20% des Gesamtbudgets (NA "goldene Regel")',
      'MUSS vom Koordinator geleitet werden - keine Ausnahmen',
      'Kick-off (M1-2, physisch), 1-2 Zwischenmeetings, Abschlusstreffen einplanen',
      'TPM: Max. 1-2 Personen pro Partner. Mehr = "Projekttourismus"-Warnung',
      'Budget ca. 600-800€ pro Person pro Meeting (Reise + Unterkunft)',
      'Inhaltsworkshops NICHT hier - ins Development-WP verschieben',
      'Steering Committee alle 6-8 Wochen (online ist ok)',
      'Ehrliche Risikoanalyse mit Mitigationsstrategien einbeziehen'
    ]
  },
  {
    id: 'research',
    type: 'RESEARCH_ANALYSIS',
    name: 'Research & Needs Analysis',
    nameDE: 'Forschung & Bedarfsanalyse',
    description: 'Analysis of target group needs, desk research, field research and comparative studies',
    descriptionDE: 'Analyse der Zielgruppenbedarfe, Desk-Recherche, Feldforschung und vergleichende Studien',
    typicalLeadType: ['UNIVERSITY', 'ANY'],
    maxBudgetPercent: 25,
    order: 2,
    suggestedActivities: [
      STANDARD_ACTIVITIES['needs_analysis'],
      STANDARD_ACTIVITIES['desk_research'],
      STANDARD_ACTIVITIES['field_research'],
      STANDARD_ACTIVITIES['comparative_analysis'],
      STANDARD_ACTIVITIES['state_of_art']
    ],
    suggestedDeliverables: [
      STANDARD_DELIVERABLES['needs_report'],
      STANDARD_DELIVERABLES['sota_report']
    ],
    tips: [
      'Involve ALL partners in data collection - proves transnational perspective',
      'Mixed methods: Surveys (quantitative) + Interviews/Focus Groups (qualitative)',
      'Specify numbers: "150 respondents from 5 countries" not just "stakeholders"',
      'Typical budget: 15-25% of total. More = evaluators question necessity',
      'Results MUST directly inform WP3 (Development) - show the connection',
      'University partner is ideal lead for academic credibility',
      'Include comparative analysis across partner countries',
      'Duration: M1-M6 (should not overlap too much with Development)'
    ],
    tipsDE: [
      'ALLE Partner in Datenerhebung einbeziehen - beweist transnationale Perspektive',
      'Mixed Methods: Umfragen (quantitativ) + Interviews/Fokusgruppen (qualitativ)',
      'Zahlen nennen: "150 Befragte aus 5 Ländern", nicht nur "Stakeholder"',
      'Typisches Budget: 15-25%. Mehr = Evaluatoren hinterfragen Notwendigkeit',
      'Ergebnisse MÜSSEN direkt WP3 (Entwicklung) informieren - Zusammenhang zeigen',
      'Uni-Partner ideal als Lead für akademische Glaubwürdigkeit',
      'Vergleichende Analyse über Partnerländer einbeziehen',
      'Dauer: M1-M6 (sollte nicht zu stark mit Entwicklung überlappen)'
    ]
  },
  {
    id: 'development',
    type: 'DEVELOPMENT',
    name: 'Development',
    nameDE: 'Entwicklung',
    description: 'Development of project outputs: curricula, materials, tools, platforms',
    descriptionDE: 'Entwicklung der Projektergebnisse: Curricula, Materialien, Tools, Plattformen',
    typicalLeadType: ['UNIVERSITY', 'SME', 'ANY'],
    maxBudgetPercent: 35,
    order: 3,
    suggestedActivities: [
      STANDARD_ACTIVITIES['methodology_development'],
      STANDARD_ACTIVITIES['curriculum_development'],
      STANDARD_ACTIVITIES['content_creation'],
      STANDARD_ACTIVITIES['tool_development'],
      STANDARD_ACTIVITIES['translation_adaptation']
    ],
    suggestedDeliverables: [
      STANDARD_DELIVERABLES['methodology_guide'],
      STANDARD_DELIVERABLES['curriculum'],
      STANDARD_DELIVERABLES['training_materials'],
      STANDARD_DELIVERABLES['trainer_guide'],
      STANDARD_DELIVERABLES['digital_platform']
    ],
    tips: [
      'THIS IS THE "HEART" - should have the highest budget (typically 30-40%)',
      'AVOID "Black Box": Specify features! Not just "App" but "PWA with 5 modules, user login, database, 6 languages"',
      'Estimate effort: "80 person-days development, 20 days design, 20 days translation"',
      'Plan multiple iterations: Draft → Internal Review → Pilot Feedback → Final',
      'Include translation & cultural adaptation time (often underestimated!)',
      'Accessibility (WCAG 2.1) and inclusivity are EU priorities - mention them',
      'Tech partner or University with expertise is ideal lead',
      'Content workshops CAN be budgeted here (not in WP1!)'
    ],
    tipsDE: [
      'DAS IST DAS "HERZSTÜCK" - sollte höchstes Budget haben (typisch 30-40%)',
      'KEINE "Black Box": Features spezifizieren! Nicht nur "App" sondern "PWA mit 5 Modulen, Login, Datenbank, 6 Sprachen"',
      'Aufwand schätzen: "80 Personentage Entwicklung, 20 Tage Design, 20 Tage Übersetzung"',
      'Mehrere Iterationen planen: Entwurf → Interne Review → Pilot-Feedback → Final',
      'Übersetzung & kulturelle Anpassung einplanen (oft unterschätzt!)',
      'Barrierefreiheit (WCAG 2.1) und Inklusion sind EU-Prioritäten - erwähnen',
      'Tech-Partner oder Uni mit Expertise ist idealer Lead',
      'Inhaltliche Arbeitstreffen KÖNNEN hier budgetiert werden (nicht in WP1!)'
    ]
  },
  {
    id: 'piloting',
    type: 'PILOTING',
    name: 'Piloting & Testing',
    nameDE: 'Pilotierung & Erprobung',
    description: 'Testing of developed outputs with target groups, feedback collection and refinement',
    descriptionDE: 'Erprobung der entwickelten Ergebnisse mit Zielgruppen, Feedback-Sammlung und Überarbeitung',
    typicalLeadType: ['NGO', 'PUBLIC_BODY', 'ANY'],
    maxBudgetPercent: 25,
    order: 4,
    suggestedActivities: [
      STANDARD_ACTIVITIES['pilot_preparation'],
      STANDARD_ACTIVITIES['pilot_implementation'],
      STANDARD_ACTIVITIES['feedback_collection'],
      STANDARD_ACTIVITIES['refinement']
    ],
    suggestedDeliverables: [
      STANDARD_DELIVERABLES['pilot_report'],
      STANDARD_DELIVERABLES['assessment_tool']
    ],
    tips: [
      'Each partner country MUST pilot - proves EU dimension',
      'LTTAs: 3-5 days minimum (shorter = not sustainable for international travel)',
      'Target 15-25 participants per training (didactically sensible)',
      'AVOID <6 participants - looks irrelevant for EU project',
      '2-3 persons per partner + external experts = good group size',
      'Phase approach: Small testing (12 participants) → Large rollout (90+)',
      'Allow 2-3 months for refinement AFTER piloting before final delivery',
      'Use Likert-scale evaluations: "75% rate training as good or very good"',
      'Digital badges are an excellent, measurable outcome!'
    ],
    tipsDE: [
      'Jedes Partnerland MUSS pilotieren - beweist EU-Dimension',
      'LTTAs: Mindestens 3-5 Tage (kürzer = nicht nachhaltig für internationale Anreise)',
      'Zielgröße 15-25 Teilnehmer pro Training (didaktisch sinnvoll)',
      'VERMEIDEN: <6 Teilnehmer - wirkt irrelevant für EU-Projekt',
      '2-3 Personen pro Partner + externe Experten = gute Gruppengröße',
      'Phasen-Ansatz: Kleines Testing (12 TN) → Großes Rollout (90+)',
      '2-3 Monate für Überarbeitung NACH Pilotierung vor Endabgabe einplanen',
      'Likert-Skala-Bewertungen nutzen: "75% bewerten Training als gut oder sehr gut"',
      'Digitale Badges sind ein exzellentes, messbares Ergebnis!'
    ]
  },
  {
    id: 'dissemination',
    type: 'DISSEMINATION',
    name: 'Dissemination & Exploitation',
    nameDE: 'Verbreitung & Verwertung',
    description: 'Communication, dissemination of results and sustainability planning',
    descriptionDE: 'Kommunikation, Verbreitung der Ergebnisse und Nachhaltigkeitsplanung',
    typicalLeadType: ['NGO', 'ANY'],
    maxBudgetPercent: 20,
    order: 5,
    suggestedActivities: [
      STANDARD_ACTIVITIES['dissemination_plan'],
      STANDARD_ACTIVITIES['website_social'],
      STANDARD_ACTIVITIES['newsletter'],
      STANDARD_ACTIVITIES['multiplier_events'],
      STANDARD_ACTIVITIES['conference_participation'],
      STANDARD_ACTIVITIES['publications'],
      STANDARD_ACTIVITIES['sustainability_plan'],
      STANDARD_ACTIVITIES['final_conference']
    ],
    suggestedDeliverables: [
      STANDARD_DELIVERABLES['website'],
      STANDARD_DELIVERABLES['multiplier_event'],
      STANDARD_DELIVERABLES['policy_brief'],
      STANDARD_DELIVERABLES['final_event']
    ],
    tips: [
      'Start dissemination from Day 1 - do NOT wait until results are ready',
      'THE 100€ RULE: Budget ~100€ per local participant for Multiplier Events',
      'Minimum 1 event per partner country - proves European dimension',
      'Participant benchmarks: Local workshop 20-30, National 40-60, Final conference 80-120',
      'Online events: Need 3-5x more participants to justify same budget (lower value)',
      'AVOID generic "share on social media" - be specific: "LinkedIn group XY (20k members), 2% engagement target"',
      'Use Erasmus+ platforms: EPALE, eTwinning, SALTO - evaluators check this!',
      'Schedule events AFTER piloting (M23+) when you have results to present',
      'Sustainability plan is CRITICAL - "How will results live after funding ends?"',
      'NGO or Association partner is ideal lead for network access'
    ],
    tipsDE: [
      'Verbreitung von Tag 1 an starten - NICHT warten bis Ergebnisse fertig',
      'DIE 100€-REGEL: Budget ca. 100€ pro lokalem Teilnehmer für Multiplier Events',
      'Mindestens 1 Event pro Partnerland - beweist europäische Dimension',
      'Teilnehmer-Benchmarks: Lokaler Workshop 20-30, National 40-60, Abschluss 80-120',
      'Online-Events: Brauchen 3-5x mehr Teilnehmer für gleiches Budget (niedrigerer Wert)',
      'VERMEIDEN: Generisches "auf Social Media teilen" - konkret sein: "LinkedIn-Gruppe XY (20k Mitglieder), 2% Engagement-Ziel"',
      'Erasmus+ Plattformen nutzen: EPALE, eTwinning, SALTO - Evaluatoren prüfen das!',
      'Events NACH Pilotierung planen (M23+), wenn Ergebnisse präsentierbar sind',
      'Nachhaltigkeitsplan ist KRITISCH - "Wie leben Ergebnisse nach Förderungsende?"',
      'NGO oder Verband als Lead ideal wegen Netzwerkzugang'
    ]
  },
  {
    id: 'quality',
    type: 'QUALITY',
    name: 'Quality Assurance & Evaluation',
    nameDE: 'Qualitätssicherung & Evaluation',
    description: 'External evaluation, quality monitoring and continuous improvement',
    descriptionDE: 'Externe Evaluation, Qualitätsüberwachung und kontinuierliche Verbesserung',
    typicalLeadType: ['UNIVERSITY', 'ANY'],
    maxBudgetPercent: 15,
    order: 6,
    suggestedActivities: [
      STANDARD_ACTIVITIES['quality_plan'],
      STANDARD_ACTIVITIES['progress_monitoring'],
      STANDARD_ACTIVITIES['feedback_collection']
    ],
    suggestedDeliverables: [
      STANDARD_DELIVERABLES['quality_report']
    ],
    tips: [
      'Consider integrating into WP1 for smaller projects (KA210, budgets <200k)',
      'If separate: Max 10-15% of budget',
      'External evaluator adds credibility - mention in methodology',
      'Define SMART KPIs from Day 1 - they become contractual obligations!',
      'Regular internal reviews (quarterly) with documented results',
      'Link QA findings to WP improvements - show adaptive management',
      'University partner often ideal for evaluation expertise'
    ],
    tipsDE: [
      'Bei kleineren Projekten in WP1 integrieren (KA210, Budgets <200k)',
      'Falls separat: Maximal 10-15% des Budgets',
      'Externer Evaluator erhöht Glaubwürdigkeit - in Methodik erwähnen',
      'SMART-KPIs von Tag 1 definieren - werden vertragsrelevant!',
      'Regelmäßige interne Reviews (vierteljährlich) mit dokumentierten Ergebnissen',
      'QA-Erkenntnisse mit WP-Verbesserungen verknüpfen - adaptives Management zeigen',
      'Uni-Partner oft ideal für Evaluationsexpertise'
    ]
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get recommended WP structure based on project type and budget
 */
export function getRecommendedWPStructure(
  actionType: 'KA220' | 'KA210',
  totalBudget: number
): { wpCount: number; templates: WPTemplate[]; notes: string[] } {
  const notes: string[] = [];

  if (actionType === 'KA210') {
    // Small-scale partnerships: simpler structure
    notes.push('KA210 Projekte sollten eine vereinfachte WP-Struktur haben');
    return {
      wpCount: 3,
      templates: [
        WP_TEMPLATES.find(t => t.type === 'MANAGEMENT')!,
        WP_TEMPLATES.find(t => t.type === 'DEVELOPMENT')!,
        WP_TEMPLATES.find(t => t.type === 'DISSEMINATION')!
      ],
      notes
    };
  }

  // KA220: Standard structure
  if (totalBudget < 200000) {
    notes.push('Bei kleinerem Budget: Management + 3 Durchführungspakete empfohlen');
    return {
      wpCount: 4,
      templates: [
        WP_TEMPLATES.find(t => t.type === 'MANAGEMENT')!,
        WP_TEMPLATES.find(t => t.type === 'RESEARCH_ANALYSIS')!,
        WP_TEMPLATES.find(t => t.type === 'DEVELOPMENT')!,
        WP_TEMPLATES.find(t => t.type === 'DISSEMINATION')!
      ],
      notes
    };
  }

  // Standard KA220 with full budget
  notes.push('Empfohlene Struktur: Management + max. 4 Durchführungspakete');
  notes.push('Mehr WPs machen den Antrag unübersichtlich');
  return {
    wpCount: 5,
    templates: WP_TEMPLATES.filter(t => t.type !== 'QUALITY'), // Quality can be integrated
    notes
  };
}

/**
 * Validate WP assignment against Programme Guide rules
 * Includes all major No-Gos from NA experience
 */
export function validateWPAssignment(
  wp: {
    type: WPType;
    leadPartnerId: string;
    leadPartnerType: string;
    budgetPercent: number;
    isCoordinator: boolean;
    wpNumber?: number;
  },
  allWPs: { leadPartnerId: string; type: WPType; budgetPercent: number }[],
  options?: {
    totalBudget?: number;
    partnerCount?: number;
    hasPiloting?: boolean;
  }
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const template = WP_TEMPLATES.find(t => t.type === wp.type);
  if (!template) {
    errors.push(`Unbekannter WP-Typ: ${wp.type}`);
    return { valid: false, errors, warnings };
  }

  // ============================================================
  // RULE 1: THE 20% LAW - Management WP
  // ============================================================
  if (wp.type === 'MANAGEMENT') {
    if (!wp.isCoordinator) {
      errors.push('KRITISCH: Das Management-WP (WP1) MUSS vom Koordinator geleitet werden - keine Ausnahmen');
    }
    if (wp.budgetPercent > 20) {
      errors.push(`KRITISCH: Management-Budget (${wp.budgetPercent}%) überschreitet die 20%-Grenze. NAs lehnen dies fast immer ab.`);
    } else if (wp.budgetPercent > 18) {
      warnings.push(`Management-Budget (${wp.budgetPercent}%) nahe an der 20%-Grenze. Empfohlen: max. 18%`);
    }
  }

  // ============================================================
  // RULE 2: Budget limits per WP type
  // ============================================================
  if (wp.budgetPercent > template.maxBudgetPercent) {
    errors.push(`WP "${template.nameDE}" darf maximal ${template.maxBudgetPercent}% des Budgets haben (aktuell: ${wp.budgetPercent}%)`);
  }

  // Development should be the "heart" - warning if too low
  if (wp.type === 'DEVELOPMENT' && wp.budgetPercent < 25) {
    warnings.push(`Entwicklungs-WP hat nur ${wp.budgetPercent}% Budget - typischerweise sollte es das höchste Budget (25-40%) haben als "Herzstück" des Projekts`);
  }

  // ============================================================
  // RULE 3: Partner lead distribution
  // ============================================================
  const partnerWPLeads = allWPs.filter(w => w.leadPartnerId === wp.leadPartnerId).length;
  if (partnerWPLeads > 2 && !wp.isCoordinator) {
    warnings.push(`Partner leitet ${partnerWPLeads} WPs - maximal 2 empfohlen (außer Koordinator). Zeigt keine echte Kooperation.`);
  }
  if (partnerWPLeads > 3) {
    errors.push(`Ein Partner darf nicht mehr als 3 WPs leiten - verteilen Sie die Verantwortung`);
  }

  // ============================================================
  // RULE 4: Check total WP count
  // ============================================================
  if (allWPs.length > 5) {
    warnings.push(`${allWPs.length} WPs: Erhöht die Komplexität im Reporting exponentiell. Maximal 5 WPs empfohlen.`);
  }
  if (allWPs.length > 7) {
    errors.push(`${allWPs.length} WPs: Zu komplex. Evaluatoren werden dies als schlechte Planung werten.`);
  }

  // ============================================================
  // RULE 5: Structural checks
  // ============================================================
  // Check if Development WP has more budget than Management
  const managementWP = allWPs.find(w => w.type === 'MANAGEMENT');
  const developmentWP = allWPs.find(w => w.type === 'DEVELOPMENT');
  if (managementWP && developmentWP && wp.type === 'DEVELOPMENT') {
    if (developmentWP.budgetPercent < managementWP.budgetPercent) {
      errors.push(`Das Development-WP hat weniger Budget als das Management-WP - das Projekt "verwaltet sich selbst" statt Ergebnisse zu produzieren`);
    }
  }

  // ============================================================
  // RULE 6: Budget balance across partners
  // ============================================================
  // Calculate what % of budget this partner gets across all their WPs
  const partnerTotalBudget = allWPs
    .filter(w => w.leadPartnerId === wp.leadPartnerId)
    .reduce((sum, w) => sum + w.budgetPercent, 0);

  if (partnerTotalBudget > 40 && !wp.isCoordinator) {
    warnings.push(`Partner erhält ${partnerTotalBudget}% des Gesamtbudgets - Koordinator-Konzentration vermeiden (max. 40% empfohlen)`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate entire project WP structure
 */
export function validateProjectStructure(
  wpConfigs: { type: WPType; leadPartnerId: string; budgetPercent: number; isCoordinator: boolean }[],
  totalBudget: number,
  partnerCount: number
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check total budget allocation
  const totalAllocated = wpConfigs.reduce((sum, wp) => sum + wp.budgetPercent, 0);
  if (totalAllocated > 100) {
    errors.push(`Budget-Überschreitung: ${totalAllocated}% zugewiesen (max. 100%)`);
  } else if (totalAllocated < 95) {
    warnings.push(`Nur ${totalAllocated}% des Budgets zugewiesen. Verbleibende ${100 - totalAllocated}% sollten verteilt werden.`);
  }

  // Check if all required WP types are present
  const hasManagement = wpConfigs.some(wp => wp.type === 'MANAGEMENT');
  const hasDevelopment = wpConfigs.some(wp => wp.type === 'DEVELOPMENT');
  const hasDissemination = wpConfigs.some(wp => wp.type === 'DISSEMINATION');
  const hasPiloting = wpConfigs.some(wp => wp.type === 'PILOTING');

  if (!hasManagement) errors.push('WP1 Management fehlt - jedes Projekt benötigt ein Management-WP');
  if (!hasDevelopment) errors.push('Development-WP fehlt - ohne Entwicklung keine Projektergebnisse');
  if (!hasDissemination) errors.push('Dissemination-WP fehlt - Verbreitung ist für EU essentiell');
  if (!hasPiloting && totalBudget >= 200000) {
    warnings.push('Kein Piloting-WP: Bei größeren Projekten wird Validierung durch Pilotierung erwartet');
  }

  // Check partner involvement
  const uniqueLeads = new Set(wpConfigs.map(wp => wp.leadPartnerId)).size;
  if (uniqueLeads < Math.min(partnerCount, wpConfigs.length)) {
    warnings.push(`Nur ${uniqueLeads} Partner als WP-Leads. Jeder Partner sollte mindestens ein WP leiten um "Active Involvement" zu zeigen.`);
  }

  // Check WP count
  if (wpConfigs.length > 5) {
    warnings.push(`${wpConfigs.length} WPs: Komplexität erhöht Reporting-Aufwand. 5 WPs empfohlen.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Calculate shadow budget estimate based on activities
 * Returns estimated cost using old unit cost logic
 */
export function calculateShadowBudget(activities: {
  tpmCount: number;
  tpmPersonsPerMeeting: number;
  lttaDays: number;
  lttaParticipants: number;
  multiplierEventsLocal: number;
  multiplierEventsParticipants: number;
  developmentPersonDays: number;
  researchPersonDays: number;
  countryRegion: 'western' | 'southern' | 'eastern' | 'northern';
}): { estimated: number; breakdown: { category: string; amount: number }[] } {
  const breakdown: { category: string; amount: number }[] = [];

  // TPM costs
  const tpmCost = activities.tpmCount * activities.tpmPersonsPerMeeting * 700; // avg €700 per person
  breakdown.push({ category: 'TPMs (Meetings)', amount: tpmCost });

  // LTTA costs (simplified)
  const lttaCostPerPerson = activities.lttaDays * 150; // €150/day for travel+accommodation
  const lttaCost = activities.lttaParticipants * lttaCostPerPerson;
  breakdown.push({ category: 'LTTAs (Trainings)', amount: lttaCost });

  // Multiplier Events (100€/participant)
  const eventCost = activities.multiplierEventsLocal * activities.multiplierEventsParticipants * 100;
  breakdown.push({ category: 'Multiplier Events', amount: eventCost });

  // Development staff costs
  const rates = BENCHMARKS.DAILY_RATES[activities.countryRegion];
  const avgDevRate = (rates.researcher.min + rates.researcher.max) / 2;
  const devCost = activities.developmentPersonDays * avgDevRate;
  breakdown.push({ category: 'Development Staff', amount: devCost });

  // Research staff costs
  const researchCost = activities.researchPersonDays * avgDevRate * 0.9; // Slightly lower for research
  breakdown.push({ category: 'Research Staff', amount: researchCost });

  const estimated = breakdown.reduce((sum, item) => sum + item.amount, 0);
  return { estimated, breakdown };
}

/**
 * Get activity suggestions based on project priorities
 */
export function getActivitySuggestions(
  priorities: string[],
  sector: 'ADU' | 'VET' | 'SCH' | 'YOU'
): WPActivity[] {
  const suggestions: WPActivity[] = [];

  // Always include mandatory activities
  Object.values(STANDARD_ACTIVITIES)
    .filter(a => a.mandatory)
    .forEach(a => suggestions.push(a));

  // Add based on priorities
  if (priorities.includes('digital') || priorities.includes('DIGITAL_TRANSFORMATION')) {
    suggestions.push(STANDARD_ACTIVITIES['tool_development']);
  }

  if (priorities.includes('green') || priorities.includes('ENVIRONMENT_SUSTAINABILITY')) {
    // Add green activities note
  }

  return [...new Set(suggestions)];
}
