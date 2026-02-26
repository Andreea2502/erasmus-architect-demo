import React, { useRef } from 'react';
import {
    BookOpen, Upload, Plus, RefreshCw, AlertTriangle,
    Sparkles, CheckCircle2, X, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ResearchSource } from '@/types/concept';
import { StarsConceptStore } from '@/store/stars-concept-store';

interface StarsStep2SourcesProps {
    store: StarsConceptStore;
    runAnalysis: (sourceId: string) => Promise<void>;
    handleFileUpload: (files: FileList) => Promise<void>;
}

export function StarsStep2Sources({
    store,
    runAnalysis,
    handleFileUpload,
}: StarsStep2SourcesProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);

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
    const totalFindings = store.sources.reduce(
        (sum, s) => sum + (s.keyFindings?.length || 0), 0
    );

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <BookOpen className="h-5 w-5 text-indigo-500" />
                    Schritt 2: Quellen hochladen & analysieren
                </h2>
                <p className="text-sm text-gray-500 mb-6">
                    Lade deine Recherche-Ergebnisse hoch und lass sie analysieren. Die Erkenntnisse fließen in das Exposé ein.
                </p>
            </div>

            {/* Source Upload / Drop Zone */}
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
                            Manuell hinzufügen
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
                        oder füge sie manuell per Copy-Paste hinzu.
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
                                                placeholder="Füge hier den Inhalt der Recherche ein (Copy-Paste)..."
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
                            {analyzedCount} Quellen analysiert, {totalFindings} Erkenntnisse extrahiert
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
