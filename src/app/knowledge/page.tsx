"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    Upload,
    FileText,
    Trash2,
    Database,
    AlertCircle,
    Loader2,
    BookOpen,
    ArrowLeft,
} from "lucide-react";
import {
    vectorStore,
    uploadDocument,
    UploadedDocument
} from "@/lib/rag-system";

export default function KnowledgePage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [documents, setDocuments] = useState<UploadedDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState("");
    const [error, setError] = useState<string | null>(null);

    // Load documents on mount
    useEffect(() => {
        loadDocuments();
    }, []);

    const loadDocuments = async () => {
        setLoading(true);
        try {
            // Force initialization of vector store
            const docs = await vectorStore.getDocumentsAsync();
            setDocuments(docs);
        } catch (err) {
            console.error("Failed to load documents:", err);
            setError("Fehler beim Laden der Wissensdatenbank.");
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleUpload(e.target.files[0]);
        }
    };

    const handleUpload = async (file: File) => {
        setUploading(true);
        setUploadProgress(0);
        setUploadStatus("Starte Upload...");
        setError(null);

        try {
            // Determine type based on extension (simple heuristic)
            let type: UploadedDocument['type'] = 'other';
            if (file.name.toLowerCase().includes('guide') || file.name.toLowerCase().includes('leitfaden')) {
                type = 'programme_guide';
            } else if (file.name.toLowerCase().includes('study') || file.name.toLowerCase().includes('studie')) {
                type = 'study';
            } else if (file.name.toLowerCase().includes('statist')) {
                type = 'statistics';
            }

            await uploadDocument(file, type, (progress, status) => {
                setUploadProgress(progress);
                setUploadStatus(status);
            });

            // Refresh list
            await loadDocuments();
            setUploadStatus("Erfolgreich hochgeladen!");
            setTimeout(() => setUploadStatus(""), 3000);
        } catch (err: any) {
            console.error("Upload failed:", err);
            setError(err.message || "Upload fehlgeschlagen.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Möchtest du dieses Dokument wirklich aus der Wissensdatenbank löschen?")) return;

        try {
            const success = await vectorStore.deleteDocument(id);
            if (success) {
                await loadDocuments();
            } else {
                setError("Löschen fehlgeschlagen.");
            }
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    const handleClearAll = async () => {
        if (!confirm("ACHTUNG: Alle Dokumente werden unwiderruflich gelöscht. Fortfahren?")) return;

        try {
            await vectorStore.clear();
            await loadDocuments();
        } catch (err) {
            console.error("Clear failed:", err);
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'programme_guide': return 'Programmleitfaden';
            case 'study': return 'Studie / Bericht';
            case 'statistics': return 'Statistik';
            default: return 'Dokument';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'programme_guide': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'study': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'statistics': return 'bg-green-100 text-green-700 border-green-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => router.push('/')}
                    className="flex items-center gap-2 text-gray-500 hover:text-[#003399] transition-colors mb-4 font-medium"
                >
                    <ArrowLeft size={20} />
                    Zurück zum Dashboard
                </button>

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <BookOpen className="text-[#003399]" size={32} />
                            Wissensdatenbank
                        </h1>
                        <p className="text-gray-500 mt-2">
                            Verwalte Dokumente, die von der KI für alle Projekte genutzt werden.
                        </p>
                    </div>
                    <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 flex items-center gap-3">
                        <Database size={20} className="text-[#003399]" />
                        <div>
                            <span className="block text-xs text-blue-600 font-semibold uppercase">Status</span>
                            <span className="font-bold text-[#003399]">
                                {documents.length} Dokumente
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upload Area */}
            <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-8 mb-8 text-center hover:border-[#003399] transition-colors">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    className="hidden"
                    accept=".pdf,.txt,.csv,image/*"
                />

                {uploading ? (
                    <div className="max-w-md mx-auto">
                        <Loader2 size={48} className="mx-auto text-[#003399] animate-spin mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{uploadStatus}</h3>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                            <div
                                className="bg-[#003399] h-2.5 rounded-full transition-all duration-300"
                                style={{ width: `${uploadProgress}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-gray-500">{Math.round(uploadProgress)}%</p>
                    </div>
                ) : (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="cursor-pointer"
                    >
                        <div className="w-16 h-16 bg-blue-50 text-[#003399] rounded-full flex items-center justify-center mx-auto mb-4">
                            <Upload size={32} />
                        </div>
                        <h3 className="text-xl font-medium text-gray-900 mb-2">
                            Neues Dokument hochladen
                        </h3>
                        <p className="text-gray-500 mb-4 max-w-lg mx-auto">
                            Unterstützt PDF, Textdateien und Bilder. Die Dokumente werden automatisch analysiert und indexiert.
                        </p>
                        <button className="px-6 py-2 bg-[#003399] text-white rounded-lg hover:bg-[#002266] transition-colors">
                            Datei auswählen
                        </button>
                    </div>
                )}

                {error && (
                    <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center justify-center gap-2">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}
            </div>

            {/* Warning if too many documents */}
            {documents.length > 5 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="text-amber-600 flex-shrink-0" size={24} />
                        <div>
                            <h3 className="font-semibold text-amber-800">Zu viele Dokumente</h3>
                            <p className="text-amber-700 text-sm mt-1">
                                Es sind {documents.length} Dokumente in der Datenbank. Für optimale Ergebnisse
                                wird nur der <strong>Erasmus+ Programmleitfaden 2026</strong> empfohlen.
                                Die Schritt-Anweisungen sind bereits in der Anwendung integriert.
                            </p>
                            <button
                                onClick={handleClearAll}
                                className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 text-sm font-medium"
                            >
                                🗑️ Alle Dokumente löschen und neu starten
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Document List */}
            <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Indexierte Dokumente</h2>
                    {documents.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            className="px-3 py-1.5 text-red-600 hover:bg-red-50 border border-red-200 rounded-lg text-sm font-medium"
                        >
                            🗑️ Alle löschen
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <Loader2 size={32} className="mx-auto text-gray-400 animate-spin" />
                        <p className="text-gray-500 mt-2">Lade Datenbank...</p>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                        <Database size={48} className="mx-auto text-gray-300 mb-4" />
                        <h3 className="text-lg font-medium text-gray-700">Die Wissensdatenbank ist leer</h3>
                        <p className="text-gray-500">Lade Dokumente hoch, damit die KI sie nutzen kann.</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {documents.map((doc) => (
                            <div key={doc.id} className="bg-white border rounded-lg p-4 flex items-center justify-between hover:shadow-sm transition-shadow">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-lg ${getTypeColor(doc.type)} bg-opacity-20`}>
                                        <FileText size={24} className={getTypeColor(doc.type).split(' ')[1]} />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{doc.name}</h3>
                                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                                            <span className={`px-2 py-0.5 rounded text-xs border ${getTypeColor(doc.type)}`}>
                                                {getTypeLabel(doc.type)}
                                            </span>
                                            <span>{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                            <span>•</span>
                                            <span>{doc.totalChunks} Chunks</span>
                                            {doc.totalPages && (
                                                <>
                                                    <span>•</span>
                                                    <span>{doc.totalPages} Seiten</span>
                                                </>
                                            )}
                                        </div>
                                        {doc.summary && (
                                            <div className="mt-3 text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-100">
                                                <span className="font-semibold text-gray-700 block mb-1">Zusammenfassung:</span>
                                                {doc.summary}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleDelete(doc.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Löschen"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
