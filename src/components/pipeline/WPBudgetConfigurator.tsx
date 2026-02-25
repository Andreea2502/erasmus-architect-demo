'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Check,
  Users,
} from 'lucide-react';
import { ConsortiumPartner } from '@/lib/project-pipeline';
import { type Language } from '@/lib/i18n';

// ============================================================================
// TYPES
// ============================================================================

export interface CostItem {
  id: string;
  category: string;
  role: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  partnerId: string;
  // For nested calculations (accommodation)
  persons?: number;
  nights?: number;
}

export interface WPBudgetConfig {
  wpNumber: number;
  title: string;
  titleDE: string;
  leadPartnerId: string;
  costItems: CostItem[];
  totalBudget: number;
  // WP1 uses percent instead of cost items
  budgetPercent?: number;
}

interface WPBudgetConfiguratorProps {
  consortium: ConsortiumPartner[];
  coordinatorId: string | null;
  totalLumpSum: number;
  language: Language;
  onConfigurationChange: (configs: WPBudgetConfig[]) => void;
  initialConfigs?: WPBudgetConfig[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const WP_DEFINITIONS = [
  { number: 1, title: 'Project Management', titleDE: 'Projektmanagement', maxPercent: 20 },
  { number: 2, title: 'Research & Analysis', titleDE: 'Forschung & Analyse', maxPercent: null },
  { number: 3, title: 'Development & Production', titleDE: 'Entwicklung & Produktion', maxPercent: null },
  { number: 4, title: 'Training & Piloting', titleDE: 'Training & Piloting', maxPercent: null },
  { number: 5, title: 'Dissemination & Exploitation', titleDE: 'Verbreitung & Verwertung', maxPercent: null },
];

// WP2: Research & Analysis (Focus: Staff)
const WP2_CATEGORIES = {
  de: [
    { value: 'researcher', label: 'Researcher / Forscher' },
    { value: 'technician', label: 'Technician / Datenanalyst' },
    { value: 'senior_expert', label: 'Senior Expert' },
    { value: 'junior_researcher', label: 'Junior Researcher' },
  ],
  en: [
    { value: 'researcher', label: 'Researcher' },
    { value: 'technician', label: 'Technician / Data Analyst' },
    { value: 'senior_expert', label: 'Senior Expert' },
    { value: 'junior_researcher', label: 'Junior Researcher' },
  ],
};

// WP3: Development & Production
const WP3_CATEGORIES = {
  de: [
    { value: 'expert_adult_edu', label: 'Expert Adult Education' },
    { value: 'expert_digital', label: 'Expert Digital Literacy' },
    { value: 'expert_ai', label: 'Expert AI (Tech)' },
    { value: 'expert_migration', label: 'Expert Migration/Inclusion' },
    { value: 'content_dev', label: 'Content Developer' },
    { value: 'translation', label: 'Übersetzung' },
    { value: 'software_license', label: 'Software Lizenz (Abo)' },
    { value: 'web_dev', label: 'Web Development' },
    { value: 'graphic_design', label: 'Grafikdesign' },
    { value: 'workshop_materials', label: 'Workshop Materialien' },
    { value: 'printing', label: 'Druckkosten' },
  ],
  en: [
    { value: 'expert_adult_edu', label: 'Expert Adult Education' },
    { value: 'expert_digital', label: 'Expert Digital Literacy' },
    { value: 'expert_ai', label: 'Expert AI (Tech)' },
    { value: 'expert_migration', label: 'Expert Migration/Inclusion' },
    { value: 'content_dev', label: 'Content Developer' },
    { value: 'translation', label: 'Translation Services' },
    { value: 'software_license', label: 'Software License (Subscription)' },
    { value: 'web_dev', label: 'Web Development' },
    { value: 'graphic_design', label: 'Graphic Design' },
    { value: 'workshop_materials', label: 'Workshop Materials' },
    { value: 'printing', label: 'Printing' },
  ],
};

// WP4: Training & Piloting
const WP4_CATEGORIES = {
  de: [
    { value: 'flight_train', label: 'Reisekosten (Flug/Zug)' },
    { value: 'green_travel', label: 'Green Travel Top-Up' },
    { value: 'hotel_food', label: 'Unterkunft & Verpflegung' },
    { value: 'catering', label: 'Catering (Events)' },
    { value: 'trainer', label: 'Trainer / Facilitator' },
    { value: 'moderator', label: 'Moderator' },
    { value: 'venue_rental', label: 'Raummiete' },
  ],
  en: [
    { value: 'flight_train', label: 'Travel Cost (Flight/Train)' },
    { value: 'green_travel', label: 'Green Travel Top-Up' },
    { value: 'hotel_food', label: 'Accommodation & Subsistence' },
    { value: 'catering', label: 'Catering (Events)' },
    { value: 'trainer', label: 'Trainer / Facilitator' },
    { value: 'moderator', label: 'Moderator' },
    { value: 'venue_rental', label: 'Venue Rental' },
  ],
};

// WP5: Dissemination
const WP5_CATEGORIES = {
  de: [
    { value: 'multiplier_event', label: 'Multiplier Event' },
    { value: 'dissemination_material', label: 'Verbreitungsmaterial' },
    { value: 'website', label: 'Website / Online Plattform' },
    { value: 'social_media', label: 'Social Media Kampagne' },
    { value: 'publication', label: 'Publikationen' },
  ],
  en: [
    { value: 'multiplier_event', label: 'Multiplier Event' },
    { value: 'dissemination_material', label: 'Dissemination Material' },
    { value: 'website', label: 'Website / Online Platform' },
    { value: 'social_media', label: 'Social Media Campaign' },
    { value: 'publication', label: 'Publications' },
  ],
};

// Default rates
const DEFAULT_RATES: Record<string, number> = {
  researcher: 350, technician: 200, senior_expert: 400, junior_researcher: 180,
  expert_adult_edu: 350, expert_digital: 350, expert_ai: 450, expert_migration: 350,
  content_dev: 300, trainer: 400, moderator: 350,
  flight_train: 350, green_travel: 50, hotel_food: 120, catering: 25, venue_rental: 500,
  translation: 500, software_license: 50, web_dev: 2000, graphic_design: 800,
  workshop_materials: 200, printing: 500,
  multiplier_event: 100, dissemination_material: 500, website: 1500, social_media: 300, publication: 800,
};

// ============================================================================
// COMPONENT
// ============================================================================

export function WPBudgetConfigurator({
  consortium,
  coordinatorId,
  totalLumpSum,
  language,
  onConfigurationChange,
  initialConfigs,
}: WPBudgetConfiguratorProps) {
  const [wpConfigs, setWpConfigs] = useState<WPBudgetConfig[]>([]);
  const [expandedWP, setExpandedWP] = useState<number | null>(1);
  // Track selected partner for adding new cost items
  const [selectedPartnerForNewItem, setSelectedPartnerForNewItem] = useState<Record<number, string>>({});

  // Initialize WP configurations
  useEffect(() => {
    if (initialConfigs && initialConfigs.length > 0) {
      setWpConfigs(initialConfigs);
      return;
    }

    const configs: WPBudgetConfig[] = WP_DEFINITIONS.map((wp) => ({
      wpNumber: wp.number,
      title: wp.title,
      titleDE: wp.titleDE,
      leadPartnerId: wp.number === 1 ? (coordinatorId || consortium[0]?.id || '') : '',
      costItems: [],
      totalBudget: 0,
      budgetPercent: wp.number === 1 ? 15 : undefined, // WP1 starts with 15%
    }));

    setWpConfigs(configs);
  }, [coordinatorId, consortium]);

  // Calculate totals and notify parent
  useEffect(() => {
    const updatedConfigs = wpConfigs.map(wp => {
      if (wp.wpNumber === 1) {
        // WP1 uses percent
        return { ...wp, totalBudget: Math.round(totalLumpSum * (wp.budgetPercent || 0) / 100) };
      }
      return {
        ...wp,
        totalBudget: wp.costItems.reduce((sum, item) => sum + calculateItemTotal(item), 0),
      };
    });

    const totalsChanged = updatedConfigs.some((wp, i) => wp.totalBudget !== wpConfigs[i]?.totalBudget);
    if (totalsChanged) {
      setWpConfigs(updatedConfigs);
    }

    onConfigurationChange(updatedConfigs);
  }, [wpConfigs.map(w => JSON.stringify(w.costItems)).join(','), wpConfigs.map(w => w.budgetPercent).join(',')]);

  const calculateItemTotal = (item: CostItem): number => {
    if (item.category === 'hotel_food' && item.persons && item.nights) {
      return item.persons * item.nights * item.pricePerUnit;
    }
    if (item.category === 'flight_train' && item.persons) {
      return item.persons * item.pricePerUnit;
    }
    return item.quantity * item.pricePerUnit;
  };

  const addCostItem = (wpNumber: number) => {
    const selectedPartner = selectedPartnerForNewItem[wpNumber] || wpConfigs.find(w => w.wpNumber === wpNumber)?.leadPartnerId || '';

    const newItem: CostItem = {
      id: `item-${Date.now()}`,
      category: '',
      role: '',
      quantity: 1,
      unit: language === 'de' ? 'Tage' : 'Days',
      pricePerUnit: 0,
      partnerId: selectedPartner,
    };

    setWpConfigs(prev => prev.map(wp =>
      wp.wpNumber === wpNumber
        ? { ...wp, costItems: [...wp.costItems, newItem] }
        : wp
    ));
  };

  const updateCostItem = (wpNumber: number, itemId: string, updates: Partial<CostItem>) => {
    setWpConfigs(prev => prev.map(wp =>
      wp.wpNumber === wpNumber
        ? {
            ...wp,
            costItems: wp.costItems.map(item =>
              item.id === itemId ? { ...item, ...updates } : item
            ),
          }
        : wp
    ));
  };

  const removeCostItem = (wpNumber: number, itemId: string) => {
    setWpConfigs(prev => prev.map(wp =>
      wp.wpNumber === wpNumber
        ? { ...wp, costItems: wp.costItems.filter(item => item.id !== itemId) }
        : wp
    ));
  };

  const updateWPLead = (wpNumber: number, partnerId: string) => {
    setWpConfigs(prev => prev.map(wp =>
      wp.wpNumber === wpNumber ? { ...wp, leadPartnerId: partnerId } : wp
    ));
  };

  const updateWP1Percent = (percent: number) => {
    setWpConfigs(prev => prev.map(wp =>
      wp.wpNumber === 1 ? { ...wp, budgetPercent: percent } : wp
    ));
  };

  const getCategoriesForWP = (wpNumber: number): { value: string; label: string }[] => {
    const lang = language === 'de' ? 'de' : 'en';
    switch (wpNumber) {
      case 2: return WP2_CATEGORIES[lang];
      case 3: return WP3_CATEGORIES[lang];
      case 4: return WP4_CATEGORIES[lang];
      case 5: return WP5_CATEGORIES[lang];
      default: return [];
    }
  };

  const getUnitForCategory = (category: string): string => {
    const daysUnits = ['researcher', 'technician', 'senior_expert', 'junior_researcher',
      'expert_adult_edu', 'expert_digital', 'expert_ai', 'expert_migration', 'content_dev',
      'trainer', 'moderator'];
    const personsUnits = ['flight_train', 'multiplier_event', 'catering'];
    const monthsUnits = ['software_license'];

    if (daysUnits.includes(category)) return language === 'de' ? 'Tage' : 'Days';
    if (personsUnits.includes(category)) return language === 'de' ? 'Personen' : 'Persons';
    if (monthsUnits.includes(category)) return language === 'de' ? 'Monate' : 'Months';
    return language === 'de' ? 'Stück' : 'Units';
  };

  const needsNestedCalculation = (category: string): boolean => ['hotel_food'].includes(category);
  const needsPersonsInput = (category: string): boolean => ['flight_train', 'hotel_food', 'catering'].includes(category);

  // Calculate totals
  const wp1Budget = wpConfigs.find(w => w.wpNumber === 1)?.budgetPercent || 0;
  const wp1Total = Math.round(totalLumpSum * wp1Budget / 100);
  const otherWPsTotal = wpConfigs.filter(w => w.wpNumber !== 1).reduce((sum, wp) =>
    sum + wp.costItems.reduce((itemSum, item) => itemSum + calculateItemTotal(item), 0), 0);
  const totalAllocated = wp1Total + otherWPsTotal;
  const remainingBudget = totalLumpSum - totalAllocated;
  const wp1OverLimit = wp1Budget > 20;

  // Partner budget distribution
  const budgetByPartner: Record<string, number> = {};
  consortium.forEach(p => { budgetByPartner[p.id] = 0; });

  // Add WP1 budget to coordinator
  const coordinator = consortium.find(p => p.id === coordinatorId);
  if (coordinator) {
    budgetByPartner[coordinator.id] = wp1Total;
  }

  // Add other WPs
  wpConfigs.filter(w => w.wpNumber !== 1).forEach(wp => {
    wp.costItems.forEach(item => {
      if (item.partnerId && budgetByPartner[item.partnerId] !== undefined) {
        budgetByPartner[item.partnerId] += calculateItemTotal(item);
      }
    });
  });

  // Get partner name helper
  const getPartnerName = (partnerId: string): string => {
    const partner = consortium.find(p => p.id === partnerId);
    return partner?.name || 'Unbekannt';
  };

  return (
    <div className="space-y-4">
      {/* Budget Overview */}
      <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-sm text-gray-500">{language === 'de' ? 'Gesamtbudget' : 'Total Budget'}</span>
              <p className="text-xl font-bold text-gray-900">€{totalLumpSum.toLocaleString()}</p>
            </div>
            <div className="h-10 w-px bg-gray-200" />
            <div>
              <span className="text-sm text-gray-500">{language === 'de' ? 'Vergeben' : 'Allocated'}</span>
              <p className="text-xl font-bold text-blue-600">€{totalAllocated.toLocaleString()}</p>
            </div>
            <div className="h-10 w-px bg-gray-200" />
            <div>
              <span className="text-sm text-gray-500">{language === 'de' ? 'Verbleibend' : 'Remaining'}</span>
              <p className={`text-xl font-bold ${remainingBudget === 0 ? 'text-green-600' : remainingBudget < 0 ? 'text-red-600' : 'text-orange-500'}`}>
                €{remainingBudget.toLocaleString()}
              </p>
            </div>
          </div>
          {remainingBudget === 0 && (
            <Badge className="bg-green-500 text-white">
              <Check className="h-4 w-4 mr-1" />
              {language === 'de' ? 'Budget komplett' : 'Budget complete'}
            </Badge>
          )}
        </div>

        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${totalAllocated > totalLumpSum ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${Math.min((totalAllocated / totalLumpSum) * 100, 100)}%` }}
          />
        </div>

        {wp1OverLimit && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
            <AlertTriangle className="h-4 w-4" />
            {language === 'de'
              ? `Managementkosten überschreiten 20%-Limit (aktuell: ${wp1Budget}%)`
              : `Management costs exceed 20% limit (current: ${wp1Budget}%)`}
          </div>
        )}
      </div>

      {/* Partner Budget Distribution */}
      <div className="bg-gray-50 rounded-xl p-4 border">
        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" />
          {language === 'de' ? 'Budget pro Partner' : 'Budget per Partner'}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {consortium.map(partner => {
            const partnerBudget = budgetByPartner[partner.id] || 0;
            const partnerPercent = (partnerBudget / totalLumpSum) * 100;
            const isWarning = partnerPercent > 50 || partnerBudget === 0;

            return (
              <div
                key={partner.id}
                className={`p-3 rounded-lg border ${isWarning ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white'}`}
              >
                <p className="text-sm font-medium text-gray-800 truncate">{partner.name}</p>
                <p className={`text-lg font-bold ${isWarning ? 'text-orange-600' : 'text-gray-900'}`}>
                  €{partnerBudget.toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">{partnerPercent.toFixed(1)}%</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* WP Cards */}
      {wpConfigs.map((wp) => {
        const wpDef = WP_DEFINITIONS.find(d => d.number === wp.wpNumber)!;
        const isExpanded = expandedWP === wp.wpNumber;
        const wpTotal = wp.wpNumber === 1 ? wp1Total : wp.costItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);
        const categories = getCategoriesForWP(wp.wpNumber);

        return (
          <Card key={wp.wpNumber} className={`border-2 ${isExpanded ? 'border-blue-300' : 'border-gray-200'}`}>
            {/* Header */}
            <div
              className="p-4 cursor-pointer flex items-center justify-between hover:bg-gray-50"
              onClick={() => setExpandedWP(isExpanded ? null : wp.wpNumber)}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">
                  WP{wp.wpNumber}
                </div>
                <div>
                  <p className="font-medium">{language === 'de' ? wpDef.titleDE : wpDef.title}</p>
                  <p className="text-sm text-gray-500">
                    €{wpTotal.toLocaleString()}
                    {wp.wpNumber === 1 && (
                      <span className={wp1OverLimit ? 'text-red-500 ml-2' : 'text-gray-400 ml-2'}>
                        ({wp.budgetPercent}% - max 20%)
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {wp.wpNumber !== 1 && (
                  <Badge variant="outline">{wp.costItems.length} {language === 'de' ? 'Posten' : 'items'}</Badge>
                )}
                {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
              </div>
            </div>

            {/* Content */}
            {isExpanded && (
              <CardContent className="border-t pt-4 space-y-4">
                {/* Lead Partner Selection */}
                <div className="flex items-center gap-4">
                  <Label className="w-32 font-medium">{language === 'de' ? 'Lead-Partner' : 'Lead Partner'}</Label>
                  <Select
                    value={wp.leadPartnerId}
                    onValueChange={(value) => updateWPLead(wp.wpNumber, value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder={language === 'de' ? 'Partner wählen...' : 'Select partner...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {consortium.map(partner => (
                        <SelectItem key={partner.id} value={partner.id}>
                          {partner.id === coordinatorId && '👑 '}{partner.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* WP1: Simple Percent Slider */}
                {wp.wpNumber === 1 ? (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <Label className="block mb-3 font-medium">
                      {language === 'de' ? 'Budget-Anteil' : 'Budget Share'}: {wp.budgetPercent}%
                      <span className="text-gray-500 ml-2">(€{wp1Total.toLocaleString()})</span>
                    </Label>
                    <input
                      type="range"
                      min="10"
                      max="20"
                      step="1"
                      value={wp.budgetPercent || 15}
                      onChange={(e) => updateWP1Percent(parseInt(e.target.value))}
                      className="w-full h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>10%</span>
                      <span>15%</span>
                      <span>20%</span>
                    </div>
                    <p className="text-sm text-blue-700 mt-3">
                      {language === 'de'
                        ? 'Beinhaltet: Koordination, Finanzmanagement, TPMs, Reporting, Qualitätssicherung'
                        : 'Includes: Coordination, Financial Management, TPMs, Reporting, Quality Assurance'}
                    </p>
                  </div>
                ) : (
                  /* WP2-5: Cost Items */
                  <div className="space-y-4">
                    {/* Partner Selection for new items - stays visible */}
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <Label className="block mb-2 text-sm font-medium text-purple-800">
                        {language === 'de' ? 'Partner für neue Kostenpositionen:' : 'Partner for new cost items:'}
                      </Label>
                      <Select
                        value={selectedPartnerForNewItem[wp.wpNumber] || wp.leadPartnerId || ''}
                        onValueChange={(value) => setSelectedPartnerForNewItem(prev => ({ ...prev, [wp.wpNumber]: value }))}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder={language === 'de' ? 'Partner wählen...' : 'Select partner...'} />
                        </SelectTrigger>
                        <SelectContent>
                          {consortium.map(partner => (
                            <SelectItem key={partner.id} value={partner.id}>
                              {partner.id === coordinatorId && '👑 '}{partner.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Existing Cost Items - grouped by partner */}
                    {wp.costItems.length > 0 && (
                      <div className="space-y-3">
                        {/* Group by partner */}
                        {Object.entries(
                          wp.costItems.reduce((acc, item) => {
                            const partnerId = item.partnerId || 'unassigned';
                            if (!acc[partnerId]) acc[partnerId] = [];
                            acc[partnerId].push(item);
                            return acc;
                          }, {} as Record<string, CostItem[]>)
                        ).map(([partnerId, items]) => (
                          <div key={partnerId} className="border rounded-lg overflow-hidden">
                            {/* Partner Header */}
                            <div className="px-3 py-2 bg-gray-100 border-b">
                              <p className="font-medium text-sm">
                                {partnerId === 'unassigned'
                                  ? (language === 'de' ? '⚠️ Nicht zugewiesen' : '⚠️ Unassigned')
                                  : getPartnerName(partnerId)}
                              </p>
                            </div>

                            {/* Items for this partner */}
                            <div className="p-3 space-y-2 bg-white">
                              {items.map((item) => (
                                <div key={item.id} className="p-3 bg-gray-50 rounded-lg border space-y-2">
                                  <div className="grid grid-cols-12 gap-2 items-end">
                                    {/* Category */}
                                    <div className="col-span-4">
                                      <Label className="text-xs">{language === 'de' ? 'Kategorie' : 'Category'}</Label>
                                      <Select
                                        value={item.category}
                                        onValueChange={(value) => {
                                          updateCostItem(wp.wpNumber, item.id, {
                                            category: value,
                                            pricePerUnit: DEFAULT_RATES[value] || 0,
                                            unit: getUnitForCategory(value),
                                          });
                                        }}
                                      >
                                        <SelectTrigger>
                                          <SelectValue placeholder="..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {categories.map(cat => (
                                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {/* Quantity / Persons / Nights */}
                                    {needsNestedCalculation(item.category) ? (
                                      <>
                                        <div className="col-span-2">
                                          <Label className="text-xs">{language === 'de' ? 'Personen' : 'Persons'}</Label>
                                          <Input
                                            type="number"
                                            min="1"
                                            value={item.persons || ''}
                                            onChange={(e) => updateCostItem(wp.wpNumber, item.id, { persons: parseInt(e.target.value) || 0 })}
                                          />
                                        </div>
                                        <div className="col-span-2">
                                          <Label className="text-xs">{language === 'de' ? 'Nächte' : 'Nights'}</Label>
                                          <Input
                                            type="number"
                                            min="1"
                                            value={item.nights || ''}
                                            onChange={(e) => updateCostItem(wp.wpNumber, item.id, { nights: parseInt(e.target.value) || 0 })}
                                          />
                                        </div>
                                      </>
                                    ) : needsPersonsInput(item.category) ? (
                                      <div className="col-span-2">
                                        <Label className="text-xs">{language === 'de' ? 'Personen' : 'Persons'}</Label>
                                        <Input
                                          type="number"
                                          min="1"
                                          value={item.persons || item.quantity}
                                          onChange={(e) => updateCostItem(wp.wpNumber, item.id, {
                                            persons: parseInt(e.target.value) || 0,
                                            quantity: parseInt(e.target.value) || 0,
                                          })}
                                        />
                                      </div>
                                    ) : (
                                      <div className="col-span-2">
                                        <Label className="text-xs">{language === 'de' ? 'Menge' : 'Qty'}</Label>
                                        <Input
                                          type="number"
                                          min="1"
                                          value={item.quantity}
                                          onChange={(e) => updateCostItem(wp.wpNumber, item.id, { quantity: parseInt(e.target.value) || 0 })}
                                        />
                                      </div>
                                    )}

                                    {/* Price */}
                                    <div className={needsNestedCalculation(item.category) ? 'col-span-2' : 'col-span-3'}>
                                      <Label className="text-xs">€/{item.unit}</Label>
                                      <Input
                                        type="number"
                                        min="0"
                                        value={item.pricePerUnit}
                                        onChange={(e) => updateCostItem(wp.wpNumber, item.id, { pricePerUnit: parseInt(e.target.value) || 0 })}
                                      />
                                    </div>

                                    {/* Total & Delete */}
                                    <div className="col-span-2 flex items-center justify-end gap-2">
                                      <span className="font-bold text-sm">€{calculateItemTotal(item).toLocaleString()}</span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeCostItem(wp.wpNumber, item.id)}
                                        className="p-1 h-auto text-red-500 hover:text-red-700"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Item Button */}
                    <Button
                      variant="outline"
                      onClick={() => addCostItem(wp.wpNumber)}
                      className="w-full border-dashed"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {language === 'de' ? 'Kostenposition hinzufügen' : 'Add Cost Item'}
                      {selectedPartnerForNewItem[wp.wpNumber] && (
                        <span className="ml-2 text-purple-600">
                          ({getPartnerName(selectedPartnerForNewItem[wp.wpNumber])})
                        </span>
                      )}
                    </Button>
                  </div>
                )}

                {/* WP Total */}
                <div className="flex justify-end pt-2 border-t">
                  <div className="text-right">
                    <span className="text-sm text-gray-500">{language === 'de' ? 'WP Gesamt' : 'WP Total'}: </span>
                    <span className="text-xl font-bold">€{wpTotal.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
