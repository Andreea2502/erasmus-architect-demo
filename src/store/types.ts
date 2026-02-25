/**
 * APP-WIDE TYPES
 * ================
 * Core data structures for the full application
 */

// ============================================================================
// PARTNER TYPES
// ============================================================================

export interface Partner {
  id: string;

  // Basic Info
  organizationName: string;
  acronym?: string;
  country: string;
  city?: string;
  website?: string;
  email?: string;
  phone?: string;

  // Classification
  organizationType: OrganizationType;
  legalForm?: string;

  // EU IDs
  picNumber?: string;
  oidNumber?: string;

  // Profile
  missionStatement: string;
  foundingYear?: number;
  staffSize?: StaffSize;
  geographicScope?: GeographicScope;

  // Contacts (Ansprechpersonen)
  contacts: Contact[];

  // Expertise
  expertiseAreas: ExpertiseArea[];
  targetGroups: TargetGroupAccess[];
  sectorsActive: Sector[];
  workingLanguages: string[];

  // Track Record
  previousProjects: PreviousProject[];
  isNewcomer: boolean;

  // AI-Generated Descriptions (for project applications)
  generatedDescriptions?: PartnerDescription[];

  // Uploaded Documents (project reports, etc.)
  uploadedDocuments?: PartnerDocument[];

  // Meta
  tags: string[];
  notes?: string;
  internetResearch?: string; // Insights from web research
  source?: string; // How was this partner added?
  createdAt: Date;
  updatedAt: Date;
  dataQuality: number; // 0-100
}

export interface PartnerDescription {
  id: string;
  title: string; // e.g. "KA220-ADU 2026" or "General Description"
  content: string; // 1000-1500 words
  wordCount: number;
  language: string;
  generatedAt: Date;
  lastUsedAt?: Date;
}

export interface PartnerDocument {
  id: string;
  name: string;
  type: 'PROJECT_REPORT' | 'CERTIFICATE' | 'REFERENCE' | 'OTHER';
  fileUrl?: string; // Local or cloud URL
  url?: string; // External URL (e.g. website)
  relatedProjectId?: string; // ID of the PreviousProject this document belongs to
  uploadedAt: Date;
  description?: string;
  extractedText?: string; // Persist extracted text for AI analysis
  summary?: StudySummary; // Structured AI summary
  extractedPartnerData?: {
    email?: string;
    phone?: string;
    website?: string;
    city?: string;
  };
}

// Study/Research Document Summary (from RAG system)
export interface StudySummary {
  id: string;
  documentId: string;
  documentName: string;
  documentType: 'study' | 'statistics' | 'programme_guide' | 'other';

  title: string;
  authors?: string[];
  year?: number;

  executiveSummary: string;
  methodology?: string; // Added to match usage

  keyFindings: {
    topic: string; // Added to match usage
    finding: string;
    relevance: string;
    quotable?: string;
  }[];

  statistics: {
    metric: string;
    context: string;
    source?: string;
  }[];

  recommendations: string[];
  targetGroups: string[];
  relevantSectors: Sector[];
  keyTerms: string[];

  // Refined Partner Data (for "Holistic Profile")
  completedProjects?: {
    title: string;
    role: 'COORDINATOR' | 'PARTNER';
    programme: string;
    year?: number;
    topic?: string;
  }[];
  staffSize?: string; // e.g. "10-20", "50+"
  mission?: string;
  erasmusData?: {
    oid?: string;
    pic?: string;
    accreditation?: string;
  };
  competences?: string[]; // Specific skills/competences mentioned

  usefulForProposal: {
    needsAnalysis?: string;
    methodology?: string;
    impact?: string;
    dissemination?: string;
  };

  limitations?: string;

  analyzedAt: Date;
  textLength: number;
  extractedPartnerData?: {
    email?: string;
    phone?: string;
    website?: string;
    city?: string;
  };
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
  email?: string;
  phone?: string;
  isPrimary: boolean;
}

export interface ExpertiseArea {
  id: string;
  domain: ExpertiseDomain;
  description: string;
  level: 1 | 2 | 3 | 4 | 5;
  evidence?: string;
}

export interface TargetGroupAccess {
  id: string;
  group: TargetGroup;
  reach: number;
  method: string;
}

export interface PreviousProject {
  id: string;
  title: string;
  projectNumber?: string;
  programme: string;
  year: number;
  role: 'COORDINATOR' | 'PARTNER';
  description?: string;
}

// ============================================================================
// PROJECT TYPES
// ============================================================================

export interface Project {
  id: string;

  // Basic Info
  title: string;
  acronym: string;
  status: ProjectStatus;

  // Call Info
  actionType: ActionType;
  sector: Sector;
  budgetTier: number;
  duration: number; // months
  callYear: number;
  nationalAgency?: string;

  // Priorities
  horizontalPriorities: string[];
  sectorPriority?: string;

  // Needs Analysis
  problemStatement: string;
  rootCauses: string[];
  statistics: Statistic[];
  targetGroups: ProjectTargetGroup[];

  // Objectives
  objectives: Objective[];

  // Consortium
  consortium: ConsortiumMember[];

  // Work Plan
  workPackages: WorkPackage[];

  // Results
  results: ProjectResult[];

  // Impact
  impactVision?: string;
  indicators: Indicator[];

  // Dissemination
  disseminationChannels: string[];
  multiplierEvents: MultiplierEvent[];

  // Sustainability
  sustainabilityPlan?: string;

  // Generator State (pipeline state for reopening in generator)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  generatorState?: any; // PipelineState from project-pipeline.ts
  lastGeneratorUpdate?: Date;

  // Concept Developer State (for saving/resuming concept development)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  conceptDeveloperState?: any; // ConceptState + currentStep from ConceptDeveloper

  // Context from Concept Generator
  originalConcept?: SavedConcept;

  // Project-specific Knowledge Pool
  knowledgePool?: ProjectKnowledgePool;

  // Meta
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PROJECT KNOWLEDGE POOL
// ============================================================================

export interface ProjectKnowledgePool {
  documents: KnowledgeDocument[];
  websites: KnowledgeWebsite[];
  notes: KnowledgeNote[];
}

export interface KnowledgeDocument {
  id: string;
  name: string;
  type: 'pdf' | 'docx' | 'doc' | 'txt' | 'other';
  category: 'study' | 'partner_info' | 'previous_project' | 'statistics' | 'reference' | 'other';

  // Content
  extractedText?: string;
  summary?: string;
  keyFindings?: string[];

  // Structured AI Analysis (for Erasmus+ relevant data)
  aiAnalysis?: {
    // Organization Info (for Partner PIFs)
    organizationName?: string;
    mission?: string;
    staffSize?: string;

    // Erasmus+ IDs
    erasmusData?: {
      oid?: string;
      pic?: string;
      accreditation?: string;
    };

    // Competences & Expertise
    competences?: string[];
    targetGroups?: string[];
    relevantSectors?: ('ADU' | 'VET' | 'SCH' | 'YOU' | 'HED' | 'SPO')[];

    // Project Experience
    completedProjects?: {
      title: string;
      role: 'COORDINATOR' | 'PARTNER';
      programme: string;
      year?: number;
      topic?: string;
    }[];

    // For Studies/Statistics
    statistics?: {
      metric: string;
      context: string;
      source?: string;
    }[];
    recommendations?: string[];

    // Proposal Usefulness
    usefulForProposal?: {
      needsAnalysis?: string;
      methodology?: string;
      impact?: string;
      dissemination?: string;
    };

    // Key Terms for matching
    keyTerms?: string[];
  };

  // Metadata
  source?: string; // Where did this come from?
  relatedPartnerId?: string; // If this belongs to a specific partner
  tags: string[];

  // Status
  status: 'uploading' | 'processing' | 'ready' | 'error';
  error?: string;

  // Timestamps
  uploadedAt: Date;
  processedAt?: Date;
  extractedPartnerData?: {
    email?: string;
    phone?: string;
    website?: string;
    city?: string;
  };
}

export interface KnowledgeWebsite {
  id: string;
  url: string;
  title?: string;
  category: 'partner_website' | 'project_website' | 'reference' | 'statistics' | 'other';

  // Extracted Content
  extractedText?: string;
  summary?: string;
  keyPoints?: string[];

  // Metadata
  relatedPartnerId?: string;
  tags: string[];

  // Status
  status: 'pending' | 'fetching' | 'ready' | 'error';
  error?: string;
  lastFetchedAt?: Date;
}

export interface KnowledgeNote {
  id: string;
  title: string;
  content: string;
  category: 'insight' | 'reminder' | 'draft' | 'reference';

  // Post-it Style
  color: 'yellow' | 'pink' | 'blue' | 'green' | 'purple' | 'orange';

  // Priority & Status
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'done' | 'archived';

  // Deadline
  deadline?: Date;

  // Formatting
  formatting?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    fontSize?: 'small' | 'medium' | 'large';
  };

  // Checklist items within note
  checklist?: {
    id: string;
    text: string;
    checked: boolean;
  }[];

  // Links to other items
  linkedDocumentIds?: string[];
  linkedWebsiteIds?: string[];
  relatedPartnerId?: string;

  // Metadata
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Statistic {
  id: string;
  statement: string;
  source: string;
  year: number;
}

export interface ProjectTargetGroup {
  id: string;
  name: string;
  size: number;
  characteristics: string;
  needs: string[];
}

export interface Objective {
  id: string;
  code: string;
  type: 'GENERAL' | 'SPECIFIC';
  description: string;
  indicators: string[];
}

export interface ConsortiumMember {
  id: string;
  partnerId: string;
  role: 'COORDINATOR' | 'PARTNER';
  budgetShare: number;
  justification?: string;
  workPackageLeadership: string[]; // WP IDs
}

export interface WorkPackage {
  id: string;
  number: number;
  title: string;
  type?: WorkPackageType;
  objectives: string[];
  description: string;
  startMonth: number;
  endMonth: number;
  leadPartner: string; // partnerId
  activities: Activity[];
  deliverables: Deliverable[];
}

export interface Activity {
  id: string;
  code: string;
  title: string;
  description: string;
  startMonth: number;
  endMonth: number;
  leadPartner: string;
}

export interface Deliverable {
  id: string;
  code: string;
  title: string;
  description?: string;
  dueMonth: number;
  type: 'REPORT' | 'TOOL' | 'CURRICULUM' | 'GUIDE' | 'OTHER';
  disseminationLevel: 'PUBLIC' | 'SENSITIVE';
}

export interface ProjectResult {
  id: string;
  code: string;
  title: string;
  type: string;
  description: string;
  workPackageId: string;
  languages: string[];
  targetAudience: string[];
  innovationLevel: 1 | 2 | 3 | 4 | 5;
  transferPotential: 1 | 2 | 3 | 4 | 5;
}

export interface Indicator {
  id: string;
  name: string;
  type: 'OUTPUT' | 'OUTCOME' | 'IMPACT';
  target: number;
  unit: string;
  measurementMethod?: string;
}

export interface MultiplierEvent {
  id: string;
  name: string;
  type: string;
  month: number;
  location: string;
  country: string;
  targetParticipants: number;
  hostPartnerId: string;
}

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type OrganizationType =
  | 'HIGHER_EDUCATION'
  | 'SCHOOL'
  | 'VET_PROVIDER'
  | 'ADULT_EDUCATION'
  | 'NGO'
  | 'PUBLIC_AUTHORITY'
  | 'SME'
  | 'LARGE_ENTERPRISE'
  | 'RESEARCH_INSTITUTE'
  | 'SOCIAL_ENTERPRISE'
  | 'OTHER';

export type StaffSize =
  | 'MICRO_1_9'
  | 'SMALL_10_49'
  | 'MEDIUM_50_249'
  | 'LARGE_250_PLUS';

export type GeographicScope =
  | 'LOCAL'
  | 'REGIONAL'
  | 'NATIONAL'
  | 'EUROPEAN'
  | 'INTERNATIONAL';

export type ExpertiseDomain =
  | 'CURRICULUM_DEVELOPMENT'
  | 'DIGITAL_TOOLS'
  | 'TRAINING_DELIVERY'
  | 'RESEARCH_EVALUATION'
  | 'TARGET_GROUP_ACCESS'
  | 'POLICY_ADVOCACY'
  | 'COMMUNICATION_MEDIA'
  | 'TECHNICAL_DEVELOPMENT'
  | 'QUALITY_ASSURANCE'
  | 'PROJECT_MANAGEMENT'
  | 'FINANCIAL_MANAGEMENT'
  | 'OTHER';

export type TargetGroup =
  | 'YOUTH_15_18'
  | 'YOUTH_18_25'
  | 'YOUTH_25_30'
  | 'NEET'
  | 'UNEMPLOYED_ADULTS'
  | 'LOW_SKILLED_ADULTS'
  | 'MIGRANTS_REFUGEES'
  | 'PEOPLE_WITH_DISABILITIES'
  | 'TEACHERS_SCHOOL'
  | 'TEACHERS_VET'
  | 'TRAINERS_ADULT_ED'
  | 'YOUTH_WORKERS'
  | 'POLICY_MAKERS'
  | 'EMPLOYERS_HR'
  | 'SENIORS_55PLUS'
  | 'RURAL_COMMUNITIES'
  | 'OTHER';

export type Sector = 'SCH' | 'VET' | 'ADU' | 'YOU';

export type ActionType = 'KA210' | 'KA220';

export type ProjectStatus =
  | 'CONCEPT'
  | 'DRAFT'
  | 'IN_PROGRESS'
  | 'READY_FOR_REVIEW'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED';

export type WorkPackageType =
  | 'MANAGEMENT'
  | 'RESEARCH'
  | 'DEVELOPMENT'
  | 'PILOTING'
  | 'DISSEMINATION'
  | 'QUALITY'
  | 'OTHER';

export type ResultType =
  | 'CURRICULUM'
  | 'METHODOLOGY'
  | 'TRAINING_PROGRAMME'
  | 'DIGITAL_TOOL'
  | 'PLATFORM'
  | 'GUIDELINES'
  | 'POLICY_RECOMMENDATIONS'
  | 'RESEARCH_REPORT'
  | 'OER_COLLECTION'
  | 'OTHER';

// ============================================================================
// DISPLAY HELPERS
// ============================================================================

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  HIGHER_EDUCATION: 'Higher Education Institution',
  SCHOOL: 'School',
  VET_PROVIDER: 'VET Provider',
  ADULT_EDUCATION: 'Adult Education Provider',
  NGO: 'NGO / Non-Profit',
  PUBLIC_AUTHORITY: 'Public Authority',
  SME: 'SME',
  LARGE_ENTERPRISE: 'Large Enterprise',
  RESEARCH_INSTITUTE: 'Research Institute',
  SOCIAL_ENTERPRISE: 'Social Enterprise',
  OTHER: 'Other',
};

export const EXPERTISE_DOMAIN_LABELS: Record<ExpertiseDomain, string> = {
  CURRICULUM_DEVELOPMENT: 'Curriculum Development',
  DIGITAL_TOOLS: 'Digital Tools & Platforms',
  TRAINING_DELIVERY: 'Training Delivery',
  RESEARCH_EVALUATION: 'Research & Evaluation',
  TARGET_GROUP_ACCESS: 'Target Group Access',
  POLICY_ADVOCACY: 'Policy & Advocacy',
  COMMUNICATION_MEDIA: 'Communication & Media',
  TECHNICAL_DEVELOPMENT: 'Technical Development',
  QUALITY_ASSURANCE: 'Quality Assurance',
  PROJECT_MANAGEMENT: 'Project Management',
  FINANCIAL_MANAGEMENT: 'Financial Management',
  OTHER: 'Other',
};

export const TARGET_GROUP_LABELS: Record<TargetGroup, string> = {
  YOUTH_15_18: 'Youth 15-18',
  YOUTH_18_25: 'Youth 18-25',
  YOUTH_25_30: 'Youth 25-30',
  NEET: 'NEET',
  UNEMPLOYED_ADULTS: 'Unemployed Adults',
  LOW_SKILLED_ADULTS: 'Low-skilled Adults',
  MIGRANTS_REFUGEES: 'Migrants & Refugees',
  PEOPLE_WITH_DISABILITIES: 'People with Disabilities',
  TEACHERS_SCHOOL: 'School Teachers',
  TEACHERS_VET: 'VET Teachers',
  TRAINERS_ADULT_ED: 'Adult Education Trainers',
  YOUTH_WORKERS: 'Youth Workers',
  POLICY_MAKERS: 'Policy Makers',
  EMPLOYERS_HR: 'Employers / HR',
  SENIORS_55PLUS: 'Seniors 55+',
  RURAL_COMMUNITIES: 'Rural Communities',
  OTHER: 'Other',
};

export const SECTOR_LABELS: Record<Sector, string> = {
  SCH: 'School Education',
  VET: 'Vocational Education & Training',
  ADU: 'Adult Education',
  YOU: 'Youth',
};

export const WORK_PACKAGE_TYPE_LABELS: Record<WorkPackageType, string> = {
  MANAGEMENT: 'Project Management',
  RESEARCH: 'Research & Analysis',
  DEVELOPMENT: 'Development',
  PILOTING: 'Piloting & Testing',
  DISSEMINATION: 'Dissemination & Exploitation',
  QUALITY: 'Quality Assurance',
  OTHER: 'Other',
};

export const COUNTRY_NAMES: Record<string, string> = {
  AT: 'Austria',
  BE: 'Belgium',
  BG: 'Bulgaria',
  HR: 'Croatia',
  CY: 'Cyprus',
  CZ: 'Czechia',
  DK: 'Denmark',
  EE: 'Estonia',
  FI: 'Finland',
  FR: 'France',
  DE: 'Germany',
  GR: 'Greece',
  HU: 'Hungary',
  IE: 'Ireland',
  IT: 'Italy',
  LV: 'Latvia',
  LT: 'Lithuania',
  LU: 'Luxembourg',
  MT: 'Malta',
  NL: 'Netherlands',
  PL: 'Poland',
  PT: 'Portugal',
  RO: 'Romania',
  SK: 'Slovakia',
  SI: 'Slovenia',
  ES: 'Spain',
  SE: 'Sweden',
  IS: 'Iceland',
  LI: 'Liechtenstein',
  NO: 'Norway',
  MK: 'North Macedonia',
  RS: 'Serbia',
  TR: 'Turkey',
};

export const BUDGET_TIERS = {
  KA210: [30000, 60000],
  KA220: [120000, 250000, 400000],
};

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  KA210: 'KA210 Small-scale Partnership',
  KA220: 'KA220 Cooperation Partnership',
};

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  CONCEPT: 'Konzept-Entwurf',
  DRAFT: 'Draft',
  IN_PROGRESS: 'In Progress',
  READY_FOR_REVIEW: 'Ready for Review',
  SUBMITTED: 'Submitted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  ARCHIVED: 'Archived',
};

export const HORIZONTAL_PRIORITIES = [
  {
    id: 'INCLUSION_DIVERSITY',
    name: 'Inclusion & Diversity',
    nameDE: 'Inklusion & Vielfalt',
    description: 'Promote equal opportunities, inclusion, diversity, and the fight against discrimination in all programme activities',
    descriptionDE: 'Förderung von Chancengleichheit, Inklusion, Vielfalt und Bekämpfung von Diskriminierung in allen Programmaktivitäten',
  },
  {
    id: 'DIGITAL_TRANSFORMATION',
    name: 'Digital Transformation',
    nameDE: 'Digitale Transformation',
    description: 'Develop digital readiness, resilience and capacity through digital skills, digital education tools and platforms',
    descriptionDE: 'Entwicklung digitaler Bereitschaft, Resilienz und Kapazität durch digitale Kompetenzen, Bildungstools und Plattformen',
  },
  {
    id: 'ENVIRONMENT_SUSTAINABILITY',
    name: 'Environment & Sustainability',
    nameDE: 'Umwelt & Nachhaltigkeit',
    description: 'Support green transition and sustainable development in education, training, and youth activities',
    descriptionDE: 'Unterstützung des grünen Wandels und nachhaltiger Entwicklung in Bildung, Ausbildung und Jugendaktivitäten',
  },
  {
    id: 'PARTICIPATION_CIVIC',
    name: 'Participation in Democratic Life',
    nameDE: 'Teilhabe am demokratischen Leben',
    description: 'Promote active citizenship, critical thinking, and participation in democratic processes',
    descriptionDE: 'Förderung von aktivem Bürgertum, kritischem Denken und Teilhabe an demokratischen Prozessen',
  },
];

// ============================================================================
// CONCEPT TYPES
// ============================================================================

// Study reference from Google Search Grounding
export interface StudyReference {
  title: string;
  url: string;
  snippet?: string;
}

// Parameters for concept generation
export interface ProjectConceptParams {
  actionType: string;
  sector: string;
  budget: number;
  duration: number;
  partners: Array<{
    name: string;
    country: string;
    type: string;
    expertise: string[];
  }>;
  themeIdeas?: string;
  targetGroups?: string[];
  studies?: Array<{
    title: string;
    keyFindings: string;
  }>;
}

// Detailed Work Package Configuration for Concepts
export interface ConceptWorkPackage {
  number: number;
  type?: 'MANAGEMENT' | 'RESEARCH' | 'DEVELOPMENT' | 'PILOTING' | 'DISSEMINATION' | 'QUALITY' | 'OTHER';
  title: string;
  titleDE?: string;
  description: string;
  lead: string;

  // Budget & Duration
  budgetPercent?: number;
  duration?: { start: number; end: number };

  // Activities & Deliverables
  activities?: string[];
  deliverables?: string[];

  // Resource Estimates
  expertDays?: number;
  tpmCount?: number;
  participantsPerPartner?: number;
}

// LTTA Configuration
export interface ConceptLTTA {
  count: number;
  durationDays: number;
  participants: number;
  description?: string;
}

// Multiplier Events Configuration
export interface ConceptMultiplierEvents {
  count: number;
  participantsPerEvent: number;
  description?: string;
}

// Budget Breakdown
export interface ConceptBudgetBreakdown {
  management: number;
  development: number;
  piloting: number;
  dissemination: number;
  ltta?: number;
  other?: number;
}

export interface ProjectConcept {
  title: string;
  acronym: string;
  priority: string;
  problemStatement: string;
  innovation: string;
  detailedConcept?: string;

  // Work Packages - supports both simple and detailed format
  workPackages: ConceptWorkPackage[];

  mainOutputs: string[];
  expectedImpact: string;
  consortiumFit: string;
  duration?: number;

  // Extended WP Configuration
  ltta?: ConceptLTTA;
  multiplierEvents?: ConceptMultiplierEvents;
  budgetBreakdown?: ConceptBudgetBreakdown;

  // Grounded study references from Google Search
  studyReferences?: StudyReference[];

  // SMART objectives from Concept Developer
  objectives?: {
    text: string;
    indicators: string[];
    sources: string[];
    erasmusPriority?: string;
  }[];
}

export interface SavedConcept extends ProjectConcept {
  id: string;
  createdAt: Date;
  status: 'DRAFT' | 'APPLIED';
  partnerIds: string[]; // IDs of selected partners
  initialIdea: string;
  sector: Sector;
  actionType: ActionType;
}

// ============================================================================
// TEXT-SNIPPET LIBRARY TYPES
// ============================================================================

export interface SavedSnippet {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}
