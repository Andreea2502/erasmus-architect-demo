import React from 'react';
import {
    Lightbulb, Mic, MicOff, Sparkles, RefreshCw, Search, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getBedarfsanalysePrompt, getBestPracticesPrompt } from '@/lib/concept-prompts';
import { copyToClipboard } from '@/lib/concept-helpers';
import { useConceptStore } from '@/store/concept-store';
import { useConceptGeneration } from '@/hooks/useConceptGeneration';

interface Step1IdeaProps {
    language: string;
    isRecording: boolean;
    toggleRecording: () => void;
    SECTORS: { value: string; label: string }[];
    ERASMUS_PRIORITIES: { value: string; label: string }[];
}

export function Step1Idea({
    language,
    isRecording,
    toggleRecording,
    SECTORS,
    ERASMUS_PRIORITIES
}: Step1IdeaProps) {
    const store = useConceptStore();
    const { enhanceIdea, isGenerating } = useConceptGeneration();

    const generateResearchPrompts = () => {
        store.updateState({ researchPromptsGenerated: true });
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <Lightbulb className="h-5 w-5 text-amber-500" />
                    Schritt 1: Deine Projektidee
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                    Beschreibe deine Idee grob - daraus generieren wir Recherche-Prompts für eine fundierte Bedarfsanalyse.
                </p>
            </div>

            {/* Sector & Action Type */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Sektor</label>
                    <select
                        value={store.sector}
                        onChange={e => store.updateState({ sector: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                        {SECTORS.map(s => (
                            <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Aktionstyp</label>
                    <select
                        value={store.actionType}
                        onChange={e => store.updateState({ actionType: e.target.value })}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                        <option value="KA220">KA220 - Kooperationspartnerschaft</option>
                        <option value="KA210">KA210 - Kleine Partnerschaft</option>
                    </select>
                </div>
            </div>

            {/* Erasmus+ Priority Focus */}
            <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Erasmus+ Schwerpunkt (Priorität)</label>
                <select
                    value={store.priorityFocus || ''}
                    onChange={e => store.updateState({ priorityFocus: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                    {ERASMUS_PRIORITIES.map(p => (
                        <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                </select>
                {store.priorityFocus === 'Anderes' && (
                    <Input
                        className="mt-2"
                        placeholder="Bitte eigenen Schwerpunkt eintragen..."
                        onChange={e => store.updateState({ priorityFocus: e.target.value })}
                        autoFocus
                    />
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        {language === 'de' ? 'Budget (€)' : 'Budget (€)'}
                    </label>
                    <Input
                        type="number"
                        value={store.budgetTier || (store.actionType === 'KA220' ? 250000 : 60000)}
                        onChange={e => store.updateState({ budgetTier: parseInt(e.target.value) || 0 })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                        {language === 'de' ? 'Dauer (Monate)' : 'Duration (Months)'}
                    </label>
                    <Input
                        type="number"
                        value={store.duration || (store.actionType === 'KA210' ? 12 : 24)}
                        onChange={e => store.updateState({ duration: parseInt(e.target.value) || 0 })}
                    />
                </div>
            </div>

            {/* Idea */}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-semibold text-gray-700">
                        Projektidee - schreib einfach drauf los
                    </label>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleRecording}
                        className={`h-8 px-2 flex items-center gap-1.5 transition-colors ${isRecording
                            ? 'text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700'
                            : 'text-gray-500 hover:text-amber-600 hover:bg-amber-50'
                            }`}
                    >
                        {isRecording ? (
                            <>
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                </span>
                                <MicOff className="h-4 w-4" />
                                <span className="text-xs font-medium">Aufnahme stoppen</span>
                            </>
                        ) : (
                            <>
                                <Mic className="h-4 w-4" />
                                <span className="text-xs font-medium">Diktieren</span>
                            </>
                        )}
                    </Button>
                </div>
                <Textarea
                    value={store.idea}
                    onChange={e => store.updateState({ idea: e.target.value, isEnhanced: false, enhancedIdea: '', enhancedProblem: '' })}
                    placeholder={isRecording ? "Höre zu..." : "z.B. Irgendwas mit KI und Erwachsenenbildung, vielleicht ein Toolkit oder so, damit die Leute endlich KI im Unterricht nutzen können..."}
                    className={`min-h-[100px] transition-all ${isRecording ? 'border-red-300 ring-2 ring-red-100 bg-red-50/10' : ''}`}
                />
                {isRecording && (
                    <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Sprich deine Idee einfach ein. Die KI formuliert es danach professionell für dich um.
                    </p>
                )}
            </div>

            {/* Target Group */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Zielgruppe
                </label>
                <Input
                    value={store.targetGroup}
                    onChange={e => store.updateState({ targetGroup: e.target.value })}
                    placeholder="z.B. Erwachsenenbildner, Trainer, Lehrende in der Weiterbildung"
                />
            </div>

            {/* Problem */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Welches Problem soll gelöst werden?
                </label>
                <Textarea
                    value={store.problem}
                    onChange={e => store.updateState({ problem: e.target.value, isEnhanced: false, enhancedIdea: '', enhancedProblem: '' })}
                    placeholder="z.B. Die meisten Erwachsenenbildner haben keine Ahnung von KI und trauen sich da nicht ran..."
                    className="min-h-[100px]"
                />
            </div>

            {/* Enhance Button */}
            {store.idea.trim().length > 10 && store.targetGroup.trim().length > 0 && store.problem.trim().length > 10 && !store.isEnhanced && (
                <Button
                    onClick={enhanceIdea}
                    disabled={isGenerating}
                    className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white h-12 text-base"
                >
                    {isGenerating ? (
                        <><RefreshCw className="h-5 w-5 animate-spin mr-2" /> Idee wird aufbereitet...</>
                    ) : (
                        <><Sparkles className="h-5 w-5 mr-2" /> Idee aufbereiten &amp; optimieren</>
                    )}
                </Button>
            )}

            {/* Enhanced Preview */}
            {store.isEnhanced && store.enhancedIdea && (
                <div className="space-y-4 pt-2">
                    <div className="bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-violet-900 flex items-center gap-2">
                                <Sparkles className="h-4 w-4" />
                                Aufbereitete Projektidee
                            </h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => store.updateState({ isEnhanced: false, enhancedIdea: '', enhancedProblem: '' })}
                                className="text-violet-500 hover:text-violet-700 text-xs"
                            >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Neu aufbereiten
                            </Button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <span className="text-xs font-semibold text-violet-600 uppercase">Projektidee</span>
                                <p className="text-sm text-gray-800 mt-1 leading-relaxed">{store.enhancedIdea}</p>
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-violet-600 uppercase">Problemstellung</span>
                                <p className="text-sm text-gray-800 mt-1 leading-relaxed">{store.enhancedProblem}</p>
                            </div>
                        </div>
                        <p className="text-xs text-violet-500 mt-3 italic">
                            Diese aufbereitete Version wird in den Recherche-Prompts verwendet. Deine Originaltexte bleiben erhalten.
                        </p>
                    </div>
                </div>
            )}

            {/* Generate Prompts Button */}
            {store.idea && store.targetGroup && store.problem && store.isEnhanced && (
                <Button
                    onClick={generateResearchPrompts}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white h-12 text-base"
                >
                    <Search className="h-5 w-5 mr-2" />
                    Research-Prompts generieren
                </Button>
            )}

            {/* Research Prompts */}
            {store.researchPromptsGenerated && (
                <div className="space-y-6 pt-4 border-t">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <h3 className="font-bold text-amber-900 flex items-center gap-2 mb-2">
                            <Search className="h-5 w-5" />
                            Deine Research-Prompts
                        </h3>
                        <p className="text-sm text-amber-700">
                            Kopiere diese Prompts und verwende sie in Perplexity, ChatGPT oder einem anderen Research-Tool.
                            Lade die Ergebnisse anschließend in Schritt 2 hoch.
                        </p>
                    </div>

                    {/* Prompt 1: Bedarfsanalyse */}
                    <div className="border rounded-xl overflow-hidden">
                        <div className="bg-blue-50 px-4 py-3 flex items-center justify-between border-b">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm">1</div>
                                <div>
                                    <h4 className="font-bold text-blue-900">Bedarfsanalyse & Datenlage</h4>
                                    <p className="text-xs text-blue-600">Studien, Statistiken, EU-Daten</p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(getBedarfsanalysePrompt(store))}
                                className="border-blue-300 text-blue-700 hover:bg-blue-100"
                            >
                                <Copy className="h-4 w-4 mr-1" />
                                Kopieren
                            </Button>
                        </div>
                        <div className="p-4 bg-gray-50 max-h-[300px] overflow-y-auto">
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                                {getBedarfsanalysePrompt(store)}
                            </pre>
                        </div>
                    </div>

                    {/* Prompt 2: Best Practices */}
                    <div className="border rounded-xl overflow-hidden">
                        <div className="bg-purple-50 px-4 py-3 flex items-center justify-between border-b">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm">2</div>
                                <div>
                                    <h4 className="font-bold text-purple-900">Best Practices & Innovationslücke</h4>
                                    <p className="text-xs text-purple-600">Bestehende Projekte, Gap Analysis</p>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(getBestPracticesPrompt(store))}
                                className="border-purple-300 text-purple-700 hover:bg-purple-100"
                            >
                                <Copy className="h-4 w-4 mr-1" />
                                Kopieren
                            </Button>
                        </div>
                        <div className="p-4 bg-gray-50 max-h-[300px] overflow-y-auto">
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                                {getBestPracticesPrompt(store)}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
