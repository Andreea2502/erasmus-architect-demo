"use client";

import { useState, useEffect, ReactNode, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Users,
  FolderKanban,
  FileOutput,
  Menu,
  X,
  Home,
  Sparkles,
  Globe,
  ChevronDown,
  ChevronRight,
  Rocket,
  BookOpen,
  Search,
  Settings,
  HelpCircle,
  FileText,
  Upload,
  Plus,
  Zap,
  LayoutDashboard,
  Library,
  ArrowLeft,
  Command,
  Lightbulb,
  BookmarkPlus,
  Calculator,
  FilePen,
} from "lucide-react";
import { useLanguageStore } from "@/store/language-store";
import { useAppStore } from "@/store/app-store";
import { t, Language, LANGUAGE_NAMES, LANGUAGE_FLAGS } from "@/lib/i18n";

interface AppShellProps {
  children: ReactNode;
}

// Navigation structure - simplified and reorganized
const getNavStructure = (language: Language) => ({
  main: [
    {
      href: "/",
      label: t("dashboard", language),
      icon: LayoutDashboard,
      description: language === 'de' ? "Übersicht & Schnellzugriff" : "Overview & Quick Access"
    },
  ],
  create: [
    {
      href: "/generator",
      label: t("projectGenerator", language),
      icon: Rocket,
      color: "orange", // Orange theme for generator
      highlight: true,
      description: language === 'de' ? "KI erstellt deinen Antrag" : "AI creates your application"
    },
    {
      href: "/projects/new",
      label: language === 'de' ? "Konzeptentwickler" : "Concept Developer",
      icon: Lightbulb,
      color: "amber",
      highlight: true,
      description: language === 'de' ? "Von der Idee zum Konzept" : "From idea to concept"
    },
  ],
  manage: [
    {
      href: "/projects",
      label: t("projects", language),
      icon: FolderKanban,
      description: language === 'de' ? "Projektanträge" : "Project applications",
      subItems: [
        { href: "/projects", label: language === 'de' ? "Alle Projekte" : "All Projects", icon: FolderKanban },
        { href: "/projects?tab=drafts", label: language === 'de' ? "Entwürfe" : "Drafts", icon: FilePen },
        { href: "/projects/new", label: language === 'de' ? "Konzeptentwickler" : "Concept Developer", icon: Lightbulb },
      ]
    },
    {
      href: "/partners",
      label: language === 'de' ? "Partner" : "Partners", // Removed "CRM"
      icon: Users,
      description: language === 'de' ? "Konsortium verwalten" : "Manage consortium",
      subItems: [
        { href: "/partners", label: language === 'de' ? "Alle Partner" : "All Partners", icon: Users },
        { href: "/partners/smart-import", label: t("smartImport", language), icon: Sparkles, highlight: true },
        { href: "/partners/new", label: language === 'de' ? "Neuer Partner" : "New Partner", icon: Plus },
      ]
    },
    {
      href: "/library",
      label: language === 'de' ? "Bibliothek" : "Library",
      icon: Library,
      description: language === 'de' ? "Snippets & Konzepte" : "Snippets & Concepts",
      subItems: [
        { href: "/library/concepts", label: language === 'de' ? "Konzepte" : "Concepts", icon: Lightbulb },
        { href: "/library/snippets", label: "Text-Snippets", icon: BookmarkPlus },
      ]
    },
  ],
  tools: [
    {
      href: "/budget",
      label: language === 'de' ? "Budget-Rechner" : "Budget Calculator",
      icon: Calculator,
      description: language === 'de' ? "Lump-Sum Budgettabelle" : "Lump-Sum Budget Table"
    },
    {
      href: "/export",
      label: t("export", language),
      icon: FileOutput,
      description: language === 'de' ? "PDF & Backup" : "PDF & Backup"
    },
  ],
});

// Breadcrumb mapping
const getBreadcrumbs = (pathname: string, language: Language) => {
  const paths = pathname.split('/').filter(Boolean);
  const breadcrumbs: { label: string; href: string }[] = [];

  const pathLabels: Record<string, string> = {
    'partners': t('partnerCRM', language),
    'projects': t('projects', language),
    'knowledge': t('knowledgeHub', language),
    'export': t('export', language),
    'generator': t('projectGenerator', language),
    'new': t('newProject', language),
    'smart-import': t('smartImport', language),
    'import': 'Import',
    'budget': language === 'de' ? 'Budget-Rechner' : 'Budget Calculator',
  };

  let currentPath = '';
  for (const path of paths) {
    currentPath += `/${path}`;
    // Skip dynamic routes (UUIDs)
    if (path.match(/^[a-f0-9-]{36}$/i)) {
      breadcrumbs.push({ label: 'Details', href: currentPath });
    } else {
      breadcrumbs.push({
        label: pathLabels[path] || path,
        href: currentPath
      });
    }
  }

  return breadcrumbs;
};

// Available languages for the header selector
const HEADER_LANGUAGES: Language[] = ["de", "en", "ro", "hr", "pt"];

export function AppShell({ children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedNav, setExpandedNav] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { language, setLanguage } = useLanguageStore();
  const partners = useAppStore((state) => state.partners);
  const projects = useAppStore((state) => state.projects);
  const pathname = usePathname();
  const router = useRouter();

  // Hydration fix
  useEffect(() => {
    setMounted(true);
  }, []);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setSearchQuery("");
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const currentLanguage = mounted ? language : "de";
  const navStructure = getNavStructure(currentLanguage);
  const breadcrumbs = getBreadcrumbs(pathname, currentLanguage);
  const showBackButton = pathname !== '/';

  // Search results
  const searchResults = searchQuery.length > 1 ? [
    ...partners.filter(p =>
      p.organizationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.acronym?.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 3).map(p => ({
      type: 'partner' as const,
      label: p.acronym || p.organizationName,
      sublabel: p.organizationName,
      href: `/partners/${p.id}`,
      icon: Users,
    })),
    ...projects.filter(p =>
      p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.acronym?.toLowerCase().includes(searchQuery.toLowerCase())
    ).slice(0, 3).map(p => ({
      type: 'project' as const,
      label: p.acronym || p.title || 'Projekt',
      sublabel: p.title,
      href: `/projects/${p.id}`,
      icon: FolderKanban,
    })),
  ] : [];

  // Quick actions for search
  const quickActions = [
    { label: t('projectGenerator', language), href: '/generator', icon: Rocket, color: 'text-orange-500' },
    { label: t('smartImport', language), href: '/partners/smart-import', icon: Sparkles, color: 'text-blue-500' },
    { label: language === 'de' ? 'Konzeptentwickler' : 'Concept Developer', href: '/projects/new', icon: Lightbulb, color: 'text-amber-500' },
    { label: t('newPartner', language), href: '/partners/new', icon: Plus, color: 'text-purple-500' },
  ];

  const NavItem = ({ item, isSubItem = false }: { item: any; isSubItem?: boolean }) => {
    const isActive = pathname === item.href ||
      (item.subItems?.some((sub: any) => pathname === sub.href || pathname.startsWith(sub.href + '/')));
    const isExpanded = expandedNav === item.href;
    const hasSubItems = item.subItems && item.subItems.length > 0;

    if (hasSubItems) {
      return (
        <div>
          {/* Main item - clicking navigates to the parent page */}
          <div className="flex items-center">
            <Link
              href={item.href}
              className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-l-xl transition-all duration-200 ${isActive
                ? "bg-[#003399]/10 text-[#003399]"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
            >
              <div className={`p-1.5 rounded-lg ${isActive ? 'bg-[#003399]/10' : 'bg-gray-100'}`}>
                <item.icon size={18} className={isActive ? 'text-[#003399]' : 'text-gray-500'} />
              </div>
              {!sidebarCollapsed && (
                <div className="text-left">
                  <span className="font-medium text-sm">{item.label}</span>
                  {item.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                  )}
                </div>
              )}
            </Link>
            {/* Expand/collapse button - separate from navigation */}
            {!sidebarCollapsed && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setExpandedNav(isExpanded ? null : item.href);
                }}
                className={`px-2 py-2.5 rounded-r-xl transition-all duration-200 ${isActive
                  ? "bg-[#003399]/10 text-[#003399] hover:bg-[#003399]/20"
                  : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  }`}
              >
                <ChevronDown
                  size={16}
                  className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>
            )}
          </div>

          {isExpanded && !sidebarCollapsed && (
            <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 pl-3">
              {item.subItems.map((sub: any) => (
                <Link
                  key={sub.href}
                  href={sub.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${pathname === sub.href || pathname.startsWith(sub.href + '/')
                    ? "bg-[#003399] text-white shadow-md"
                    : sub.highlight
                      ? "text-[#003399] bg-blue-50 hover:bg-blue-100"
                      : "text-gray-600 hover:bg-gray-100"
                    }`}
                >
                  {sub.icon && <sub.icon size={14} />}
                  {sub.highlight && pathname !== sub.href && <Sparkles size={12} className="text-[#ffcc00]" />}
                  {sub.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    // Color-based styling for different item types
    const getColorClasses = () => {
      if (isActive) {
        if (item.color === 'purple') return "bg-purple-600 text-white shadow-lg shadow-purple-500/20";
        if (item.color === 'orange') return "bg-orange-500 text-white shadow-lg shadow-orange-500/20";
        return "bg-[#003399] text-white shadow-lg shadow-blue-500/20";
      }
      if (item.highlight) {
        if (item.color === 'orange') return "bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 border border-orange-200 hover:border-orange-400";
        return "bg-gradient-to-r from-[#ffcc00]/20 to-orange-100 text-[#003399] border border-[#ffcc00]/50 hover:border-[#ffcc00]";
      }
      if (item.color === 'purple') return "text-purple-700 bg-purple-50 hover:bg-purple-100";
      return "text-gray-600 hover:bg-gray-100 hover:text-gray-900";
    };

    const getIconBgClasses = () => {
      if (isActive) return 'bg-white/20';
      if (item.color === 'purple') return 'bg-purple-100';
      if (item.color === 'orange' || item.highlight) return 'bg-orange-100';
      return 'bg-gray-100';
    };

    const getIconColorClasses = () => {
      if (isActive) return 'text-white';
      if (item.color === 'purple') return 'text-purple-600';
      if (item.color === 'orange' || item.highlight) return 'text-orange-600';
      return 'text-gray-500';
    };

    return (
      <Link
        href={item.href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${getColorClasses()}`}
      >
        <div className={`p-1.5 rounded-lg ${getIconBgClasses()}`}>
          <item.icon size={18} className={getIconColorClasses()} />
        </div>
        {!sidebarCollapsed && (
          <div className="flex-1 text-left">
            <span className="font-medium text-sm">{item.label}</span>
            {item.description && (
              <p className={`text-xs mt-0.5 ${isActive ? 'text-white/70' : 'text-gray-400'}`}>
                {item.description}
              </p>
            )}
          </div>
        )}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
          />
          <div className="relative w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 p-4 border-b">
              <Search size={20} className="text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Partner, Projekt oder Seite suchen..."
                className="flex-1 outline-none text-lg"
                autoFocus
              />
              <kbd className="px-2 py-1 text-xs bg-gray-100 rounded border text-gray-500">ESC</kbd>
            </div>

            <div className="max-h-[50vh] overflow-y-auto">
              {searchQuery.length > 1 ? (
                searchResults.length > 0 ? (
                  <div className="p-2">
                    <p className="px-3 py-2 text-xs text-gray-400 uppercase tracking-wider">Ergebnisse</p>
                    {searchResults.map((result, idx) => (
                      <Link
                        key={idx}
                        href={result.href}
                        onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className={`p-2 rounded-lg ${result.type === 'partner' ? 'bg-blue-100' : 'bg-green-100'}`}>
                          <result.icon size={16} className={result.type === 'partner' ? 'text-blue-600' : 'text-green-600'} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{result.label}</p>
                          <p className="text-sm text-gray-500">{result.sublabel}</p>
                        </div>
                        <ChevronRight size={16} className="ml-auto text-gray-300" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-gray-500">
                    Keine Ergebnisse für "{searchQuery}"
                  </div>
                )
              ) : (
                <div className="p-2">
                  <p className="px-3 py-2 text-xs text-gray-400 uppercase tracking-wider">Schnellzugriff</p>
                  {quickActions.map((action, idx) => (
                    <Link
                      key={idx}
                      href={action.href}
                      onClick={() => { setSearchOpen(false); setSearchQuery(""); }}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="p-2 rounded-lg bg-gray-100">
                        <action.icon size={16} className={action.color} />
                      </div>
                      <span className="font-medium text-gray-700">{action.label}</span>
                      <ChevronRight size={16} className="ml-auto text-gray-300" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-4 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors lg:hidden"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#003399] to-[#0055cc] rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-[#ffcc00] font-bold text-sm">E+</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-gray-900">Erasmus+ Architect</span>
              <span className="ml-2 text-xs bg-[#003399]/10 text-[#003399] px-2 py-0.5 rounded-full font-medium">
                2026
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Search Bar */}
        <button
          onClick={() => setSearchOpen(true)}
          className="hidden md:flex items-center gap-3 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors w-80"
        >
          <Search size={18} className="text-gray-400" />
          <span className="text-gray-500 text-sm flex-1 text-left">Suchen...</span>
          <kbd className="px-2 py-0.5 text-xs bg-white rounded border text-gray-400 flex items-center gap-1">
            <Command size={12} /> K
          </kbd>
        </button>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Mobile search */}
          <button
            onClick={() => setSearchOpen(true)}
            className="md:hidden p-2 hover:bg-gray-100 rounded-xl"
          >
            <Search size={20} className="text-gray-600" />
          </button>

          {/* Language Selector */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {HEADER_LANGUAGES.map((langCode) => (
              <button
                key={langCode}
                onClick={() => setLanguage(langCode)}
                className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${language === langCode
                  ? "bg-white text-[#003399] shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                {LANGUAGE_FLAGS[langCode]}
              </button>
            ))}
          </div>

          {/* Help */}
          <button className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-600">
            <HelpCircle size={20} />
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={`fixed top-16 left-0 bottom-0 bg-white border-r border-gray-200 transition-all duration-300 z-40 flex flex-col ${sidebarOpen
          ? sidebarCollapsed ? "w-20" : "w-72"
          : "w-0 -translate-x-full lg:translate-x-0 lg:w-0"
          } print:hidden`}
      >
        {sidebarOpen && (
          <>
            {/* Collapse toggle */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex absolute -right-3 top-6 w-6 h-6 bg-white border border-gray-200 rounded-full items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
            >
              <ChevronRight size={14} className={`text-gray-400 transition-transform ${sidebarCollapsed ? '' : 'rotate-180'}`} />
            </button>

            <nav className="flex-1 p-3 space-y-6 overflow-y-auto">
              {/* Main Section - Dashboard */}
              <div className="space-y-1">
                {navStructure.main.map((item) => (
                  <NavItem key={item.href} item={item} />
                ))}
              </div>

              {/* Create Section - Generator */}
              <div className="space-y-1">
                {!sidebarCollapsed && (
                  <p className="px-3 py-2 text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    {currentLanguage === 'de' ? 'Erstellen' : 'Create'}
                  </p>
                )}
                {navStructure.create.map((item) => (
                  <NavItem key={item.href} item={item} />
                ))}
              </div>

              {/* Manage Section - Projects & Partners */}
              <div className="space-y-1">
                {!sidebarCollapsed && (
                  <p className="px-3 py-2 text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    {currentLanguage === 'de' ? 'Verwalten' : 'Manage'}
                  </p>
                )}
                {navStructure.manage.map((item) => (
                  <NavItem key={item.href} item={item} />
                ))}
              </div>

              {/* Tools Section - Export */}
              <div className="space-y-1">
                {!sidebarCollapsed && (
                  <p className="px-3 py-2 text-xs text-gray-400 uppercase tracking-wider font-semibold">
                    {currentLanguage === 'de' ? 'Tools' : 'Tools'}
                  </p>
                )}
                {navStructure.tools.map((item) => (
                  <NavItem key={item.href} item={item} />
                ))}
              </div>
            </nav>

            {/* Sidebar Footer - Version Info */}
            {!sidebarCollapsed && (
              <div className="p-4 border-t border-gray-100">
                <div className="text-center text-xs text-gray-400">
                  <p>Erasmus+ Architect</p>
                  <p>v2.0 · 2026</p>
                </div>
              </div>
            )}
          </>
        )}
      </aside>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main
        className={`pt-16 min-h-screen transition-all duration-300 ${sidebarOpen
          ? sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"
          : "lg:ml-0"
          } print:pt-0 print:ml-0 lg:print:ml-0 print:min-h-0 print:h-auto print:overflow-visible`}
      >
        {/* Breadcrumbs & Back Button */}
        {showBackButton && (
          <div className="sticky top-16 z-20 bg-white/80 backdrop-blur-sm border-b border-gray-100 print:hidden">
            <div className="px-6 py-3 flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
              >
                <ArrowLeft size={18} />
              </button>
              <nav className="flex items-center gap-2 text-sm">
                <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
                  <Home size={14} />
                </Link>
                {breadcrumbs.map((crumb, idx) => (
                  <div key={crumb.href} className="flex items-center gap-2">
                    <ChevronRight size={14} className="text-gray-300" />
                    {idx === breadcrumbs.length - 1 ? (
                      <span className="font-medium text-gray-900">{crumb.label}</span>
                    ) : (
                      <Link
                        href={crumb.href}
                        className="text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        {crumb.label}
                      </Link>
                    )}
                  </div>
                ))}
              </nav>
            </div>
          </div>
        )}

        <div className="p-6 print:p-0">{children}</div>
      </main>
    </div>
  );
}
