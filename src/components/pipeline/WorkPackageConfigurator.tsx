'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Layers,
  Users,
  Target,
  Calendar,
  FileText,
  Sparkles,
  Info,
  AlertCircle,
  Loader2,
  Zap,
  Euro,
  Calculator,
  Hotel,
  Plane,
  UserCheck,
} from 'lucide-react';
import {
  WP_TEMPLATES,
  STANDARD_ACTIVITIES,
  STANDARD_DELIVERABLES,
  getRecommendedWPStructure,
  validateWPAssignment,
  validateProjectStructure,
  BENCHMARKS,
  NO_GOS,
  SMART_INDICATOR_TEMPLATES,
  EXAMPLE_BUDGET_250K,
  type WPTemplate,
  type WPActivity,
  type WPDeliverable,
  type WPType,
} from '@/lib/wp-templates';
import { ConsortiumPartner } from '@/lib/project-pipeline';
import { type PartnerRoleAssignment } from '@/lib/consortium-integration';
import { type Language } from '@/lib/i18n';

// ============================================================================
// TYPES
// ============================================================================

export interface WPBudgetDetails {
  expertDays: number;
  expertDayCost: number;
  accommodationCost: number;
  accommodationNights: number;
  travelCost: number;
  participantCount: number;
  eventCost: number;
  materialsCost: number;
}

export interface WPConfiguration {
  wpNumber: number;
  type: WPType;
  title: string;
  titleDE: string;
  leadPartnerId: string;
  selectedActivities: string[]; // Activity IDs
  selectedDeliverables: string[]; // Deliverable IDs
  budgetPercent: number;
  duration: { start: number; end: number };
  objectives: string[];
  customTitle?: string;
  budgetDetails?: WPBudgetDetails;
}

interface WorkPackageConfiguratorProps {
  consortium: ConsortiumPartner[];
  partnerRoleAssignments: Record<string, PartnerRoleAssignment>;
  coordinatorId: string | null;
  actionType: 'KA220' | 'KA210';
  totalBudget: number;
  wpCount: number;
  language: Language;
  onConfigurationChange: (configs: WPConfiguration[]) => void;
  initialConfigs?: WPConfiguration[];
  onGenerateWP?: (wpNumber: number, config: WPConfiguration) => void;
  generatingWPNumber?: number | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function WorkPackageConfigurator({
  consortium,
  partnerRoleAssignments,
  coordinatorId,
  actionType,
  totalBudget,
  wpCount,
  language,
  onConfigurationChange,
  initialConfigs,
  onGenerateWP,
  generatingWPNumber,
}: WorkPackageConfiguratorProps) {
  const [wpConfigs, setWpConfigs] = useState<WPConfiguration[]>([]);
  const [expandedWP, setExpandedWP] = useState<number | null>(1);
  const [validationErrors, setValidationErrors] = useState<Record<number, string[]>>({});
  const [validationWarnings, setValidationWarnings] = useState<Record<number, string[]>>({});
  const [showGuideline, setShowGuideline] = useState(false);

  // Get recommended structure
  const recommended = getRecommendedWPStructure(actionType, totalBudget);

  // Helper function to find best lead partner for a WP type
  const findBestLeadPartner = (wpNum: number, wpType: string): string => {
    // WP1 (Management) - always coordinator
    if (wpType === 'MANAGEMENT' && coordinatorId) {
      return coordinatorId;
    }

    // Find partner with matching suggested WP leads from role assignments
    const matchingPartner = Object.entries(partnerRoleAssignments).find(([id, assignment]) =>
      assignment?.suggestedWPLeads?.includes(wpNum)
    );
    if (matchingPartner) {
      return matchingPartner[0];
    }

    // Fallback: Match WP type to partner role
    const roleToWPType: Record<string, string[]> = {
      'TECHNICAL_LEAD': ['DEVELOPMENT', 'PILOTING'],
      'CONTENT_EXPERT': ['RESEARCH_ANALYSIS', 'DEVELOPMENT'],
      'DISSEMINATION_LEAD': ['DISSEMINATION'],
      'QUALITY_ASSURANCE': ['PILOTING', 'RESEARCH_ANALYSIS'],
    };

    for (const [partnerId, assignment] of Object.entries(partnerRoleAssignments)) {
      const matchingTypes = roleToWPType[assignment?.suggestedRole || ''] || [];
      if (matchingTypes.includes(wpType)) {
        return partnerId;
      }
    }

    return consortium[0]?.id || '';
  };

  // Initialize WP configurations
  useEffect(() => {
    if (initialConfigs && initialConfigs.length > 0) {
      setWpConfigs(initialConfigs);
      return;
    }

    // Create initial configs based on recommendations
    const configs: WPConfiguration[] = [];
    const templates = recommended.templates.slice(0, wpCount);

    for (let i = 0; i < wpCount; i++) {
      const template = templates[i] || WP_TEMPLATES.find(t => t.type === 'DEVELOPMENT')!;
      const wpNum = i + 1;

      // Find best lead partner based on template and role assignments
      const leadPartnerId = findBestLeadPartner(wpNum, template.type);

      // Select mandatory activities by default
      const defaultActivities = template.suggestedActivities
        .filter(a => a.mandatory)
        .map(a => a.id);

      // Select first 2 deliverables by default
      const defaultDeliverables = template.suggestedDeliverables
        .slice(0, 2)
        .map(d => d.id);

      configs.push({
        wpNumber: wpNum,
        type: template.type,
        title: template.name,
        titleDE: template.nameDE,
        leadPartnerId,
        selectedActivities: defaultActivities,
        selectedDeliverables: defaultDeliverables,
        budgetPercent: Math.round(100 / wpCount),
        duration: calculateDuration(wpNum, wpCount),
        objectives: [],
      });
    }

    setWpConfigs(configs);
    onConfigurationChange(configs);
  }, [wpCount, coordinatorId, Object.keys(partnerRoleAssignments).length]);

  // Update lead partners when role assignments change (but keep other configurations)
  useEffect(() => {
    if (wpConfigs.length === 0) return;

    // Check if any lead partners need updating based on new role assignments
    let needsUpdate = false;
    const updatedConfigs = wpConfigs.map(config => {
      const bestLeadPartner = findBestLeadPartner(config.wpNumber, config.type);

      // Only update if the current lead partner is empty or is no longer in the consortium
      const currentLeadValid = consortium.some(p => p.id === config.leadPartnerId);
      if (!currentLeadValid && bestLeadPartner) {
        needsUpdate = true;
        return { ...config, leadPartnerId: bestLeadPartner };
      }
      return config;
    });

    if (needsUpdate) {
      setWpConfigs(updatedConfigs);
      onConfigurationChange(updatedConfigs);
    }
  }, [partnerRoleAssignments, consortium.length]);

  // Validate configurations whenever they change
  useEffect(() => {
    const errors: Record<number, string[]> = {};
    const warnings: Record<number, string[]> = {};

    // First, validate overall project structure
    const projectValidation = validateProjectStructure(
      wpConfigs.map(c => ({
        type: c.type,
        leadPartnerId: c.leadPartnerId,
        budgetPercent: c.budgetPercent,
        isCoordinator: c.leadPartnerId === coordinatorId,
      })),
      totalBudget,
      consortium.length
    );

    // Add project-level errors/warnings to WP1
    if (projectValidation.errors.length > 0 || projectValidation.warnings.length > 0) {
      if (wpConfigs.length > 0) {
        errors[0] = [...(errors[0] || []), ...projectValidation.errors];
        warnings[0] = [...(warnings[0] || []), ...projectValidation.warnings];
      }
    }

    // Validate each WP individually
    for (const config of wpConfigs) {
      const partner = consortium.find(p => p.id === config.leadPartnerId);
      const isCoordinator = config.leadPartnerId === coordinatorId;

      const validation = validateWPAssignment(
        {
          type: config.type,
          leadPartnerId: config.leadPartnerId,
          leadPartnerType: partner?.type || '',
          budgetPercent: config.budgetPercent,
          isCoordinator,
          wpNumber: config.wpNumber,
        },
        wpConfigs.map(c => ({
          leadPartnerId: c.leadPartnerId,
          type: c.type,
          budgetPercent: c.budgetPercent
        })),
        {
          totalBudget,
          partnerCount: consortium.length,
          hasPiloting: wpConfigs.some(c => c.type === 'PILOTING'),
        }
      );

      if (validation.errors.length > 0) {
        errors[config.wpNumber] = [...(errors[config.wpNumber] || []), ...validation.errors];
      }
      if (validation.warnings.length > 0) {
        warnings[config.wpNumber] = [...(warnings[config.wpNumber] || []), ...validation.warnings];
      }
    }

    setValidationErrors(errors);
    setValidationWarnings(warnings);
  }, [wpConfigs, coordinatorId, consortium, totalBudget]);

  // Calculate duration based on WP position
  function calculateDuration(wpNum: number, totalWPs: number): { start: number; end: number } {
    const projectDuration = actionType === 'KA220' ? 36 : 24;

    if (wpNum === 1) {
      // Management: entire project
      return { start: 1, end: projectDuration };
    }

    const contentWPs = totalWPs - 1;
    const wpIndex = wpNum - 2; // 0-based for content WPs
    const phaseLength = Math.floor(projectDuration / contentWPs);

    // Last WP (dissemination) should run longer
    if (wpNum === totalWPs) {
      return { start: Math.max(1, (wpIndex - 1) * phaseLength), end: projectDuration };
    }

    return {
      start: wpIndex * phaseLength + 1,
      end: Math.min((wpIndex + 2) * phaseLength, projectDuration),
    };
  }

  // Update a specific WP configuration
  const updateWPConfig = (wpNumber: number, updates: Partial<WPConfiguration>) => {
    const newConfigs = wpConfigs.map(config =>
      config.wpNumber === wpNumber ? { ...config, ...updates } : config
    );
    setWpConfigs(newConfigs);
    onConfigurationChange(newConfigs);
  };

  // Toggle activity selection
  const toggleActivity = (wpNumber: number, activityId: string) => {
    const config = wpConfigs.find(c => c.wpNumber === wpNumber);
    if (!config) return;

    const activity = Object.values(STANDARD_ACTIVITIES).find(a => a.id === activityId);

    // Don't allow deselecting mandatory activities
    if (activity?.mandatory && config.selectedActivities.includes(activityId)) {
      return;
    }

    const newActivities = config.selectedActivities.includes(activityId)
      ? config.selectedActivities.filter(id => id !== activityId)
      : [...config.selectedActivities, activityId];

    updateWPConfig(wpNumber, { selectedActivities: newActivities });
  };

  // Toggle deliverable selection
  const toggleDeliverable = (wpNumber: number, deliverableId: string) => {
    const config = wpConfigs.find(c => c.wpNumber === wpNumber);
    if (!config) return;

    const newDeliverables = config.selectedDeliverables.includes(deliverableId)
      ? config.selectedDeliverables.filter(id => id !== deliverableId)
      : [...config.selectedDeliverables, deliverableId];

    updateWPConfig(wpNumber, { selectedDeliverables: newDeliverables });
  };

  // Change WP type
  const changeWPType = (wpNumber: number, newType: WPType) => {
    const template = WP_TEMPLATES.find(t => t.type === newType);
    if (!template) return;

    // Select default activities for new type
    const defaultActivities = template.suggestedActivities
      .filter(a => a.mandatory)
      .map(a => a.id);

    const defaultDeliverables = template.suggestedDeliverables
      .slice(0, 2)
      .map(d => d.id);

    updateWPConfig(wpNumber, {
      type: newType,
      title: template.name,
      titleDE: template.nameDE,
      selectedActivities: defaultActivities,
      selectedDeliverables: defaultDeliverables,
    });
  };

  // Get SMART indicator examples for WP type
  const getIndicatorExamples = (wpType: WPType): { template: string; example: string }[] | null => {
    const typeMap: Record<string, keyof typeof SMART_INDICATOR_TEMPLATES> = {
      'MANAGEMENT': 'management',
      'RESEARCH_ANALYSIS': 'research',
      'DEVELOPMENT': 'development',
      'PILOTING': 'piloting',
      'DISSEMINATION': 'dissemination',
    };
    const key = typeMap[wpType];
    return key ? SMART_INDICATOR_TEMPLATES[key] : null;
  };

  // Calculate total budget allocation
  const totalBudgetPercent = wpConfigs.reduce((sum, c) => sum + c.budgetPercent, 0);
  const budgetValid = totalBudgetPercent === 100;

  // Get template for a WP type
  const getTemplate = (type: WPType): WPTemplate => {
    return WP_TEMPLATES.find(t => t.type === type) || WP_TEMPLATES[0];
  };

  return (
    <div className="space-y-4">
      {/* Header with summary */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold text-indigo-800">
              {language === 'de' ? 'Work Package Konfiguration' : 'Work Package Configuration'}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGuideline(!showGuideline)}
              className="text-indigo-600 border-indigo-300 hover:bg-indigo-50"
            >
              <Info className="h-4 w-4 mr-1" />
              {language === 'de' ? 'WP Guideline' : 'WP Guideline'}
            </Button>
            <Badge className={budgetValid ? 'bg-green-500' : 'bg-red-500'}>
              Budget: {totalBudgetPercent}%
            </Badge>
          </div>
        </div>

        {/* WP Guideline Panel */}
        {showGuideline && (
          <div className="mb-4 p-4 bg-white rounded-lg border border-indigo-200 max-h-96 overflow-y-auto text-sm">
            <div className="prose prose-sm max-w-none">
              <h4 className="text-indigo-800 font-bold mb-2">
                {language === 'de' ? 'Work Package Guideline' : 'Work Package Guideline'}
              </h4>

              <h5 className="text-indigo-700 font-semibold mt-3 mb-1">
                {language === 'de' ? 'Budget-Richtwerte' : 'Budget Guidelines'}
              </h5>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li><strong>Management (WP1):</strong> max. 15-20%</li>
                <li><strong>Development:</strong> 25-35%</li>
                <li><strong>Piloting:</strong> 15-25%</li>
                <li><strong>Dissemination:</strong> 15-20%</li>
              </ul>

              <h5 className="text-indigo-700 font-semibold mt-3 mb-1">
                {language === 'de' ? 'Tagessätze nach Land' : 'Daily Rates by Country'}
              </h5>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li><strong>DE/AT/NL/BE:</strong> 350-500€/Tag</li>
                <li><strong>ES/IT/PT:</strong> 280-350€/Tag</li>
                <li><strong>RO/HR/BG:</strong> 200-280€/Tag</li>
                <li><strong>PL/CZ/SK:</strong> 230-300€/Tag</li>
              </ul>

              <h5 className="text-indigo-700 font-semibold mt-3 mb-1">
                {language === 'de' ? 'Wichtige Regeln' : 'Important Rules'}
              </h5>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li>{language === 'de' ? 'WP1 MUSS vom Koordinator geleitet werden' : 'WP1 MUST be led by Coordinator'}</li>
                <li>{language === 'de' ? 'Max. 2 WPs pro Partner (außer Koordinator)' : 'Max. 2 WPs per partner (except Coordinator)'}</li>
                <li>{language === 'de' ? 'Frühzeitige Dissemination - nicht erst am Ende!' : 'Early dissemination - not just at the end!'}</li>
              </ul>

              <h5 className="text-indigo-700 font-semibold mt-3 mb-1">
                {language === 'de' ? 'NO-GOs (Ablehnungsgründe)' : 'NO-GOs (Rejection Reasons)'}
              </h5>
              <ul className="list-disc list-inside text-red-600 space-y-1">
                <li>{language === 'de' ? 'Management-Budget > 20%' : 'Management budget > 20%'}</li>
                <li>{language === 'de' ? 'Vage Indikatoren wie "erhöhtes Bewusstsein"' : 'Vague indicators like "increased awareness"'}</li>
                <li>{language === 'de' ? 'Weniger als 10 Teilnehmer bei LTTA' : 'Less than 10 participants in LTTA'}</li>
                <li>{language === 'de' ? 'Keine Multiplier Events geplant' : 'No Multiplier Events planned'}</li>
              </ul>

              <h5 className="text-indigo-700 font-semibold mt-3 mb-1">
                {language === 'de' ? 'TPM & LTTA Richtwerte' : 'TPM & LTTA Guidelines'}
              </h5>
              <ul className="list-disc list-inside text-gray-700 space-y-1">
                <li><strong>TPM:</strong> 100-150€ pro Person/Meeting, 2-3 Personen pro Partner</li>
                <li><strong>LTTA:</strong> 5-10 Tage, 15-25 Teilnehmer, ~1.500-2.500€/Person</li>
                <li><strong>Multiplier Events:</strong> ~100€ lokal, ~200€ international pro Teilnehmer</li>
              </ul>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowGuideline(false)}
              className="mt-2 w-full text-indigo-600"
            >
              {language === 'de' ? 'Schließen' : 'Close'}
            </Button>
          </div>
        )}

        {/* Recommendations */}
        {recommended.notes.length > 0 && (
          <div className="text-sm text-indigo-600 space-y-1">
            {recommended.notes.map((note, i) => (
              <p key={i} className="flex items-center gap-1">
                <Info className="h-4 w-4" />
                {note}
              </p>
            ))}
          </div>
        )}

        {/* Budget bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Budget-Verteilung</span>
            <span>{totalBudgetPercent}% / 100%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden flex">
            {wpConfigs.map((config, idx) => {
              const template = getTemplate(config.type);
              const isOverLimit = config.budgetPercent > template.maxBudgetPercent;
              const colors = [
                'bg-blue-500', 'bg-green-500', 'bg-yellow-500',
                'bg-purple-500', 'bg-pink-500', 'bg-orange-500'
              ];
              return (
                <div
                  key={config.wpNumber}
                  className={`${isOverLimit ? 'bg-red-500' : colors[idx % colors.length]} transition-all`}
                  style={{ width: `${config.budgetPercent}%` }}
                  title={`WP${config.wpNumber}: ${config.budgetPercent}%`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* WP Cards */}
      {wpConfigs.map((config) => {
        const template = getTemplate(config.type);
        const isExpanded = expandedWP === config.wpNumber;
        const hasErrors = validationErrors[config.wpNumber]?.length > 0;
        const hasWarnings = validationWarnings[config.wpNumber]?.length > 0;
        const leadPartner = consortium.find(p => p.id === config.leadPartnerId);

        return (
          <Card
            key={config.wpNumber}
            className={`border-2 transition-all ${
              hasErrors
                ? 'border-red-300 bg-red-50/30'
                : hasWarnings
                  ? 'border-yellow-300 bg-yellow-50/30'
                  : isExpanded
                    ? 'border-indigo-300 shadow-md'
                    : 'border-gray-200'
            }`}
          >
            {/* WP Header - Always visible */}
            <div
              className="p-4 cursor-pointer"
              onClick={() => setExpandedWP(isExpanded ? null : config.wpNumber)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white ${
                    config.type === 'MANAGEMENT' ? 'bg-blue-600' :
                    config.type === 'RESEARCH_ANALYSIS' ? 'bg-green-600' :
                    config.type === 'DEVELOPMENT' ? 'bg-purple-600' :
                    config.type === 'PILOTING' ? 'bg-orange-600' :
                    config.type === 'DISSEMINATION' ? 'bg-pink-600' :
                    'bg-gray-600'
                  }`}>
                    WP{config.wpNumber}
                  </div>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {language === 'de' ? config.titleDE : config.title}
                      {config.wpNumber === 1 && (
                        <Badge variant="outline" className="text-xs">Pflicht</Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      {leadPartner?.name || 'Kein Lead'}
                      <span className="text-gray-300">|</span>
                      <Calendar className="h-3 w-3" />
                      M{config.duration.start}-M{config.duration.end}
                      <span className="text-gray-300">|</span>
                      {config.budgetPercent}% Budget
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {hasErrors && (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  {hasWarnings && !hasErrors && (
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  )}
                  {!hasErrors && !hasWarnings && (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  )}
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Validation messages in header */}
              {(hasErrors || hasWarnings) && !isExpanded && (
                <div className="mt-2 text-sm">
                  {validationErrors[config.wpNumber]?.map((err, i) => (
                    <p key={i} className="text-red-600">⚠️ {err}</p>
                  ))}
                  {validationWarnings[config.wpNumber]?.map((warn, i) => (
                    <p key={i} className="text-yellow-600">💡 {warn}</p>
                  ))}
                </div>
              )}
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <CardContent className="pt-0 border-t space-y-6">
                {/* Validation messages */}
                {(hasErrors || hasWarnings) && (
                  <div className="space-y-2">
                    {validationErrors[config.wpNumber]?.map((err, i) => (
                      <div key={i} className="p-2 bg-red-100 rounded text-red-700 text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {err}
                      </div>
                    ))}
                    {validationWarnings[config.wpNumber]?.map((warn, i) => (
                      <div key={i} className="p-2 bg-yellow-100 rounded text-yellow-700 text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        {warn}
                      </div>
                    ))}
                  </div>
                )}

                {/* WP Type & Lead Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {language === 'de' ? 'WP-Typ' : 'WP Type'}
                    </label>
                    <Select
                      value={config.type}
                      onValueChange={(value) => changeWPType(config.wpNumber, value as WPType)}
                      disabled={config.wpNumber === 1} // Management WP type is fixed
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WP_TEMPLATES.map((t) => (
                          <SelectItem key={t.type} value={t.type}>
                            {language === 'de' ? t.nameDE : t.name}
                            <span className="text-xs text-gray-400 ml-2">
                              (max {t.maxBudgetPercent}%)
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      {language === 'de' ? 'Lead-Partner' : 'Lead Partner'}
                    </label>
                    <Select
                      value={config.leadPartnerId}
                      onValueChange={(value) => updateWPConfig(config.wpNumber, { leadPartnerId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Partner wählen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {consortium.map((partner) => {
                          const assignment = partnerRoleAssignments[partner.id];
                          const isCoordinator = partner.id === coordinatorId;
                          const isRecommended = assignment?.suggestedWPLeads?.includes(config.wpNumber);

                          return (
                            <SelectItem key={partner.id} value={partner.id}>
                              <div className="flex items-center gap-2">
                                {isCoordinator && <span>👑</span>}
                                {partner.name}
                                {isRecommended && (
                                  <Badge className="bg-green-100 text-green-700 text-xs">
                                    Empfohlen
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Budget Slider */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Budget: {config.budgetPercent}%
                    <span className="text-gray-400 ml-2">
                      (€{Math.round(totalBudget * config.budgetPercent / 100).toLocaleString()})
                    </span>
                    {config.budgetPercent > template.maxBudgetPercent && (
                      <span className="text-red-500 ml-2">
                        ⚠️ Max {template.maxBudgetPercent}%
                      </span>
                    )}
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    value={config.budgetPercent}
                    onChange={(e) => updateWPConfig(config.wpNumber, { budgetPercent: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>

                {/* Budget Details Form */}
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-4">
                    <Calculator className="h-5 w-5 text-green-600" />
                    <h4 className="font-medium text-green-800">
                      {language === 'de' ? 'Budget-Kalkulation Details' : 'Budget Calculation Details'}
                    </h4>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Expert Days */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-sm">
                        <UserCheck className="h-4 w-4 text-green-600" />
                        {language === 'de' ? 'Expertentage' : 'Expert Days'}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={config.budgetDetails?.expertDays || ''}
                        onChange={(e) => updateWPConfig(config.wpNumber, {
                          budgetDetails: {
                            ...config.budgetDetails,
                            expertDays: parseInt(e.target.value) || 0,
                            expertDayCost: config.budgetDetails?.expertDayCost || 400,
                            accommodationCost: config.budgetDetails?.accommodationCost || 100,
                            accommodationNights: config.budgetDetails?.accommodationNights || 0,
                            travelCost: config.budgetDetails?.travelCost || 0,
                            participantCount: config.budgetDetails?.participantCount || 0,
                            eventCost: config.budgetDetails?.eventCost || 0,
                            materialsCost: config.budgetDetails?.materialsCost || 0,
                          }
                        })}
                        className="h-9"
                      />
                    </div>

                    {/* Expert Day Cost */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-sm">
                        <Euro className="h-4 w-4 text-green-600" />
                        {language === 'de' ? '€/Tag' : '€/Day'}
                      </Label>
                      <Input
                        type="number"
                        min="100"
                        max="800"
                        placeholder="400"
                        value={config.budgetDetails?.expertDayCost || ''}
                        onChange={(e) => updateWPConfig(config.wpNumber, {
                          budgetDetails: {
                            ...config.budgetDetails,
                            expertDays: config.budgetDetails?.expertDays || 0,
                            expertDayCost: parseInt(e.target.value) || 400,
                            accommodationCost: config.budgetDetails?.accommodationCost || 100,
                            accommodationNights: config.budgetDetails?.accommodationNights || 0,
                            travelCost: config.budgetDetails?.travelCost || 0,
                            participantCount: config.budgetDetails?.participantCount || 0,
                            eventCost: config.budgetDetails?.eventCost || 0,
                            materialsCost: config.budgetDetails?.materialsCost || 0,
                          }
                        })}
                        className="h-9"
                      />
                    </div>

                    {/* Participant Count */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-sm">
                        <Users className="h-4 w-4 text-green-600" />
                        {language === 'de' ? 'Teilnehmer' : 'Participants'}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={config.budgetDetails?.participantCount || ''}
                        onChange={(e) => updateWPConfig(config.wpNumber, {
                          budgetDetails: {
                            ...config.budgetDetails,
                            expertDays: config.budgetDetails?.expertDays || 0,
                            expertDayCost: config.budgetDetails?.expertDayCost || 400,
                            accommodationCost: config.budgetDetails?.accommodationCost || 100,
                            accommodationNights: config.budgetDetails?.accommodationNights || 0,
                            travelCost: config.budgetDetails?.travelCost || 0,
                            participantCount: parseInt(e.target.value) || 0,
                            eventCost: config.budgetDetails?.eventCost || 0,
                            materialsCost: config.budgetDetails?.materialsCost || 0,
                          }
                        })}
                        className="h-9"
                      />
                    </div>

                    {/* Accommodation Nights */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-sm">
                        <Hotel className="h-4 w-4 text-green-600" />
                        {language === 'de' ? 'Übernachtungen' : 'Nights'}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={config.budgetDetails?.accommodationNights || ''}
                        onChange={(e) => updateWPConfig(config.wpNumber, {
                          budgetDetails: {
                            ...config.budgetDetails,
                            expertDays: config.budgetDetails?.expertDays || 0,
                            expertDayCost: config.budgetDetails?.expertDayCost || 400,
                            accommodationCost: config.budgetDetails?.accommodationCost || 100,
                            accommodationNights: parseInt(e.target.value) || 0,
                            travelCost: config.budgetDetails?.travelCost || 0,
                            participantCount: config.budgetDetails?.participantCount || 0,
                            eventCost: config.budgetDetails?.eventCost || 0,
                            materialsCost: config.budgetDetails?.materialsCost || 0,
                          }
                        })}
                        className="h-9"
                      />
                    </div>

                    {/* Accommodation Cost per Night */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-sm">
                        <Euro className="h-4 w-4 text-green-600" />
                        {language === 'de' ? '€/Nacht' : '€/Night'}
                      </Label>
                      <Input
                        type="number"
                        min="50"
                        max="300"
                        placeholder="100"
                        value={config.budgetDetails?.accommodationCost || ''}
                        onChange={(e) => updateWPConfig(config.wpNumber, {
                          budgetDetails: {
                            ...config.budgetDetails,
                            expertDays: config.budgetDetails?.expertDays || 0,
                            expertDayCost: config.budgetDetails?.expertDayCost || 400,
                            accommodationCost: parseInt(e.target.value) || 100,
                            accommodationNights: config.budgetDetails?.accommodationNights || 0,
                            travelCost: config.budgetDetails?.travelCost || 0,
                            participantCount: config.budgetDetails?.participantCount || 0,
                            eventCost: config.budgetDetails?.eventCost || 0,
                            materialsCost: config.budgetDetails?.materialsCost || 0,
                          }
                        })}
                        className="h-9"
                      />
                    </div>

                    {/* Travel Cost */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-sm">
                        <Plane className="h-4 w-4 text-green-600" />
                        {language === 'de' ? 'Reisekosten €' : 'Travel €'}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={config.budgetDetails?.travelCost || ''}
                        onChange={(e) => updateWPConfig(config.wpNumber, {
                          budgetDetails: {
                            ...config.budgetDetails,
                            expertDays: config.budgetDetails?.expertDays || 0,
                            expertDayCost: config.budgetDetails?.expertDayCost || 400,
                            accommodationCost: config.budgetDetails?.accommodationCost || 100,
                            accommodationNights: config.budgetDetails?.accommodationNights || 0,
                            travelCost: parseInt(e.target.value) || 0,
                            participantCount: config.budgetDetails?.participantCount || 0,
                            eventCost: config.budgetDetails?.eventCost || 0,
                            materialsCost: config.budgetDetails?.materialsCost || 0,
                          }
                        })}
                        className="h-9"
                      />
                    </div>

                    {/* Event Cost */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-sm">
                        <Target className="h-4 w-4 text-green-600" />
                        {language === 'de' ? 'Event-Kosten €' : 'Event Cost €'}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={config.budgetDetails?.eventCost || ''}
                        onChange={(e) => updateWPConfig(config.wpNumber, {
                          budgetDetails: {
                            ...config.budgetDetails,
                            expertDays: config.budgetDetails?.expertDays || 0,
                            expertDayCost: config.budgetDetails?.expertDayCost || 400,
                            accommodationCost: config.budgetDetails?.accommodationCost || 100,
                            accommodationNights: config.budgetDetails?.accommodationNights || 0,
                            travelCost: config.budgetDetails?.travelCost || 0,
                            participantCount: config.budgetDetails?.participantCount || 0,
                            eventCost: parseInt(e.target.value) || 0,
                            materialsCost: config.budgetDetails?.materialsCost || 0,
                          }
                        })}
                        className="h-9"
                      />
                    </div>

                    {/* Materials Cost */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1 text-sm">
                        <FileText className="h-4 w-4 text-green-600" />
                        {language === 'de' ? 'Material €' : 'Materials €'}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={config.budgetDetails?.materialsCost || ''}
                        onChange={(e) => updateWPConfig(config.wpNumber, {
                          budgetDetails: {
                            ...config.budgetDetails,
                            expertDays: config.budgetDetails?.expertDays || 0,
                            expertDayCost: config.budgetDetails?.expertDayCost || 400,
                            accommodationCost: config.budgetDetails?.accommodationCost || 100,
                            accommodationNights: config.budgetDetails?.accommodationNights || 0,
                            travelCost: config.budgetDetails?.travelCost || 0,
                            participantCount: config.budgetDetails?.participantCount || 0,
                            eventCost: config.budgetDetails?.eventCost || 0,
                            materialsCost: parseInt(e.target.value) || 0,
                          }
                        })}
                        className="h-9"
                      />
                    </div>
                  </div>

                  {/* Budget Calculation Summary */}
                  {config.budgetDetails && (
                    <div className="mt-4 pt-4 border-t border-green-200">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">{language === 'de' ? 'Expertentage:' : 'Expert Days:'}</span>
                          <span className="font-medium">
                            {(config.budgetDetails.expertDays || 0) * (config.budgetDetails.expertDayCost || 400)}€
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">{language === 'de' ? 'Unterkunft:' : 'Accommodation:'}</span>
                          <span className="font-medium">
                            {(config.budgetDetails.accommodationNights || 0) * (config.budgetDetails.accommodationCost || 100) * (config.budgetDetails.participantCount || 1)}€
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">{language === 'de' ? 'Reise:' : 'Travel:'}</span>
                          <span className="font-medium">{config.budgetDetails.travelCost || 0}€</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">{language === 'de' ? 'Events:' : 'Events:'}</span>
                          <span className="font-medium">{config.budgetDetails.eventCost || 0}€</span>
                        </div>
                        <div className="col-span-2 flex justify-between pt-2 border-t border-green-300 font-semibold text-green-800">
                          <span>{language === 'de' ? 'Gesamt (kalkuliert):' : 'Total (calculated):'}</span>
                          <span>
                            {(
                              ((config.budgetDetails.expertDays || 0) * (config.budgetDetails.expertDayCost || 400)) +
                              ((config.budgetDetails.accommodationNights || 0) * (config.budgetDetails.accommodationCost || 100) * (config.budgetDetails.participantCount || 1)) +
                              (config.budgetDetails.travelCost || 0) +
                              (config.budgetDetails.eventCost || 0) +
                              (config.budgetDetails.materialsCost || 0)
                            ).toLocaleString()}€
                          </span>
                        </div>
                        <div className="col-span-2 flex justify-between text-xs text-gray-500">
                          <span>{language === 'de' ? 'Budget-Anteil:' : 'Budget share:'}</span>
                          <span>{Math.round(totalBudget * config.budgetPercent / 100).toLocaleString()}€</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Activities Selection */}
                <div>
                  <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    {language === 'de' ? 'Aktivitäten auswählen' : 'Select Activities'}
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {template.suggestedActivities.map((activity) => {
                      const isSelected = config.selectedActivities.includes(activity.id);
                      const isMandatory = activity.mandatory;

                      return (
                        <div
                          key={activity.id}
                          onClick={() => toggleActivity(config.wpNumber, activity.id)}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-indigo-400 bg-indigo-50'
                              : 'border-gray-200 hover:border-gray-300'
                          } ${isMandatory && isSelected ? 'cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                              isSelected
                                ? 'bg-indigo-500 border-indigo-500'
                                : 'border-gray-300'
                            }`}>
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm flex items-center gap-2">
                                {language === 'de' ? activity.nameDE : activity.name}
                                {isMandatory && (
                                  <Badge className="bg-red-100 text-red-700 text-xs">Pflicht</Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {language === 'de' ? activity.descriptionDE : activity.description}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                ⏱️ {activity.typicalDuration}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Deliverables Selection */}
                <div>
                  <label className="block text-sm font-medium mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {language === 'de' ? 'Ergebnisse / Deliverables' : 'Deliverables'}
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {template.suggestedDeliverables.map((deliverable) => {
                      const isSelected = config.selectedDeliverables.includes(deliverable.id);

                      return (
                        <div
                          key={deliverable.id}
                          onClick={() => toggleDeliverable(config.wpNumber, deliverable.id)}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-green-400 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 ${
                              isSelected
                                ? 'bg-green-500 border-green-500'
                                : 'border-gray-300'
                            }`}>
                              {isSelected && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {language === 'de' ? deliverable.nameDE : deliverable.name}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {language === 'de' ? deliverable.descriptionDE : deliverable.description}
                              </p>
                              <Badge variant="outline" className="text-xs mt-1">
                                {deliverable.type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Tips */}
                {template.tipsDE.length > 0 && (
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-800 mb-2">💡 {language === 'de' ? 'Tipps (Programme Guide & NA-Erfahrung)' : 'Tips (Programme Guide & NA Experience)'}:</p>
                    <ul className="text-sm text-blue-700 space-y-1">
                      {(language === 'de' ? template.tipsDE : template.tips).slice(0, 5).map((tip, i) => (
                        <li key={i} className={tip.includes('KRITISCH') || tip.includes('CRITICAL') ? 'font-semibold text-blue-900' : ''}>
                          • {tip}
                        </li>
                      ))}
                    </ul>
                    {(language === 'de' ? template.tipsDE : template.tips).length > 5 && (
                      <details className="mt-2">
                        <summary className="text-xs text-blue-600 cursor-pointer hover:underline">
                          {language === 'de' ? `+ ${template.tipsDE.length - 5} weitere Tipps` : `+ ${template.tips.length - 5} more tips`}
                        </summary>
                        <ul className="text-sm text-blue-700 space-y-1 mt-2">
                          {(language === 'de' ? template.tipsDE : template.tips).slice(5).map((tip, i) => (
                            <li key={i}>• {tip}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}

                {/* SMART Indicator Examples */}
                {getIndicatorExamples(config.type) && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm font-medium text-green-800 mb-2">📊 {language === 'de' ? 'SMART-Indikatoren (Beispiele)' : 'SMART Indicators (Examples)'}:</p>
                    <ul className="text-sm text-green-700 space-y-1">
                      {getIndicatorExamples(config.type)!.slice(0, 3).map((indicator, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-green-500">✓</span>
                          <span>{indicator.example}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-xs text-green-600 mt-2 italic">
                      {language === 'de'
                        ? '⚠️ Vage Indikatoren wie "erhöhtes Bewusstsein" führen zur Ablehnung!'
                        : '⚠️ Vague indicators like "increased awareness" lead to rejection!'}
                    </p>
                  </div>
                )}

                {/* Benchmark Info for specific WP types */}
                {config.type === 'MANAGEMENT' && (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm font-medium text-amber-800 mb-2">📏 {language === 'de' ? 'Benchmark (Schattenkalkulation)' : 'Benchmark (Shadow Calculation)'}:</p>
                    <ul className="text-xs text-amber-700 space-y-1">
                      <li>• TPM: €{BENCHMARKS.TPM.costPerPersonPerMeeting.min}-{BENCHMARKS.TPM.costPerPersonPerMeeting.max} {language === 'de' ? 'pro Person/Meeting' : 'per person/meeting'}</li>
                      <li>• {BENCHMARKS.TPM.personsPerPartner.min}-{BENCHMARKS.TPM.personsPerPartner.max} {language === 'de' ? 'Personen pro Partner (mehr = "Projekttourismus")' : 'persons per partner (more = "project tourism")'}</li>
                      <li>• {language === 'de' ? 'Empfohlen' : 'Recommended'}: Kick-off + 1-2 Interim + Final</li>
                    </ul>
                  </div>
                )}

                {config.type === 'DISSEMINATION' && (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm font-medium text-amber-800 mb-2">📏 {language === 'de' ? 'Benchmark (100€-Regel)' : 'Benchmark (100€ Rule)'}:</p>
                    <ul className="text-xs text-amber-700 space-y-1">
                      <li>• €{BENCHMARKS.MULTIPLIER_EVENTS.costPerLocalParticipant} {language === 'de' ? 'pro lokalem Teilnehmer' : 'per local participant'}</li>
                      <li>• €{BENCHMARKS.MULTIPLIER_EVENTS.costPerInternationalParticipant} {language === 'de' ? 'pro internationalem Teilnehmer' : 'per international participant'}</li>
                      <li>• {language === 'de' ? 'Min. Teilnehmer' : 'Min. participants'}: {language === 'de' ? 'Workshop' : 'Workshop'} {BENCHMARKS.MULTIPLIER_EVENTS.minParticipantsLocalWorkshop}+, National {BENCHMARKS.MULTIPLIER_EVENTS.targetParticipantsNationalConference.min}-{BENCHMARKS.MULTIPLIER_EVENTS.targetParticipantsNationalConference.max}, Final {BENCHMARKS.MULTIPLIER_EVENTS.targetParticipantsFinalConference.min}-{BENCHMARKS.MULTIPLIER_EVENTS.targetParticipantsFinalConference.max}</li>
                      <li>• {language === 'de' ? 'Mind. 1 Event pro Partnerland!' : 'Min. 1 event per partner country!'}</li>
                    </ul>
                  </div>
                )}

                {config.type === 'PILOTING' && (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                    <p className="text-sm font-medium text-amber-800 mb-2">📏 {language === 'de' ? 'Benchmark (LTTAs)' : 'Benchmark (LTTAs)'}:</p>
                    <ul className="text-xs text-amber-700 space-y-1">
                      <li>• {language === 'de' ? 'Dauer' : 'Duration'}: {BENCHMARKS.LTTA.minDurationDays}-{BENCHMARKS.LTTA.maxDurationDays} {language === 'de' ? 'Tage (+ Reisetage)' : 'days (+ travel)'}</li>
                      <li>• {language === 'de' ? 'Zielgröße' : 'Target size'}: {BENCHMARKS.LTTA.targetGroupSize.min}-{BENCHMARKS.LTTA.targetGroupSize.max} {language === 'de' ? 'Teilnehmer' : 'participants'}</li>
                      <li>• {language === 'de' ? 'VERMEIDEN' : 'AVOID'}: &lt;{BENCHMARKS.LTTA.warningSmallGroup} {language === 'de' ? 'Teilnehmer (wirkt irrelevant)' : 'participants (looks irrelevant)'}</li>
                      <li>• {BENCHMARKS.LTTA.minParticipantsPerPartner}+ {language === 'de' ? 'Personen pro Partner empfohlen' : 'persons per partner recommended'}</li>
                    </ul>
                  </div>
                )}

                {/* Generate WP Button */}
                {onGenerateWP && (
                  <div className="pt-4 border-t">
                    <Button
                      onClick={() => onGenerateWP(config.wpNumber, config)}
                      disabled={generatingWPNumber !== null}
                      className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white"
                    >
                      {generatingWPNumber === config.wpNumber ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          {language === 'de' ? 'Generiere WP...' : 'Generating WP...'}
                        </>
                      ) : (
                        <>
                          <Zap className="mr-2 h-5 w-5" />
                          {language === 'de' ? `WP${config.wpNumber} Generieren` : `Generate WP${config.wpNumber}`}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4 border">
        <h4 className="font-medium mb-3">
          {language === 'de' ? 'Zusammenfassung' : 'Summary'}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Work Packages:</span>
            <span className="ml-2 font-medium">{wpConfigs.length}</span>
          </div>
          <div>
            <span className="text-gray-500">Aktivitäten:</span>
            <span className="ml-2 font-medium">
              {wpConfigs.reduce((sum, c) => sum + c.selectedActivities.length, 0)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Deliverables:</span>
            <span className="ml-2 font-medium">
              {wpConfigs.reduce((sum, c) => sum + c.selectedDeliverables.length, 0)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Budget:</span>
            <span className={`ml-2 font-medium ${budgetValid ? 'text-green-600' : 'text-red-600'}`}>
              {totalBudgetPercent}% {budgetValid ? '✓' : '(≠100%)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
