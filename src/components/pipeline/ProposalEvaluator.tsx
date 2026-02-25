import React, { useState } from 'react';
import { PipelineState, EvaluationResult } from '@/lib/project-pipeline';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award, AlertCircle, CheckCircle2, FileText, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface ProposalEvaluatorProps {
    pipelineState: PipelineState;
    language?: string;
}

export function ProposalEvaluator({ pipelineState, language = 'de' }: ProposalEvaluatorProps) {
    const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

    const t = {
        evalBtn: language === 'de' ? 'Antrag gutachterlich prüfen' : 'Evaluate Proposal',
        evaluating: language === 'de' ? 'Prüfung läuft (ca. 30-60 Sekunden)...' : 'Evaluating (approx. 30-60 seconds)...',
        score: language === 'de' ? 'Gesamtpunkte' : 'Total Score',
        strengths: language === 'de' ? 'Stärken' : 'Strengths',
        weaknesses: language === 'de' ? 'Schwächen' : 'Weaknesses',
        suggestions: language === 'de' ? 'Gutachter-Empfehlungen zur Verbesserung:' : 'Evaluator Suggestions for Improvement:',
        categories: {
            relevance: language === 'de' ? 'Relevanz' : 'Relevance',
            design: language === 'de' ? 'Projektdesign & Umsetzung' : 'Project Design & Implementation',
            partnership: language === 'de' ? 'Partnerschaft & Kooperation' : 'Partnership & Cooperation',
            impact: language === 'de' ? 'Impact & Verbreitung' : 'Impact & Dissemination'
        }
    };

    const handleEvaluate = async () => {
        setIsEvaluating(true);
        setError(null);
        try {
            const response = await fetch('/api/evaluate-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pipelineState, language })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Evaluation failed');
            }

            const data = await response.json();
            setEvaluation(data);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Ein Fehler ist bei der Evaluierung aufgetreten.');
        } finally {
            setIsEvaluating(false);
        }
    };

    const toggleCategory = (cat: string) => {
        setExpandedCategory(expandedCategory === cat ? null : cat);
    };

    const getScoreColor = (score: number, max: number) => {
        const ratio = score / max;
        if (ratio >= 0.8) return 'text-green-600';
        if (ratio >= 0.6) return 'text-amber-500';
        return 'text-red-500';
    };

    const getScoreBgColor = (score: number, max: number) => {
        const ratio = score / max;
        if (ratio >= 0.8) return 'bg-green-600';
        if (ratio >= 0.6) return 'bg-amber-500';
        return 'bg-red-500';
    };

    if (!evaluation && !isEvaluating) {
        return (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                <Award className="w-16 h-16 text-slate-300 mb-4" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">Gutachter-Modus Simulator</h3>
                <p className="text-slate-500 text-center max-w-lg mb-6">
                    Lasse deinen gesamten Antrag von einer KI nach offiziellen EU-Kriterien (Relevanz, Design, Partnerschaft, Impact) analysieren und decke Schwachstellen vor der Einreichung auf.
                </p>
                <Button onClick={handleEvaluate} size="lg" className="bg-[#003399] hover:bg-[#002266]">
                    <FileText className="w-5 h-5 mr-2" />
                    {t.evalBtn}
                </Button>
                {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
            </div>
        );
    }

    if (isEvaluating) {
        return (
            <div className="flex flex-col items-center justify-center p-12 border rounded-xl bg-white shadow-sm">
                <Loader2 className="w-12 h-12 text-[#003399] animate-spin mb-4" />
                <h3 className="text-lg font-medium text-slate-700">{t.evaluating}</h3>
                <p className="text-slate-500 text-sm mt-2 text-center max-w-sm">
                    Der Antrag wird "gelesen" und nach den 4 EU-Bewertungskriterien evaluiert. Dies dauert einen Moment.
                </p>
            </div>
        );
    }

    if (!evaluation) return null;

    return (
        <div className="space-y-6">
            <Card className="border-t-4 border-t-[#003399] overflow-hidden">
                <div className="bg-slate-50 p-6 flex items-center justify-between border-b">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Evaluierungsbericht</h2>
                        <p className="text-slate-600 mt-1 max-w-2xl">{evaluation.overallFeedback}</p>
                    </div>
                    <div className="flex flex-col items-center justify-center bg-white rounded-full w-32 h-32 shadow-sm border-4 border-slate-100 relative">
                        <span className={`text-4xl font-black ${getScoreColor(evaluation.score, 100)}`}>
                            {evaluation.score}
                        </span>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">/ 100 Pkt</span>
                        <svg className="absolute top-0 left-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="46" fill="transparent" stroke="#f1f5f9" strokeWidth="8" />
                            <circle cx="50" cy="50" r="46" fill="transparent" stroke="currentColor" strokeWidth="8" strokeDasharray={`${(evaluation.score / 100) * 289} 289`} className={getScoreColor(evaluation.score, 100)} strokeLinecap="round" />
                        </svg>
                    </div>
                </div>

                <div className="p-0">
                    {(Object.entries(evaluation.categories) as [keyof typeof evaluation.categories, any][]).map(([key, data]) => {
                        const isExpanded = expandedCategory === key;
                        return (
                            <div key={key} className="border-b last:border-0 hover:bg-slate-50/50 transition-colors">
                                <button
                                    onClick={() => toggleCategory(key)}
                                    className="w-full text-left p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 focus:outline-none"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <h3 className="font-semibold text-lg text-slate-800">
                                                {t.categories[key]}
                                            </h3>
                                            <span className={`font-bold ${getScoreColor(data.score, data.maxScore)}`}>
                                                {data.score} / {data.maxScore}
                                            </span>
                                        </div>
                                        <Progress value={(data.score / data.maxScore) * 100} className="h-2" indicatorClassName={getScoreBgColor(data.score, data.maxScore)} />
                                    </div>
                                    <div className="flex-shrink-0 flex items-center justify-end text-slate-400">
                                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="px-6 pb-6 pt-2 select-text">
                                        <p className="text-slate-600 bg-slate-100 p-4 rounded-lg mb-4 text-sm leading-relaxed">
                                            {data.feedback}
                                        </p>
                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="bg-green-50/50 border border-green-100 rounded-lg p-4">
                                                <h4 className="flex items-center text-green-800 font-medium mb-3 text-sm">
                                                    <CheckCircle2 className="w-4 h-4 mr-2" />
                                                    {t.strengths}
                                                </h4>
                                                <ul className="space-y-2">
                                                    {data.strengths.map((str: string, i: number) => (
                                                        <li key={i} className="text-sm text-green-700 flex items-start">
                                                            <span className="mr-2 mt-1">•</span> <span>{str}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div className="bg-red-50/50 border border-red-100 rounded-lg p-4">
                                                <h4 className="flex items-center text-red-800 font-medium mb-3 text-sm">
                                                    <AlertCircle className="w-4 h-4 mr-2" />
                                                    {t.weaknesses}
                                                </h4>
                                                <ul className="space-y-2">
                                                    {data.weaknesses.map((wk: string, i: number) => (
                                                        <li key={i} className="text-sm text-red-700 flex items-start">
                                                            <span className="mr-2 mt-1">•</span> <span>{wk}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Card>

            <Card className="bg-amber-50/30 border-amber-200">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center text-amber-800">
                        <Award className="w-5 h-5 mr-2" />
                        {t.suggestions}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-3">
                        {evaluation.suggestions.map((suggestion, i) => (
                            <li key={i} className="flex items-start text-amber-900 bg-white p-3 rounded-lg border border-amber-100 shadow-sm">
                                <span className="font-bold text-amber-400 mr-3 mt-0.5">{i + 1}.</span>
                                <span className="text-sm leading-relaxed">{suggestion}</span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>

            <div className="flex justify-end pt-4">
                <Button onClick={handleEvaluate} variant="outline" className="text-slate-600">
                    Erneut prüfen
                </Button>
            </div>
        </div>
    );
}
