"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { AppShell } from "@/components/layout/AppShell";
import { ConceptDeveloper } from "@/components/concept/ConceptDeveloper";
import { StarsExposeDeveloper } from "@/components/stars/StarsExposeDeveloper";
import { Lightbulb, Star, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

type ConceptMode = 'classic' | 'stars';

function ModeSelector({ mode, onSelect }: { mode: ConceptMode | null; onSelect: (m: ConceptMode) => void }) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Neues Projekt starten</h1>
        <p className="text-gray-500">Wähle den Modus, der am besten zu deinem Vorhaben passt</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Classic Mode */}
        <button
          onClick={() => onSelect('classic')}
          className={`group relative text-left p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-xl ${
            mode === 'classic'
              ? 'border-amber-400 bg-amber-50/50 shadow-lg shadow-amber-100'
              : 'border-gray-200 hover:border-amber-300 bg-white'
          }`}
        >
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${mode === 'classic' ? 'bg-amber-500 text-white' : 'bg-amber-100 text-amber-600 group-hover:bg-amber-200'} transition-colors`}>
              <Lightbulb size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Konzeptentwickler</h3>
              <p className="text-sm text-gray-500 mb-3">Von der Idee zum Konzept in 6 Schritten</p>
              <div className="space-y-2">
                {['3 KI-Konzeptvorschläge zur Auswahl', 'SMART-Ziele mit Indikatoren', 'WP-Struktur automatisch generiert', 'Schneller Konzeptentwurf (800-1000 Wörter)'].map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle2 size={14} className="text-amber-500 flex-shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {mode === 'classic' && (
            <div className="absolute top-3 right-3 bg-amber-500 text-white text-xs px-2 py-1 rounded-full font-medium">
              Ausgewählt
            </div>
          )}
        </button>

        {/* STARS Mode */}
        <button
          onClick={() => onSelect('stars')}
          className={`group relative text-left p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-xl ${
            mode === 'stars'
              ? 'border-indigo-400 bg-indigo-50/50 shadow-lg shadow-indigo-100'
              : 'border-gray-200 hover:border-indigo-300 bg-white'
          }`}
        >
          <div className="absolute -top-3 -right-2">
            <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1">
              <Sparkles size={12} /> NEU
            </span>
          </div>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${mode === 'stars' ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200'} transition-colors`}>
              <Star size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Projekt-Exposé</h3>
              <p className="text-sm text-gray-500 mb-3">Professionelles Exposé im STARS-Format</p>
              <div className="space-y-2">
                {['Narratives Storytelling (Challenge → Opportunity → Response)', 'Strategische Ziele mit Rationale-Begründung', 'Hierarchische Zielgruppenanalyse (4 Ebenen)', 'Benannte methodologische Prinzipien'].map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                    <CheckCircle2 size={14} className="text-indigo-500 flex-shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {mode === 'stars' && (
            <div className="absolute top-3 right-3 bg-indigo-500 text-white text-xs px-2 py-1 rounded-full font-medium">
              Ausgewählt
            </div>
          )}
        </button>
      </div>

      {mode && (
        <div className="mt-6 text-center">
          <button
            onClick={() => onSelect(mode)}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all ${
              mode === 'stars'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
            }`}
          >
            Jetzt starten <ArrowRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

function NewProjectContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const resumeId = searchParams.get('resume');
  const modeParam = searchParams.get('mode') as ConceptMode | null;

  // If there's a resume param or mode param, go directly to that mode
  const [activeMode, setActiveMode] = useState<ConceptMode | null>(modeParam || (resumeId ? 'classic' : null));
  const [showSelector, setShowSelector] = useState(!modeParam && !resumeId);

  useEffect(() => {
    if (modeParam) {
      setActiveMode(modeParam);
      setShowSelector(false);
    }
  }, [modeParam]);

  const handleModeSelect = (mode: ConceptMode) => {
    if (activeMode === mode && !showSelector) return; // Already in this mode
    setActiveMode(mode);
    if (showSelector && activeMode === mode) {
      // Second click on same mode = confirm
      setShowSelector(false);
      router.replace(`/projects/new?mode=${mode}`);
    }
  };

  // Show selector if no mode chosen yet
  if (showSelector) {
    return (
      <div className="p-6 pt-12">
        <ModeSelector mode={activeMode} onSelect={handleModeSelect} />
      </div>
    );
  }

  // Render the appropriate developer
  if (activeMode === 'stars') {
    return (
      <div className="p-6">
        <StarsExposeDeveloper
          resumeProjectId={resumeId || undefined}
          onSwitchMode={() => { setShowSelector(true); setActiveMode(null); }}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <ConceptDeveloper resumeProjectId={resumeId || undefined} />
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="p-8 text-center text-gray-400">Laden...</div>}>
        <NewProjectContent />
      </Suspense>
    </AppShell>
  );
}
