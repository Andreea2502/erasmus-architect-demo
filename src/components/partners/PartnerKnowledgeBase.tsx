'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  FileText,
  Sparkles,
  Brain,
  Target,
  Users,
  Globe,
  Calendar,
  ChevronDown,
  ChevronUp,
  Award,
  Lightbulb,
  TrendingUp,
  Building2,
  ExternalLink,
  Download,
  Search,
  Filter,
} from 'lucide-react';
import { Partner, PartnerDocument, StudySummary } from '@/store/types';

// ============================================================================
// TYPES
// ============================================================================

interface PartnerKnowledgeBaseProps {
  partner: Partner;
  language: 'de' | 'en' | string;
  onOpenDocument?: (doc: PartnerDocument) => void;
}

interface AggregatedKnowledge {
  totalDocuments: number;
  totalKeyFindings: number;
  projectTypes: string[];
  methodologies: string[];
  targetGroups: string[];
  expertiseAreas: string[];
  keyThemes: { theme: string; count: number }[];
  allFindings: { topic: string; finding: string; source: string }[];
  allRecommendations: string[];
}

// ============================================================================
// HELPER: Aggregate Knowledge from all Documents
// ============================================================================

function aggregateKnowledge(documents: PartnerDocument[]): AggregatedKnowledge {
  const knowledge: AggregatedKnowledge = {
    totalDocuments: documents.length,
    totalKeyFindings: 0,
    projectTypes: [],
    methodologies: [],
    targetGroups: [],
    expertiseAreas: [],
    keyThemes: [],
    allFindings: [],
    allRecommendations: [],
  };

  const themeCounter: Record<string, number> = {};

  for (const doc of documents) {
    if (!doc.summary) continue;

    // Count findings
    knowledge.totalKeyFindings += doc.summary.keyFindings?.length || 0;

    // Collect all findings with source
    for (const finding of doc.summary.keyFindings || []) {
      knowledge.allFindings.push({
        topic: finding.topic,
        finding: finding.finding,
        source: doc.name,
      });

      // Count themes
      const topic = finding.topic.toLowerCase();
      themeCounter[topic] = (themeCounter[topic] || 0) + 1;
    }

    // Collect methodologies
    if (doc.summary.methodology) {
      knowledge.methodologies.push(doc.summary.methodology);
    }

    // Collect recommendations
    for (const rec of doc.summary.recommendations || []) {
      knowledge.allRecommendations.push(rec);
    }

    // Collect project type
    if (doc.type) {
      if (!knowledge.projectTypes.includes(doc.type)) {
        knowledge.projectTypes.push(doc.type);
      }
    }

    // Collect target groups from keywords
    for (const kw of doc.summary.keyTerms || []) {
      const kwLower = kw.toLowerCase();
      if (kwLower.includes('lehrer') || kwLower.includes('teacher') ||
        kwLower.includes('trainer') || kwLower.includes('educator') ||
        kwLower.includes('student') || kwLower.includes('schüler') ||
        kwLower.includes('erwachsene') || kwLower.includes('adult')) {
        if (!knowledge.targetGroups.includes(kw)) {
          knowledge.targetGroups.push(kw);
        }
      }
    }

    // Keywords as expertise
    for (const kw of doc.summary.keyTerms || []) {
      if (!knowledge.expertiseAreas.includes(kw)) {
        knowledge.expertiseAreas.push(kw);
      }
    }
  }

  // Convert theme counter to sorted array
  knowledge.keyThemes = Object.entries(themeCounter)
    .map(([theme, count]) => ({ theme, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return knowledge;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function PartnerKnowledgeBase({ partner, language, onOpenDocument }: PartnerKnowledgeBaseProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('overview');
  const [showAllFindings, setShowAllFindings] = useState(false);

  const documents = partner.uploadedDocuments || [];
  const descriptions = partner.generatedDescriptions || [];
  const previousProjects = partner.previousProjects || [];

  // Aggregate knowledge from all documents
  const knowledge = useMemo(() => aggregateKnowledge(documents), [documents]);

  // Calculate knowledge completeness
  const knowledgeScore = useMemo(() => {
    let score = 0;
    if (documents.length > 0) score += 25;
    if (documents.length > 2) score += 15;
    if (descriptions.length > 0) score += 20;
    if (previousProjects.length > 0) score += 20;
    if (partner.expertiseAreas && partner.expertiseAreas.length > 0) score += 10;
    if (partner.missionStatement) score += 10;
    return Math.min(score, 100);
  }, [documents, descriptions, previousProjects, partner]);

  const t = {
    title: language === 'de' ? 'Wissensdatenbank' : 'Knowledge Base',
    subtitle: language === 'de'
      ? 'Aggregiertes Wissen aus allen Dokumenten und Beschreibungen'
      : 'Aggregated knowledge from all documents and descriptions',
    overview: language === 'de' ? 'Übersicht' : 'Overview',
    documents: language === 'de' ? 'Dokumente' : 'Documents',
    findings: language === 'de' ? 'Erkenntnisse' : 'Findings',
    expertise: language === 'de' ? 'Expertise' : 'Expertise',
    projects: language === 'de' ? 'Frühere Projekte' : 'Previous Projects',
    knowledgeScore: language === 'de' ? 'Wissens-Score' : 'Knowledge Score',
    noDocuments: language === 'de'
      ? 'Noch keine Dokumente hochgeladen. Laden Sie Projektberichte, Partner-Beschreibungen oder andere relevante Dokumente hoch.'
      : 'No documents uploaded yet. Upload project reports, partner descriptions or other relevant documents.',
    keyThemes: language === 'de' ? 'Hauptthemen' : 'Key Themes',
    methodologies: language === 'de' ? 'Methodiken' : 'Methodologies',
    recommendations: language === 'de' ? 'Empfehlungen' : 'Recommendations',
    showAll: language === 'de' ? 'Alle anzeigen' : 'Show all',
    showLess: language === 'de' ? 'Weniger anzeigen' : 'Show less',
  };

  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="space-y-6">
      {/* Header with Knowledge Score */}
      <div className="bg-gradient-to-r from-[#003399]/10 to-purple-500/10 rounded-xl p-6 border border-[#003399]/20">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Brain className="h-6 w-6 text-[#003399]" />
              {t.title}
            </h2>
            <p className="text-sm text-gray-600 mt-1">{t.subtitle}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">{t.knowledgeScore}</div>
            <div className="flex items-center gap-2">
              <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${knowledgeScore >= 70 ? 'bg-green-500' :
                    knowledgeScore >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                  style={{ width: `${knowledgeScore}%` }}
                />
              </div>
              <span className="font-bold text-lg">{knowledgeScore}%</span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-white/80 rounded-lg p-3 border">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <FileText className="h-4 w-4" />
              {t.documents}
            </div>
            <div className="text-2xl font-bold text-gray-900">{knowledge.totalDocuments}</div>
          </div>
          <div className="bg-white/80 rounded-lg p-3 border">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Lightbulb className="h-4 w-4" />
              {t.findings}
            </div>
            <div className="text-2xl font-bold text-gray-900">{knowledge.totalKeyFindings}</div>
          </div>
          <div className="bg-white/80 rounded-lg p-3 border">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Award className="h-4 w-4" />
              {t.projects}
            </div>
            <div className="text-2xl font-bold text-gray-900">{previousProjects.length}</div>
          </div>
          <div className="bg-white/80 rounded-lg p-3 border">
            <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
              <Sparkles className="h-4 w-4" />
              KI-Beschreibungen
            </div>
            <div className="text-2xl font-bold text-gray-900">{descriptions.length}</div>
          </div>
        </div>
      </div>

      {/* No Documents Message */}
      {documents.length === 0 && descriptions.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed">
          <BookOpen className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 max-w-md mx-auto">{t.noDocuments}</p>
        </div>
      )}

      {/* Key Themes */}
      {knowledge.keyThemes.length > 0 && (
        <Card>
          <CardHeader
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleSection('themes')}
          >
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#003399]" />
                {t.keyThemes}
              </span>
              {expandedSection === 'themes' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </CardTitle>
          </CardHeader>
          {expandedSection === 'themes' && (
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {knowledge.keyThemes.map((theme, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className="px-3 py-1.5 text-sm flex items-center gap-1"
                  >
                    {theme.theme}
                    <span className="ml-1 px-1.5 py-0.5 bg-[#003399]/10 text-[#003399] rounded-full text-xs font-bold">
                      {theme.count}
                    </span>
                  </Badge>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Key Findings */}
      {knowledge.allFindings.length > 0 && (
        <Card>
          <CardHeader
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleSection('findings')}
          >
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                {t.findings} ({knowledge.allFindings.length})
              </span>
              {expandedSection === 'findings' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </CardTitle>
          </CardHeader>
          {expandedSection === 'findings' && (
            <CardContent className="space-y-3">
              {(showAllFindings ? knowledge.allFindings : knowledge.allFindings.slice(0, 5)).map((finding, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-lg border hover:border-[#003399]/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center text-sm font-bold">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 mb-1">{finding.topic}</div>
                      <p className="text-sm text-gray-600">{finding.finding}</p>
                      <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {finding.source}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {knowledge.allFindings.length > 5 && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllFindings(!showAllFindings);
                  }}
                >
                  {showAllFindings ? t.showLess : `${t.showAll} (${knowledge.allFindings.length - 5} mehr)`}
                </Button>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Methodologies */}
      {knowledge.methodologies.length > 0 && (
        <Card>
          <CardHeader
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleSection('methodologies')}
          >
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-500" />
                {t.methodologies} ({knowledge.methodologies.length})
              </span>
              {expandedSection === 'methodologies' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </CardTitle>
          </CardHeader>
          {expandedSection === 'methodologies' && (
            <CardContent className="space-y-3">
              {knowledge.methodologies.map((methodology, idx) => (
                <div key={idx} className="p-4 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-sm text-gray-700">{methodology}</p>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Recommendations */}
      {knowledge.allRecommendations.length > 0 && (
        <Card>
          <CardHeader
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleSection('recommendations')}
          >
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                {t.recommendations} ({knowledge.allRecommendations.length})
              </span>
              {expandedSection === 'recommendations' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </CardTitle>
          </CardHeader>
          {expandedSection === 'recommendations' && (
            <CardContent>
              <ul className="space-y-2">
                {knowledge.allRecommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-purple-500 mt-1">→</span>
                    <span className="text-gray-700">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          )}
        </Card>
      )}

      {/* Expertise Areas */}
      {knowledge.expertiseAreas.length > 0 && (
        <Card>
          <CardHeader
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleSection('expertise')}
          >
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Award className="h-5 w-5 text-blue-500" />
                {t.expertise}
              </span>
              {expandedSection === 'expertise' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </CardTitle>
          </CardHeader>
          {expandedSection === 'expertise' && (
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {knowledge.expertiseAreas.slice(0, 20).map((area, idx) => (
                  <Badge key={idx} className="bg-blue-50 text-blue-700 border-blue-200">
                    {area}
                  </Badge>
                ))}
                {knowledge.expertiseAreas.length > 20 && (
                  <Badge variant="outline">+{knowledge.expertiseAreas.length - 20} mehr</Badge>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Document List */}
      {documents.length > 0 && (
        <Card>
          <CardHeader
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleSection('documents')}
          >
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-500" />
                {t.documents} ({documents.length})
              </span>
              {expandedSection === 'documents' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </CardTitle>
          </CardHeader>
          {expandedSection === 'documents' && (
            <CardContent className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => onOpenDocument?.(doc)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg border flex items-center justify-center">
                      <FileText className="h-5 w-5 text-[#003399]" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{doc.name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {new Date(doc.uploadedAt).toLocaleDateString()}
                        <span>•</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{doc.type}</Badge>
                        {doc.summary && (
                          <>
                            <span>•</span>
                            <span className="text-green-600 flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              KI-analysiert
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {doc.url && (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 text-gray-400 hover:text-[#003399] transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* AI-Generated Descriptions */}
      {descriptions.length > 0 && (
        <Card>
          <CardHeader
            className="cursor-pointer hover:bg-gray-50 transition-colors"
            onClick={() => toggleSection('descriptions')}
          >
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#003399]" />
                KI-Beschreibungen ({descriptions.length})
              </span>
              {expandedSection === 'descriptions' ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </CardTitle>
          </CardHeader>
          {expandedSection === 'descriptions' && (
            <CardContent className="space-y-4">
              {descriptions.map((desc, idx) => (
                <div key={idx} className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="font-semibold text-[#003399] mb-2">{desc.title}</div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{desc.content}</p>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
