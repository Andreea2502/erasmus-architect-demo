"use client";

import { useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { PartnerForm } from "@/components/partners/PartnerForm";
import { useAppStore } from "@/store/app-store";
import { useLanguageStore } from "@/store/language-store";
import { PartnerDescription, PartnerDocument } from "@/store/types";
import { createTranslator } from "@/lib/translations";
import {
  extractTextFromPDF,
  extractTextFromDocx,
  extractTextFromImage,
  fileToBase64
} from "@/lib/rag-system";
import { aggregatePartnerAnalysis } from "@/lib/partner-analysis";
import { DocumentUploadDialog } from "@/components/partners/DocumentUploadDialog";
import { PartnerKnowledgeBase } from "@/components/partners/PartnerKnowledgeBase";
import {
  Edit,
  Sparkles,
  FileText,
  Upload,
  ChevronLeft,
  RefreshCw,
  Copy,
  Check,
  Trash2,
  Download,
  Plus,
  Calendar,
  Globe,
  Building2,
  UserCircle,
  X,
  MessageSquare,
  Send,
  Wand2,
  AlertCircle,
  Info,
  LayoutDashboard,
  Shield,
  Mail,
  Phone,
  Target,
  History as HistoryIcon,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Award,
  BookOpen
} from "lucide-react";

// Country flags
const COUNTRY_FLAGS: Record<string, string> = {
  DE: "🇩🇪", AT: "🇦🇹", CH: "🇨🇭", ES: "🇪🇸", FR: "🇫🇷", IT: "🇮🇹", PT: "🇵🇹",
  NL: "🇳🇱", BE: "🇧🇪", PL: "🇵🇱", CZ: "🇨🇿", SK: "🇸🇰", HU: "🇭🇺", RO: "🇷🇴",
  BG: "🇧🇬", GR: "🇬🇷", CY: "🇨🇾", MT: "🇲🇹", SI: "🇸🇮", HR: "🇭🇷", RS: "🇷🇸",
  BA: "🇧🇦", MK: "🇲🇰", AL: "🇦🇱", ME: "🇲🇪", XK: "🇽🇰", TR: "🇹🇷", UA: "🇺🇦",
  SE: "🇸🇪", NO: "🇳🇴", FI: "🇫🇮", DK: "🇩🇰", IE: "🇮🇪", UK: "🇬🇧", GB: "🇬🇧",
  EE: "🇪🇪", LV: "🇱🇻", LT: "🇱🇹", LU: "🇱🇺", IS: "🇮🇸", LI: "🇱🇮",
  EU: "🇪🇺",
};

type TabType = "summary" | "edit" | "ai" | "documents" | "knowledge";

interface AdditionalInput {
  id: string;
  type: "text" | "file";
  content: string;
  fileName?: string;
}

export default function EditPartnerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const partnerId = params.id as string;
  const { language } = useLanguageStore();
  const t = createTranslator(language);

  // Get initial tab from URL or default to "summary"
  const initialTab = (searchParams.get("tab") as TabType) || "summary";
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Partner data
  const partner = useAppStore((state) => state.partners.find((p) => p.id === partnerId));
  const updatePartner = useAppStore((state) => state.updatePartner);

  // AI Description state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDescription, setGeneratedDescription] = useState("");
  const [descriptionTitle, setDescriptionTitle] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Additional inputs for AI
  const [additionalInputs, setAdditionalInputs] = useState<AdditionalInput[]>([]);
  const [newTextInput, setNewTextInput] = useState("");
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [manualEditId, setManualEditId] = useState<string | null>(null);
  const [manualEditText, setManualEditText] = useState("");

  // Document states
  const [analyzingDocId, setAnalyzingDocId] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [showSummaryId, setShowSummaryId] = useState<string | null>(null);

  // Correction mode
  const [correctionMode, setCorrectionMode] = useState(false);
  const [correctionInstruction, setCorrectionInstruction] = useState("");
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [editingDescriptionId, setEditingDescriptionId] = useState<string | null>(null);

  // Project context for AI (not currently used in UI but kept for state consistency)
  const [projectContext, setProjectContext] = useState({
    actionType: "KA220",
    sector: "ADU",
    projectTitle: "",
    projectDescription: "",
  });

  // Error states
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [correctionError, setCorrectionError] = useState<string | null>(null);

  // Add text input
  const handleAddTextInput = () => {
    if (!newTextInput.trim()) return;
    setAdditionalInputs([
      ...additionalInputs,
      { id: crypto.randomUUID(), type: "text", content: newTextInput.trim() }
    ]);
    setNewTextInput("");
  };

  // Add file input
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      let extractedText = "";
      const fileName = file.name.toLowerCase();

      // For text files, read directly
      if (file.type === "text/plain") {
        extractedText = await file.text();
      }
      // For PDFs and images, use the helpers
      else if (file.type === "application/pdf" || fileName.endsWith(".pdf")) {
        const { text } = await extractTextFromPDF(file);
        extractedText = text;
      } else if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" || fileName.endsWith(".docx")) {
        extractedText = await extractTextFromDocx(file);
      } else if (file.type.startsWith("image/")) {
        const base64 = await fileToBase64(file);
        extractedText = await extractTextFromImage(base64);
      }

      if (extractedText) {
        setAdditionalInputs([
          ...additionalInputs,
          { id: crypto.randomUUID(), type: "file", content: extractedText, fileName: file.name }
        ]);
      }
    } catch (error) {
      console.error("File processing error:", error);
    }
    setIsProcessingFile(false);
    // Reset the input
    e.target.value = "";
  };

  // Remove input
  const handleRemoveInput = (id: string) => {
    setAdditionalInputs(additionalInputs.filter(i => i.id !== id));
  };

  // Correct existing description
  const handleCorrectDescription = async (descriptionToCorrect?: string) => {
    if (!correctionInstruction.trim()) return;

    const textToCorrect = descriptionToCorrect || generatedDescription;
    if (!textToCorrect) return;

    setIsCorrecting(true);
    setCorrectionError(null); // Clear previous errors
    try {
      const response = await fetch("/api/generate-partner-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner,
          existingDescription: textToCorrect,
          correctionInstruction: correctionInstruction,
          language,
          mode: "correct",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Check for specific error types
        if (response.status === 500 && errorData.error?.includes("API Key")) {
          setCorrectionError(t.errors.apiKeyMissing);
        } else if (!navigator.onLine) {
          setCorrectionError(t.errors.networkError);
        } else {
          setCorrectionError(t.errors.correctionFailed);
        }
        console.error("Correction error:", errorData);
        return;
      }

      const result = await response.json();

      // If correcting a saved description
      if (editingDescriptionId && partner) {
        const updatedDescriptions = partner.generatedDescriptions?.map(d =>
          d.id === editingDescriptionId
            ? { ...d, content: result.description, wordCount: result.wordCount }
            : d
        );
        updatePartner(partnerId, { generatedDescriptions: updatedDescriptions });
        setEditingDescriptionId(null);
      } else {
        // If correcting the preview
        setGeneratedDescription(result.description);
      }
      setCorrectionInstruction("");
      setCorrectionMode(false);
      setCorrectionError(null); // Clear any errors on success
    } catch (error) {
      console.error("Correction error:", error);
      if (!navigator.onLine) {
        setCorrectionError(t.errors.networkError);
      } else {
        setCorrectionError(t.errors.correctionFailed);
      }
    }
    setCorrectionError(null); // Clear any errors on success
  };

  const handleStartManualEdit = (id: string | "preview", text: string) => {
    setManualEditId(id);
    setManualEditText(text);
  };

  const handleSaveManualEdit = () => {
    if (!partner) return;

    if (manualEditId === "preview") {
      setGeneratedDescription(manualEditText);
    } else {
      const updatedDescriptions = partner.generatedDescriptions?.map(d =>
        d.id === manualEditId
          ? { ...d, content: manualEditText, wordCount: manualEditText.split(/\s+/).filter(w => w.length > 0).length }
          : d
      );
      updatePartner(partnerId, { generatedDescriptions: updatedDescriptions });
    }
    setManualEditId(null);
    setManualEditText("");
  };

  const handleSaveDescription = () => {
    if (!partner || !generatedDescription) return;

    const newDescription: PartnerDescription = {
      id: crypto.randomUUID(),
      title: descriptionTitle || `Beschreibung ${new Date().toLocaleDateString()}`,
      content: generatedDescription,
      wordCount: generatedDescription.split(/\s+/).filter((w) => w.length > 0).length,
      language,
      generatedAt: new Date(),
    };

    const existingDescriptions = partner.generatedDescriptions || [];
    updatePartner(partnerId, {
      generatedDescriptions: [...existingDescriptions, newDescription],
    });

    // Reset
    setGeneratedDescription("");
    setDescriptionTitle("");
    setAdditionalInputs([]);
  };

  const handleDeleteDescription = (descId: string) => {
    if (!partner) return;
    const updated = (partner.generatedDescriptions || []).filter((d) => d.id !== descId);
    updatePartner(partnerId, { generatedDescriptions: updated });
  };

  const handleCopyDescription = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // --- NEW DOCUMENT UPLOAD HANDLER ---
  const handleDocumentUploadComplete = (newDoc: PartnerDocument) => {
    if (!partner) return;

    const existingDocs = partner.uploadedDocuments || [];
    const updates: Partial<typeof partner> = {
      uploadedDocuments: [...existingDocs, newDoc]
    };

    // Auto-populate missing partner data if extracted
    if (newDoc.extractedPartnerData) {
      if (!partner.email && newDoc.extractedPartnerData.email) updates.email = newDoc.extractedPartnerData.email;
      if (!partner.phone && newDoc.extractedPartnerData.phone) updates.phone = newDoc.extractedPartnerData.phone;
      if (!partner.website && newDoc.extractedPartnerData.website) updates.website = newDoc.extractedPartnerData.website;
      if (!partner.city && newDoc.extractedPartnerData.city) updates.city = newDoc.extractedPartnerData.city;
    }

    // Auto-save the Executive Summary to AI Descriptions
    if (newDoc.summary?.executiveSummary) {
      const execSummaryRaw = newDoc.summary.executiveSummary;
      const newDescription: PartnerDescription = {
        id: crypto.randomUUID(),
        title: `Zusammenfassung: ${newDoc.name}`,
        content: execSummaryRaw,
        wordCount: execSummaryRaw.split(/\s+/).filter((w: string) => w.length > 0).length,
        language: language,
        generatedAt: new Date(),
      };
      updates.generatedDescriptions = [...(partner.generatedDescriptions || []), newDescription];
    }

    updatePartner(partnerId, updates);

    // If it has a summary, show it
    if (newDoc.summary) {
      setShowSummaryId(newDoc.id);
    }
  };

  const handleGenerateDescription = async () => {
    if (!partner) return;

    setIsGenerating(true);
    setGenerationError(null); // Clear previous errors
    try {
      // Combine additional inputs
      let additionalInfo = additionalInputs.map(i =>
        i.type === "file"
          ? `[Aus Dokument "${i.fileName}"]: ${i.content}`
          : i.content
      ).join("\n\n");

      // ALSO include content from uploaded documents (store)
      if (partner.uploadedDocuments && partner.uploadedDocuments.length > 0) {
        const docContent = partner.uploadedDocuments
          .filter(d => d.extractedText)
          .map(d => `[Aus hinterlegtem Dokument "${d.name}"]: ${d.extractedText?.substring(0, 5000)} ...`) // Limit length per doc to avoid token limits
          .join("\n\n");

        if (docContent) {
          additionalInfo += `\n\n=== HINTERGRUNDWISSEN AUS DOKUMENTEN ===\n${docContent}`;
        }
      }

      const response = await fetch("/api/generate-partner-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partner,
          additionalInfo: additionalInfo || undefined,
          language,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: { error?: string, details?: string } = {};
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          console.error("Non-JSON error response:", errorText);
          errorData = { error: errorText };
        }

        // Check for specific error types
        if (response.status === 500 && errorData.error?.includes("API Key")) {
          setGenerationError(t.errors.apiKeyMissing);
        } else if (!navigator.onLine) {
          setGenerationError(t.errors.networkError);
        } else {
          setGenerationError(t.errors.generationFailed + ": " + (errorData.error || errorData.details || "Unknown Server Error"));
        }
        console.error("Generation error:", errorData);
        return;
      }

      const result = await response.json();
      setGeneratedDescription(result.description);
      setDescriptionTitle(`Profil ${new Date().toLocaleDateString()}`);
      setCorrectionMode(false);
      setGenerationError(null); // Clear any errors on success
    } catch (error) {
      console.error("Generation error:", error);
      if (!navigator.onLine) {
        setGenerationError(t.errors.networkError);
      } else {
        setGenerationError(t.errors.generationFailed);
      }
    }
    setIsGenerating(false);
  };

  // Kept for backward compat or if needed
  const handlePartnerDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Legacy support or remove if fully replaced by dialog? 
    // Keeping it for now as it might be used elsewhere or as fallback
    const file = e.target.files?.[0];
    if (!file || !partner) return;

    // ... implementation logic would go here
  };

  const handleDeletePartnerDoc = (docId: string) => {
    if (!partner) return;
    const updated = (partner.uploadedDocuments || []).filter(d => d.id !== docId);
    updatePartner(partnerId, { uploadedDocuments: updated });
  };

  if (!partner) {
    return (
      <AppShell>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900">
            {t.partnerDetail.partnerNotFound}
          </h2>
          <Link href="/partners" className="text-blue-600 hover:underline mt-2 inline-block">
            {t.partnerDetail.backToOverview}
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/partners"
            className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4"
          >
            <ChevronLeft size={18} />
            {t.partnerDetail.backToOverview}
          </Link>

          <div className="flex items-start gap-4">
            <span className="text-5xl">{COUNTRY_FLAGS[partner.country] || "🏳️"}</span>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {partner.acronym || partner.organizationName}
              </h1>
              {partner.acronym && (
                <p className="text-gray-600">{partner.organizationName}</p>
              )}
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Building2 size={14} />
                  {partner.organizationType}
                </span>
                {partner.city && (
                  <span className="flex items-center gap-1">
                    <Globe size={14} />
                    {partner.city}
                  </span>
                )}
                {partner.contacts && partner.contacts.length > 0 && (
                  <span className="flex items-center gap-1">
                    <UserCircle size={14} />
                    {partner.contacts.length} {t.partnerDetail.contacts}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Modern Action Buttons */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { id: "summary" as TabType, icon: LayoutDashboard, label: "Übersicht" },
            { id: "knowledge" as TabType, icon: BookOpen, label: "Wissensdatenbank" },
            { id: "documents" as TabType, icon: FileText, label: "Dokumente" },
            { id: "ai" as TabType, icon: Sparkles, label: "KI-Beschreibungen" },
            { id: "edit" as TabType, icon: Edit, label: "Bearbeiten" },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-medium transition-all ${activeTab === id
                ? "bg-[#003399] text-white shadow-lg ring-2 ring-[#003399] ring-offset-2"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300 shadow-sm"
                }`}
            >
              <Icon size={18} />
              {label}
              {id === "ai" && partner.generatedDescriptions && partner.generatedDescriptions.length > 0 && (
                <span className={`ml-1.5 px-2 py-0.5 text-xs rounded-full ${activeTab === id ? "bg-white/20 text-white" : "bg-purple-100 text-purple-700"
                  }`}>
                  {partner.generatedDescriptions.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* SUMMARY VIEW */}
        {activeTab === "summary" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* Left Column: Identity & Contact */}
            <div className="space-y-6">
              {/* Identity Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <Shield size={18} className="text-[#003399]" />
                  <h3 className="font-semibold text-gray-900">Identität</h3>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Organisation</span>
                    <p className="font-medium text-gray-900 mt-1">{partner.organizationName}</p>
                    {partner.acronym && <p className="text-sm text-gray-500">{partner.acronym}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Land</span>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg">{COUNTRY_FLAGS[partner.country]}</span>
                        <span className="text-gray-900">{partner.country}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Typ</span>
                      <p className="text-gray-900 mt-1">{partner.organizationType}</p>
                    </div>
                  </div>

                  {partner.oidNumber && (
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">OID</span>
                      <p className="font-mono text-gray-900 mt-1 bg-gray-50 px-2 py-1 rounded w-fit">{partner.oidNumber}</p>
                    </div>
                  )}

                  {partner.website && (
                    <div>
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Website</span>
                      <a href={partner.website} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:underline mt-1">
                        <Globe size={14} />
                        {partner.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Contact Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <UserCircle size={18} className="text-[#003399]" />
                  <h3 className="font-semibold text-gray-900">Kontakt</h3>
                </div>
                <div className="p-6">
                  {partner.contacts && partner.contacts.length > 0 ? (
                    <div className="space-y-4">
                      {partner.contacts.map((contact, idx) => (
                        <div key={idx} className="flex items-start gap-3 pb-4 last:pb-0 last:border-0 border-b border-gray-100">
                          <div className="h-8 w-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                            {contact.firstName?.[0]}{contact.lastName?.[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{contact.firstName} {contact.lastName}</p>
                            {contact.email && (
                              <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                                <Mail size={14} />
                                <a href={`mailto:${contact.email}`} className="hover:text-blue-600">{contact.email}</a>
                              </div>
                            )}
                            {contact.phone && (
                              <div className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                                <Phone size={14} />
                                <span>{contact.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Keine Kontakte hinterlegt.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Knowledge & Research (Spans 2 cols) */}
            <div className="lg:col-span-2 space-y-6">

              {/* Document Knowledge Card - Moved up & always visible if docs exist */}
              {partner.uploadedDocuments && partner.uploadedDocuments.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="bg-gradient-to-r from-[#003399]/10 to-purple-500/10 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={18} className="text-[#003399]" />
                      <h3 className="font-semibold text-gray-900">Kompiliertes Wissen (Dokumente)</h3>
                    </div>
                    <button
                      onClick={() => setActiveTab("documents")}
                      className="text-xs text-[#003399] hover:underline font-medium flex items-center gap-1"
                    >
                      Alle Dokumente
                      <ExternalLink size={12} />
                    </button>
                  </div>
                  <div className="p-6">
                    {partner.uploadedDocuments.some(d => d.summary) ? (
                      <>
                        {(() => {
                          const profile = aggregatePartnerAnalysis(partner.uploadedDocuments || []);
                          return (
                            <div className="space-y-6">
                              {/* 1. Executive Summary & Mission */}
                              <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2 px-1">Ganzheitliches Profil (Extraktion)</h4>
                                <p className="text-gray-800 leading-relaxed text-lg italic mb-4">
                                  "{profile.executiveSummary}"
                                </p>
                                {profile.mission && (
                                  <div className="flex gap-2 items-start text-sm text-gray-700 bg-white/60 p-3 rounded">
                                    <Target size={16} className="text-blue-600 mt-0.5 shrink-0" />
                                    <div>
                                      <span className="font-semibold text-blue-900">Mission: </span>
                                      {profile.mission}
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* 2. Key Facts & Erasmus Data */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                  <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Info size={16} className="text-[#003399]" />
                                    Fakten & Zahlen
                                  </h5>
                                  <ul className="space-y-2 text-sm">
                                    {profile.staffSize && (
                                      <li className="flex justify-between border-b border-gray-50 pb-1">
                                        <span className="text-gray-500">Teamgröße</span>
                                        <span className="font-medium">{profile.staffSize}</span>
                                      </li>
                                    )}
                                    {profile.erasmusData.oid && (
                                      <li className="flex justify-between border-b border-gray-50 pb-1">
                                        <span className="text-gray-500">OID</span>
                                        <span className="font-mono bg-gray-100 px-1.5 rounded">{profile.erasmusData.oid}</span>
                                      </li>
                                    )}
                                    {profile.erasmusData.pic && (
                                      <li className="flex justify-between border-b border-gray-50 pb-1">
                                        <span className="text-gray-500">PIC</span>
                                        <span className="font-mono bg-gray-100 px-1.5 rounded">{profile.erasmusData.pic}</span>
                                      </li>
                                    )}
                                  </ul>
                                  {profile.competences.length > 0 && (
                                    <div className="mt-3 pt-2">
                                      <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Kompetenzen</span>
                                      <div className="flex flex-wrap gap-1">
                                        {profile.competences.slice(0, 5).map((c, i) => (
                                          <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{c}</span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* 3. Experience / Projects */}
                                <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                                  <h5 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                    <Award size={16} className="text-[#003399]" />
                                    Erfahrung
                                  </h5>
                                  {profile.completedProjects.length > 0 ? (
                                    <ul className="space-y-3">
                                      {profile.completedProjects.slice(0, 3).map((proj, i) => (
                                        <li key={i} className="text-sm">
                                          <div className="font-medium text-gray-900 truncate" title={proj.title}>{proj.title}</div>
                                          <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span className={`px-1.5 py-0.5 rounded ${proj.role === 'COORDINATOR' ? 'bg-purple-100 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                                              {proj.role === 'COORDINATOR' ? 'Coord.' : 'Partner'}
                                            </span>
                                            <span>{proj.programme}</span>
                                            {proj.year && <span>({proj.year})</span>}
                                          </div>
                                        </li>
                                      ))}
                                      {profile.completedProjects.length > 3 && (
                                        <li className="text-xs text-center text-gray-500 pt-1">
                                          + {profile.completedProjects.length - 3} weitere Projekte
                                        </li>
                                      )}
                                    </ul>
                                  ) : (
                                    <p className="text-sm text-gray-500 italic">Keine Projektdaten extrahiert.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        <div className="space-y-6">
                          {partner.uploadedDocuments.filter(d => d.summary).map((doc, idx) => (
                            <div key={doc.id} className={`${idx !== 0 ? 'border-t pt-6' : ''}`}>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="p-1.5 bg-gray-100 rounded text-gray-600">
                                  <FileText size={14} />
                                </div>
                                <span className="text-sm font-bold text-gray-800">{doc.name}</span>
                              </div>

                              <p className="text-sm text-gray-700 leading-relaxed mb-4 italic">
                                "{doc.summary?.executiveSummary}"
                              </p>

                              {doc.summary?.keyFindings && doc.summary.keyFindings.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {doc.summary.keyFindings.slice(0, 2).map((finding, fIdx) => (
                                    <div key={fIdx} className="bg-green-50 p-3 rounded-lg border border-green-100">
                                      <p className="text-xs font-bold text-green-900 mb-1">Key Insight</p>
                                      <p className="text-xs text-green-800 line-clamp-3">{finding.finding}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <div className="bg-blue-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                          <FileText className="text-[#003399]" size={24} />
                        </div>
                        <p className="text-sm font-medium text-gray-900 mb-1">{partner.uploadedDocuments.length} Dokumente hochgeladen</p>
                        <p className="text-xs text-gray-500 mb-4">Noch keine KI-Analyse durchgeführt.</p>
                        <button
                          onClick={() => setActiveTab("documents")}
                          className="px-4 py-2 bg-[#003399] text-white rounded-lg text-sm font-medium hover:bg-[#003399]/90 transition-colors"
                        >
                          KI-Analyse im Dokumente-Tab starten
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Internet Research Card */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe size={18} className="text-[#003399]" />
                    <h3 className="font-semibold text-gray-900">Internet Recherche</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab("ai")}
                    className="text-xs text-[#003399] hover:underline font-medium flex items-center gap-1"
                  >
                    Neue Suche
                    <ExternalLink size={12} />
                  </button>
                </div>
                <div className="p-6">
                  {partner.website ? (
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                        <Globe size={24} />
                      </div>
                      <div>
                        <p className="text-gray-900 font-medium mb-1">Website erfasst</p>
                        <a href={partner.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                          {partner.website}
                        </a>
                        <p className="text-xs text-gray-500 mt-2">
                          Sie können die KI nutzen, um Inhalte von der Website für die Partnerbeschreibung zu extrahieren.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm italic">Keine Website hinterlegt.</p>
                  )}
                </div>
              </div>

              {/* Activity Log / Previous Projects */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center gap-2">
                  <HistoryIcon size={18} className="text-[#003399]" />
                  <h3 className="font-semibold text-gray-900">Bisherige Projekte</h3>
                </div>
                <div className="p-6">
                  {partner.previousProjects && partner.previousProjects.length > 0 ? (
                    <div className="space-y-4">
                      {partner.previousProjects.map(project => (
                        <div key={project.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-gray-900">{project.projectNumber}</h4>
                            <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">{project.role}</span>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">{project.title}</p>
                          {/* Here we can add the DocumentUploadDialog for adding reports contextually if needed 
                              But for now keeping it simple as per original design, adding functionality 
                              via the general documents tab or specific buttons if requested.
                           */}
                          <div className="flex items-center gap-2">
                            <DocumentUploadDialog
                              partnerId={partnerId}
                              onUploadComplete={handleDocumentUploadComplete}
                              trigger={
                                <button className="text-xs text-[#003399] hover:underline flex items-center gap-1">
                                  <Upload size={12} />
                                  {t.buttons.addReport}
                                </button>
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 italic">Keine bisherigen Projekte eingetragen.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* KNOWLEDGE BASE TAB */}
        {activeTab === "knowledge" && (
          <div className="animate-in fade-in duration-300">
            <PartnerKnowledgeBase
              partner={partner}
              language={language}
              onOpenDocument={(doc) => {
                setShowSummaryId(doc.id);
                setActiveTab("documents");
              }}
            />
          </div>
        )}

        {/* EDIT FORM */}
        {activeTab === "edit" && (
          <div className="animate-in fade-in duration-300">
            <PartnerForm
              initialData={partner}
              onSave={(data) => {
                updatePartner(partnerId, data);
                // Optional: switch back to summary or show success toast
              }}
              onCancel={() => setActiveTab("summary")}
            />
          </div>
        )}

        {/* AI GENERATOR tab */}
        {activeTab === "ai" && (
          <div className="animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Side: Generator Controls */}
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Sparkles size={20} className="text-[#003399]" />
                    {t.aiDescriptions.generateNew}
                  </h2>
                  <p className="text-sm text-gray-500 mb-6">
                    {t.aiDescriptions.intro}
                  </p>

                  <div className="space-y-4">
                    {/* Additional Inputs List */}
                    {additionalInputs.length > 0 && (
                      <div className="space-y-2 mb-4">
                        <label className="text-sm font-medium text-gray-700">Zusätzliche Infos:</label>
                        {additionalInputs.map((input) => (
                          <div key={input.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded border">
                            <span className="truncate flex-1">
                              {input.type === "file" ?
                                `📄 ${input.fileName} (${input.content.length} chars)` :
                                `📝 "${input.content.substring(0, 30)}..."`}
                            </span>
                            <button onClick={() => handleRemoveInput(input.id)} className="text-red-500 hover:text-red-700 p-1">
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Additional Text Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t.aiDescriptions.additionalInfo}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTextInput}
                          onChange={(e) => setNewTextInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddTextInput()}
                          placeholder={t.aiDescriptions.textPlaceholder}
                          className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                        <button
                          onClick={handleAddTextInput}
                          disabled={!newTextInput.trim()}
                          className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>

                    {/* File Upload for Context */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Dokumente für Kontext hochladen
                      </label>
                      <div className="flex items-center justify-center w-full">
                        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-3 text-gray-400" />
                            <p className="mb-2 text-sm text-gray-500">
                              <span className="font-semibold">Klicken zum Hochladen</span> oder Drag & Drop
                            </p>
                            <p className="text-xs text-gray-500">PDF, DOCX, TXT oder Bilder</p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            onChange={handleFileUpload}
                            accept=".pdf,.docx,.txt,image/*"
                          />
                        </label>
                      </div>
                      {isProcessingFile && <p className="text-xs text-blue-600 mt-1">Verarbeite Datei...</p>}
                    </div>

                    {generationError && (
                      <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
                        <AlertCircle size={16} />
                        {generationError}
                      </div>
                    )}

                    <button
                      onClick={handleGenerateDescription}
                      disabled={isGenerating}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#003399] text-white rounded-lg hover:bg-[#003399]/90 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {isGenerating ? (
                        <>
                          <RefreshCw className="animate-spin" size={18} />
                          {t.buttons.generating}
                        </>
                      ) : (
                        <>
                          <Wand2 size={18} />
                          {t.buttons.generate}
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Saved Descriptions List */}
                {partner.generatedDescriptions && partner.generatedDescriptions.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-900 flex items-center gap-2">
                      <HistoryIcon size={18} />
                      Gespeicherte Versionen
                    </h3>
                    <div className="space-y-3">
                      {[...partner.generatedDescriptions]
                        .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
                        .map((desc) => (
                          <div key={desc.id} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors shadow-sm group">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h4 className="font-medium text-gray-900">{desc.title}</h4>
                                <p className="text-xs text-gray-500">{new Date(desc.generatedAt).toLocaleDateString()} • {desc.wordCount} Wörter</p>
                              </div>
                              <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleCopyDescription(desc.content, desc.id)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 rounded bg-gray-50 hover:bg-blue-50"
                                  title="Kopieren"
                                >
                                  {copiedId === desc.id ? <Check size={14} /> : <Copy size={14} />}
                                </button>
                                <button
                                  onClick={() => {
                                    // Load into editor/preview
                                    setGeneratedDescription(desc.content);
                                    setDescriptionTitle(desc.title);
                                    setEditingDescriptionId(desc.id);
                                  }}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 rounded bg-gray-50 hover:bg-blue-50"
                                  title="Bearbeiten"
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteDescription(desc.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 rounded bg-gray-50 hover:bg-red-50"
                                  title="Löschen"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-3 mb-2">{desc.content}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Side: Preview & Editor */}
              <div className="space-y-6">
                {generatedDescription ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col h-full min-h-[500px]">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                      <input
                        type="text"
                        value={descriptionTitle}
                        onChange={(e) => setDescriptionTitle(e.target.value)}
                        className="bg-transparent border-none text-gray-900 font-semibold focus:ring-0 p-0 w-full mr-4"
                        placeholder="Titel für diese Version..."
                      />
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {generatedDescription.split(/\s+/).filter(w => w.length > 0).length} Wörter
                        </span>
                        {editingDescriptionId && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            Bearbeitet Version
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto">
                      {manualEditId === "preview" || (editingDescriptionId && manualEditId === editingDescriptionId) ? (
                        <textarea
                          value={manualEditText}
                          onChange={(e) => setManualEditText(e.target.value)}
                          className="w-full h-full min-h-[300px] p-4 text-gray-800 leading-relaxed border-0 focus:ring-0 resize-none font-serif text-lg"
                        />
                      ) : (
                        <div className="prose prose-blue max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap font-serif text-lg">
                          {generatedDescription}
                        </div>
                      )}
                    </div>

                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 space-y-4">
                      {/* Action Buttons Row */}
                      <div className="flex justify-between items-center">
                        <div className="flex gap-2">
                          {manualEditId ? (
                            <button
                              onClick={handleSaveManualEdit}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                            >
                              <Check size={16} /> Fertig
                            </button>
                          ) : (
                            <button
                              onClick={() => handleStartManualEdit(editingDescriptionId || "preview", generatedDescription)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                            >
                              <Edit size={16} /> Manuell bearbeiten
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCopyDescription(generatedDescription, "preview")}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                          >
                            {copiedId === "preview" ? <Check size={16} /> : <Copy size={16} />}
                            Kopieren
                          </button>
                          <button
                            onClick={handleSaveDescription}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-[#003399] text-white rounded-lg text-sm hover:bg-[#003399]/90 shadow-sm"
                          >
                            <Check size={16} />
                            {editingDescriptionId ? "Änderungen speichern" : "Speichern"}
                          </button>
                        </div>
                      </div>

                      {/* AI Correction Input */}
                      <div className="relative">
                        <div className={`flex items-center gap-2 p-2 rounded-lg border transition-colors ${correctionMode ? 'bg-white border-blue-500 ring-1 ring-blue-500' : 'bg-white border-gray-300 hover:border-gray-400'}`}>
                          <MessageSquare className="text-gray-400 ml-2" size={18} />
                          <input
                            type="text"
                            value={correctionInstruction}
                            onChange={(e) => {
                              setCorrectionInstruction(e.target.value);
                              setCorrectionMode(true);
                            }}
                            placeholder="KI-Anweisung zur Überarbeitung..."
                            className="flex-1 border-none focus:ring-0 text-gray-800 placeholder-gray-400 bg-transparent text-sm"
                            onKeyDown={(e) => e.key === "Enter" && handleCorrectDescription()}
                            onFocus={() => setCorrectionMode(true)}
                            onBlur={() => !correctionInstruction && setCorrectionMode(false)}
                          />
                          {correctionInstruction && (
                            <button
                              onClick={() => handleCorrectDescription()}
                              disabled={isCorrecting}
                              className="p-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                              {isCorrecting ? <RefreshCw className="animate-spin" size={14} /> : <Send size={14} />}
                            </button>
                          )}
                        </div>
                        {correctionError && <p className="text-xs text-red-600 mt-1 ml-1">{correctionError}</p>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                    <Sparkles className="w-12 h-12 mb-4 text-gray-300" />
                    <p className="font-medium">Noch keine Beschreibung generiert</p>
                    <p className="text-sm mt-1 max-w-xs">{t.aiDescriptions.intro}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* DOCUMENTS TAB */}
        {activeTab === "documents" && (
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText size={20} />
              {t.documents.title}
            </h2>

            {/* Upload Area */}
            <div className="mb-8">
              <DocumentUploadDialog
                partnerId={partnerId}
                onUploadComplete={handleDocumentUploadComplete}
                trigger={
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-[#003399] hover:bg-blue-50/30 transition-colors cursor-pointer">
                    <Upload className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                    <p className="font-medium text-gray-700 mb-1">
                      {t.documents.dragFiles}
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      PDF, DOCX, JPG, PNG oder Website-URL
                    </p>
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#003399] text-white rounded-lg text-sm font-medium hover:bg-[#003399]/90 transition-colors">
                      <Plus size={16} />
                      {t.buttons.selectFile} / URL
                    </span>
                  </div>
                }
              />
            </div>

            {/* Error Alert in Documents Tab */}
            {generationError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
                <AlertCircle size={20} className="text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-red-800 font-medium">{generationError}</p>
                </div>
                <button
                  onClick={() => setGenerationError(null)}
                  className="text-red-400 hover:text-red-600"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            {/* Knowledge Compilation Section Header */}
            {partner.uploadedDocuments && partner.uploadedDocuments.length > 0 && (
              <div className="flex items-center justify-between mb-4 border-b pb-2">
                <h3 className="text-md font-bold text-[#003399] flex items-center gap-2">
                  <Sparkles size={18} />
                  Kompiliertes Wissen
                </h3>
                <span className="text-xs text-gray-500 italic">KI-ausgewertete Erkenntnisse aus Ihren Dokumenten</span>
              </div>
            )}

            {/* Uploaded Documents */}
            {partner.uploadedDocuments && partner.uploadedDocuments.length > 0 ? (
              <div className="space-y-4">
                {partner.uploadedDocuments.map((doc) => (
                  <div key={doc.id} className="border rounded-xl overflow-hidden bg-white shadow-sm">
                    <div className="flex items-center justify-between p-4 bg-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-white rounded-lg border flex items-center justify-center text-blue-600 shadow-sm">
                          {doc.name.endsWith(".pdf") ? (
                            <FileText size={20} />
                          ) : doc.name.endsWith(".docx") ? (
                            <FileText size={20} />
                          ) : (
                            <FileText size={20} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{doc.name}</p>
                            {doc.relatedProjectId && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                                Projekt-Bezug
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            {new Date(doc.uploadedAt).toLocaleDateString()} • {doc.type}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {analyzingDocId === doc.id ? (
                          <div className="flex items-center gap-2 text-sm text-blue-600">
                            <RefreshCw className="animate-spin" size={16} />
                            <span className="font-medium">{analysisProgress}%</span>
                          </div>
                        ) : (
                          // For now, re-analysis is integrated into upload/initial processing, but could add re-analyze button.
                          <button
                            onClick={() => handleDeletePartnerDoc(doc.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Löschen"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => setShowSummaryId(showSummaryId === doc.id ? null : doc.id)}
                          className={`p-2 rounded-lg transition-colors ${showSummaryId === doc.id
                            ? "bg-blue-100 text-blue-700"
                            : "text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                            }`}
                        >
                          {showSummaryId === doc.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                      </div>
                    </div>

                    {/* Extracted Summary View */}
                    {showSummaryId === doc.id && (
                      <div className="p-6 bg-white animate-in slide-in-from-top-2">
                        {doc.summary ? (
                          <div className="space-y-6">
                            {/* Executive Summary */}
                            <div>
                              <h4 className="flex items-center gap-2 text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">
                                <Sparkles size={16} className="text-[#003399]" />
                                Executive Summary
                              </h4>
                              <p className="text-gray-700 leading-relaxed bg-blue-50/50 p-4 rounded-lg italic">
                                "{doc.summary.executiveSummary}"
                              </p>
                            </div>

                            {/* Key Findings Grid */}
                            <div>
                              <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-3">Key Findings</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {doc.summary.keyFindings.map((finding, idx) => (
                                  <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-100 hover:border-blue-100 transition-colors">
                                    <div className="flex items-start gap-3">
                                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mt-0.5">
                                        {idx + 1}
                                      </span>
                                      <div>
                                        <p className="font-semibold text-gray-900 text-sm mb-1">{finding.topic}</p>
                                        <p className="text-sm text-gray-600">{finding.finding}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Methodological Approach */}
                            {doc.summary.methodology && (
                              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                                  <Target size={16} className="text-gray-500" />
                                  Methodik & Ansatz
                                </h4>
                                <p className="text-sm text-gray-700">{doc.summary.methodology}</p>
                              </div>
                            )}

                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            {analyzingDocId === doc.id ? (
                              <div className="space-y-3">
                                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
                                <p>Dokument wird analysiert...</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <Info className="w-8 h-8 mx-auto text-gray-300" />
                                <p>Keine KI-Zusammenfassung verfügbar.</p>
                                <p className="text-xs">Das Dokument wurde möglicherweise ohne Analyse hochgeladen oder der Text war zu kurz.</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">{t.documents.noDocsTitle}</h3>
                <p className="text-gray-500 max-w-sm mx-auto mb-6">
                  {t.documents.noDocuments}
                </p>
                <DocumentUploadDialog
                  partnerId={partnerId}
                  onUploadComplete={handleDocumentUploadComplete}
                  trigger={
                    <button className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#003399] text-white rounded-lg font-medium hover:bg-[#003399]/90 transition-colors shadow-sm">
                      <Upload size={18} />
                      {t.buttons.upload}
                    </button>
                  }
                />
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
