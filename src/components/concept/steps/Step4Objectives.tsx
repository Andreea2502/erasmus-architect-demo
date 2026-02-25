import React from 'react';
import { Target, RefreshCw, Check, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConceptStore } from '@/store/concept-store';
import { useConceptGeneration } from '@/hooks/useConceptGeneration';
import { PromptInstructionInput } from '@/components/ui/PromptInstructionInput';
import { FeedbackMessage } from '@/components/ui/FeedbackMessage';

export function Step4Objectives() {
    const store = useConceptStore();
    const { isGenerating, generateObjectives, regenerateSingleObjective } = useConceptGeneration();

    const handleObjectiveTextChange = (id: string, text: string) => {
        store.updateField('objectives', store.objectives.map(o =>
            o.id === id ? { ...o, text } : o
        ));
    };

    const handleIndicatorChange = (objId: string, index: number, value: string) => {
        store.updateField('objectives', store.objectives.map(o => {
            if (o.id === objId) {
                const newInds = [...o.indicators];
                newInds[index] = value;
                return { ...o, indicators: newInds };
            }
            return o;
        }));
    };

    const toggleObjectiveSelection = (id: string) => {
        const isSelected = store.selectedObjectiveIds.includes(id);
        if (isSelected) {
            store.updateField('selectedObjectiveIds', store.selectedObjectiveIds.filter(selId => selId !== id));
        } else {
            store.updateField('selectedObjectiveIds', [...store.selectedObjectiveIds, id]);
        }
    };

    const toggleAllObjectives = () => {
        if (store.selectedObjectiveIds.length === store.objectives.length) {
            store.updateField('selectedObjectiveIds', []);
        } else {
            store.updateField('selectedObjectiveIds', store.objectives.map(o => o.id));
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <Target className="h-5 w-5 text-green-500" />
                    Schritt 4: SMART-Ziele & Ergebnisse
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                    Basierend auf deinen Quellen und dem Konzept werden SMART-Ziele definiert, die sich direkt auf deine Recherche beziehen.
                </p>
            </div>

            {!store.objectivesGenerated ? (
                <>
                    <PromptInstructionInput
                        value={store.additionalInstructions || ''}
                        onChange={(val) => store.updateState({ additionalInstructions: val })}
                    />
                    <Button
                        onClick={() => { store.updateState({ objectivesError: undefined }); generateObjectives(); }}
                        disabled={isGenerating}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white h-12 text-base"
                    >
                        {isGenerating ? (
                            <><RefreshCw className="h-5 w-5 animate-spin mr-2" /> Ziele werden definiert...</>
                        ) : (
                            <><Target className="h-5 w-5 mr-2" /> SMART-Ziele generieren</>
                        )}
                    </Button>

                    {store.objectivesError && (
                        <FeedbackMessage
                            type="error"
                            message={store.objectivesError}
                            onRetry={() => { store.updateState({ objectivesError: undefined }); generateObjectives(); }}
                            className="mt-4"
                        />
                    )}
                </>
            ) : (
                <div className="space-y-4">
                    {/* Selection counter */}
                    <div className="flex items-center justify-between px-1">
                        <span className="text-sm text-gray-500">
                            <strong className="text-green-600">{store.selectedObjectiveIds.length}</strong> von {store.objectives.length} Zielen ausgewählt
                        </span>
                        <button
                            onClick={toggleAllObjectives}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                            {store.selectedObjectiveIds.length === store.objectives.length ? 'Alle abwählen' : 'Alle auswählen'}
                        </button>
                    </div>

                    {store.objectives.map((obj, i) => {
                        const isSelected = store.selectedObjectiveIds.includes(obj.id);
                        return (
                            <div
                                key={obj.id}
                                onClick={() => toggleObjectiveSelection(obj.id)}
                                className={`rounded-xl border p-4 cursor-pointer transition-all ${isSelected
                                    ? 'border-green-300 bg-green-50/30'
                                    : 'border-dashed border-gray-300 opacity-50'
                                    }`}
                            >
                    <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-1 transition-colors ${isSelected ? 'border-green-500 bg-green-500' : 'border-gray-300'
                                        }`}>
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {i + 1}
                    </div>
                    <div className="flex-1">
                        <Input
                            value={obj.text}
                            onChange={(e) => handleObjectiveTextChange(obj.id, e.target.value)}
                            className="font-semibold text-gray-900 mb-2 w-full bg-transparent border-transparent hover:border-gray-300 focus:border-green-500 transition-colors"
                        />

                        {/* Indicators */}
                        <div className="mb-2">
                            <span className="text-xs font-semibold text-gray-500 uppercase">Indikatoren</span>
                            <ul className="mt-1 space-y-1">
                                {obj.indicators.map((ind, j) => (
                                    <li key={j} className="text-sm text-gray-600 flex items-center gap-1">
                                        <span className="text-green-500 mr-1">-</span>
                                        <Input
                                            value={ind}
                                            onChange={(e) => handleIndicatorChange(obj.id, j, e.target.value)}
                                            className="h-7 text-sm bg-transparent border-transparent hover:border-gray-300 focus:border-green-500 py-0 px-2 flex-1"
                                        />
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Sources */}
                        {obj.sources && obj.sources.length > 0 && (
                            <div className="mb-2">
                                <span className="text-xs font-semibold text-gray-500 uppercase">Quellenbelege</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {obj.sources.map((src, j) => (
                                        <span key={j} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                                            <BookOpen className="h-3 w-3" /> {src}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Footer (Priority & Actions) */}
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                            <div>
                                {obj.erasmusPriority && (
                                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded-full">
                                        {obj.erasmusPriority}
                                    </span>
                                )}
                            </div>

                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent toggling selection
                                    regenerateSingleObjective(obj.id);
                                }}
                                disabled={store.regeneratingObjectiveId === obj.id || isGenerating}
                                className="h-7 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            >
                                <RefreshCw className={`h-3 w-3 mr-1.5 ${store.regeneratingObjectiveId === obj.id ? 'animate-spin' : ''}`} />
                                {store.regeneratingObjectiveId === obj.id ? 'Generiert...' : 'Neu generieren'}
                            </Button>
                        </div>
                    </div>
                </div>
                            </div>
    );
})}

<Button
    onClick={generateObjectives}
    variant="outline"
    disabled={isGenerating}
    className="w-full"
>
    <RefreshCw className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
    Neu generieren
</Button>
                </div >
            )}
        </div >
    );
}
