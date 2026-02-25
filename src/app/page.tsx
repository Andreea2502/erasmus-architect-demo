"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { useAppStore } from "@/store/app-store";
import { useLanguageStore } from "@/store/language-store";
import { t, Language } from "@/lib/i18n";
import {
  SECTOR_LABELS,
  ACTION_TYPE_LABELS,
  COUNTRY_NAMES,
} from "@/store/types";
import {
  Users,
  FolderKanban,
  Plus,
  ArrowRight,
  Globe,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
  Sparkles,
  Rocket,
  Zap,
  BookOpen,
  Target,
  ChevronRight,
  Play,
} from "lucide-react";

export default function DashboardPage() {
  const partners = useAppStore((state) => state.partners);
  const projects = useAppStore((state) => state.projects);
  const { language: storeLanguage } = useLanguageStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const language: Language = mounted ? storeLanguage : "de";

  // Calculate stats
  const totalPartners = partners.length;
  const totalProjects = projects.length;
  const activeProjects = projects.filter((p) => p.status === "IN_PROGRESS").length;

  const recentPartners = [...partners]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);

  // Quick Actions für Neulinge
  const quickActions = [
    {
      title: "Partner importieren",
      description: "KI analysiert Websites & CSV",
      icon: Users,
      href: "/partners/smart-import",
      color: "from-blue-500 to-blue-600",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      title: "Projekt generieren",
      description: "12-Schritte KI-Pipeline",
      icon: Rocket,
      href: "/generator",
      color: "from-orange-500 to-red-500",
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
      highlight: true,
    },
    {
      title: "Wissen hochladen",
      description: "Programmleitfaden & Studien",
      icon: BookOpen,
      href: "/knowledge",
      color: "from-green-500 to-emerald-500",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
  ];


  return (
    <AppShell>
      <div className="space-y-8 max-w-7xl mx-auto">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {t("welcome", language).replace("Erasmus+ Architect", "")}
              <span className="bg-gradient-to-r from-[#003399] to-[#0055cc] bg-clip-text text-transparent">
                Erasmus+ Architect
              </span>
            </h1>
            <p className="text-gray-500 mt-1">
              Dein KI-gestützter Projektassistent für erfolgreiche EU-Anträge
            </p>
          </div>
        </div>

        {/* Main CTA - Project Generator */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#003399] via-[#0044aa] to-[#0055cc] rounded-3xl p-8 text-white shadow-xl">
          {/* Background decorations */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-[#ffcc00]/10 rounded-full blur-2xl" />

          <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="flex-1 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full text-sm mb-4">
                <Zap size={14} className="text-[#ffcc00]" />
                <span className="font-medium">{t('aiPowered', language)}</span>
                <span className="w-1 h-1 rounded-full bg-white/50" />
                <span className="text-white/80">12-Schritte Pipeline</span>
              </div>

              <h2 className="text-3xl lg:text-4xl font-bold mb-4 leading-tight">
                {t('heroTitle', language)}
              </h2>

              <p className="text-blue-100 text-lg mb-6 leading-relaxed">
                {t('heroSubtitle', language)}
              </p>

              <div className="flex flex-wrap gap-6 text-sm">
                {[
                  { icon: CheckCircle, text: t('step12Pipeline', language) },
                  { icon: Target, text: t('criticalEvaluator', language) },
                  { icon: BookOpen, text: t('ragProgramGuide', language) },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <item.icon size={18} className="text-[#ffcc00]" />
                    <span className="text-white/90">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/generator"
              className="group flex items-center gap-4 px-8 py-5 bg-[#ffcc00] text-[#003399] rounded-2xl font-bold text-lg hover:bg-yellow-400 transition-all shadow-xl hover:shadow-2xl hover:scale-[1.02] whitespace-nowrap"
            >
              <div className="p-3 bg-[#003399]/10 rounded-xl group-hover:bg-[#003399]/20 transition-colors">
                <Play size={24} fill="currentColor" />
              </div>
              <div className="text-left">
                <div className="text-xl">{t('startNow', language).replace(' →', '')}</div>
                <div className="text-sm font-normal text-[#003399]/70">Kostenlos & ohne Registrierung</div>
              </div>
              <ArrowRight size={24} className="ml-2 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>


        {/* Quick Actions Grid */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Schnellzugriff</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, idx) => (
              <Link
                key={idx}
                href={action.href}
                className={`group relative p-5 bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all duration-300 ${
                  action.highlight ? 'ring-2 ring-orange-200 ring-offset-2' : ''
                }`}
              >
                {action.highlight && (
                  <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold rounded-full shadow-lg">
                    EMPFOHLEN
                  </span>
                )}
                <div className={`w-12 h-12 ${action.iconBg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <action.icon size={24} className={action.iconColor} />
                </div>
                <h4 className="font-semibold text-gray-900 mb-1">{action.title}</h4>
                <p className="text-sm text-gray-500">{action.description}</p>
                <ChevronRight size={18} className="absolute top-1/2 right-4 -translate-y-1/2 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Partners */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-xl">
                  <Users size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t("recentPartners", language)}</h3>
                  <p className="text-sm text-gray-500">{totalPartners} gesamt</p>
                </div>
              </div>
              <Link
                href="/partners"
                className="text-sm font-medium text-[#003399] hover:text-[#002266] flex items-center gap-1"
              >
                {t("viewAll", language)} <ArrowRight size={14} />
              </Link>
            </div>

            <div className="divide-y divide-gray-50">
              {recentPartners.length === 0 ? (
                <div className="p-8 text-center">
                  <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 mb-4">{t("noPartners", language)}</p>
                  <Link
                    href="/partners/smart-import"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#003399] text-white text-sm font-medium rounded-lg hover:bg-[#002266] transition-colors"
                  >
                    <Sparkles size={16} />
                    Smart Import starten
                  </Link>
                </div>
              ) : (
                recentPartners.map((partner) => (
                  <Link
                    key={partner.id}
                    href={`/partners/${partner.id}`}
                    className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                      {partner.acronym?.substring(0, 2) || partner.organizationName.substring(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {partner.acronym || partner.organizationName}
                      </p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        <Globe size={12} />
                        {COUNTRY_NAMES[partner.country] || partner.country}
                      </p>
                    </div>
                    {partner.isNewcomer && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                        {t("newcomer", language)}
                      </span>
                    )}
                    <ChevronRight size={16} className="text-gray-300" />
                  </Link>
                ))
              )}
            </div>

            {recentPartners.length > 0 && (
              <div className="p-4 bg-gray-50 border-t">
                <Link
                  href="/partners/new"
                  className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-gray-600 hover:text-[#003399] transition-colors"
                >
                  <Plus size={16} />
                  Neuen Partner hinzufügen
                </Link>
              </div>
            )}
          </div>

          {/* Recent Projects */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-xl">
                  <FolderKanban size={20} className="text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{t("recentProjects", language)}</h3>
                  <p className="text-sm text-gray-500">{activeProjects} aktiv</p>
                </div>
              </div>
              <Link
                href="/projects"
                className="text-sm font-medium text-[#003399] hover:text-[#002266] flex items-center gap-1"
              >
                {t("viewAll", language)} <ArrowRight size={14} />
              </Link>
            </div>

            <div className="divide-y divide-gray-50">
              {recentProjects.length === 0 ? (
                <div className="p-8 text-center">
                  <FolderKanban size={40} className="mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 mb-4">{t("noProjects", language)}</p>
                  <Link
                    href="/generator"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <Rocket size={16} />
                    Mit KI generieren
                  </Link>
                </div>
              ) : (
                recentProjects.map((project) => {
                  const StatusIcon = project.status === "APPROVED" ? CheckCircle
                    : project.status === "IN_PROGRESS" ? Clock
                    : AlertCircle;
                  const statusColors = project.status === "APPROVED"
                    ? "bg-green-100 text-green-700"
                    : project.status === "IN_PROGRESS"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600";

                  return (
                    <Link
                      key={project.id}
                      href={`/projects/${project.id}`}
                      className="flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {project.acronym?.substring(0, 2) || "PR"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {project.acronym || project.title || t('noTitle', language)}
                        </p>
                        <p className="text-sm text-gray-500">
                          {ACTION_TYPE_LABELS[project.actionType]} • €{project.budgetTier.toLocaleString()}
                        </p>
                      </div>
                      <span className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusColors}`}>
                        <StatusIcon size={12} />
                        {project.status === "APPROVED" ? t('statusApproved', language)
                          : project.status === "IN_PROGRESS" ? t('statusInProgress', language)
                          : t('statusDraft', language)}
                      </span>
                      <ChevronRight size={16} className="text-gray-300" />
                    </Link>
                  );
                })
              )}
            </div>

            {recentProjects.length > 0 && (
              <div className="p-4 bg-gray-50 border-t">
                <Link
                  href="/projects/new"
                  className="flex items-center justify-center gap-2 w-full py-2 text-sm font-medium text-gray-600 hover:text-[#003399] transition-colors"
                >
                  <Plus size={16} />
                  Neues Projekt erstellen
                </Link>
              </div>
            )}
          </div>
        </div>


      </div>
    </AppShell>
  );
}
