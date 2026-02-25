
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Globe, FileText, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { extractTextFromPDF, extractTextFromDocx, extractTextFromImage, fileToBase64 } from "@/lib/rag-system";
import { PartnerDocument } from "@/store/types";

interface DocumentUploadDialogProps {
    partnerId: string;
    projectId?: string; // Optional: Link to a specific project
    onUploadComplete: (doc: PartnerDocument) => void;
    trigger?: React.ReactNode;
}

export function DocumentUploadDialog({ partnerId, projectId, onUploadComplete, trigger }: DocumentUploadDialogProps) {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("file");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Form states
    const [url, setUrl] = useState("");
    const [text, setText] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState("");

    const resetForm = () => {
        setUrl("");
        setText("");
        setFile(null);
        setFileName("");
        setError(null);
        setIsLoading(false);
    };

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) resetForm();
    };

    const processDocument = async () => {
        setIsLoading(true);
        setError(null);

        try {
            let extractedText = "";
            let docName = fileName;
            let finalUrl = "";

            // 1. Extract content based on tab
            if (activeTab === "file" && file) {
                docName = file.name;
                finalUrl = URL.createObjectURL(file); // Temporary blob URL

                if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
                    const { text } = await extractTextFromPDF(file);
                    extractedText = text;
                } else if (file.type.includes("word") || file.name.toLowerCase().endsWith(".docx")) {
                    extractedText = await extractTextFromDocx(file);
                } else if (file.type.startsWith("image/")) {
                    const base64 = await fileToBase64(file);
                    extractedText = await extractTextFromImage(base64);
                } else {
                    extractedText = await file.text();
                }
            } else if (activeTab === "url" && url) {
                docName = url.replace(/^https?:\/\//, '').split('/')[0] + " (Website)";
                finalUrl = url;

                const res = await fetch("/api/extract-url", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ url }),
                });

                if (!res.ok) {
                    const errorData = await res.json().catch(() => null);
                    throw new Error(errorData?.error || "Fehler beim Abrufen der Website");
                }
                const data = await res.json();
                extractedText = data.text;
            } else if (activeTab === "text" && text) {
                docName = `Notiz vom ${new Date().toLocaleDateString()}`;
                extractedText = text;
            } else {
                throw new Error("Bitte wähle eine Datei oder URL aus.");
            }

            if (!extractedText || extractedText.trim().length === 0) {
                throw new Error("Es konnte kein Text extrahiert werden.");
            }

            // 2. Summarize via AI
            let summaryData = null;
            if (extractedText.length > 50) {
                const response = await fetch("/api/summarize-study", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        documentText: extractedText,
                        documentName: docName,
                        language: "de" // Defaulting to DE for now, could be dynamic
                    }),
                });

                if (response.ok) {
                    const result = await response.json();
                    summaryData = result.summary;
                }
            }

            // 3. Create Document Object
            const newDoc: PartnerDocument = {
                id: crypto.randomUUID(),
                name: docName,
                type: summaryData?.type?.toUpperCase() || 'OTHER',
                uploadedAt: new Date(),
                fileUrl: finalUrl,
                url: activeTab === "url" ? url : undefined,
                relatedProjectId: projectId,
                extractedText: extractedText,
                summary: summaryData,
                extractedPartnerData: summaryData?.extractedPartnerData
            };

            onUploadComplete(newDoc);
            setOpen(false);

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : "Ein unbekannter Fehler ist aufgetreten");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setFile(e.target.files[0]);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <Upload size={16} />
                        Bericht hinzufügen
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Dokument oder Ressource hinzufügen</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="file">Datei</TabsTrigger>
                        <TabsTrigger value="url">Website</TabsTrigger>
                        <TabsTrigger value="text">Text</TabsTrigger>
                    </TabsList>

                    <div className="py-4">
                        <TabsContent value="file" className="space-y-4">
                            <div className="grid w-full max-w-sm items-center gap-1.5">
                                <Label htmlFor="file">Datei auswählen</Label>
                                <Input id="file" type="file" onChange={handleFileChange} accept=".pdf,.docx,.txt,.jpg,.png" />
                                <p className="text-xs text-muted-foreground">Unterstützt: PDF, Word, Text, Bilder</p>
                            </div>
                        </TabsContent>

                        <TabsContent value="url" className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="url">Website URL</Label>
                                <Input
                                    id="url"
                                    placeholder="https://example.com/project"
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                />
                                <p className="text-xs text-muted-foreground">Wir extrahieren den Text automatisch von der Webseite.</p>
                            </div>
                        </TabsContent>

                        <TabsContent value="text" className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="text">Inhalt eingeben</Label>
                                <Textarea
                                    id="text"
                                    placeholder="Füge hier Notizen oder kopierten Text ein..."
                                    className="min-h-[150px]"
                                    value={text}
                                    onChange={(e) => setText(e.target.value)}
                                />
                            </div>
                        </TabsContent>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md text-sm flex items-start gap-2">
                            <AlertCircle size={16} className="mt-0.5 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setOpen(false)} disabled={isLoading}>
                            Abbrechen
                        </Button>
                        <Button onClick={processDocument} disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isLoading ? "Verarbeite..." : "Hinzufügen & Analysieren"}
                        </Button>
                    </div>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
