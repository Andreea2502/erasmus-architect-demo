import React, { useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import {
    Layers, AlertTriangle, TrendingUp, Rocket, Target, Users, BookOpen,
    ChevronDown, ChevronRight, CheckCircle2, Loader2, Sparkles, RefreshCw,
    Trash2, Eye, EyeOff, AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StarsConceptStore } from '@/store/stars-concept-store';
import {
    StarsGoal,
    StarsTargetGroup,
    StarsMethodPrinciple,
    TARGET_GROUP_LEVEL_LABELS,
    TargetGroupLevel,
} from '@/types/stars-concept';

// ============================================================================
// TYPES
// ============================================================================

interface StarsStep4CoreProps {
    store: StarsConceptStore;
    generateChallenge: () => Promise<void>;
    generateOpportunity: () => Promise<void>;
    generateResponse: () => Promise<void>;
    generateGoals: () => Promise<void>;
    generateTargetGroups: () => Promise<void>;
    generateMethodology: () => Promise<void>;
}

type SectionStatus = 'empty' | 'loading' | 'complete' | 'error';

// ============================================================================
// SECTION CONFIGURATION
// ============================================================================

interface SectionConfig {
    id: number;
    title: string;
    subtitle: string;
    icon: React.ElementType;
    iconColor: string;
    bgColor: string;
    borderColor: string;
    badgeColor: string;
}

const SECTIONS: SectionConfig[] = [
    {
        id: 1,
        title: 'Die Herausforderung',
        subtitle: 'Tiefgehende Problemanalyse mit narrativem Essay-Stil',
        icon: AlertTriangle,
        iconColor: 'text-rose-500',
        bgColor: 'bg-rose-50',
        borderColor: 'border-rose-200',
        badgeColor: 'bg-rose-100 text-rose-700',
    },
    {
        id: 2,
        title: 'Die Chance',
        subtitle: 'Perspektivwechsel \u2014 was wird m\u00f6glich?',
        icon: TrendingUp,
        iconColor: 'text-emerald-500',
        bgColor: 'bg-emerald-50',
        borderColor: 'border-emerald-200',
        badgeColor: 'bg-emerald-100 text-emerald-700',
    },
    {
        id: 3,
        title: 'Die Projektantwort',
        subtitle: 'Was das Projekt konkret leistet',
        icon: Rocket,
        iconColor: 'text-blue-500',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        badgeColor: 'bg-blue-100 text-blue-700',
    },
    {
        id: 4,
        title: 'Projektziele',
        subtitle: 'Strategische Ziele mit Begr\u00fcndung und messbaren Ergebnissen',
        icon: Target,
        iconColor: 'text-amber-500',
        bgColor: 'bg-amber-50',
        borderColor: 'border-amber-200',
        badgeColor: 'bg-amber-100 text-amber-700',
    },
    {
        id: 5,
        title: 'Zielgruppen',
        subtitle: 'Hierarchische Zielgruppenanalyse in 4 Ebenen',
        icon: Users,
        iconColor: 'text-purple-500',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        badgeColor: 'bg-purple-100 text-purple-700',
    },
    {
        id: 6,
        title: 'Methodologischer Ansatz',
        subtitle: 'Benannte Prinzipien, die alle Projektaktivit\u00e4ten leiten',
        icon: BookOpen,
        iconColor: 'text-cyan-500',
        bgColor: 'bg-cyan-50',
        borderColor: 'border-cyan-200',
        badgeColor: 'bg-cyan-100 text-cyan-700',
    },
];

const TARGET_GROUP_LEVEL_COLORS: Record<TargetGroupLevel, string> = {
    PRIMARY: 'bg-indigo-100 text-indigo-800 border-indigo-300',
    SECONDARY: 'bg-blue-100 text-blue-800 border-blue-300',
    TERTIARY: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    QUATERNARY: 'bg-gray-100 text-gray-800 border-gray-300',
};

const TARGET_GROUP_BORDER_COLORS: Record<TargetGroupLevel, string> = {
    PRIMARY: 'border-l-indigo-400',
    SECONDARY: 'border-l-blue-400',
    TERTIARY: 'border-l-emerald-400',
    QUATERNARY: 'border-l-gray-400',
};

const PRINCIPLE_BORDER_COLORS = [
    'border-l-cyan-400',
    'border-l-teal-400',
    'border-l-indigo-400',
    'border-l-violet-400',
    'border-l-emerald-400',
    'border-l-blue-400',
    'border-l-amber-400',
    'border-l-rose-400',
];

// ============================================================================
// COMPONENT
// ============================================================================

export function StarsStep4Core({
    store,
    generateChallenge,
    generateOpportunity,
    generateResponse,
    generateGoals,
    generateTargetGroups,
    generateMethodology,
}: StarsStep4CoreProps) {
    const [expandedSection, setExpandedSection] = useState<number | null>(1);
    const [previewMode, setPreviewMode] = useState<Record<number, boolean>>({});

    // ========================================================================
    // STATUS HELPERS
    // ========================================================================

    const getSectionStatus = useCallback((sectionId: number): SectionStatus => {
        switch (sectionId) {
            case 1:
                if (store.challengeError) return 'error';
                if (store.isGeneratingChallenge) return 'loading';
                if (store.challengeNarrative.trim()) return 'complete';
                return 'empty';
            case 2:
                if (store.opportunityError) return 'error';
                if (store.isGeneratingOpportunity) return 'loading';
                if (store.opportunityNarrative.trim()) return 'complete';
                return 'empty';
            case 3:
                if (store.responseError) return 'error';
                if (store.isGeneratingResponse) return 'loading';
                if (store.projectResponse.trim()) return 'complete';
                return 'empty';
            case 4:
                if (store.goalsError) return 'error';
                if (store.isGeneratingGoals) return 'loading';
                if (store.goals.length > 0) return 'complete';
                return 'empty';
            case 5:
                if (store.targetGroupsError) return 'error';
                if (store.isGeneratingTargetGroups) return 'loading';
                if (store.starsTargetGroups.length > 0) return 'complete';
                return 'empty';
            case 6:
                if (store.methodologyError) return 'error';
                if (store.isGeneratingMethodology) return 'loading';
                if (store.methodPrinciples.length > 0) return 'complete';
                return 'empty';
            default:
                return 'empty';
        }
    }, [
        store.challengeNarrative, store.isGeneratingChallenge, store.challengeError,
        store.opportunityNarrative, store.isGeneratingOpportunity, store.opportunityError,
        store.projectResponse, store.isGeneratingResponse, store.responseError,
        store.goals, store.isGeneratingGoals, store.goalsError,
        store.starsTargetGroups, store.isGeneratingTargetGroups, store.targetGroupsError,
        store.methodPrinciples, store.isGeneratingMethodology, store.methodologyError,
    ]);

    const completedCount = SECTIONS.filter(s => getSectionStatus(s.id) === 'complete').length;

    const toggleSection = (sectionId: number) => {
        setExpandedSection(prev => (prev === sectionId ? null : sectionId));
    };

    const togglePreview = (sectionId: number) => {
        setPreviewMode(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
    };

    // ========================================================================
    // GOAL HELPERS
    // ========================================================================

    const updateGoal = useCallback((goalId: string, field: keyof StarsGoal, value: string) => {
        const updated = store.goals.map(g =>
            g.id === goalId ? { ...g, [field]: value } : g
        );
        store.updateField('goals', updated);
    }, [store]);

    const removeGoal = useCallback((goalId: string) => {
        const updated = store.goals
            .filter(g => g.id !== goalId)
            .map((g, idx) => ({ ...g, number: idx + 1 }));
        store.updateField('goals', updated);
    }, [store]);

    // ========================================================================
    // TARGET GROUP HELPERS
    // ========================================================================

    const updateTargetGroup = useCallback((tgId: string, field: keyof StarsTargetGroup, value: string) => {
        const updated = store.starsTargetGroups.map(tg =>
            tg.id === tgId ? { ...tg, [field]: value } : tg
        );
        store.updateField('starsTargetGroups', updated);
    }, [store]);

    // ========================================================================
    // METHOD PRINCIPLE HELPERS
    // ========================================================================

    const updatePrinciple = useCallback((pId: string, field: keyof StarsMethodPrinciple, value: string) => {
        const updated = store.methodPrinciples.map(p =>
            p.id === pId ? { ...p, [field]: value } : p
        );
        store.updateField('methodPrinciples', updated);
    }, [store]);

    // ========================================================================
    // STATUS INDICATOR
    // ========================================================================

    const renderStatusIndicator = (status: SectionStatus) => {
        switch (status) {
            case 'complete':
                return <CheckCircle2 className="h-4 w-4 text-green-500" />;
            case 'loading':
                return <Loader2 className="h-4 w-4 text-indigo-500 animate-spin" />;
            case 'error':
                return <AlertCircle className="h-4 w-4 text-red-500" />;
            default:
                return <div className="h-3 w-3 rounded-full bg-gray-300" />;
        }
    };

    // ========================================================================
    // ERROR DISPLAY
    // ========================================================================

    const renderError = (error: string | undefined) => {
        if (!error) return null;
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex items-center gap-2 mt-3">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                {error}
            </div>
        );
    };

    // ========================================================================
    // NARRATIVE SECTION RENDERER (for sections 1-3)
    // ========================================================================

    const renderNarrativeSection = (
        sectionId: number,
        value: string,
        isGenerating: boolean,
        error: string | undefined,
        onGenerate: () => Promise<void>,
        loadingLabel: string,
        generateLabel: string,
        regenerateLabel: string,
        fieldKey: 'challengeNarrative' | 'opportunityNarrative' | 'projectResponse',
        prerequisiteMet: boolean,
        prerequisiteHint?: string,
    ) => {
        if (!prerequisiteMet) {
            return (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                    <AlertCircle className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">{prerequisiteHint}</p>
                </div>
            );
        }

        if (isGenerating) {
            return (
                <div className="flex items-center justify-center gap-3 py-8">
                    <Loader2 className="h-5 w-5 text-indigo-500 animate-spin" />
                    <span className="text-sm text-indigo-600 font-medium">{loadingLabel}</span>
                </div>
            );
        }

        if (!value.trim()) {
            return (
                <>
                    <div className="flex justify-center py-6">
                        <Button
                            onClick={onGenerate}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 text-base"
                        >
                            <Sparkles className="h-5 w-5 mr-2" />
                            {generateLabel}
                        </Button>
                    </div>
                    {renderError(error)}
                </>
            );
        }

        const isPreview = previewMode[sectionId] || false;

        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => togglePreview(sectionId)}
                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition-colors"
                    >
                        {isPreview ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        {isPreview ? 'Bearbeiten' : 'Vorschau'}
                    </button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onGenerate}
                        disabled={isGenerating}
                        className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    >
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        {regenerateLabel}
                    </Button>
                </div>

                {isPreview ? (
                    <div className="prose prose-sm max-w-none bg-gray-50 rounded-lg border border-gray-200 p-4 min-h-[200px]">
                        <ReactMarkdown>{value}</ReactMarkdown>
                    </div>
                ) : (
                    <Textarea
                        value={value}
                        onChange={e => store.updateField(fieldKey, e.target.value)}
                        className="min-h-[280px] text-sm leading-relaxed font-mono"
                        rows={12}
                        placeholder={`${SECTIONS.find(s => s.id === sectionId)?.title}...`}
                    />
                )}

                {renderError(error)}
            </div>
        );
    };

    // ========================================================================
    // SECTION 4: GOALS TABLE
    // ========================================================================

    const renderGoalsSection = () => {
        if (store.isGeneratingGoals) {
            return (
                <div className="flex items-center justify-center gap-3 py-8">
                    <Loader2 className="h-5 w-5 text-amber-500 animate-spin" />
                    <span className="text-sm text-amber-600 font-medium">Generiere Projektziele...</span>
                </div>
            );
        }

        if (store.goals.length === 0) {
            return (
                <>
                    <div className="flex justify-center py-6">
                        <Button
                            onClick={generateGoals}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 text-base"
                        >
                            <Sparkles className="h-5 w-5 mr-2" />
                            Projektziele generieren
                        </Button>
                    </div>
                    {renderError(store.goalsError)}
                </>
            );
        }

        return (
            <div className="space-y-4">
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-amber-50 text-amber-900">
                                <th className="px-3 py-2.5 text-left font-semibold w-16">Nr.</th>
                                <th className="px-3 py-2.5 text-left font-semibold">Ziel</th>
                                <th className="px-3 py-2.5 text-left font-semibold">Begr&uuml;ndung (Rationale)</th>
                                <th className="px-3 py-2.5 text-left font-semibold">Messbares Ergebnis</th>
                                <th className="px-3 py-2.5 w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {store.goals.map((goal, idx) => (
                                <tr
                                    key={goal.id}
                                    className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                                >
                                    <td className="px-3 py-2 align-top">
                                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-bold text-xs">
                                            G{goal.number}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2 align-top">
                                        <Textarea
                                            value={goal.statement}
                                            onChange={e => updateGoal(goal.id, 'statement', e.target.value)}
                                            className="text-sm min-h-[60px] resize-y border-gray-200"
                                            rows={2}
                                        />
                                    </td>
                                    <td className="px-3 py-2 align-top">
                                        <Textarea
                                            value={goal.rationale}
                                            onChange={e => updateGoal(goal.id, 'rationale', e.target.value)}
                                            className="text-sm min-h-[60px] resize-y border-gray-200"
                                            rows={2}
                                        />
                                    </td>
                                    <td className="px-3 py-2 align-top">
                                        <Textarea
                                            value={goal.measurableOutcome}
                                            onChange={e => updateGoal(goal.id, 'measurableOutcome', e.target.value)}
                                            className="text-sm min-h-[60px] resize-y border-gray-200"
                                            rows={2}
                                        />
                                    </td>
                                    <td className="px-3 py-2 align-top">
                                        <button
                                            onClick={() => removeGoal(goal.id)}
                                            className="text-red-400 hover:text-red-600 p-1 transition-colors"
                                            title="Ziel entfernen"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={generateGoals}
                        disabled={store.isGeneratingGoals}
                        className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    >
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        Ziele neu generieren
                    </Button>
                </div>

                {renderError(store.goalsError)}
            </div>
        );
    };

    // ========================================================================
    // SECTION 5: TARGET GROUPS CARDS
    // ========================================================================

    const renderTargetGroupsSection = () => {
        if (store.isGeneratingTargetGroups) {
            return (
                <div className="flex items-center justify-center gap-3 py-8">
                    <Loader2 className="h-5 w-5 text-purple-500 animate-spin" />
                    <span className="text-sm text-purple-600 font-medium">Generiere Zielgruppenanalyse...</span>
                </div>
            );
        }

        if (store.starsTargetGroups.length === 0) {
            return (
                <>
                    <div className="flex justify-center py-6">
                        <Button
                            onClick={generateTargetGroups}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 text-base"
                        >
                            <Sparkles className="h-5 w-5 mr-2" />
                            Zielgruppen generieren
                        </Button>
                    </div>
                    {renderError(store.targetGroupsError)}
                </>
            );
        }

        return (
            <div className="space-y-4">
                <div className="grid gap-4">
                    {store.starsTargetGroups.map(tg => {
                        const levelLabel = TARGET_GROUP_LEVEL_LABELS[tg.level];
                        const levelColor = TARGET_GROUP_LEVEL_COLORS[tg.level];
                        const borderColor = TARGET_GROUP_BORDER_COLORS[tg.level];

                        return (
                            <div
                                key={tg.id}
                                className={`rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow border-l-4 ${borderColor}`}
                            >
                                <div className="p-4 space-y-3">
                                    {/* Level badge + Name */}
                                    <div className="flex items-center gap-3">
                                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${levelColor}`}>
                                            {levelLabel.de}
                                        </span>
                                        <input
                                            type="text"
                                            value={tg.name}
                                            onChange={e => updateTargetGroup(tg.id, 'name', e.target.value)}
                                            className="flex-1 font-semibold text-gray-900 text-sm bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-indigo-400 focus:outline-none px-1 py-0.5 transition-colors"
                                        />
                                    </div>

                                    {/* Fields grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                Beschreibung
                                            </label>
                                            <Textarea
                                                value={tg.description}
                                                onChange={e => updateTargetGroup(tg.id, 'description', e.target.value)}
                                                className="text-sm min-h-[50px] resize-y"
                                                rows={2}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                Merkmale & Bedarfe
                                            </label>
                                            <Textarea
                                                value={tg.characteristicsAndNeeds}
                                                onChange={e => updateTargetGroup(tg.id, 'characteristicsAndNeeds', e.target.value)}
                                                className="text-sm min-h-[50px] resize-y"
                                                rows={2}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                Rolle im Projekt
                                            </label>
                                            <Textarea
                                                value={tg.roleInProject}
                                                onChange={e => updateTargetGroup(tg.id, 'roleInProject', e.target.value)}
                                                className="text-sm min-h-[50px] resize-y"
                                                rows={2}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 mb-1">
                                                Gesch&auml;tzte Reichweite
                                            </label>
                                            <input
                                                type="text"
                                                value={tg.estimatedReach}
                                                onChange={e => updateTargetGroup(tg.id, 'estimatedReach', e.target.value)}
                                                className="w-full text-sm rounded-md border border-gray-200 px-3 py-2 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={generateTargetGroups}
                        disabled={store.isGeneratingTargetGroups}
                        className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    >
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        Neu generieren
                    </Button>
                </div>

                {renderError(store.targetGroupsError)}
            </div>
        );
    };

    // ========================================================================
    // SECTION 6: METHOD PRINCIPLES CARDS
    // ========================================================================

    const renderMethodologySection = () => {
        if (store.isGeneratingMethodology) {
            return (
                <div className="flex items-center justify-center gap-3 py-8">
                    <Loader2 className="h-5 w-5 text-cyan-500 animate-spin" />
                    <span className="text-sm text-cyan-600 font-medium">Generiere methodologische Prinzipien...</span>
                </div>
            );
        }

        if (store.methodPrinciples.length === 0) {
            return (
                <>
                    <div className="flex justify-center py-6">
                        <Button
                            onClick={generateMethodology}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 text-base"
                        >
                            <Sparkles className="h-5 w-5 mr-2" />
                            Prinzipien generieren
                        </Button>
                    </div>
                    {renderError(store.methodologyError)}
                </>
            );
        }

        return (
            <div className="space-y-4">
                <div className="grid gap-3">
                    {store.methodPrinciples.map((principle, idx) => {
                        const borderColor = PRINCIPLE_BORDER_COLORS[idx % PRINCIPLE_BORDER_COLORS.length];

                        return (
                            <div
                                key={principle.id}
                                className={`rounded-lg border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow border-l-4 ${borderColor} p-4`}
                            >
                                <input
                                    type="text"
                                    value={principle.name}
                                    onChange={e => updatePrinciple(principle.id, 'name', e.target.value)}
                                    className="w-full font-bold text-gray-900 text-sm bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-indigo-400 focus:outline-none px-0 py-1 mb-2 transition-colors"
                                />
                                <Textarea
                                    value={principle.description}
                                    onChange={e => updatePrinciple(principle.id, 'description', e.target.value)}
                                    className="text-sm min-h-[70px] resize-y leading-relaxed"
                                    rows={3}
                                />
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-end">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={generateMethodology}
                        disabled={store.isGeneratingMethodology}
                        className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    >
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        Neu generieren
                    </Button>
                </div>

                {renderError(store.methodologyError)}
            </div>
        );
    };

    // ========================================================================
    // SECTION CONTENT DISPATCH
    // ========================================================================

    const renderSectionContent = (sectionId: number) => {
        switch (sectionId) {
            case 1:
                return renderNarrativeSection(
                    1,
                    store.challengeNarrative,
                    store.isGeneratingChallenge,
                    store.challengeError,
                    generateChallenge,
                    'Generiere narrativen Essay...',
                    'Herausforderung generieren',
                    'Neu generieren',
                    'challengeNarrative',
                    true,
                );
            case 2:
                return renderNarrativeSection(
                    2,
                    store.opportunityNarrative,
                    store.isGeneratingOpportunity,
                    store.opportunityError,
                    generateOpportunity,
                    'Generiere Chancen-Narrativ...',
                    'Chance generieren',
                    'Neu generieren',
                    'opportunityNarrative',
                    store.challengeNarrative.trim().length > 0,
                    'Bitte generiere zuerst die Herausforderung (Sektion 4.1), bevor du die Chance beschreibst.',
                );
            case 3:
                return renderNarrativeSection(
                    3,
                    store.projectResponse,
                    store.isGeneratingResponse,
                    store.responseError,
                    generateResponse,
                    'Generiere Projektantwort...',
                    'Projektantwort generieren',
                    'Neu generieren',
                    'projectResponse',
                    store.challengeNarrative.trim().length > 0 && store.opportunityNarrative.trim().length > 0,
                    'Bitte generiere zuerst die Herausforderung (4.1) und die Chance (4.2), bevor du die Projektantwort erstellst.',
                );
            case 4:
                return renderGoalsSection();
            case 5:
                return renderTargetGroupsSection();
            case 6:
                return renderMethodologySection();
            default:
                return null;
        }
    };

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-2">
                    <Layers className="h-5 w-5 text-indigo-500" />
                    Schritt 4: Projektkern
                </h2>
                <p className="text-sm text-gray-500">
                    Das Herzst&uuml;ck deines STARS-Expos&eacute;s &mdash; 6 aufeinander aufbauende Sektionen.
                </p>
            </div>

            {/* Progress indicator */}
            <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-lg px-4 py-3">
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-indigo-900">
                            {completedCount} von 6 Sektionen fertig
                        </span>
                        <span className="text-xs text-indigo-600 font-medium">
                            {Math.round((completedCount / 6) * 100)}%
                        </span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-indigo-200">
                        <div
                            className="h-full rounded-full bg-indigo-500 transition-all duration-500 ease-out"
                            style={{ width: `${(completedCount / 6) * 100}%` }}
                        />
                    </div>
                </div>
                {completedCount === 6 && (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                )}
            </div>

            {/* Accordion sections */}
            <div className="space-y-3">
                {SECTIONS.map(section => {
                    const status = getSectionStatus(section.id);
                    const isExpanded = expandedSection === section.id;
                    const Icon = section.icon;

                    return (
                        <div
                            key={section.id}
                            className={`rounded-xl border transition-all duration-200 ${
                                isExpanded
                                    ? `${section.borderColor} shadow-sm`
                                    : 'border-gray-200 hover:border-gray-300'
                            }`}
                        >
                            {/* Section Header */}
                            <button
                                onClick={() => toggleSection(section.id)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-left"
                            >
                                <div className={`p-1.5 rounded-lg ${section.bgColor}`}>
                                    <Icon className={`h-4 w-4 ${section.iconColor}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${section.badgeColor}`}>
                                            4.{section.id}
                                        </span>
                                        <h3 className="font-semibold text-gray-900 text-sm truncate">
                                            {section.title}
                                        </h3>
                                    </div>
                                    {!isExpanded && (
                                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                                            {section.subtitle}
                                        </p>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {renderStatusIndicator(status)}
                                    {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-gray-400" />
                                    )}
                                </div>
                            </button>

                            {/* Section Content */}
                            {isExpanded && (
                                <div className="px-4 pb-4">
                                    <p className="text-xs text-gray-500 mb-4 italic">
                                        {section.subtitle}
                                    </p>
                                    {renderSectionContent(section.id)}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
