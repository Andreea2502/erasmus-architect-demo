import React from 'react';
import {
    BookOpen, Upload, Plus, RefreshCw, AlertTriangle,
    Sparkles, CheckCircle2, XCircle, X, Check, Scale, Trophy, ThumbsUp, ThumbsDown, Lightbulb, Star
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ResearchSource, ConceptProposal } from '@/types/concept';
import { useConceptStore } from '@/store/concept-store';
import { useConceptGeneration } from '@/hooks/useConceptGeneration';
import { PromptInstructionInput } from '@/components/ui/PromptInstructionInput';
import { FeedbackMessage } from '@/components/ui/FeedbackMessage';

interface Step2SourcesProps {
    handleSourceUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSaveConceptToLibrary: (conceptId: string, e: React.MouseEvent) => void;
}

export function Step2Sources({
    handleSourceUpload,
    handleSaveConceptToLibrary
}: Step2SourcesProps) {
    const store = useConceptStore();
    const { isGenerating, runAnalysis, generateConcepts, compareConcepts } = useConceptGeneration();

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

    const analyzeSource = (source: ResearchSource) => {
        runAnalysis(source.id, source.title, source.content);
    };

    const toggleConceptExpansion = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        store.updateField('concepts', store.concepts.map(c =>
            c.id === id ? { ...c, expanded: !c.expanded } : c
        ));
    };

    const selectConcept = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        store.updateState({
            selectedConceptId: id,
            concepts: store.concepts.map(c => ({
                ...c,
                selected: c.id === id,
            }))
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                    Schritt 2: Quellen hochladen & Konzepte generieren
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                    Lade deine Recherche-Ergebnisse hoch. Daraus werden 3 unterschiedliche Konzeptvorschläge generiert.
                </p>
            </div>

            {/* Source Upload */}
            <div className="border-2 border-dashed border-blue-200 rounded-xl p-6 bg-blue-50/50">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <Upload className="h-5 w-5 text-blue-500" />
                        Quellen ({store.sources.length})
                    </h3>
                    <div className="flex gap-2">
                        <label className="cursor-pointer">
                            <input
                                type="file"
                                multiple
                                accept=".txt,.md,.pdf,.docx,.doc"
                                onChange={handleSourceUpload}
                                className="hidden"
                            />
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 cursor-pointer">
                                <Upload className="h-4 w-4" />
                                Dateien hochladen
                            </span>
                        </label>
                        <Button variant="outline" size="sm" onClick={addSourceManually}>
                            <Plus className="h-4 w-4 mr-1" />
                            Manuell hinzufügen
                        </Button>
                    </div>
                </div>

                {store.sources.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">
                        Noch keine Quellen. Lade deine Recherche-Ergebnisse als PDF, DOCX oder TXT hoch,
                        oder füge sie manuell per Copy-Paste hinzu. Die Analyse startet automatisch.
                    </p>
                ) : (
                    <div className="space-y-3">
                        {store.sources.map(source => (
                            <div key={source.id} className={`bg-white rounded-lg border p-4 ${source.isAnalyzed ? 'border-green-300' :
                                source.error ? 'border-red-300' :
                                    (source.isExtracting || source.isAnalyzing) ? 'border-blue-300' :
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

                                        {/* Extrahierung läuft */}
                                        {source.isExtracting && (
                                            <div className="flex items-center gap-2 text-blue-600 text-sm py-2">
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                                Text wird aus {source.fileType?.toUpperCase() || 'Datei'} extrahiert...
                                            </div>
                                        )}

                                        {/* Fehler */}
                                        {source.error && (
                                            <div className="bg-red-50 rounded-lg p-3 mb-2">
                                                <div className="flex items-center gap-2 text-red-700 text-sm">
                                                    <AlertTriangle className="h-4 w-4 shrink-0" />
                                                    <span>{source.error}</span>
                                                </div>
                                                {source.content && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => analyzeSource(source)}
                                                        className="mt-2 bg-red-600 hover:bg-red-700 text-white"
                                                    >
                                                        <RefreshCw className="h-3 w-3 mr-1" />
                                                        Erneut versuchen
                                                    </Button>
                                                )}
                                            </div>
                                        )}

                                        {/* Manueller Paste-Bereich (nur für manuell hinzugefügte ohne Content) */}
                                        {!source.content && !source.isExtracting && !source.error && (
                                            <Textarea
                                                value={source.content}
                                                onChange={e => updateSource(source.id, { content: e.target.value })}
                                                placeholder="Füge hier den Inhalt der Recherche ein (Copy-Paste)..."
                                                className="min-h-[100px] text-sm"
                                            />
                                        )}

                                        {/* Analyse läuft */}
                                        {source.isAnalyzing && (
                                            <div className="flex items-center gap-2 text-blue-600 text-sm py-2">
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                                Quelle wird analysiert...
                                                <span className="text-xs text-gray-400">({source.content.length.toLocaleString()} Zeichen)</span>
                                            </div>
                                        )}

                                        {/* Content da, aber noch nicht analysiert und nicht gerade analysierend */}
                                        {source.content && !source.isAnalyzed && !source.isAnalyzing && !source.error && !source.isExtracting && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-gray-500">{source.content.length.toLocaleString()} Zeichen</span>
                                                <Button
                                                    size="sm"
                                                    onClick={() => analyzeSource(source)}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                                >
                                                    <Sparkles className="h-3 w-3 mr-1" />
                                                    Analysieren
                                                </Button>
                                            </div>
                                        )}

                                        {/* Analysiert */}
                                        {source.isAnalyzed && (
                                            <div className="mt-2 bg-green-50 rounded-lg p-3">
                                                <div className="flex items-center gap-1 text-green-700 text-xs font-semibold mb-1">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Analysiert
                                                    <span className="text-gray-400 font-normal ml-1">({source.content.length.toLocaleString()} Zeichen)</span>
                                                </div>
                                                <p className="text-sm text-gray-700 mb-2">{source.summary}</p>
                                                {source.keyFindings && (
                                                    <ul className="text-xs text-gray-600 space-y-1">
                                                        {source.keyFindings.map((f, i) => (
                                                            <li key={i} className="flex items-start gap-1">
                                                                <span className="text-green-500 mt-0.5">-</span>
                                                                <span>{f}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => removeSource(source.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Generate Concepts */}
            {store.sources.length > 0 && (
                <div className="mt-8">
                    {!store.conceptsGenerated && (
                        <PromptInstructionInput
                            value={store.additionalInstructions || ''}
                            onChange={(val) => store.updateState({ additionalInstructions: val })}
                        />
                    )}
                    <Button
                        onClick={() => { store.updateState({ conceptError: undefined }); generateConcepts(); }}
                        disabled={isGenerating}
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white h-12 text-base"
                    >
                        {isGenerating ? (
                            <><RefreshCw className="h-5 w-5 animate-spin mr-2" /> Konzepte werden generiert...</>
                        ) : (
                            <><Sparkles className="h-5 w-5 mr-2" /> 3 Konzeptvorschläge generieren</>
                        )}
                    </Button>
                </div>
            )}

            {/* Error Message */}
            {store.conceptError && (
                <FeedbackMessage 
                    type="error" 
                    message={store.conceptError} 
                    onRetry={() => { store.updateState({ conceptError: undefined }); generateConcepts(); }}
                    className="mt-4"
                />
            )}

            {/* Concept Proposals */}
            {store.concepts.length > 0 && (
                <div className="space-y-3 pt-4 border-t">
                    <h3 className="font-bold text-gray-900">Wähle ein Konzept aus:</h3>
                    {store.concepts.map((concept, i) => {
                        const colors = ['from-blue-500 to-blue-600', 'from-purple-500 to-purple-600', 'from-emerald-500 to-emerald-600'];
                        const bgColors = ['bg-blue-50 border-blue-400', 'bg-purple-50 border-purple-400', 'bg-emerald-50 border-emerald-400'];
                        const isExpanded = concept.expanded || concept.selected;

                        return (
                            <div
                                key={concept.id}
                                className={`rounded-xl border-2 overflow-hidden transition-all ${concept.selected
                                    ? bgColors[i % 3] + ' shadow-lg ring-2 ring-offset-1 ring-blue-400'
                                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md bg-white'
                                    }`}
                            >
                                {/* Kompakter Header mit Gradient */}
                                <div
                                    className={`bg-gradient-to-r ${colors[i % 3]} px-4 py-3 text-white cursor-pointer select-none`}
                                    onClick={(e) => toggleConceptExpansion(concept.id, e)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl font-black tracking-tight">{concept.acronym}</span>
                                            <span className="text-white/70 text-sm">|</span>
                                            <span className="text-sm text-white/90 font-medium truncate max-w-sm">{concept.title}</span>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleSaveConceptToLibrary(concept.id, e); }}
                                                className={`p-1.5 rounded-lg ${concept.savedForLater ? 'bg-white/30 text-yellow-200' : 'text-white/50 hover:text-white/80'}`}
                                                title={concept.savedForLater ? 'In Bibliothek gespeichert' : 'Für später speichern (Bibliothek)'}
                                            >
                                                {concept.savedForLater ? (
                                                    <CheckCircle2 className="h-4 w-4 text-white" />
                                                ) : (
                                                    <Star className="h-4 w-4" fill="none" />
                                                )}
                                            </button>
                                            {concept.selected && (
                                                <span className="px-2 py-0.5 bg-white/20 text-white text-xs rounded-full font-semibold">
                                                    Ausgewählt
                                                </span>
                                            )}
                                            {/* Expand/Collapse chevron */}
                                            <button className="text-white/70 hover:text-white ml-2">
                                                {isExpanded ? '▲' : '▼'}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Kompakter Body */}
                                <div className="px-4 py-3 space-y-4">
                                    <div
                                        className={`text-sm text-gray-700 cursor-pointer ${isExpanded ? 'whitespace-pre-line' : 'line-clamp-2'}`}
                                        onClick={(e) => toggleConceptExpansion(concept.id, e)}
                                    >
                                        <p className="mb-2"><strong>Problem:</strong> {concept.problemStatement}</p>
                                        <p className="mb-2"><strong>Innovation:</strong> {concept.innovation}</p>
                                        <p className="mb-2"><strong>Zusammenfassung:</strong> {concept.summary}</p>
                                        {isExpanded && (
                                            <>
                                                <p className="mb-2 font-semibold text-gray-900 mt-4">Warum dieses Konsortium?</p>
                                                <p>{concept.consortiumFit}</p>
                                            </>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap gap-1.5 items-center">
                                        {concept.mainOutputs?.slice(0, 3).map((o, j) => (
                                            <span key={j} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                                {o.length > 40 ? o.substring(0, 40) + '...' : o}
                                            </span>
                                        ))}
                                        {concept.erasmusPriorities?.slice(0, 2).map((p, j) => (
                                            <span key={`p${j}`} className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs rounded-full">
                                                {p.length > 35 ? p.substring(0, 35) + '...' : p}
                                            </span>
                                        ))}

                                        <div className="flex-1"></div>

                                        <Button
                                            variant={concept.selected ? "default" : "outline"}
                                            size="sm"
                                            onClick={(e) => selectConcept(concept.id, e)}
                                            className={concept.selected ? "bg-green-600 hover:bg-green-700" : ""}
                                        >
                                            {concept.selected ? (
                                                <><Check className="h-4 w-4 mr-1" /> Ausgewählt</>
                                            ) : (
                                                'Dieses Konzept wählen'
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Concept Comparison UI */}
            {store.concepts.length > 1 && (
                <div className="pt-6 mt-6 border-t border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                <Scale className="h-5 w-5 text-indigo-500" />
                                Konzepte vergleichen & bewerten
                            </h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Lass die KI die {store.concepts.length} Konzepte auf Machbarkeit, Innovationsgrad und Passgenauigkeit prüfen.
                            </p>
                        </div>
                        <Button
                            onClick={compareConcepts}
                            disabled={store.isComparingConcepts || isGenerating}
                            variant={store.conceptComparisonResult ? "outline" : "default"}
                            className={!store.conceptComparisonResult ? "bg-indigo-600 hover:bg-indigo-700 text-white" : ""}
                        >
                            {store.isComparingConcepts ? (
                                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Analysiert...</>
                            ) : (
                                <><Sparkles className="h-4 w-4 mr-2" /> KI-Bewertung starten</>
                            )}
                        </Button>
                    </div>

                    {store.compareConceptsError && (
                        <FeedbackMessage 
                            type="error" 
                            message={store.compareConceptsError} 
                            className="mt-4"
                        />
                    )}

                    {store.conceptComparisonResult && (
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-200 rounded-xl p-5 shadow-sm space-y-6">

                            {/* Overall Recommendation */}
                            <div className="bg-white rounded-lg p-4 border border-indigo-100 shadow-sm">
                                <div className="flex items-start gap-3">
                                    <div className="mt-1 bg-green-100 p-1.5 rounded-full">
                                        <Trophy className="h-5 w-5 text-green-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-base">Empfehlung der KI</h4>
                                        <p className="text-sm text-gray-700 mt-1 leading-relaxed">
                                            {store.conceptComparisonResult.overallSummary}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Individual Comparisons */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {store.conceptComparisonResult.comparisons?.map((comp: any, idx: number) => {
                                    const concept = store.concepts.find(c => c.id === comp.conceptId);
                                    const isRecommended = comp.conceptId === store.conceptComparisonResult.recommendationId;

                                    return (
                                        <div
                                            key={idx}
                                            className={`bg-white rounded-lg p-4 border transition-all ${isRecommended ? 'border-green-400 ring-2 ring-green-100 shadow-md' : 'border-gray-200 shadow-sm'}`}
                                        >
                                            <div className="flex items-center justify-between mb-3 border-b pb-2">
                                                <h5 className="font-bold text-gray-900 truncate pr-2" title={concept?.title || 'Konzept'}>
                                                    {concept?.acronym || `Konzept ${idx + 1}`}
                                                </h5>
                                                {isRecommended && (
                                                    <span className="bg-green-100 text-green-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shrink-0">
                                                        Favorit
                                                    </span>
                                                )}
                                            </div>

                                            <div className="space-y-3 test-sm">
                                                <div>
                                                    <h6 className="text-xs font-semibold text-green-700 flex items-center gap-1 mb-1">
                                                        <ThumbsUp className="h-3 w-3" /> Stärken
                                                    </h6>
                                                    <ul className="text-xs text-gray-700 space-y-1">
                                                        {comp.strengths?.map((s: string, i: number) => (
                                                            <li key={i} className="flex items-start gap-1">
                                                                <span className="text-green-500 mt-0.5">•</span> <span>{s}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <div>
                                                    <h6 className="text-xs font-semibold text-red-700 flex items-center gap-1 mb-1">
                                                        <ThumbsDown className="h-3 w-3" /> Schwächen
                                                    </h6>
                                                    <ul className="text-xs text-gray-700 space-y-1">
                                                        {comp.weaknesses?.map((w: string, i: number) => (
                                                            <li key={i} className="flex items-start gap-1">
                                                                <span className="text-red-500 mt-0.5">•</span> <span>{w}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <div className="pt-2 border-t mt-3">
                                                    <h6 className="text-xs font-semibold text-indigo-700 flex items-center gap-1 mb-1">
                                                        <Lightbulb className="h-3 w-3" /> Tipp zur Aufwertung
                                                    </h6>
                                                    <p className="text-xs text-gray-700 italic">
                                                        {comp.improvementTip}
                                                    </p>
                                                </div>
                                            </div>

                                            <Button
                                                variant={concept?.selected ? "default" : "outline"}
                                                size="sm"
                                                onClick={(e) => {
                                                    if (comp.conceptId) selectConcept(comp.conceptId, e as any);
                                                }}
                                                className={`w-full mt-4 ${concept?.selected ? "bg-green-600 hover:bg-green-700" : ""}`}
                                            >
                                                {concept?.selected ? (
                                                    <><Check className="h-4 w-4 mr-1" /> Ausgewählt</>
                                                ) : (
                                                    'Dieses wählen'
                                                )}
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
