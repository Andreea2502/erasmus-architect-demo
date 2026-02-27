import React, { useState } from 'react';
import {
    Star, FileDown, Globe, ArrowRight, RefreshCw, Rocket,
    BookOpen, Users, Target, Layers, ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useStarsConceptStore } from '@/store/stars-concept-store';
import { useStarsGeneration } from '@/hooks/useStarsGeneration';
import { TARGET_GROUP_LEVEL_LABELS } from '@/types/stars-concept';
import { SECTORS } from '@/lib/concept-prompts';
import { FeedbackMessage } from '@/components/ui/FeedbackMessage';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// ============================================================================
// PROPS
// ============================================================================

interface StarsStep5SummaryProps {
    exportToPipeline: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function StarsStep5Summary({ exportToPipeline }: StarsStep5SummaryProps) {
    const store = useStarsConceptStore();
    const { generateFullExpose, translateExpose } = useStarsGeneration();

    const [sectionsOpen, setSectionsOpen] = useState(false);
    const [showInstructionInput, setShowInstructionInput] = useState(false);

    const sectorLabel = SECTORS.find(s => s.value === store.sector)?.label || store.sector;
    const duration = store.duration || (store.actionType === 'KA210' ? 12 : 24);
    const budget = store.budgetTier || (store.actionType === 'KA220' ? 250000 : 60000);

    // Resolve title/acronym from selected concept if not manually set
    const selectedConcept = store.conceptProposals.find(c => c.id === store.selectedConceptId);
    const displayTitle = store.projectTitle || selectedConcept?.title || 'Kein Projekttitel';
    const displayAcronym = store.projectAcronym || selectedConcept?.acronym || '';

    // ========================================================================
    // PDF EXPORT
    // ========================================================================

    const handlePdfExport = () => {
        const printContentEl = document.getElementById('stars-pdf-print-area');
        if (!printContentEl) return;

        const renderedHtml = printContentEl.innerHTML;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>${displayAcronym || displayTitle || 'STARS Expose'} - STARS Expose</title>
                    <style>
                        /* === BASE === */
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            max-width: 800px;
                            margin: 0 auto;
                            padding: 40px;
                            line-height: 1.65;
                            color: #1e293b;
                            font-size: 14px;
                        }

                        /* === HEADINGS === */
                        h1 { font-size: 1.8em; color: #003399; border-bottom: 3px solid #003399; padding-bottom: 0.4em; margin-bottom: 0.2em; }
                        h2 { font-size: 1.3em; color: #64748b; font-weight: 400; margin-top: 0.2em; margin-bottom: 1.2em; }
                        h3 {
                            font-size: 1.15em;
                            color: #003399;
                            margin-top: 2.2em;
                            margin-bottom: 0.8em;
                            padding-bottom: 0.35em;
                            border-bottom: 2px solid #e2e8f0;
                            text-transform: uppercase;
                            letter-spacing: 0.03em;
                            font-weight: 700;
                        }
                        h4 {
                            font-size: 0.95em;
                            margin-top: 1.6em;
                            margin-bottom: 0;
                            color: #ffffff;
                            background: #1e3a8a;
                            padding: 0.5em 0.9em;
                            border-radius: 6px 6px 0 0;
                            font-weight: 600;
                            letter-spacing: 0.01em;
                        }

                        /* === ALL TABLES — BASE === */
                        table {
                            width: 100%;
                            border-collapse: separate;
                            border-spacing: 0;
                            margin: 0 0 1.2em 0;
                            border: 1px solid #cbd5e1;
                            border-radius: 0 0 6px 6px;
                            overflow: hidden;
                            font-size: 0.93em;
                        }
                        th, td {
                            padding: 10px 16px;
                            text-align: left;
                            vertical-align: top;
                            border-bottom: 1px solid #e2e8f0;
                        }
                        tr:last-child td { border-bottom: none; }

                        /* Header row for data tables (consortium) */
                        th {
                            background: #1e3a8a;
                            color: #ffffff;
                            font-weight: 600;
                            font-size: 0.85em;
                            letter-spacing: 0.04em;
                            text-transform: uppercase;
                            padding: 11px 16px;
                        }

                        /* === HIDE EMPTY HEADERS (mini-tables: identification, goals, target groups) === */
                        thead tr th:empty {
                            background: none; border: none; padding: 0; height: 0;
                            font-size: 0; line-height: 0; overflow: hidden;
                        }
                        thead:has(th:empty) { display: none; }

                        /* === MINI-TABLE LABEL/VALUE COLUMN STYLING (default for all tables) === */
                        td:first-child {
                            width: 200px;
                            min-width: 170px;
                            font-weight: 600;
                            font-size: 0.88em;
                            color: #1e3a8a;
                            background: #eff6ff;
                            border-right: 1px solid #dbeafe;
                        }
                        td:last-child {
                            width: auto;
                            font-size: 0.88em;
                            line-height: 1.55;
                        }
                        tr:nth-child(odd) td:last-child { background: #ffffff; }
                        tr:nth-child(even) td:last-child { background: #f8fafc; }

                        /* Inline bullet points in table cells (• with <br>) */
                        td br { display: block; margin-top: 0.15em; }

                        /* Tight coupling: h4 heading flows directly into its table */
                        h4 + table { margin-top: 0; border-top: none; border-radius: 0 0 6px 6px; }

                        /* h4 NOT immediately before a table — reset to inline accent style */
                        h4:not(:has(+ table)) {
                            background: none;
                            color: #1e3a8a;
                            border-radius: 0;
                            padding: 0.3em 0 0.3em 0.7em;
                            border-left: 4px solid #2563eb;
                            margin-bottom: 0.5em;
                        }

                        /* === SECTION 1: IDENTIFICATION TABLE (1st table) === */
                        table:nth-of-type(1) {
                            border: 2px solid #1e3a8a;
                            border-radius: 6px;
                            margin-top: 1em;
                        }
                        table:nth-of-type(1) td:first-child {
                            width: 230px;
                            background: #1e3a8a;
                            color: #ffffff;
                            font-weight: 600;
                            border-right: 1px solid #2545a0;
                            font-size: 0.9em;
                        }
                        table:nth-of-type(1) td:last-child { font-weight: 500; color: #0f172a; }
                        table:nth-of-type(1) tr:nth-child(odd) td:last-child { background: #ffffff; }
                        table:nth-of-type(1) tr:nth-child(even) td:last-child { background: #f1f5f9; }

                        /* === SECTION 2: CONSORTIUM TABLE (2nd table, has visible headers) === */
                        table:nth-of-type(2) {
                            border-radius: 6px;
                            margin-top: 1em;
                            border: 1px solid #cbd5e1;
                        }
                        table:nth-of-type(2) td:first-child {
                            width: auto;
                            min-width: auto;
                            background: transparent;
                            color: #1e293b;
                            font-weight: 600;
                            border-right: none;
                            font-size: 0.93em;
                        }
                        table:nth-of-type(2) td { border-right: none; }
                        table:nth-of-type(2) tr:nth-child(odd) td { background: #ffffff; }
                        table:nth-of-type(2) tr:nth-child(even) td { background: #f1f5f9; }

                        /* === HORIZONTAL RULES === */
                        hr { border: none; border-top: 1px solid #e2e8f0; margin: 2em 0; }

                        /* === CONTENT ELEMENTS === */
                        ul, ol { padding-left: 1.5em; }
                        li { margin-bottom: 0.3em; }
                        li strong { color: #1e3a8a; }
                        blockquote {
                            border-left: 4px solid #2563eb;
                            padding: 0.7em 1em;
                            color: #475569;
                            margin: 1em 0;
                            background: #f8fafc;
                            border-radius: 0 6px 6px 0;
                        }
                        strong { color: #0f172a; }
                        p { margin: 0.6em 0; }

                        /* === PRINT === */
                        @media print {
                            body { padding: 0; }
                            @page { margin: 2cm; }
                            table { break-inside: avoid; }
                            h4 { break-after: avoid; }
                        }
                    </style>
                </head>
                <body>${renderedHtml}</body>
                </html>
            `);
            printWindow.document.close();
            setTimeout(() => {
                printWindow.focus();
                printWindow.print();
            }, 400);
        }
    };

    // ========================================================================
    // HELPERS
    // ========================================================================

    const truncate = (text: string, maxLen: number) => {
        if (!text) return '(nicht generiert)';
        return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
    };

    const primaryTargetGroups = store.starsTargetGroups.filter(tg => tg.level === 'PRIMARY');
    const secondaryTargetGroups = store.starsTargetGroups.filter(tg => tg.level === 'SECONDARY');
    const otherTargetGroups = store.starsTargetGroups.filter(
        tg => tg.level !== 'PRIMARY' && tg.level !== 'SECONDARY'
    );

    // ========================================================================
    // RENDER
    // ========================================================================

    return (
        <div className="space-y-6">
            {/* Step Header */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <Rocket className="h-5 w-5 text-indigo-500" />
                    Schritt 5: STARS Expose & Export
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                    Dein professionelles Projekt-Expose auf einen Blick. Generiere das vollstandige Dokument und exportiere es.
                </p>
            </div>

            {/* ============================================================ */}
            {/* PROJECT IDENTITY CARD                                        */}
            {/* ============================================================ */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-6 text-white">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-bold tracking-wide border-2 border-white/30">
                        {displayAcronym?.substring(0, 3) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold truncate">
                            {displayTitle}
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-indigo-200">
                            <span className="bg-white/15 px-2 py-0.5 rounded font-mono text-xs">
                                {displayAcronym || 'N/A'}
                            </span>
                            <span className="opacity-60">|</span>
                            <span>{store.actionType}</span>
                            <span className="opacity-60">|</span>
                            <span>{sectorLabel}</span>
                            <span className="opacity-60">|</span>
                            <span>{duration} Monate</span>
                            <span className="opacity-60">|</span>
                            <span>{budget.toLocaleString('de-DE')} EUR</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* ============================================================ */}
            {/* QUICK STATS GRID                                             */}
            {/* ============================================================ */}
            <div className="grid grid-cols-5 gap-3">
                <div className="bg-white rounded-xl border p-4 text-center">
                    <BookOpen className="h-4 w-4 mx-auto mb-1 text-emerald-500" />
                    <div className="text-2xl font-bold text-emerald-600">{store.sources.length}</div>
                    <div className="text-xs text-gray-500">Quellen</div>
                </div>
                <div className="bg-white rounded-xl border p-4 text-center">
                    <Users className="h-4 w-4 mx-auto mb-1 text-purple-500" />
                    <div className="text-2xl font-bold text-purple-600">{store.selectedPartners.length}</div>
                    <div className="text-xs text-gray-500">Partner</div>
                </div>
                <div className="bg-white rounded-xl border p-4 text-center">
                    <Target className="h-4 w-4 mx-auto mb-1 text-amber-500" />
                    <div className="text-2xl font-bold text-amber-600">{store.goals.length}</div>
                    <div className="text-xs text-gray-500">Ziele</div>
                </div>
                <div className="bg-white rounded-xl border p-4 text-center">
                    <Users className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                    <div className="text-2xl font-bold text-blue-600">{store.starsTargetGroups.length}</div>
                    <div className="text-xs text-gray-500">Zielgruppen</div>
                </div>
                <div className="bg-white rounded-xl border p-4 text-center">
                    <Layers className="h-4 w-4 mx-auto mb-1 text-teal-500" />
                    <div className="text-2xl font-bold text-teal-600">{store.methodPrinciples.length}</div>
                    <div className="text-xs text-gray-500">Methoden</div>
                </div>
            </div>

            {/* ============================================================ */}
            {/* SECTIONS OVERVIEW (COLLAPSIBLE)                              */}
            {/* ============================================================ */}
            <div className="bg-white rounded-xl border">
                <button
                    onClick={() => setSectionsOpen(!sectionsOpen)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors rounded-xl"
                >
                    <span className="font-semibold text-gray-900 flex items-center gap-2">
                        <Layers className="h-4 w-4 text-indigo-500" />
                        Sektionen-Ubersicht (Schritt 4)
                    </span>
                    {sectionsOpen
                        ? <ChevronUp className="h-4 w-4 text-gray-400" />
                        : <ChevronDown className="h-4 w-4 text-gray-400" />
                    }
                </button>

                {sectionsOpen && (
                    <div className="px-4 pb-4 space-y-4 border-t pt-4">
                        {/* Challenge */}
                        <div>
                            <h5 className="text-sm font-semibold text-gray-700 mb-1">Challenge</h5>
                            <p className="text-sm text-gray-500">{truncate(store.challengeNarrative, 200)}</p>
                        </div>

                        {/* Opportunity */}
                        <div>
                            <h5 className="text-sm font-semibold text-gray-700 mb-1">Opportunity</h5>
                            <p className="text-sm text-gray-500">{truncate(store.opportunityNarrative, 200)}</p>
                        </div>

                        {/* Project Response */}
                        <div>
                            <h5 className="text-sm font-semibold text-gray-700 mb-1">Project Response</h5>
                            <p className="text-sm text-gray-500">{truncate(store.projectResponse, 200)}</p>
                        </div>

                        {/* Goals */}
                        <div>
                            <h5 className="text-sm font-semibold text-gray-700 mb-1">Projektziele</h5>
                            {store.goals.length > 0 ? (
                                <ul className="space-y-1">
                                    {store.goals.map(g => (
                                        <li key={g.id} className="text-sm text-gray-500">
                                            <span className="font-medium text-gray-700">G{g.number}:</span> {g.statement}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-400 italic">(keine Ziele generiert)</p>
                            )}
                        </div>

                        {/* Target Groups */}
                        <div>
                            <h5 className="text-sm font-semibold text-gray-700 mb-1">Zielgruppen</h5>
                            {store.starsTargetGroups.length > 0 ? (
                                <p className="text-sm text-gray-500">
                                    {primaryTargetGroups.length > 0 && (
                                        <span>
                                            <span className="font-medium text-gray-700">
                                                {TARGET_GROUP_LEVEL_LABELS.PRIMARY.de}:
                                            </span>{' '}
                                            {primaryTargetGroups.map(tg => tg.name).join(', ')}
                                        </span>
                                    )}
                                    {secondaryTargetGroups.length > 0 && (
                                        <span>
                                            {primaryTargetGroups.length > 0 && ', '}
                                            <span className="font-medium text-gray-700">
                                                {TARGET_GROUP_LEVEL_LABELS.SECONDARY.de}:
                                            </span>{' '}
                                            {secondaryTargetGroups.map(tg => tg.name).join(', ')}
                                        </span>
                                    )}
                                    {otherTargetGroups.length > 0 && (
                                        <span>
                                            {(primaryTargetGroups.length > 0 || secondaryTargetGroups.length > 0) && ', '}
                                            {otherTargetGroups.map(tg => (
                                                <span key={tg.id}>
                                                    <span className="font-medium text-gray-700">
                                                        {TARGET_GROUP_LEVEL_LABELS[tg.level]?.de || tg.level}:
                                                    </span>{' '}
                                                    {tg.name}
                                                </span>
                                            ))}
                                        </span>
                                    )}
                                </p>
                            ) : (
                                <p className="text-sm text-gray-400 italic">(keine Zielgruppen generiert)</p>
                            )}
                        </div>

                        {/* Methodology */}
                        <div>
                            <h5 className="text-sm font-semibold text-gray-700 mb-1">Methodische Prinzipien</h5>
                            {store.methodPrinciples.length > 0 ? (
                                <ul className="space-y-1">
                                    {store.methodPrinciples.map(mp => (
                                        <li key={mp.id} className="text-sm text-gray-500">
                                            <span className="font-medium text-gray-700">{mp.name}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-gray-400 italic">(keine Methoden generiert)</p>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* ============================================================ */}
            {/* FULL STARS EXPOSE SECTION                                     */}
            {/* ============================================================ */}
            <div className="bg-white rounded-xl border p-4 sm:p-6 no-print">
                <h4 className="font-semibold text-gray-900 mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-indigo-500" />
                        Vollstandiges STARS Expose
                    </span>
                    {store.fullExpose && (
                        <div className="flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={translateExpose}
                                disabled={store.isTranslatingExpose}
                                className="text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                            >
                                {store.isTranslatingExpose ? (
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Globe className="h-4 w-4 mr-2" />
                                )}
                                Auf Englisch ubersetzen
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handlePdfExport}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                                <FileDown className="h-4 w-4 mr-2" />
                                Als PDF speichern
                            </Button>
                        </div>
                    )}
                </h4>
                <p className="text-sm text-gray-500 mb-6">
                    Das komplette Projekt-Expose wird aus allen Sektionen zusammengesetzt und professionell formatiert.
                </p>

                {/* Prompt Instructions */}
                {(!store.fullExpose || showInstructionInput) && (
                    <div className="mb-4 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                        <label className="block text-sm font-semibold text-indigo-900 mb-2">
                            Prompt-Anweisungen (Optional)
                        </label>
                        <p className="text-xs text-indigo-700 mb-3">
                            Zusatzliche Anweisungen fur die Generierung des Expose, z.B. bestimmte Schwerpunkte, Tonalitat oder fehlende Themen.
                        </p>
                        <Textarea
                            placeholder="z.B. 'Fokus auf Innovation und Digitalisierung', 'Formellerer Schreibstil'..."
                            value={store.additionalInstructions || ''}
                            onChange={(e) => store.updateState({ additionalInstructions: e.target.value })}
                            className="min-h-[80px] bg-white border-indigo-200 focus:border-indigo-400 focus:ring-indigo-400"
                        />
                    </div>
                )}

                {/* State 1: No expose generated yet */}
                {!store.fullExpose && !store.isGeneratingExpose && (
                    <Button
                        onClick={generateFullExpose}
                        disabled={store.isGeneratingExpose}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white h-14 text-base"
                    >
                        <Star className="h-5 w-5 mr-2" />
                        STARS Expose generieren
                    </Button>
                )}

                {/* State 1b: No expose, but generating */}
                {!store.fullExpose && store.isGeneratingExpose && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <Star className="h-10 w-10 text-indigo-500 animate-spin" />
                        <p className="text-lg font-medium text-indigo-700">
                            Assembliere STARS Expose...
                        </p>
                        <p className="text-sm text-gray-500">
                            Das komplette Projekt-Expose wird aus allen Sektionen zusammengesetzt (ca. 30-60s)
                        </p>
                    </div>
                )}

                {/* State 2: Expose exists */}
                {store.fullExpose && (
                    <div className="space-y-4 border rounded-xl overflow-hidden bg-gray-50 mt-4">
                        {/* Regenerating indicator */}
                        {store.isGeneratingExpose && (
                            <div className="bg-indigo-50 p-2 text-sm text-indigo-700 font-medium flex items-center justify-center gap-2 border-b">
                                <RefreshCw className="h-4 w-4 animate-spin" /> Expose wird neu generiert...
                            </div>
                        )}
                        {store.isTranslatingExpose && (
                            <div className="bg-indigo-50 p-2 text-sm text-indigo-700 font-medium flex items-center justify-center gap-2 border-b">
                                <Globe className="h-4 w-4 animate-spin" /> Wird ubersetzt...
                            </div>
                        )}

                        {/* Rendered markdown content */}
                        <div className="p-6 max-h-[70vh] overflow-y-auto w-full prose prose-sm md:prose-base max-w-none text-gray-800 border-l-4 border-indigo-400">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {store.fullExpose}
                            </ReactMarkdown>
                        </div>

                        {/* Bottom action bar */}
                        <div className="p-3 border-t bg-white flex justify-end gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setShowInstructionInput(true);
                                    // Scroll to instruction input after state update
                                    setTimeout(() => {
                                        document.querySelector('.bg-indigo-50\\/50')?.scrollIntoView({ behavior: 'smooth' });
                                    }, 100);
                                }}
                                className="text-gray-500 hover:text-indigo-600"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Mit neuen Anweisungen generieren
                            </Button>
                            {showInstructionInput && (
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        generateFullExpose();
                                        setShowInstructionInput(false);
                                    }}
                                    disabled={store.isGeneratingExpose}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    {store.isGeneratingExpose ? (
                                        <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Generiere...</>
                                    ) : (
                                        <><Star className="h-4 w-4 mr-2" /> Neu generieren</>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                {/* Error display */}
                {store.exposeError && (
                    <FeedbackMessage
                        type="error"
                        message={store.exposeError}
                        onRetry={generateFullExpose}
                        className="mt-4"
                    />
                )}
            </div>

            {/* Hidden print area for PDF export */}
            {store.fullExpose && (
                <div id="stars-pdf-print-area" className="hidden">
                    <div style={{ marginBottom: '1.5rem', borderBottom: '2px solid #003399', paddingBottom: '1rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', color: '#003399', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                            Erasmus+ STARS Projekt-Expose
                        </div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                            {displayTitle || 'Projekttitel'}
                        </h1>
                        <div style={{ fontSize: '0.875rem', color: '#64748b', fontFamily: 'monospace', marginTop: '0.5rem' }}>
                            {displayAcronym || 'N/A'} | {store.actionType} | {sectorLabel} | {duration} Monate | {budget.toLocaleString('de-DE')} EUR
                        </div>
                    </div>
                    <div className="prose max-w-none prose-indigo">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {store.fullExpose}
                        </ReactMarkdown>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* EXPORT DIVIDER                                                */}
            {/* ============================================================ */}
            <div className="relative flex items-center py-2 no-print mt-8">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">Bereit fur den nachsten Schritt?</span>
                <div className="flex-grow border-t border-gray-200"></div>
            </div>

            {/* ============================================================ */}
            {/* EXPORT TO GENERATOR BUTTON                                   */}
            {/* ============================================================ */}
            <div className="no-print">
                <Button
                    onClick={exportToPipeline}
                    variant="outline"
                    className="w-full text-gray-700 h-14 text-lg border-2 hover:bg-gray-50"
                >
                    <ArrowRight className="h-5 w-5 mr-2 text-gray-400" />
                    Zur detaillierten Antrags-Entwicklung (Project Generator)
                </Button>
                <p className="text-center text-xs text-gray-400 mt-2">
                    Das STARS Expose wird als Grundlage fur die 12-Schritte-Pipeline verwendet
                </p>
            </div>
        </div>
    );
}
