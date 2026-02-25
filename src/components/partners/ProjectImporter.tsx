"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { extractTextFromPDF, extractTextFromImage } from "@/lib/rag-system";
import { Upload, Link as LinkIcon, FileText, Loader2, Check, AlertCircle } from "lucide-react";
import { PreviousProject } from "@/store/types";
import { v4 as uuidv4 } from "uuid";

interface ProjectImporterProps {
    onImport: (project: PreviousProject) => void;
    trigger?: React.ReactNode;
}

export function ProjectImporter({ onImport, trigger }: ProjectImporterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"text" | "url" | "file">("file");
    const [inputContent, setInputContent] = useState("");
    const [inputUrl, setInputUrl] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        setError(null);
    };

    const handleImport = async () => {
        setIsAnalyzing(true);
        setError(null);
        try {
            let contentToAnalyze = inputContent;
            let urlToAnalyze = undefined;

            // 1. Prepare Content
            if (activeTab === "file" && file) {
                if (file.type === "application/pdf") {
                    const result = await extractTextFromPDF(file);
                    contentToAnalyze = result.text;
                }
                else if (file.type.startsWith("image/")) {
                    // Using a simple FileReader for base64
                    const base64 = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.readAsDataURL(file);
                    });
                    contentToAnalyze = await extractTextFromImage(base64);
                }
                else {
                    // Text/Other
                    contentToAnalyze = await file.text();
                }
            } else if (activeTab === "url") {
                urlToAnalyze = inputUrl;
            }

            if (!contentToAnalyze && !urlToAnalyze) {
                throw new Error("Bitte Inhalt eingeben oder Datei hochladen.");
            }

            // 2. Call Analysis API with user's API key
            const apiKey = typeof window !== 'undefined' ? localStorage.getItem('gemini-api-key') : null;
            const headers: Record<string, string> = { "Content-Type": "application/json" };
            if (apiKey) {
                headers["x-gemini-api-key"] = apiKey;
            }

            const response = await fetch("/api/analyze-project-evidence", {
                method: "POST",
                headers,
                body: JSON.stringify({
                    content: contentToAnalyze,
                    url: urlToAnalyze,
                    language: "de" // Could make this dynamic
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Analyse fehlgeschlagen");
            }

            // 3. Create Project Object
            const newProject: PreviousProject = {
                id: uuidv4(),
                title: data.title || "Unbekanntes Projekt",
                programme: data.programme || "ERASMUS_KA2",
                year: data.year || new Date().getFullYear(),
                role: data.role || "PARTNER",
                description: data.description || ""
            };

            onImport(newProject);
            setIsOpen(false);

            // Reset
            setInputContent("");
            setInputUrl("");
            setFile(null);

        } catch (err) {
            setError((err as Error).message);
        }
        setIsAnalyzing(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <button className="flex items-center gap-2 text-[#003399] hover:underline">
                        Projekt importieren
                    </button>
                )}
            </DialogTrigger>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Projekt aus Nachweis importieren</DialogTitle>
                </DialogHeader>

                <div className="flex gap-2 border-b mb-4">
                    <button
                        onClick={() => setActiveTab("file")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "file" ? "border-[#003399] text-[#003399]" : "border-transparent text-gray-500"
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Upload size={16} /> Datei (PDF/Bild)
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab("url")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "url" ? "border-[#003399] text-[#003399]" : "border-transparent text-gray-500"
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <LinkIcon size={16} /> Website URL
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab("text")}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "text" ? "border-[#003399] text-[#003399]" : "border-transparent text-gray-500"
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <FileText size={16} /> Text
                        </div>
                    </button>
                </div>

                <div className="min-h-[200px]">
                    {activeTab === "file" && (
                        <div className="border-2 border-dashed rounded-lg p-8 text-center bg-gray-50">
                            <input
                                type="file"
                                id="project-file-upload"
                                className="hidden"
                                accept=".pdf,.txt,.jpg,.png,.jpeg"
                                onChange={handleFileUpload}
                            />
                            <label htmlFor="project-file-upload" className="cursor-pointer">
                                <div className="flex flex-col items-center gap-2">
                                    <Upload className="h-10 w-10 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-700">
                                        {file ? file.name : "Datei hier ablegen oder klicken"}
                                    </span>
                                    <span className="text-xs text-gray-500">PDF, Bilder, Textdateien</span>
                                </div>
                            </label>
                        </div>
                    )}

                    {activeTab === "url" && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Projekt-Webseite</label>
                            <input
                                type="url"
                                value={inputUrl}
                                onChange={(e) => setInputUrl(e.target.value)}
                                placeholder="https://example.com/project"
                                className="w-full p-2 border rounded-lg"
                            />
                            <p className="text-xs text-gray-500">Die KI wird die Webseite analysieren und Projektdaten extrahieren.</p>
                        </div>
                    )}

                    {activeTab === "text" && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Projektbeschreibung einfügen</label>
                            <textarea
                                value={inputContent}
                                onChange={(e) => setInputContent(e.target.value)}
                                rows={8}
                                placeholder="Füge hier eine Projektbeschreibung ein..."
                                className="w-full p-2 border rounded-lg resize-none"
                            />
                        </div>
                    )}
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}

                <button
                    onClick={handleImport}
                    disabled={isAnalyzing || (activeTab === 'file' && !file) || (activeTab === 'url' && !inputUrl) || (activeTab === 'text' && !inputContent)}
                    className="w-full py-2 bg-gradient-to-r from-[#003399] to-[#0044CC] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                >
                    {isAnalyzing ? (
                        <>
                            <Loader2 className="animate-spin" size={18} />
                            Analysiere...
                        </>
                    ) : (
                        <>
                            <Check size={18} />
                            Projekt analysieren & importieren
                        </>
                    )}
                </button>

            </DialogContent>
        </Dialog>
    );
}
