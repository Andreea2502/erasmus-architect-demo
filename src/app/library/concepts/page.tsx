"use client";

import React, { useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { useLanguageStore } from '@/store/language-store';
import { useConceptStore } from '@/store/concept-store';
import { useRouter } from 'next/navigation';
import { Lightbulb, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/layout/AppShell';

export default function ConceptsLibraryPage() {
    const { language } = useLanguageStore();
    const { savedConcepts, deleteSavedConcept } = useAppStore();
    const router = useRouter();

    const handleContinueToGenerator = (concept: any) => {
        const { resetState, updateState } = useConceptStore.getState();
        resetState();
        updateState({
            idea: concept.initialIdea || concept.problemStatement,
            problem: concept.problemStatement,
            sector: concept.sector,
            actionType: concept.actionType,
            budgetTier: concept.budgetBreakdown?.total || 250000,
            duration: concept.duration || 24,
            priorityFocus: concept.priority,
            selectedPartners: (concept.partnerIds || []).map((id: string) => ({ partnerId: id, role: 'partner' })),
            detailedConcept: concept.detailedConcept || null,
            wpSuggestions: concept.workPackages || [],
            selectedWpNumbers: (concept.workPackages || []).map((wp: any) => wp.number),
            wpGenerated: !!(concept.workPackages?.length > 0),
            currentStep: 6, // Jump straight to summary / generator export
        });

        router.push('/projects/new');
    };

    return (
        <AppShell>
            <div className="max-w-6xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                        <Lightbulb className="h-8 w-8 text-amber-500" />
                        {language === 'de' ? 'Gespeicherte Konzepte' : 'Saved Concepts'}
                    </h1>
                    <p className="mt-2 text-gray-500">
                        {language === 'de'
                            ? 'Verwalte deine entworfenen Projektkonzepte aus dem Concept Developer.'
                            : 'Manage your drafted project concepts from the Concept Developer.'}
                    </p>
                </div>

                <div className="space-y-4">
                    {(!savedConcepts || savedConcepts.length === 0) ? (
                        <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                            <Lightbulb className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900">Keine Konzepte gespeichert</h3>
                            <p className="mt-1 text-gray-500 max-w-sm mx-auto">
                                Nutze den Concept Developer, um verschiedene Projektideen und Konsortiums-Zusammenstellungen als Entwürfe zu speichern.
                            </p>
                            <Button onClick={() => window.location.href = '/projects/new'} className="mt-4">
                                Zum Concept Developer
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-6 md:grid-cols-2">
                            {savedConcepts.map((concept) => (
                                <div key={concept.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                                    {/* Header */}
                                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-4 text-white flex justify-between items-start gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold tracking-wider">
                                                    {concept.acronym}
                                                </span>
                                                <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
                                                    {concept.actionType}
                                                </span>
                                            </div>
                                            <h3 className="font-bold text-lg leading-tight text-white/90">
                                                {concept.title}
                                            </h3>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                if (window.confirm('Dieses Konzept wirklich löschen?')) deleteSavedConcept(concept.id);
                                            }}
                                            className="text-white/50 hover:text-white hover:bg-white/20 -mr-2 -mt-2 shrink-0"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    {/* Body */}
                                    <div className="p-5 space-y-4 flex-1">
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Kernproblem</h4>
                                            <p className="text-sm text-gray-700 line-clamp-2">{concept.problemStatement}</p>
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Innovation</h4>
                                            <p className="text-sm text-gray-700 line-clamp-2">{concept.innovation}</p>
                                        </div>
                                        <div className="pt-2 border-t mt-4">
                                            {/* Spacer */}
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="bg-gray-50 px-5 py-3 border-t flex justify-between items-center">
                                        <div className="text-xs text-gray-500 font-medium">
                                            Gespeichert am {new Date(concept.createdAt).toLocaleDateString()}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => window.location.href = '/projects/new'}
                                        >
                                            Zum Generator <ExternalLink className="h-3 w-3 ml-1.5" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppShell>
    );
}
