"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAppStore } from "@/store/app-store";
import { useLanguageStore } from "@/store/language-store";
import { t, Language, LANGUAGE_NAMES, LANGUAGE_FLAGS } from "@/lib/i18n";
import {
  generateNeedsAnalysis,
  chatWithAssistant,
  translateText,
  NeedsAnalysis,
} from "@/lib/ai-service";
import {
  SECTOR_LABELS,
  ACTION_TYPE_LABELS,
  COUNTRY_NAMES,
  ORGANIZATION_TYPE_LABELS,
} from "@/store/types";
import {
  Bot,
  Send,
  Loader2,
  Lightbulb,
  FileText,
  Users,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Languages,
  Target,
  BarChart3,
  Wand2,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

type AssistantMode = "chat" | "needs" | "translate";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Study {
  id: string;
  title: string;
  keyFindings: string;
}

export function AIAssistant() {
  const partners = useAppStore((state) => state.partners);
  const projects = useAppStore((state) => state.projects);
  const currentProjectId = useAppStore((state) => state.currentProjectId);

  // Global language from store with hydration fix
  const { language: storeLanguage, setLanguage } = useLanguageStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hydration-safe language
  const language: Language = mounted ? storeLanguage : "de";

  const [mode, setMode] = useState<AssistantMode>("chat");
  const [isLoading, setIsLoading] = useState(false);

  // Chat Mode
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: t("chatWelcome", language),
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Concepts Mode
  const [selectedPartners, setSelectedPartners] = useState<string[]>([]);
  const [actionType, setActionType] = useState<"KA210" | "KA220">("KA220");
  const [sector, setSector] = useState<string>("VET");
  const [budget, setBudget] = useState(250000);
  const [duration, setDuration] = useState(24);
  const [themeIdeas, setThemeIdeas] = useState("");
  const [studies, setStudies] = useState<Study[]>([]);

  // Needs Mode
  const [needsTopic, setNeedsTopic] = useState("");
  const [needsResult, setNeedsResult] = useState<NeedsAnalysis | null>(null);

  // Translate Mode
  const [translateInput, setTranslateInput] = useState("");
  const [translateOutput, setTranslateOutput] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("en");

  // Update chat welcome when language changes
  useEffect(() => {
    setMessages([
      {
        id: "1",
        role: "assistant",
        content: t("chatWelcome", language),
        timestamp: new Date(),
      },
    ]);
  }, [language]);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ============================================================================
  // CHAT MODE
  // ============================================================================
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      const currentProject = projects.find((p) => p.id === currentProjectId);
      const response = await chatWithAssistant(
        inputValue,
        {
          actionType: currentProject?.actionType,
          sector: currentProject?.sector,
          budget: currentProject?.budgetTier,
          partnerCount: currentProject?.consortium.length || partners.length,
          additionalInfo: currentProject
            ? `Aktuelles Projekt: ${currentProject.acronym || currentProject.title}`
            : undefined,
        },
        language
      );

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: t("error", language) + ": " + (error as Error).message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // NEEDS MODE
  // ============================================================================
  const handleGenerateNeeds = async () => {
    if (!needsTopic.trim()) return;

    setIsLoading(true);
    setNeedsResult(null);

    try {
      const countries = selectedPartners
        .map((id) => partners.find((p) => p.id === id)?.country)
        .filter(Boolean) as string[];

      const result = await generateNeedsAnalysis(
        {
          topic: needsTopic,
          sector: SECTOR_LABELS[sector as keyof typeof SECTOR_LABELS] || sector,
          targetGroups: ["Lehrkräfte", "Auszubildende", "Erwachsene Lernende"],
          countries: countries.length > 0 ? countries.map(c => COUNTRY_NAMES[c] || c) : ["Deutschland", "Österreich", "Spanien"],
          studies: studies.length > 0 ? studies : undefined,
        },
        language
      );

      setNeedsResult(result);
    } catch (error) {
      console.error("Needs analysis error:", error);
      alert(t("error", language) + ": " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // TRANSLATE MODE
  // ============================================================================
  const handleTranslate = async () => {
    if (!translateInput.trim()) return;

    setIsLoading(true);
    try {
      const result = await translateText(
        translateInput,
        targetLanguage,
        "Erasmus+ Projektantrag"
      );
      setTranslateOutput(result);
    } catch (error) {
      console.error("Translation error:", error);
      alert(t("error", language) + ": " + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-[#003399] to-[#0055cc] text-white rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#ffcc00] rounded-lg flex items-center justify-center">
            <Bot size={24} className="text-[#003399]" />
          </div>
          <div>
            <h2 className="font-bold">{t("erasmusAssistant", language)}</h2>
            <p className="text-xs text-blue-200">{t("programGuide", language)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Languages size={16} />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as Language)}
            className="bg-white/20 border-0 rounded px-2 py-1 text-sm text-white"
          >
            {(Object.keys(LANGUAGE_NAMES) as Language[]).slice(0, 8).map((l) => (
              <option key={l} value={l} className="text-gray-900">
                {LANGUAGE_FLAGS[l]} {LANGUAGE_NAMES[l]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex border-b bg-gray-50">
        {[
          { id: "chat" as AssistantMode, label: t("chat", language), icon: Bot },
          { id: "needs" as AssistantMode, label: t("needsAnalysis", language), icon: Target },
          { id: "translate" as AssistantMode, label: t("translate", language), icon: Languages },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm font-medium transition-colors ${mode === tab.id
                ? "bg-white text-[#003399] border-b-2 border-[#003399]"
                : "text-gray-500 hover:text-gray-700"
              }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* CHAT MODE */}
        {mode === "chat" && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${msg.role === "user"
                        ? "bg-[#003399] text-white"
                        : "bg-gray-100 text-gray-800"
                      }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-50 mt-1">
                      {mounted ? msg.timestamp.toLocaleTimeString() : ""}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-4 py-2">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder={t("chatPlaceholder", language)}
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#003399]"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading}
                  className="px-4 py-2 bg-[#003399] text-white rounded-lg hover:bg-[#002266] disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* NEEDS MODE */}
        {mode === "needs" && (
          <div className="p-4 space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-medium text-yellow-800 mb-1 flex items-center gap-2">
                <Target size={18} />
                {t("needsAnalysisGenerator", language)}
              </h3>
              <p className="text-sm text-yellow-700">
                {t("needsAnalysisDesc", language)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("topicProblemArea", language)}
              </label>
              <textarea
                value={needsTopic}
                onChange={(e) => setNeedsTopic(e.target.value)}
                placeholder={t("topicPlaceholder", language)}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            <button
              onClick={handleGenerateNeeds}
              disabled={isLoading || !needsTopic.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#003399] text-white rounded-lg hover:bg-[#002266] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t("analyzingNeeds", language)}
                </>
              ) : (
                <>
                  <BarChart3 size={18} />
                  {t("createNeedsAnalysis", language)}
                </>
              )}
            </button>

            {needsResult && (
              <div className="border rounded-lg p-4 space-y-4 bg-white">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">{t("problemStatement", language)}</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded">{needsResult.problemStatement}</p>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">{t("rootCauses", language)}</h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {needsResult.rootCauses.map((cause, i) => (
                      <li key={i}>{cause}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">{t("statistics", language)}</h4>
                  <div className="space-y-2">
                    {needsResult.statistics.map((stat, i) => (
                      <div key={i} className="bg-blue-50 p-3 rounded">
                        <p className="text-blue-800 font-medium">{stat.fact}</p>
                        <p className="text-blue-600 text-sm">
                          {t("source", language)}: {stat.source} ({stat.year})
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">{t("gapsLuecken", language)}</h4>
                  <ul className="list-disc list-inside text-gray-700 space-y-1">
                    {needsResult.gaps.map((gap, i) => (
                      <li key={i}>{gap}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-green-50 p-3 rounded">
                  <h4 className="font-medium text-green-800 mb-1">{t("europeanDimension", language)}</h4>
                  <p className="text-green-700">{needsResult.europeanDimension}</p>
                </div>

                <div className="bg-red-50 p-3 rounded">
                  <h4 className="font-medium text-red-800 mb-1">{t("urgency", language)}</h4>
                  <p className="text-red-700">{needsResult.urgency}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TRANSLATE MODE */}
        {mode === "translate" && (
          <div className="p-4 space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-medium text-purple-800 mb-1 flex items-center gap-2">
                <Languages size={18} />
                {t("projectTranslator", language)}
              </h3>
              <p className="text-sm text-purple-700">
                {t("translateDesc", language)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("targetLanguage", language)}
              </label>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {(Object.keys(LANGUAGE_NAMES) as Language[]).map((l) => (
                  <option key={l} value={l}>
                    {LANGUAGE_FLAGS[l]} {LANGUAGE_NAMES[l]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("sourceText", language)}
              </label>
              <textarea
                value={translateInput}
                onChange={(e) => setTranslateInput(e.target.value)}
                placeholder={t("sourceTextPlaceholder", language)}
                rows={6}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>

            <button
              onClick={handleTranslate}
              disabled={isLoading || !translateInput.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#003399] text-white rounded-lg hover:bg-[#002266] disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t("translating", language)}
                </>
              ) : (
                <>
                  <Languages size={18} />
                  {t("translateBtn", language)}
                </>
              )}
            </button>

            {translateOutput && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("translation", language)} ({LANGUAGE_NAMES[targetLanguage as Language]})
                </label>
                <textarea
                  value={translateOutput}
                  readOnly
                  rows={6}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
