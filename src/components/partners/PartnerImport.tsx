"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { Partner, OrganizationType, ExpertiseDomain } from "@/store/types";
import { v4 as uuidv4 } from "uuid";
import {
  ArrowLeft,
  Upload,
  Globe,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from "lucide-react";

type ImportMode = "url" | "text" | "file";

export function PartnerImport() {
  const router = useRouter();
  const addPartner = useAppStore((state) => state.addPartner);

  const [mode, setMode] = useState<ImportMode>("url");
  const [inputValue, setInputValue] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<Partial<Partner> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyzeInput = async () => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    // Simulate AI analysis delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    try {
      // In production, this would call the AI service
      // For demo, we extract basic info from the input
      const extracted = simulateExtraction(inputValue, mode);
      setResult(extracted);
    } catch (e) {
      setError("Could not analyze the input. Please try again or enter data manually.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const savePartner = () => {
    if (!result) return;

    addPartner({
      organizationName: result.organizationName || "Imported Partner",
      acronym: result.acronym,
      country: result.country || "AT",
      city: result.city,
      website: result.website,
      email: result.email,
      organizationType: result.organizationType || "NGO",
      missionStatement: result.missionStatement || "",
      contacts: result.contacts || [],
      expertiseAreas: result.expertiseAreas || [],
      targetGroups: result.targetGroups || [],
      previousProjects: result.previousProjects || [],
      sectorsActive: result.sectorsActive || [],
      workingLanguages: result.workingLanguages || ["en"],
      isNewcomer: result.isNewcomer ?? true,
      tags: ["imported"],
      notes: `Imported from ${mode} on ${new Date().toLocaleDateString()}`,
      dataQuality: 60,
      source: mode === "url" ? inputValue : mode,
    } as Omit<Partner, "id" | "createdAt" | "updatedAt">);

    router.push("/partners");
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push("/partners")}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Partner</h1>
          <p className="text-gray-500">
            Extract partner information from URL, text, or file
          </p>
        </div>
      </div>

      {/* Import Mode Selector */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Import Source</h2>
        <div className="flex gap-3">
          {[
            { id: "url" as ImportMode, label: "Website URL", icon: Globe },
            { id: "text" as ImportMode, label: "Paste Text", icon: FileText },
            { id: "file" as ImportMode, label: "Upload File", icon: Upload },
          ].map((option) => (
            <button
              key={option.id}
              onClick={() => {
                setMode(option.id);
                setInputValue("");
                setResult(null);
                setError(null);
              }}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                mode === option.id
                  ? "border-[#003399] bg-blue-50 text-[#003399]"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <option.icon size={18} />
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="bg-white rounded-xl border p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">
          {mode === "url" && "Enter Website URL"}
          {mode === "text" && "Paste Organization Information"}
          {mode === "file" && "Upload Document"}
        </h2>

        {mode === "url" && (
          <input
            type="url"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="https://www.organization-website.eu"
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#003399] focus:border-transparent text-lg"
          />
        )}

        {mode === "text" && (
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Paste information about the organization here...&#10;&#10;For example:&#10;- Organization name and description&#10;- Contact details&#10;- Previous project experience&#10;- Areas of expertise"
            rows={10}
            className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#003399] focus:border-transparent"
          />
        )}

        {mode === "file" && (
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">
              Drag & drop a file here, or click to browse
            </p>
            <p className="text-sm text-gray-400">
              Supports PDF, Word, and image files
            </p>
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setInputValue(file.name);
                }
              }}
              className="hidden"
              id="file-upload"
              accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            />
            <label
              htmlFor="file-upload"
              className="inline-block mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer"
            >
              Choose File
            </label>
            {inputValue && (
              <p className="mt-4 text-sm text-green-600">
                Selected: {inputValue}
              </p>
            )}
          </div>
        )}

        <button
          onClick={analyzeInput}
          disabled={!inputValue || isAnalyzing}
          className="mt-4 flex items-center gap-2 px-6 py-3 bg-[#003399] text-white rounded-lg hover:bg-[#002266] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Analyzing with AI...
            </>
          ) : (
            <>
              <Sparkles size={18} />
              Analyze & Extract
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="text-red-600 shrink-0" size={20} />
          <div>
            <p className="font-medium text-red-800">Analysis Failed</p>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="text-green-600" size={20} />
            <h2 className="font-semibold text-gray-900">Extracted Information</h2>
          </div>

          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  value={result.organizationName || ""}
                  onChange={(e) =>
                    setResult((prev) => ({ ...prev, organizationName: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={result.country || ""}
                  onChange={(e) =>
                    setResult((prev) => ({ ...prev, country: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Mission Statement
              </label>
              <textarea
                value={result.missionStatement || ""}
                onChange={(e) =>
                  setResult((prev) => ({ ...prev, missionStatement: e.target.value }))
                }
                rows={3}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-500 mb-1">
                Website
              </label>
              <input
                type="url"
                value={result.website || ""}
                onChange={(e) =>
                  setResult((prev) => ({ ...prev, website: e.target.value }))
                }
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            {result.expertiseAreas && result.expertiseAreas.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  Detected Expertise
                </label>
                <div className="flex flex-wrap gap-2">
                  {result.expertiseAreas.map((exp) => (
                    <span
                      key={exp.id}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {exp.domain.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.previousProjects && result.previousProjects.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  Detected Previous Projects
                </label>
                <ul className="space-y-1">
                  {result.previousProjects.map((proj) => (
                    <li key={proj.id} className="text-sm text-gray-700">
                      • {proj.title} ({proj.year}, {proj.role})
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t">
            <button
              onClick={savePartner}
              className="flex items-center gap-2 px-6 py-2 bg-[#003399] text-white rounded-lg hover:bg-[#002266]"
            >
              <CheckCircle size={18} />
              Save Partner
            </button>
            <button
              onClick={() => router.push(`/partners/new`)}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Edit Before Saving
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Simulated extraction for demo purposes
function simulateExtraction(input: string, mode: ImportMode): Partial<Partner> {
  const lowerInput = input.toLowerCase();

  // Try to detect organization name
  let orgName = "Imported Organization";
  let country = "AT";
  let city = "";
  let orgType: OrganizationType = "NGO";
  const expertise: { id: string; domain: ExpertiseDomain; description: string; level: 1|2|3|4|5 }[] = [];
  const projects: { id: string; title: string; programme: string; year: number; role: "COORDINATOR" | "PARTNER" }[] = [];

  // Detect country from domain or text
  if (lowerInput.includes(".de") || lowerInput.includes("germany") || lowerInput.includes("deutschland")) {
    country = "DE";
  } else if (lowerInput.includes(".at") || lowerInput.includes("austria") || lowerInput.includes("österreich")) {
    country = "AT";
  } else if (lowerInput.includes(".es") || lowerInput.includes("spain") || lowerInput.includes("españa")) {
    country = "ES";
  } else if (lowerInput.includes(".it") || lowerInput.includes("italy") || lowerInput.includes("italia")) {
    country = "IT";
  } else if (lowerInput.includes(".pl") || lowerInput.includes("poland") || lowerInput.includes("polska")) {
    country = "PL";
  } else if (lowerInput.includes(".fr") || lowerInput.includes("france")) {
    country = "FR";
  }

  // Detect organization type
  if (lowerInput.includes("university") || lowerInput.includes("universität") || lowerInput.includes("universidad")) {
    orgType = "HIGHER_EDUCATION";
    orgName = "University";
  } else if (lowerInput.includes("school") || lowerInput.includes("schule")) {
    orgType = "SCHOOL";
    orgName = "School";
  } else if (lowerInput.includes("vet") || lowerInput.includes("vocational") || lowerInput.includes("berufs")) {
    orgType = "VET_PROVIDER";
    orgName = "VET Provider";
  } else if (lowerInput.includes("research") || lowerInput.includes("forschung")) {
    orgType = "RESEARCH_INSTITUTE";
    orgName = "Research Institute";
  } else if (lowerInput.includes("sme") || lowerInput.includes("gmbh") || lowerInput.includes("company")) {
    orgType = "SME";
    orgName = "Company";
  }

  // Detect expertise
  if (lowerInput.includes("digital") || lowerInput.includes("technology") || lowerInput.includes("it")) {
    expertise.push({ id: uuidv4(), domain: "DIGITAL_TOOLS", description: "Digital technology expertise", level: 4 });
  }
  if (lowerInput.includes("training") || lowerInput.includes("education") || lowerInput.includes("learning")) {
    expertise.push({ id: uuidv4(), domain: "TRAINING_DELIVERY", description: "Training and education delivery", level: 4 });
  }
  if (lowerInput.includes("research") || lowerInput.includes("evaluation") || lowerInput.includes("study")) {
    expertise.push({ id: uuidv4(), domain: "RESEARCH_EVALUATION", description: "Research and evaluation", level: 3 });
  }
  if (lowerInput.includes("youth") || lowerInput.includes("young") || lowerInput.includes("jugend")) {
    expertise.push({ id: uuidv4(), domain: "TARGET_GROUP_ACCESS", description: "Access to youth target groups", level: 4 });
  }

  // Detect projects
  if (lowerInput.includes("erasmus") || lowerInput.includes("ka2") || lowerInput.includes("eu project")) {
    projects.push({
      id: uuidv4(),
      title: "Previous Erasmus+ Project",
      programme: "ERASMUS_KA2",
      year: 2022,
      role: "PARTNER",
    });
  }

  // Try to extract URL as website
  const urlMatch = input.match(/https?:\/\/[^\s]+/);
  const website = urlMatch ? urlMatch[0] : undefined;

  // Extract email if present
  const emailMatch = input.match(/[\w.-]+@[\w.-]+\.\w+/);
  const email = emailMatch ? emailMatch[0] : undefined;

  return {
    organizationName: orgName,
    country,
    city,
    organizationType: orgType,
    website,
    email,
    missionStatement: `Organization focused on ${orgType === "HIGHER_EDUCATION" ? "higher education and research" : orgType === "VET_PROVIDER" ? "vocational education and training" : "education and development"}.`,
    expertiseAreas: expertise,
    previousProjects: projects,
    isNewcomer: projects.length === 0,
    sectorsActive: orgType === "VET_PROVIDER" ? ["VET"] : orgType === "SCHOOL" ? ["SCH"] : ["ADU"],
    workingLanguages: ["en"],
  };
}
