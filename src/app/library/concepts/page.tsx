"use client";

import React from 'react';
import { useAppStore } from '@/store/app-store';
import { useLanguageStore } from '@/store/language-store';
import { useConceptStore } from '@/store/concept-store';
import { useStarsConceptStore } from '@/store/stars-concept-store';
import { useRouter } from 'next/navigation';
import { Lightbulb, Trash2, ExternalLink, Star, Layers, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppShell } from '@/components/layout/AppShell';
import { SavedConcept } from '@/store/types';

// ============================================================================
// MODE CONFIG
// ============================================================================

const MODE_CONFIG = {
    stars: {
        badge: 'STARS',
        badgeClass: 'bg-indigo-100 text-indigo-700 border border-indigo-300',
        gradient: 'from-indigo-600 to-purple-600',
        icon: Star,
        labelDE: 'STARS Expose',
        labelEN: 'STARS Expose',
    },
    classic: {
        badge: 'Classic',
        badgeClass: 'bg-amber-100 text-amber-700 border border-amber-300',
        gradient: 'from-blue-600 to-indigo-600',
        icon: Layers,
        labelDE: 'Konzeptentwickler',
        labelEN: 'Concept Developer',
    },
};

// ============================================================================
// COMPONENT
// ============================================================================

export default function ConceptsLibraryPage() {
    const { language } = useLanguageStore();
    const { savedConcepts, deleteSavedConcept } = useAppStore();
    const router = useRouter();

    const getMode = (concept: SavedConcept) => concept.conceptMode || 'classic';

    const handleContinueToGenerator = (concept: SavedConcept) => {
        const mode = getMode(concept);

        if (mode === 'stars') {
            // Resume in STARS mode: load data into STARS concept store
            const starsStore = useStarsConceptStore.getState();
            starsStore.resetState();
            starsStore.updateState({
                idea: concept.initialIdea || concept.problemStatement,
                problem: concept.problemStatement,
                sector: concept.sector,
                actionType: concept.actionType,
                priorityFocus: concept.priority,
                projectTitle: concept.title,
                projectAcronym: concept.acronym,
                euPolicyAlignment: concept.starsData?.euPolicyAlignment || [],
                challengeNarrative: concept.starsData?.challengeNarrative || '',
                opportunityNarrative: concept.starsData?.opportunityNarrative || '',
                projectResponse: concept.starsData?.projectResponse || '',
                goals: concept.starsData?.goals || [],
                starsTargetGroups: concept.starsData?.starsTargetGroups || [],
                methodPrinciples: concept.starsData?.methodPrinciples || [],
                partnershipNarrative: concept.starsData?.partnershipNarrative || '',
                associatedPartners: concept.starsData?.associatedPartners || [],
                fullExpose: concept.starsData?.fullExpose || null,
                selectedPartners: (concept.partnerIds || []).map((id: string) => ({ partnerId: id, role: 'PARTNER' as const })),
                currentStep: 5, // Jump to summary/export
            });
            router.push('/projects/new?mode=stars');
        } else {
            // Classic mode: load data into classic concept store
            const { resetState, updateState } = useConceptStore.getState();
            resetState();
            updateState({
                idea: concept.initialIdea || concept.problemStatement,
                problem: concept.problemStatement,
                sector: concept.sector,
                actionType: concept.actionType,
                budgetTier: 250000,
                duration: concept.duration || 24,
                priorityFocus: concept.priority,
                selectedPartners: (concept.partnerIds || []).map((id: string) => ({ partnerId: id, role: 'PARTNER' as const })),
                detailedConcept: concept.detailedConcept || null,
                wpSuggestions: (concept.workPackages || []).map((wp: any) => ({
                    number: wp.number,
                    type: wp.type || 'OTHER',
                    title: wp.title,
                    description: wp.description,
                    lead: wp.lead || '',
                    activities: wp.activities || [],
                    deliverables: wp.deliverables || [],
                    duration: wp.duration || { start: 1, end: 24 },
                })),
                selectedWpNumbers: (concept.workPackages || []).map((wp: any) => wp.number),
                wpGenerated: !!(concept.workPackages?.length > 0),
                currentStep: 6, // Jump straight to summary / generator export
            });
            router.push('/projects/new?mode=classic');
        }
    };

    // Separate concepts by mode
    const starsConcepts = savedConcepts?.filter(c => getMode(c) === 'stars') || [];
    const classicConcepts = savedConcepts?.filter(c => getMode(c) === 'classic') || [];

    return (
        <AppShell>
            <div className="max-w-6xl mx-auto space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
                        <BookOpen className="h-8 w-8 text-indigo-500" />
                        {language === 'de' ? 'Konzept-Bibliothek' : 'Concept Library'}
                    </h1>
                    <p className="mt-2 text-gray-500">
                        {language === 'de'
                            ? 'Verwalte deine gespeicherten Projektkonzepte aus dem STARS Expose und dem Konzeptentwickler.'
                            : 'Manage your saved project concepts from the STARS Expose and Concept Developer.'}
                    </p>
                </div>

                {(!savedConcepts || savedConcepts.length === 0) ? (
                    <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">
                            {language === 'de' ? 'Keine Konzepte gespeichert' : 'No saved concepts'}
                        </h3>
                        <p className="mt-1 text-gray-500 max-w-sm mx-auto">
                            {language === 'de'
                                ? 'Nutze den STARS Expose oder den Konzeptentwickler, um Projektideen zu entwickeln und hier zu speichern.'
                                : 'Use the STARS Expose or Concept Developer to create and save project ideas here.'}
                        </p>
                        <Button onClick={() => router.push('/projects/new')} className="mt-4">
                            {language === 'de' ? 'Zum Konzeptentwickler' : 'Go to Concept Developer'}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* STARS Concepts Section */}
                        {starsConcepts.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Star className="h-5 w-5 text-indigo-500" />
                                    <h2 className="text-lg font-bold text-gray-900">
                                        STARS Expose ({starsConcepts.length})
                                    </h2>
                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full font-semibold border border-indigo-200">
                                        STARS
                                    </span>
                                </div>
                                <div className="grid gap-6 md:grid-cols-2">
                                    {starsConcepts.map(concept => (
                                        <ConceptCard
                                            key={concept.id}
                                            concept={concept}
                                            mode="stars"
                                            onDelete={deleteSavedConcept}
                                            onContinue={handleContinueToGenerator}
                                            language={language}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Classic Concepts Section */}
                        {classicConcepts.length > 0 && (
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <Layers className="h-5 w-5 text-amber-500" />
                                    <h2 className="text-lg font-bold text-gray-900">
                                        {language === 'de' ? 'Konzeptentwickler' : 'Concept Developer'} ({classicConcepts.length})
                                    </h2>
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-semibold border border-amber-200">
                                        Classic
                                    </span>
                                </div>
                                <div className="grid gap-6 md:grid-cols-2">
                                    {classicConcepts.map(concept => (
                                        <ConceptCard
                                            key={concept.id}
                                            concept={concept}
                                            mode="classic"
                                            onDelete={deleteSavedConcept}
                                            onContinue={handleContinueToGenerator}
                                            language={language}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppShell>
    );
}

// ============================================================================
// CONCEPT CARD COMPONENT
// ============================================================================

function ConceptCard({
    concept,
    mode,
    onDelete,
    onContinue,
    language,
}: {
    concept: SavedConcept;
    mode: 'stars' | 'classic';
    onDelete: (id: string) => void;
    onContinue: (concept: SavedConcept) => void;
    language: string;
}) {
    const config = MODE_CONFIG[mode];
    const Icon = config.icon;

    // For STARS, show goals count and methodology count
    const starsGoals = concept.starsData?.goals?.length || 0;
    const starsPrinciples = concept.starsData?.methodPrinciples?.length || 0;
    const hasExpose = !!(concept.starsData?.fullExpose);

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            {/* Header */}
            <div className={`bg-gradient-to-r ${config.gradient} px-5 py-4 text-white flex justify-between items-start gap-4`}>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold tracking-wider">
                            {concept.acronym}
                        </span>
                        <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
                            {concept.actionType}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            mode === 'stars'
                                ? 'bg-white/30 text-white'
                                : 'bg-white/30 text-white'
                        }`}>
                            <Icon className="h-3 w-3 inline mr-1 -mt-0.5" />
                            {config.badge}
                        </span>
                    </div>
                    <h3 className="font-bold text-lg leading-tight text-white/90 truncate">
                        {concept.title}
                    </h3>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                        if (window.confirm(
                            language === 'de'
                                ? 'Dieses Konzept wirklich loschen?'
                                : 'Really delete this concept?'
                        )) onDelete(concept.id);
                    }}
                    className="text-white/50 hover:text-white hover:bg-white/20 -mr-2 -mt-2 shrink-0"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-3 flex-1">
                <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                        {mode === 'stars' ? 'Challenge' : (language === 'de' ? 'Kernproblem' : 'Core Problem')}
                    </h4>
                    <p className="text-sm text-gray-700 line-clamp-2">
                        {concept.problemStatement}
                    </p>
                </div>
                <div>
                    <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                        Innovation
                    </h4>
                    <p className="text-sm text-gray-700 line-clamp-2">
                        {concept.innovation}
                    </p>
                </div>

                {/* STARS-specific stats */}
                {mode === 'stars' && (starsGoals > 0 || starsPrinciples > 0) && (
                    <div className="flex flex-wrap gap-2 pt-2">
                        {starsGoals > 0 && (
                            <span className="text-xs px-2 py-1 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                                {starsGoals} {language === 'de' ? 'Ziele' : 'Goals'}
                            </span>
                        )}
                        {starsPrinciples > 0 && (
                            <span className="text-xs px-2 py-1 rounded-full bg-purple-50 text-purple-600 font-medium">
                                {starsPrinciples} {language === 'de' ? 'Prinzipien' : 'Principles'}
                            </span>
                        )}
                        {hasExpose && (
                            <span className="text-xs px-2 py-1 rounded-full bg-green-50 text-green-600 font-medium">
                                {language === 'de' ? 'Expose vorhanden' : 'Expose complete'}
                            </span>
                        )}
                    </div>
                )}

                {/* Classic-specific stats */}
                {mode === 'classic' && concept.workPackages?.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-600 font-medium">
                            {concept.workPackages.length} Work Packages
                        </span>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-5 py-3 border-t flex justify-between items-center">
                <div className="text-xs text-gray-500 font-medium">
                    {language === 'de' ? 'Gespeichert am' : 'Saved on'} {new Date(concept.createdAt).toLocaleDateString()}
                </div>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onContinue(concept)}
                    className={mode === 'stars'
                        ? 'text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                        : 'text-amber-700 border-amber-200 hover:bg-amber-50'
                    }
                >
                    {mode === 'stars'
                        ? (language === 'de' ? 'Im STARS offnen' : 'Open in STARS')
                        : (language === 'de' ? 'Zum Generator' : 'Open in Generator')
                    }
                    <ExternalLink className="h-3 w-3 ml-1.5" />
                </Button>
            </div>
        </div>
    );
}
