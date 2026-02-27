"use client";

import React, { useState, useMemo } from 'react';
import { FileUp, FolderOpen, CheckCircle2, AlertCircle, Layers, Users, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useBudgetCalculatorStore } from '@/store/budget-calculator-store';
import { useAppStore } from '@/store/app-store';
import { getCountryProfile, COST_GROUP_META } from '@/lib/country-cost-profiles';

/**
 * BudgetImport – Allows importing a finished project (from generator) into the budget calculator.
 *
 * Two import modes:
 * 1. "Aus Projekt laden" – select from completed/in-progress projects
 * 2. (Future) "Text einfuegen" – paste application text for AI extraction
 *
 * After import, the user proceeds to BudgetDistribution for partner percentages.
 */

interface BudgetImportProps {
    onImportComplete: () => void;
    onCancel: () => void;
}

export function BudgetImport({ onImportComplete, onCancel }: BudgetImportProps) {
    const store = useBudgetCalculatorStore();
    const projects = useAppStore(s => s.projects);

    const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

    // Only show projects that have generatorState with at least WPs or consortium
    const importableProjects = useMemo(() => {
        return projects.filter(p => {
            const gs = p.generatorState;
            if (!gs) return false;
            // Must have at least consortium or work packages
            return (gs.consortium?.length > 0) || (gs.workPackages?.length > 0);
        }).sort((a, b) => {
            // Sort by last update, newest first
            const aDate = a.lastGeneratorUpdate || a.updatedAt || a.createdAt;
            const bDate = b.lastGeneratorUpdate || b.updatedAt || b.createdAt;
            return new Date(bDate).getTime() - new Date(aDate).getTime();
        });
    }, [projects]);

    const selectedProject = importableProjects.find(p => p.id === selectedProjectId);
    const selectedGS = selectedProject?.generatorState;

    const getProjectCompletionLabel = (gs: Record<string, unknown>): { label: string; color: string } => {
        const step = (gs.currentStep as number) || 0;
        const total = (gs.totalSteps as number) || 8;
        if (step >= total) return { label: 'Vollstaendig', color: 'bg-green-100 text-green-700' };
        if (step > 0) return { label: `Schritt ${step}/${total}`, color: 'bg-amber-100 text-amber-700' };
        return { label: 'Gestartet', color: 'bg-gray-100 text-gray-600' };
    };

    const handleImport = () => {
        if (!selectedGS) return;
        store.importFromProject(selectedGS);
        onImportComplete();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="text-center pb-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white mb-3">
                    <FileUp className="h-7 w-7" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">Projekt importieren</h2>
                <p className="text-sm text-gray-500 mt-1">
                    Lade einen fertigen oder teilweise generierten Antrag in den Budget-Rechner
                </p>
            </div>

            {/* Project Selection */}
            {importableProjects.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <AlertCircle className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">Keine importierbaren Projekte gefunden</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Generiere zuerst einen Antrag im Generator, dann kannst du ihn hier importieren.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-blue-500" />
                        Projekt auswaehlen ({importableProjects.length} verfuegbar)
                    </p>

                    <div className="grid gap-3 max-h-[400px] overflow-y-auto pr-1">
                        {importableProjects.map(project => {
                            const gs = project.generatorState;
                            const isSelected = selectedProjectId === project.id;
                            const completion = getProjectCompletionLabel(gs);
                            const partnerCount = gs.consortium?.length || 0;
                            const wpCount = gs.workPackages?.length || 0;
                            const actionType = gs.configuration?.actionType || gs.idea?.actionType || '—';
                            const budget = gs.configuration?.totalBudget || gs.budget?.totalBudget;

                            return (
                                <button
                                    key={project.id}
                                    onClick={() => setSelectedProjectId(project.id)}
                                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                                        isSelected
                                            ? 'border-blue-500 bg-blue-50 shadow-sm'
                                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                {gs.acronym && (
                                                    <span className="font-mono text-xs font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                                                        {gs.acronym}
                                                    </span>
                                                )}
                                                <Badge variant="outline" className="text-xs">{actionType}</Badge>
                                                <Badge className={`text-xs ${completion.color}`}>{completion.label}</Badge>
                                            </div>
                                            <p className="font-medium text-gray-900 truncate">
                                                {gs.projectTitle || project.title || 'Unbenanntes Projekt'}
                                            </p>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Users className="h-3 w-3" />
                                                    {partnerCount} Partner
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Layers className="h-3 w-3" />
                                                    {wpCount} WPs
                                                </span>
                                                {budget && (
                                                    <span>{Number(budget).toLocaleString('de-DE')} EUR</span>
                                                )}
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-1" />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Preview of selected project */}
            {selectedGS && (
                <Card className="border-blue-200 bg-blue-50/50">
                    <CardContent className="pt-5 space-y-3">
                        <p className="text-sm font-semibold text-blue-800">Import-Vorschau</p>

                        {/* Partners */}
                        {selectedGS.consortium?.length > 0 && (
                            <div>
                                <p className="text-xs font-medium text-gray-600 mb-1.5">Partner & Laendergruppen:</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedGS.consortium.map((p: { id: string; name: string; country: string; isLead?: boolean; role?: string }, i: number) => {
                                        const profile = getCountryProfile(p.country);
                                        const groupMeta = COST_GROUP_META[profile.group];
                                        return (
                                            <div key={p.id || i} className="flex items-center gap-1.5 text-xs bg-white rounded-lg px-2.5 py-1.5 border">
                                                <span className="font-medium">{p.name}</span>
                                                <Badge className={`${groupMeta.bgColor} ${groupMeta.color} text-[10px] px-1.5`}>
                                                    {p.country} · x{profile.staffMultiplier}
                                                </Badge>
                                                {(p.isLead || p.role === 'Coordinator' || i === 0) && (
                                                    <Badge className="bg-blue-600 text-white text-[10px] px-1.5">Lead</Badge>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Work Packages */}
                        {selectedGS.workPackages?.length > 0 && (
                            <div>
                                <p className="text-xs font-medium text-gray-600 mb-1.5">Arbeitspakete:</p>
                                <div className="space-y-1">
                                    {selectedGS.workPackages.map((wp: { number: number; title: string; activities?: unknown[]; deliverables?: unknown[] }, i: number) => (
                                        <div key={i} className="flex items-center gap-2 text-xs bg-white rounded px-2.5 py-1.5 border">
                                            <Badge variant="outline" className="font-mono text-[10px]">WP{wp.number}</Badge>
                                            <span className="text-gray-700">{wp.title}</span>
                                            {wp.activities && (
                                                <span className="text-gray-400 ml-auto">{wp.activities.length} Aktivitaeten</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3">
                <Button
                    variant="ghost"
                    onClick={onCancel}
                    className="text-gray-500"
                >
                    Zurueck
                </Button>
                <Button
                    onClick={handleImport}
                    disabled={!selectedGS}
                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white"
                >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Projekt importieren & Budget planen
                    <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
            </div>
        </div>
    );
}
