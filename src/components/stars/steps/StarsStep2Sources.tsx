import React, { useRef } from 'react';
import {
    BookOpen, Upload, Plus, RefreshCw, AlertTriangle,
    Sparkles, CheckCircle2, X, FileText, Star, Check,
    ChevronDown, ChevronUp, Lightbulb, Zap, Network, Library,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ResearchSource } from '@/types/concept';
import { EU_POLICY_OPTIONS } from '@/types/stars-concept';
import { StarsConceptStore } from '@/store/stars-concept-store';

// ============================================================================
// CONCEPT CARD COLORS
// ============================================================================

const CONCEPT_COLORS = [
    {
        gradient: 'from-blue-500 to-cyan-500',
        border: 'border-blue-300',
        borderSelected: 'border-blue-500',
        bg: 'bg-blue-50',
        bgSelected: 'bg-blue-50/70',
        text: 'text-blue-700',
        badge: 'bg-blue-100 text-blue-800',
        icon: Lightbulb,
        label: 'Kapazitatsaufbau',
    },
    {
        gradient: 'from-purple-500 to-fuchsia-500',
        border: 'border-purple-300',
        borderSelected: 'border-purple-500',
        bg: 'bg-purple-50',
        bgSelected: 'bg-purple-50/70',
        text: 'text-purple-700',
        badge: 'bg-purple-100 text-purple-800',
        icon: Zap,
        label: 'Tool-/Ressourcen-Entwicklung',
    },
    {
        gradient: 'from-emerald-500 to-teal-500',
        border: 'border-emerald-300',
        borderSelected: 'border-emerald-500',
        bg: 'bg-emerald-50',
        bgSelected: 'bg-emerald-50/70',
        text: 'text-emerald-700',
        badge: 'bg-emerald-100 text-emerald-800',
        icon: Network,
        label: 'Systemischer Wandel',
    },
];

// ============================================================================
// PROPS
// ============================================================================

interface StarsStep2SourcesProps {
    store: StarsConceptStore;
    runAnalysis: (sourceId: string) => Promise<void>;
    handleFileUpload: (files: FileList) => Promise<void>;
    generateConceptProposals: () => Promise<void>;
    selectConceptProposal: (conceptId: string) => void;
    saveConceptProposal?: (concept: any) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function StarsStep2Sources({
    store,
    runAnalysis,
    handleFileUpload,
    generateConceptProposals,
    selectConceptProposal,
    saveConceptProposal,
}: StarsStep2SourcesProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const [expandedConceptId, setExpandedConceptId] = React.useState<string | null>(null);
    const [savedConceptIds, setSavedConceptIds] = React.useState<Set<string>>(new Set());

    const addSourceManually = () => {
        const newSource: ResearchSource = {
            id: `src_${Date.now()}`,
            title: '',
            content: '',
            type: 'study',
            isAnalyzed: false,
            isAnalyzing: false,
            isExtracting: false,
        };
        store.updateField('sources', [...store.sources, newSource]);
    };

    const updateSource = (id: string, updates: Partial<ResearchSource>) => {
        store.updateField('sources', store.sources.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const removeSource = (id: string) => {
        store.updateField('sources', store.sources.filter(s => s.id !== id));
    };

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFileUpload(e.target.files);
        }
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files);
        }
    };

    const analyzedCount = store.sources.filter(s => s.isAnalyzed).length;
    const totalStats = store.sources.reduce(
        (sum, s) => sum + (s.statistics?.length || 0), 0
    );
    const totalFindings = store.sources.reduce(
        (sum, s) => sum + (s.keyFindings?.length || 0), 0
    );

    const toggleExpanded = (id: string) => {
        setExpandedConceptId(prev => prev === id ? null : id);
    };

    const selectedConcept = store.conceptProposals.find(c => c.id === store.selectedConceptId);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <BookOpen className="h-5 w-5 text-indigo-500" />
                    Schritt 2: Recherche & Konzeptvorschlage
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                    Lade deine Recherche-Ergebnisse hoch, lass sie analysieren, und generiere dann 3 Konzeptvorschlage zur Auswahl.
                </p>
            </div>

            {/* ============================================================ */}
            {/* SOURCE UPLOAD / DROP ZONE                                    */}
            {/* ============================================================ */}
            <div
                ref={dropZoneRef}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`border-2 border-dashed rounded-xl p-6 transition-colors ${
                    isDragging
                        ? 'border-indigo-400 bg-indigo-50'
                        : 'border-indigo-200 bg-indigo-50/50'
                }`}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Upload className="h-5 w-5 text-indigo-500" />
                        Quellen ({store.sources.length})
                    </h3>
                    <div className="flex gap-2">
                        <label className="cursor-pointer">
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept=".txt,.md,.pdf,.docx,.doc"
                                onChange={onFileChange}
                                className="hidden"
                            />
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 cursor-pointer">
                                <Upload className="h-4 w-4" />
                                Dateien hochladen
                            </span>
                        </label>
                        <Button variant="outline" size="sm" onClick={addSourceManually}>
                            <Plus className="h-4 w-4 mr-1" />
                            Manuell
                        </Button>
                    </div>
                </div>

                {isDragging && (
                    <div className="text-center py-6 text-indigo-600 font-medium">
                        <FileText className="h-8 w-8 mx-auto mb-2" />
                        Dateien hier ablegen (PDF, DOCX, TXT, MD)
                    </div>
                )}

                {store.sources.length === 0 && !isDragging ? (
                    <p className="text-sm text-gray-400 text-center py-4">
                        Noch keine Quellen. Lade deine Recherche-Ergebnisse als PDF, DOCX oder TXT hoch,
                        oder fuge sie manuell per Copy-Paste hinzu.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {store.sources.map(source => (
                            <div key={source.id} className={`bg-white rounded-lg border p-4 ${
                                source.isAnalyzed ? 'border-green-300' :
                                source.error ? 'border-red-300' :
                                (source.isExtracting || source.isAnalyzing) ? 'border-indigo-300' :
                                'border-gray-200'
                            }`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Input
                                                value={source.title}
                                                onChange={e => updateSource(source.id, { title: e.target.value })}
                                                placeholder="Titel der Quelle..."
                                                className="font-semibold"
                                            />
                                            {source.fileType && (
                                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full uppercase shrink-0">
                                                    {source.fileType}
                                                </span>
                                            )}
                                        </div>

                                        {/* Extracting */}
                                        {source.isExtracting && (
                                            <div className="flex items-center gap-2 text-indigo-600 text-sm py-2">
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                                Text wird aus {source.fileType?.toUpperCase() || 'Datei'} extrahiert...
                                            </div>
                                        )}

                                        {/* Error */}
                                        {source.error && (
                                            <div className="bg-red-50 rounded-lg p-3 mb-2">
                                                <div className="flex items-center gap-2 text-red-700 text-sm">
                                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                                    <span>{source.error}</span>
                                                </div>
                                                {source.content && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => runAnalysis(source.id)}
                                                        className="mt-2 bg-red-600 hover:bg-red-700 text-white"
                                                    >
                                                        <RefreshCw className="h-3 w-3 mr-1" />
                                                        Erneut versuchen
                                                    </Button>
                                                )}
                                            </div>
                                        )}

                                        {/* Manual paste area */}
                                        {!source.content && !source.isExtracting && !source.error && (
                                            <Textarea
                                                value={source.content}
                                                onChange={e => updateSource(source.id, { content: e.target.value })}
                                                placeholder="Fuge hier den Inhalt der Recherche ein (Copy-Paste)..."
                                                className="min-h-[100px] text-sm"
                                            />
                                        )}

                                        {/* Analyzing */}
                                        {source.isAnalyzing && (
                                            <div className="flex items-center gap-2 text-indigo-600 text-sm py-2">
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                                Quelle wird analysiert...
                                                <span className="text-xs text-gray-400">({source.content.length.toLocaleString()} Zeichen)</span>
                                            </div>
                                        )}

                                        {/* Ready to analyze */}
                                        {source.content && !source.isAnalyzed && !source.isAnalyzing && !source.error && !source.isExtracting && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500">{source.content.length.toLocaleString()} Zeichen</span>
                                                <Button
                                                    size="sm"
                                                    onClick={() => runAnalysis(source.id)}
                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                                >
                                                    <Sparkles className="h-3 w-3 mr-1" />
                                                    Analysieren
                                                </Button>
                                            </div>
                                        )}

                                        {/* Analyzed */}
                                        {source.isAnalyzed && (
                                            <div className="mt-2 bg-green-50 rounded-lg p-3 space-y-3">
                                                <div className="flex items-center gap-1 text-green-700 text-xs font-semibold">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Analysiert
                                                    <span className="text-gray-400 font-normal ml-1">({source.content.length.toLocaleString()} Zeichen)</span>
                                                    {source.sourceInfo && (
                                                        <span className="text-gray-500 font-normal ml-2">
                                                            {[source.sourceInfo.authors, source.sourceInfo.institution, source.sourceInfo.year].filter(Boolean).join(', ')}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-700">{source.summary}</p>

                                                {/* Statistics */}
                                                {source.statistics && source.statistics.length > 0 && (
                                                    <div>
                                                        <div className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                            Statistiken & Daten ({source.statistics.length})
                                                        </div>
                                                        <div className="space-y-1">
                                                            {source.statistics.map((stat, i) => (
                                                                <div key={i} className="flex items-start gap-2 text-xs bg-blue-50 rounded px-2 py-1.5 border border-blue-100">
                                                                    <span className="font-bold text-blue-800 shrink-0">{stat.value}</span>
                                                                    <span className="text-gray-700">{stat.metric}</span>
                                                                    {stat.context && <span className="text-gray-400 shrink-0">({stat.context})</span>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Quotable Data */}
                                                {source.quotableData && source.quotableData.length > 0 && (
                                                    <div>
                                                        <div className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                            Zitierbare Evidenz ({source.quotableData.length})
                                                        </div>
                                                        <ul className="text-xs text-gray-700 space-y-1">
                                                            {source.quotableData.map((q, i) => (
                                                                <li key={i} className="bg-amber-50 rounded px-2 py-1.5 border border-amber-100 italic">
                                                                    &ldquo;{q}&rdquo;
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}

                                                {/* Key Findings */}
                                                {source.keyFindings && source.keyFindings.length > 0 && (
                                                    <div>
                                                        <div className="text-xs font-bold text-green-700 uppercase tracking-wider mb-1 flex items-center gap-1">
                                                            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                            Kernerkenntnisse ({source.keyFindings.length})
                                                        </div>
                                                        <ul className="text-xs text-gray-600 space-y-1">
                                                            {source.keyFindings.map((f, i) => (
                                                                <li key={i} className="flex items-start gap-1">
                                                                    <span className="text-green-500 mt-0.5 shrink-0">-</span>
                                                                    <span>{f}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeSource(source.id)}
                                        className="text-red-400 hover:text-red-600 hover:bg-red-50"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Summary */}
            {store.sources.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-indigo-800">
                        <CheckCircle2 className="h-4 w-4 text-indigo-500" />
                        <span className="font-medium">
                            {analyzedCount} Quellen analysiert — {totalStats} Statistiken, {totalFindings} Erkenntnisse
                        </span>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* CONCEPT PROPOSALS SECTION                                    */}
            {/* ============================================================ */}
            <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Star className="h-5 w-5 text-indigo-500" />
                            Konzeptvorschlage
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Die KI generiert 3 verschiedene Konzeptansatze basierend auf deiner Idee und den Quellen. Wahle einen aus, um damit weiterzuarbeiten.
                        </p>
                    </div>
                </div>

                {/* Generate Button */}
                {!store.conceptsGenerated && !store.isGeneratingConcepts && (
                    <Button
                        onClick={generateConceptProposals}
                        disabled={store.isGeneratingConcepts || !store.idea.trim()}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white h-14 text-base"
                    >
                        <Sparkles className="h-5 w-5 mr-2" />
                        3 Konzeptvorschlage generieren
                    </Button>
                )}

                {/* Generating State */}
                {store.isGeneratingConcepts && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 bg-indigo-50/50 rounded-xl border border-indigo-200">
                        <div className="relative">
                            <Star className="h-10 w-10 text-indigo-500 animate-spin" />
                        </div>
                        <p className="text-lg font-medium text-indigo-700">
                            Generiere 3 Konzeptvorschlage...
                        </p>
                        <p className="text-sm text-gray-500 text-center max-w-md">
                            Die KI erstellt 3 verschiedene Ansatze: Kapazitatsaufbau, Tool-Entwicklung und systemischer Wandel (ca. 20-40s)
                        </p>
                    </div>
                )}

                {/* Error */}
                {store.conceptError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm text-red-700">{store.conceptError}</p>
                        </div>
                        <Button
                            size="sm"
                            onClick={generateConceptProposals}
                            className="bg-red-600 hover:bg-red-700 text-white shrink-0"
                        >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Erneut
                        </Button>
                    </div>
                )}

                {/* Concept Cards */}
                {store.conceptsGenerated && store.conceptProposals.length > 0 && !store.isGeneratingConcepts && (
                    <div className="space-y-4">
                        <div className="space-y-4">
                            {store.conceptProposals.map((concept, index) => {
                                const colors = CONCEPT_COLORS[index % CONCEPT_COLORS.length];
                                const Icon = colors.icon;
                                const isSelected = concept.id === store.selectedConceptId;
                                const isExpanded = expandedConceptId === concept.id;
                                const policyLabels = concept.euPolicyAlignment
                                    .map(id => EU_POLICY_OPTIONS.find(p => p.id === id)?.labelDE || id)
                                    .filter(Boolean);

                                return (
                                    <div
                                        key={concept.id}
                                        className={`rounded-xl border-2 overflow-hidden transition-all duration-300 ${
                                            isSelected
                                                ? `${colors.borderSelected} ${colors.bgSelected} shadow-lg ring-2 ring-offset-1 ring-${colors.borderSelected.replace('border-', '')}/30`
                                                : `${colors.border} bg-white hover:shadow-md`
                                        }`}
                                    >
                                        {/* Card Header */}
                                        <div
                                            className={`bg-gradient-to-r ${colors.gradient} p-4 cursor-pointer`}
                                            onClick={() => toggleExpanded(concept.id)}
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                                                        <Icon className="h-5 w-5 text-white" />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-mono">
                                                                {concept.acronym}
                                                            </span>
                                                            <span className="bg-white/15 text-white/80 text-xs px-2 py-0.5 rounded-full">
                                                                {colors.label}
                                                            </span>
                                                            {isSelected && (
                                                                <span className="bg-white text-gray-800 text-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                                    <Check className="h-3 w-3" /> Ausgewahlt
                                                                </span>
                                                            )}
                                                        </div>
                                                        <h4 className="text-white font-bold text-sm mt-1 leading-tight">
                                                            {concept.title}
                                                        </h4>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {isExpanded
                                                        ? <ChevronUp className="h-5 w-5 text-white/70" />
                                                        : <ChevronDown className="h-5 w-5 text-white/70" />
                                                    }
                                                </div>
                                            </div>
                                        </div>

                                        {/* Card Body - Summary always visible */}
                                        <div className="p-4">
                                            <p className="text-sm text-gray-700 leading-relaxed">
                                                {concept.summary}
                                            </p>

                                            {/* Expanded Details */}
                                            {isExpanded && (
                                                <div className="mt-4 space-y-4 pt-4 border-t border-gray-100">
                                                    {/* Approach */}
                                                    <div>
                                                        <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Ansatz</h5>
                                                        <p className="text-sm text-gray-700">{concept.approach}</p>
                                                    </div>

                                                    {/* Innovation */}
                                                    <div>
                                                        <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Innovation</h5>
                                                        <p className="text-sm text-gray-700">{concept.innovation}</p>
                                                    </div>

                                                    {/* Outputs */}
                                                    <div>
                                                        <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Ergebnisse</h5>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {concept.mainOutputs.map((output, oi) => (
                                                                <span key={oi} className={`text-xs px-2.5 py-1 rounded-lg ${colors.badge}`}>
                                                                    {output}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* EU Policy Alignment */}
                                                    {policyLabels.length > 0 && (
                                                        <div>
                                                            <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">EU Policy Alignment</h5>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {policyLabels.map((label, pi) => (
                                                                    <span key={pi} className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                                                        {label}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Select + Save Buttons */}
                                            <div className="mt-4 flex items-center justify-between">
                                                {saveConceptProposal && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        disabled={savedConceptIds.has(concept.id)}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            saveConceptProposal(concept);
                                                            setSavedConceptIds(prev => new Set(prev).add(concept.id));
                                                        }}
                                                        className={
                                                            savedConceptIds.has(concept.id)
                                                                ? 'text-green-600 border-green-200'
                                                                : 'text-indigo-600 border-indigo-200 hover:bg-indigo-50'
                                                        }
                                                    >
                                                        {savedConceptIds.has(concept.id) ? (
                                                            <><Check className="h-3.5 w-3.5 mr-1" /> Gespeichert</>
                                                        ) : (
                                                            <><Library className="h-3.5 w-3.5 mr-1" /> In Bibliothek</>
                                                        )}
                                                    </Button>
                                                )}
                                                <Button
                                                    onClick={(e) => { e.stopPropagation(); selectConceptProposal(concept.id); }}
                                                    disabled={isSelected}
                                                    className={
                                                        isSelected
                                                            ? 'bg-gray-100 text-gray-500 cursor-default'
                                                            : `bg-gradient-to-r ${colors.gradient} hover:opacity-90 text-white`
                                                    }
                                                    size="sm"
                                                >
                                                    {isSelected ? (
                                                        <><Check className="h-4 w-4 mr-1" /> Ausgewahlt</>
                                                    ) : (
                                                        <><Star className="h-4 w-4 mr-1" /> Dieses Konzept wahlen</>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Regenerate Button */}
                        <div className="flex justify-center pt-2">
                            <Button
                                variant="outline"
                                onClick={generateConceptProposals}
                                disabled={store.isGeneratingConcepts}
                                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                            >
                                <RefreshCw className={`h-4 w-4 mr-2 ${store.isGeneratingConcepts ? 'animate-spin' : ''}`} />
                                Neue Konzeptvorschlage generieren
                            </Button>
                        </div>
                    </div>
                )}

                {/* Selected Concept Confirmation */}
                {selectedConcept && (
                    <div className="mt-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center shrink-0">
                                <Check className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-indigo-900">
                                    {selectedConcept.acronym} — {selectedConcept.title}
                                </p>
                                <p className="text-xs text-indigo-600 mt-0.5">
                                    Ausgewahlt als Grundlage fur das Expose. Titel, Akronym und EU-Policy werden automatisch ubernommen.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
