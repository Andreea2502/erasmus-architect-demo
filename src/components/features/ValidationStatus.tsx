"use client";

import { useMemo, useState } from 'react';
import {
    AlertTriangle,
    CheckCircle2,
    XCircle,
    ChevronDown,
    Info
} from 'lucide-react';
import { PipelineState } from '@/lib/project-pipeline';
import { validateProject, getTrafficLightStatus, ValidationResult } from '@/lib/validation-rules';

interface ValidationStatusProps {
    projectState: PipelineState;
}

export function ValidationStatus({ projectState }: ValidationStatusProps) {
    const [isOpen, setIsOpen] = useState(false);

    const results = useMemo(() => {
        if (!projectState) return [];
        return validateProject(projectState);
    }, [projectState]);

    const status = useMemo(() => getTrafficLightStatus(results), [results]);

    const errors = results.filter(r => r.severity === 'error');
    const warnings = results.filter(r => r.severity === 'warning');

    // Traffic Light Colors
    const getColor = () => {
        switch (status) {
            case 'red': return 'bg-red-100 text-red-700 border-red-200';
            case 'yellow': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'green': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getIcon = () => {
        switch (status) {
            case 'red': return <XCircle size={18} className="text-red-600" />;
            case 'yellow': return <AlertTriangle size={18} className="text-yellow-600" />;
            case 'green': return <CheckCircle2 size={18} className="text-green-600" />;
            default: return <Info size={18} className="text-gray-500" />;
        }
    };

    const getLabel = () => {
        switch (status) {
            case 'red': return 'Unvollständig';
            case 'yellow': return 'Warnungen';
            case 'green': return 'Bereit';
            default: return 'Status';
        }
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${getColor()}`}
                title="Validierungsstatus anzeigen"
            >
                {getIcon()}
                <span className="text-sm font-medium">{getLabel()}</span>
                <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 border-b bg-gray-50 flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Projekt-Validierung</h3>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-gray-400 hover:text-gray-600"
                        >
                            <span className="sr-only">Schließen</span>
                            <XCircle size={16} />
                        </button>
                    </div>

                    <div className="max-h-96 overflow-y-auto p-4 space-y-4">
                        {results.length === 0 ? (
                            <div className="text-center py-8">
                                <CheckCircle2 size={48} className="mx-auto text-green-500 mb-2" />
                                <p className="text-green-700 font-medium">Alles sieht gut aus!</p>
                                <p className="text-sm text-green-600">Das Projekt erfüllt alle formalen Kriterien.</p>
                            </div>
                        ) : (
                            <>
                                {errors.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                                            <XCircle size={12} /> Kritische Fehler ({errors.length})
                                        </h4>
                                        <ul className="space-y-2">
                                            {errors.map((err, i) => (
                                                <li key={i} className="text-sm text-gray-700 bg-red-50 p-2 rounded border border-red-100 flex gap-2">
                                                    <span className="shrink-0 text-red-500">•</span>
                                                    {err.message}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {warnings.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-yellow-700 uppercase tracking-wider mb-2 mt-4 flex items-center gap-1">
                                            <AlertTriangle size={12} /> Warnungen ({warnings.length})
                                        </h4>
                                        <ul className="space-y-2">
                                            {warnings.map((warn, i) => (
                                                <li key={i} className="text-sm text-gray-700 bg-yellow-50 p-2 rounded border border-yellow-100 flex gap-2">
                                                    <span className="shrink-0 text-yellow-500">•</span>
                                                    {warn.message}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className="p-3 bg-gray-50 border-t text-xs text-gray-500 text-center">
                        Automatische Prüfung basierend auf Erasmus+ KA220 Regeln.
                    </div>
                </div>
            )}

            {/* Click outside to close - simple implementation via transparent overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
}
