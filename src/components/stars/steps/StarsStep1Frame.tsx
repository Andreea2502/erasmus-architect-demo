import React from 'react';
import {
    Lightbulb, Mic, MicOff, Sparkles, RefreshCw, Search, Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { getBedarfsanalysePrompt, getBestPracticesPrompt, SECTORS, ERASMUS_PRIORITIES } from '@/lib/concept-prompts';
import { copyToClipboard } from '@/lib/concept-helpers';
import { EU_POLICY_OPTIONS } from '@/types/stars-concept';
import { StarsConceptStore } from '@/store/stars-concept-store';

interface StarsStep1FrameProps {
    store: StarsConceptStore;
    enhanceIdea: () => Promise<void>;
    isEnhancing: boolean;
}

export function StarsStep1Frame({
    store,
    enhanceIdea,
    isEnhancing,
}: StarsStep1FrameProps) {
    const [isRecording, setIsRecording] = React.useState(false);

    const toggleRecording = () => {
        setIsRecording(prev => !prev);
    };

    const generateResearchPrompts = () => {
        store.updateState({ researchPromptsGenerated: true });
    };

    const toggleEuPolicy = (policyId: string) => {
        const current = store.euPolicyAlignment;
        if (current.includes(policyId)) {
            store.updateState({ euPolicyAlignment: current.filter(id => id !== policyId) });
        } else {
            store.updateState({ euPolicyAlignment: [...current, policyId] });
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <Lightbulb className="h-5 w-5 text-indigo-500" />
                    Schritt 1: Projektrahmen & Idee
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
            <div>
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

            {/* Budget & Duration */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Budget (&euro;)</label>
                    <Input
                        type="number"
                        value={store.budgetTier || (store.actionType === 'KA220' ? 250000 : 60000)}
                        onChange={e => store.updateState({ budgetTier: parseInt(e.target.value) || 0 })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Dauer (Monate)</label>
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
                            : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50'
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
                    placeholder={isRecording ? "Höre zu..." : "z.B. Irgendwas mit KI und Erwachsenenbildung, vielleicht ein Toolkit oder so..."}
                    className={`min-h-[100px] transition-all ${isRecording ? 'border-red-300 ring-2 ring-red-100 bg-red-50/10' : ''}`}
                />
                {isRecording && (
                    <p className="text-xs text-indigo-600 mt-2 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" />
                        Sprich deine Idee einfach ein. Die KI formuliert es danach professionell für dich um.
                    </p>
                )}
            </div>

            {/* Target Group */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Zielgruppe</label>
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

            {/* --- STARS-specific fields --- */}

            {/* Project Title (EN) */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Projekttitel (EN)</label>
                <Input
                    value={store.projectTitle}
                    onChange={e => store.updateState({ projectTitle: e.target.value })}
                    placeholder="z.B. Empowering Adult Educators Through AI Literacy"
                />
            </div>

            {/* Project Acronym (EN) */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Projekt-Akronym (EN)</label>
                <Input
                    value={store.projectAcronym}
                    onChange={e => store.updateState({ projectAcronym: e.target.value })}
                    placeholder="z.B. AI-EDUCATE"
                />
            </div>

            {/* EU Policy Alignment */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">EU Policy Alignment</label>
                <p className="text-xs text-gray-500 mb-3">
                    Wähle die EU-Politikbereiche, die zum Projekt passen (Mehrfachauswahl möglich).
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {EU_POLICY_OPTIONS.map(option => {
                        const isChecked = store.euPolicyAlignment.includes(option.id);
                        return (
                            <label
                                key={option.id}
                                className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-all text-sm ${
                                    isChecked
                                        ? 'border-indigo-400 bg-indigo-50 text-indigo-900'
                                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50 text-gray-700'
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => toggleEuPolicy(option.id)}
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <span>{option.labelDE}</span>
                            </label>
                        );
                    })}
                </div>
            </div>

            {/* Enhance Button */}
            {store.idea.trim().length > 10 && store.targetGroup.trim().length > 0 && store.problem.trim().length > 10 && !store.isEnhanced && (
                <Button
                    onClick={enhanceIdea}
                    disabled={isEnhancing}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white h-12 text-base"
                >
                    {isEnhancing ? (
                        <><RefreshCw className="h-5 w-5 animate-spin mr-2" /> Idee wird aufbereitet...</>
                    ) : (
                        <><Sparkles className="h-5 w-5 mr-2" /> Idee aufbereiten &amp; optimieren</>
                    )}
                </Button>
            )}

            {/* Enhanced Preview */}
            {store.isEnhanced && store.enhancedIdea && (
                <div className="space-y-4 pt-2">
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                                <Sparkles className="h-4 w-4" />
                                Aufbereitete Projektidee
                            </h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => store.updateState({ isEnhanced: false, enhancedIdea: '', enhancedProblem: '' })}
                                className="text-indigo-500 hover:text-indigo-700 text-xs"
                            >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Neu aufbereiten
                            </Button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <span className="text-xs font-semibold text-indigo-600 uppercase">Projektidee</span>
                                <p className="text-sm text-gray-800 mt-1 leading-relaxed">{store.enhancedIdea}</p>
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-indigo-600 uppercase">Problemstellung</span>
                                <p className="text-sm text-gray-800 mt-1 leading-relaxed">{store.enhancedProblem}</p>
                            </div>
                        </div>
                        <p className="text-xs text-indigo-500 mt-3 italic">
                            Diese aufbereitete Version wird in den Recherche-Prompts verwendet. Deine Originaltexte bleiben erhalten.
                        </p>
                    </div>
                </div>
            )}

            {/* Generate Prompts Button */}
            {store.idea && store.targetGroup && store.problem && store.isEnhanced && (
                <Button
                    onClick={generateResearchPrompts}
                    className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white h-12 text-base"
                >
                    <Search className="h-5 w-5 mr-2" />
                    Research-Prompts generieren
                </Button>
            )}

            {/* Research Prompts */}
            {store.researchPromptsGenerated && (
                <div className="space-y-6 pt-4 border-t">
                    <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                        <h3 className="font-bold text-indigo-900 flex items-center gap-2 mb-2">
                            <Search className="h-5 w-5" />
                            Deine Research-Prompts
                        </h3>
                        <p className="text-sm text-indigo-700">
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
                                onClick={() => copyToClipboard(getBedarfsanalysePrompt(store as any))}
                                className="border-blue-300 text-blue-700 hover:bg-blue-100"
                            >
                                <Copy className="h-4 w-4 mr-1" />
                                Kopieren
                            </Button>
                        </div>
                        <div className="p-4 bg-gray-50 max-h-[300px] overflow-y-auto">
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                                {getBedarfsanalysePrompt(store as any)}
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
                                onClick={() => copyToClipboard(getBestPracticesPrompt(store as any))}
                                className="border-purple-300 text-purple-700 hover:bg-purple-100"
                            >
                                <Copy className="h-4 w-4 mr-1" />
                                Kopieren
                            </Button>
                        </div>
                        <div className="p-4 bg-gray-50 max-h-[300px] overflow-y-auto">
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">
                                {getBestPracticesPrompt(store as any)}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
