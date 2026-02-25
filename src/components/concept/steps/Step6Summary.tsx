import React from 'react';
import { Rocket, Target, Layers, FileText, RefreshCw, Globe, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConceptStore } from '@/store/concept-store';
import { useConceptGeneration } from '@/hooks/useConceptGeneration';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { exportToPDF } from '@/lib/concept-helpers';
import { PromptInstructionInput } from '@/components/ui/PromptInstructionInput';
import { FeedbackMessage } from '@/components/ui/FeedbackMessage';

const SECTORS = [
    { value: 'ADU', label: 'Erwachsenenbildung' },
    { value: 'VET', label: 'Berufsbildung' },
    { value: 'SCH', label: 'Schulbildung' },
    { value: 'YOU', label: 'Jugend' },
    { value: 'HED', label: 'Hochschulbildung' },
];

interface Step6SummaryProps {
    exportToPipeline: () => void;
}

export function Step6Summary({ exportToPipeline }: Step6SummaryProps) {
    const store = useConceptStore();
    const { generateDetailedConcept, translateConcept } = useConceptGeneration();

    const selectedConcept = store.concepts.find(c => c.id === store.selectedConceptId);

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <Rocket className="h-5 w-5 text-indigo-500" />
                    Schritt 6: Zusammenfassung & Export
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                    Dein fertiges Konzept auf einen Blick. Übernimm es direkt in die Antrags-Pipeline.
                </p>
            </div>

            {selectedConcept && (
                <div className="space-y-6">
                    {/* Concept Summary Card */}
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-indigo-500 text-white flex items-center justify-center font-bold text-lg">
                                {selectedConcept.acronym?.substring(0, 2)}
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{selectedConcept.title}</h3>
                                <span className="text-sm text-gray-500 font-mono">{selectedConcept.acronym} | {store.actionType} | {SECTORS.find(s => s.value === store.sector)?.label}</span>
                            </div>
                        </div>
                        <p className="text-gray-700">{selectedConcept.summary}</p>
                    </div>

                    {/* Quick Stats */}
                    <div className="grid grid-cols-4 gap-4">
                        <div className="bg-white rounded-xl border p-4 text-center">
                            <div className="text-2xl font-bold text-blue-600">{store.sources.length}</div>
                            <div className="text-xs text-gray-500">Quellen</div>
                        </div>
                        <div className="bg-white rounded-xl border p-4 text-center">
                            <div className="text-2xl font-bold text-purple-600">{store.selectedPartners.length}</div>
                            <div className="text-xs text-gray-500">Partner</div>
                        </div>
                        <div className="bg-white rounded-xl border p-4 text-center">
                            <div className="text-2xl font-bold text-green-600">
                                {store.objectives.filter(o => store.selectedObjectiveIds.includes(o.id)).length}
                            </div>
                            <div className="text-xs text-gray-500">Ziele</div>
                        </div>
                        <div className="bg-white rounded-xl border p-4 text-center">
                            <div className="text-2xl font-bold text-orange-600">
                                {store.wpSuggestions.filter(wp => store.selectedWpNumbers.includes(wp.number)).length}
                            </div>
                            <div className="text-xs text-gray-500">{store.actionType === 'KA210' ? 'Aktivitäten' : 'Work Packages'}</div>
                        </div>
                    </div>

                    {/* Objectives Summary */}
                    <div className="bg-white rounded-xl border p-4">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Target className="h-4 w-4 text-green-500" />
                            Projektziele
                        </h4>
                        <ul className="space-y-2">
                            {store.objectives.filter(o => store.selectedObjectiveIds.includes(o.id)).map((obj, i) => (
                                <li key={obj.id} className="text-sm text-gray-700 flex items-start gap-2">
                                    <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                                    {obj.text}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* WP / Activities Overview */}
                    <div className="bg-white rounded-xl border p-4">
                        <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <Layers className="h-4 w-4 text-orange-500" />
                            {store.actionType === 'KA210' ? 'Aktivitäten' : 'Work Packages'}
                        </h4>
                        <div className="space-y-2">
                            {store.wpSuggestions.filter(wp => store.selectedWpNumbers.includes(wp.number)).map(wp => (
                                <div key={wp.number} className="flex items-center gap-3 text-sm">
                                    <span className="w-10 h-8 rounded bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xs">
                                        {store.actionType === 'KA210' ?`A${wp.number}` : `WP${wp.number}`}
                                    </span>
                                    <span className="text-gray-700 flex-1">{wp.title}</span>
                                    <span className="text-gray-400 text-xs">M{wp.duration.start}-M{wp.duration.end}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Detailed Concept Generation */}
                    <div className="bg-white rounded-xl border p-4 sm:p-6 no-print">
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-blue-500" />
                                Detaillierter Konzeptentwurf (2-3 Seiten)
                            </span>
                            {store.detailedConcept && (
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={translateConcept}
                                        disabled={store.isTranslatingConcept}
                                        className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                                    >
                                        {store.isTranslatingConcept ? (
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Globe className="h-4 w-4 mr-2" />
                                        )}
                                        Auf Englisch übersetzen
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            const sectorLabel = SECTORS.find(s => s.value === store.sector)?.label || '';
                                            exportToPDF('pdf-print-area', selectedConcept?.title || 'Konzept', selectedConcept?.acronym || 'Kein Akronym', store.actionType, sectorLabel);
                                        }}
                                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                    >
                                        <FileText className="h-4 w-4 mr-2" />
                                        Als PDF speichern
                                    </Button>
                                </div>
                            )}
                        </h4>
                        <p className="text-sm text-gray-500 mb-6">
                            Erstelle aus deinen bisherigen Eingaben einen professionellen, zusammenhängenden Rohentwurf deines Konzeptes.
                        </p>

                        <PromptInstructionInput
                            value={store.additionalInstructions || ''}
                            onChange={(val) => store.updateState({ additionalInstructions: val })}
                        />

                        {!store.detailedConcept ? (
                            <Button
                                onClick={generateDetailedConcept}
                                disabled={store.isGeneratingDetailedConcept}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-base mt-2"
                            >
                                {store.isGeneratingDetailedConcept ? (
                                    <><RefreshCw className="h-5 w-5 animate-spin mr-2" /> Generiere Konzept-Dokument (ca. 30s)...</>
                                ) : (
                                    <><Sparkles className="h-5 w-5 mr-2" /> Konzeptentwurf generieren</>
                                )}
                            </Button>
                        ) : (
                            <div className="space-y-4 border rounded-xl overflow-hidden bg-gray-50 mt-4">
                                {store.isGeneratingDetailedConcept && (
                                    <div className="bg-blue-50 p-2 text-sm text-blue-700 font-medium flex items-center justify-center gap-2 border-b">
                                        <RefreshCw className="h-4 w-4 animate-spin" /> Konzept wird neu generiert...
                                    </div>
                                )}

                                <div className="p-6 max-h-[60vh] overflow-y-auto w-full prose prose-sm md:prose-base max-w-none text-gray-800">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {store.detailedConcept}
                                    </ReactMarkdown>
                                </div>

                                <div className="p-3 border-t bg-white flex justify-end gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={generateDetailedConcept}
                                        disabled={store.isGeneratingDetailedConcept}
                                        className="text-gray-500 hover:text-blue-600"
                                    >
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                        Mit neuen Anweisungen generieren
                                    </Button>
                                </div>
                            </div>
                        )}

                        {store.detailedConceptError && (
                            <FeedbackMessage
                                type="error"
                                message={store.detailedConceptError}
                                className="mt-4"
                            />
                        )}
                    </div>

                    {/* Print area for the iframe export */}
                    {store.detailedConcept && (
                        <div id="pdf-print-area" className="hidden">
                            <div className="text-3xl font-bold mb-6 border-b pb-4">{selectedConcept.title}</div>
                            <div className="text-sm text-gray-600 mb-8 font-mono">
                                {selectedConcept.acronym} | {store.actionType} | {SECTORS.find(s => s.value === store.sector)?.label}
                            </div>
                            <div className="prose max-w-none prose-indigo">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {store.detailedConcept}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}

                    <div className="relative flex items-center py-2 no-print mt-8">
                        <div className="flex-grow border-t border-gray-200"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">Bereit für den nächsten Schritt?</span>
                        <div className="flex-grow border-t border-gray-200"></div>
                    </div>

                    {/* Export Button - Visually demoted vs the Detailed Concept action */}
                    <Button
                        onClick={exportToPipeline}
                        variant="outline"
                        className="w-full text-gray-700 h-14 text-lg border-2 hover:bg-gray-50 no-print"
                    >
                        <ArrowRight className="h-5 w-5 mr-2 text-gray-400" />
                        Zur detaillierten Antrags-Entwicklung (Project Generator)
                    </Button>
                </div>
            )}
        </div>
    );
}
