import React from 'react';
import { Layers, RefreshCw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useConceptStore } from '@/store/concept-store';
import { useWorkPackageGeneration } from '@/hooks/useWorkPackageGeneration';
import { PromptInstructionInput } from '@/components/ui/PromptInstructionInput';
import { FeedbackMessage } from '@/components/ui/FeedbackMessage';

export function Step5WorkPackages() {
    const store = useConceptStore();
    const { isGenerating, generateWPStructure } = useWorkPackageGeneration();

    const toggleWpSelection = (wpNumber: number) => {
        const isSelected = store.selectedWpNumbers.includes(wpNumber);
        if (isSelected) {
            store.updateField('selectedWpNumbers', store.selectedWpNumbers.filter(num => num !== wpNumber));
        } else {
            const newSelections = [...store.selectedWpNumbers, wpNumber].sort((a, b) => a - b);
            store.updateField('selectedWpNumbers', newSelections);
        }
    };

    const toggleAllWps = () => {
        if (store.selectedWpNumbers.length === store.wpSuggestions.length) {
            store.updateField('selectedWpNumbers', []);
        } else {
            store.updateField('selectedWpNumbers', store.wpSuggestions.map(wp => wp.number));
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <Layers className="h-5 w-5 text-orange-500" />
                    Schritt 5: {store.actionType === 'KA210' ? 'Aktivitäten-Struktur' : 'Work Package Struktur'}
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                    {store.actionType === 'KA210'
                        ? 'Die Projektaktivitäten, Teilschritte und erwarteten Ergebnisse.'
                        : 'Die logische Struktur der Arbeitspakete, Aktivitäten und Deliverables.'}
                </p>
            </div>

            {!store.wpGenerated ? (
                <>
                    <PromptInstructionInput
                        value={store.additionalInstructions || ''}
                        onChange={(val) => store.updateState({ additionalInstructions: val })}
                    />
                    <Button
                        onClick={() => { store.updateState({ wpError: undefined }); generateWPStructure(); }}
                        disabled={isGenerating}
                        className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white h-12 text-base"
                    >
                        {isGenerating ? (
                            <><RefreshCw className="h-5 w-5 animate-spin mr-2" /> Struktur wird geplant...</>
                        ) : (
                            <><Layers className="h-5 w-5 mr-2" /> {store.actionType === 'KA210' ? 'Projekt-Schritte' : 'WP-Struktur'} generieren</>
                        )}
                    </Button>

                    {store.wpError && (
                        <FeedbackMessage
                            type="error"
                            message={store.wpError}
                            onRetry={() => { store.updateState({ wpError: undefined }); generateWPStructure(); }}
                            className="mt-4"
                        />
                    )}
                </>
            ) : (
                <div className="space-y-4">
                    {/* Selection counter */}
                    <div className="flex items-center justify-between px-1">
                        <span className="text-sm text-gray-500">
                            <strong className="text-orange-600">{store.selectedWpNumbers.length}</strong> von {store.wpSuggestions.length} Work Packages/Aktivitäten ausgewählt
                        </span>
                        <button
                            onClick={toggleAllWps}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                            {store.selectedWpNumbers.length === store.wpSuggestions.length ? 'Alle abwählen' : 'Alle auswählen'}
                        </button>
                    </div>

                    {store.wpSuggestions.map((wp) => {
                        const isKA210 = store.actionType === 'KA210';
                        const label = isKA210 ? `A${wp.number}` : `WP${wp.number}`;
                        const isSelected = store.selectedWpNumbers.includes(wp.number);

                        return (
                            <div
                                key={wp.number}
                                className={`rounded-xl border p-4 cursor-pointer transition-all ${isSelected
                                    ? (!isKA210 && wp.number === 1 ? 'border-amber-300 bg-amber-50' : 'border-orange-300 bg-orange-50/30')
                                    : 'border-dashed border-gray-300 opacity-50 bg-gray-50'}`}
                                onClick={() => toggleWpSelection(wp.number)}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        {/* Checkbox */}
                                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'}`}>
                                            {isSelected && <Check className="h-3 w-3 text-white" />}
                                        </div>

                                        <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
                                            {label}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{wp.title}</h4>
                                            <span className="text-xs text-gray-500">M{wp.duration.start}-M{wp.duration.end} | {wp.lead}</span>
                                        </div>
                                    </div>
                                    <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">{wp.type}</span>
                                </div>

                                <p className="text-sm text-gray-700 mb-3">{wp.description}</p>

                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <span className="font-semibold text-gray-500 uppercase">{isKA210 ? 'Teilschritte' : 'Aktivitäten'}</span>
                                        <ul className="mt-1 space-y-0.5">
                                            {wp.activities.map((a, j) => (
                                                <li key={j} className="text-gray-700 flex items-start gap-1">
                                                    <span className="text-orange-400">-</span> {a}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-gray-500 uppercase">{isKA210 ? 'Ergebnisse' : 'Deliverables'}</span>
                                        <ul className="mt-1 space-y-0.5">
                                            {wp.deliverables.map((d, j) => (
                                                <li key={j} className="text-gray-700 flex items-start gap-1">
                                                    <span className="text-green-400">-</span> {d}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
    );
})}

<Button
    onClick={generateWPStructure}
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
