"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useAppStore } from "@/store/app-store";
import { useLanguageStore } from "@/store/language-store";
import {
  Partner,
  ORGANIZATION_TYPE_LABELS,
  COUNTRY_NAMES,
  OrganizationType,
  Sector,
  ExpertiseDomain,
} from "@/store/types";
import {
  Plus,
  Search,
  Globe,
  Building2,
  Trash2,
  Edit,
  Upload,
  Filter,
  X,
  Users,
  Mail,
  Phone,
  ChevronDown,
  ChevronRight,
  Sparkles,
  FileText,
  LayoutGrid,
  List,
  SortAsc,
  SortDesc,
  UserCircle,
} from "lucide-react";

// Country flags using emoji
const COUNTRY_FLAGS: Record<string, string> = {
  DE: "🇩🇪", AT: "🇦🇹", CH: "🇨🇭", ES: "🇪🇸", FR: "🇫🇷", IT: "🇮🇹", PT: "🇵🇹",
  NL: "🇳🇱", BE: "🇧🇪", PL: "🇵🇱", CZ: "🇨🇿", SK: "🇸🇰", HU: "🇭🇺", RO: "🇷🇴",
  BG: "🇧🇬", GR: "🇬🇷", CY: "🇨🇾", MT: "🇲🇹", SI: "🇸🇮", HR: "🇭🇷", RS: "🇷🇸",
  BA: "🇧🇦", MK: "🇲🇰", AL: "🇦🇱", ME: "🇲🇪", XK: "🇽🇰", TR: "🇹🇷", UA: "🇺🇦",
  SE: "🇸🇪", NO: "🇳🇴", FI: "🇫🇮", DK: "🇩🇰", IE: "🇮🇪", UK: "🇬🇧", GB: "🇬🇧",
  EE: "🇪🇪", LV: "🇱🇻", LT: "🇱🇹", LU: "🇱🇺", IS: "🇮🇸", LI: "🇱🇮",
  EU: "🇪🇺",
};

// Get flag for country code
const getFlag = (countryCode: string): string => {
  return COUNTRY_FLAGS[countryCode.toUpperCase()] || "🏳️";
};

type ViewMode = "grid" | "list";
type SortField = "name" | "country" | "type" | "projects" | "date";
type SortOrder = "asc" | "desc";

export function PartnerList() {
  const { language } = useLanguageStore();
  const partners = useAppStore((state) => state.partners);
  const deletePartner = useAppStore((state) => state.deletePartner);

  // UI State
  const [search, setSearch] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null);

  // Sort State
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");

  // Filter State
  const [filterCountry, setFilterCountry] = useState<string>("");
  const [filterType, setFilterType] = useState<OrganizationType | "">("");
  const [filterSector, setFilterSector] = useState<Sector | "">("");
  const [filterExpertise, setFilterExpertise] = useState<ExpertiseDomain | "">("");
  const [filterNewcomer, setFilterNewcomer] = useState<boolean | null>(null);

  // Get unique values for filters
  const uniqueCountries = useMemo(() =>
    [...new Set(partners.map(p => p.country))].sort(),
    [partners]
  );

  const uniqueTypes = useMemo(() =>
    [...new Set(partners.map(p => p.organizationType))],
    [partners]
  );

  const uniqueSectors = useMemo(() => {
    const sectors = new Set<Sector>();
    partners.forEach(p => p.sectorsActive?.forEach(s => sectors.add(s)));
    return [...sectors];
  }, [partners]);

  const uniqueExpertise = useMemo(() => {
    const expertise = new Set<ExpertiseDomain>();
    partners.forEach(p => p.expertiseAreas?.forEach(e => e.domain && expertise.add(e.domain)));
    return [...expertise];
  }, [partners]);

  // Filter and sort partners
  const filteredPartners = useMemo(() => {
    let result = partners.filter(p => {
      // Search filter
      const searchLower = search.toLowerCase();
      const matchesSearch = !search ||
        p.organizationName.toLowerCase().includes(searchLower) ||
        p.country.toLowerCase().includes(searchLower) ||
        (p.acronym && p.acronym.toLowerCase().includes(searchLower)) ||
        (p.city && p.city.toLowerCase().includes(searchLower)) ||
        p.contacts?.some(c =>
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchLower) ||
          c.email?.toLowerCase().includes(searchLower)
        );

      // Country filter
      const matchesCountry = !filterCountry || p.country === filterCountry;

      // Type filter
      const matchesType = !filterType || p.organizationType === filterType;

      // Sector filter
      const matchesSector = !filterSector || p.sectorsActive?.includes(filterSector);

      // Expertise filter
      const matchesExpertise = !filterExpertise ||
        p.expertiseAreas?.some(e => e.domain === filterExpertise);

      // Newcomer filter
      const matchesNewcomer = filterNewcomer === null || p.isNewcomer === filterNewcomer;

      return matchesSearch && matchesCountry && matchesType &&
             matchesSector && matchesExpertise && matchesNewcomer;
    });

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "name":
          comparison = a.organizationName.localeCompare(b.organizationName);
          break;
        case "country":
          comparison = a.country.localeCompare(b.country);
          break;
        case "type":
          comparison = a.organizationType.localeCompare(b.organizationType);
          break;
        case "projects":
          comparison = (b.previousProjects?.length || 0) - (a.previousProjects?.length || 0);
          break;
        case "date":
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [partners, search, filterCountry, filterType, filterSector, filterExpertise, filterNewcomer, sortField, sortOrder]);

  const handleDelete = (id: string) => {
    deletePartner(id);
    setShowDeleteConfirm(null);
  };

  const clearFilters = () => {
    setFilterCountry("");
    setFilterType("");
    setFilterSector("");
    setFilterExpertise("");
    setFilterNewcomer(null);
  };

  const hasActiveFilters = filterCountry || filterType || filterSector || filterExpertise || filterNewcomer !== null;

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {language === "de" ? "Partner-CRM" : "Partner CRM"}
          </h1>
          <p className="text-gray-500">
            {partners.length} {language === "de" ? "Partner in der Datenbank" : "partners in database"}
            {filteredPartners.length !== partners.length && (
              <span className="text-blue-600 ml-2">
                ({filteredPartners.length} {language === "de" ? "gefiltert" : "filtered"})
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/partners/smart-import"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-lg hover:from-orange-600 hover:to-yellow-600 transition-colors"
          >
            <Sparkles size={18} />
            {language === "de" ? "KI-Import" : "AI Import"}
          </Link>
          <Link
            href="/partners/import"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Upload size={18} />
            Import
          </Link>
          <Link
            href="/partners/new"
            className="flex items-center gap-2 px-4 py-2 bg-[#003399] text-white rounded-lg hover:bg-[#002266] transition-colors"
          >
            <Plus size={18} />
            {language === "de" ? "Partner hinzufügen" : "Add Partner"}
          </Link>
        </div>
      </div>

      {/* Search and View Toggle */}
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder={language === "de" ? "Partner, Land, Stadt, Kontakt suchen..." : "Search partners, country, city, contact..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-[#003399] focus:border-transparent"
          />
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
            showFilters || hasActiveFilters
              ? "bg-blue-50 border-blue-300 text-blue-700"
              : "hover:bg-gray-50"
          }`}
        >
          <Filter size={18} />
          Filter
          {hasActiveFilters && (
            <span className="w-5 h-5 bg-blue-600 text-white text-xs rounded-full flex items-center justify-center">
              {[filterCountry, filterType, filterSector, filterExpertise, filterNewcomer !== null].filter(Boolean).length}
            </span>
          )}
        </button>

        {/* View Mode Toggle */}
        <div className="flex border rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2.5 ${viewMode === "grid" ? "bg-[#003399] text-white" : "hover:bg-gray-50"}`}
          >
            <LayoutGrid size={18} />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2.5 ${viewMode === "list" ? "bg-[#003399] text-white" : "hover:bg-gray-50"}`}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">
              {language === "de" ? "Filter" : "Filters"}
            </h3>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                <X size={14} />
                {language === "de" ? "Alle löschen" : "Clear all"}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Country Filter */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {language === "de" ? "Land" : "Country"}
              </label>
              <select
                value={filterCountry}
                onChange={(e) => setFilterCountry(e.target.value)}
                className="w-full p-2 border rounded-lg text-sm"
              >
                <option value="">{language === "de" ? "Alle Länder" : "All countries"}</option>
                {uniqueCountries.map(country => (
                  <option key={country} value={country}>
                    {getFlag(country)} {COUNTRY_NAMES[country] || country}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {language === "de" ? "Organisationstyp" : "Organization Type"}
              </label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as OrganizationType | "")}
                className="w-full p-2 border rounded-lg text-sm"
              >
                <option value="">{language === "de" ? "Alle Typen" : "All types"}</option>
                {uniqueTypes.map(type => (
                  <option key={type} value={type}>
                    {ORGANIZATION_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>

            {/* Sector Filter */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {language === "de" ? "Sektor" : "Sector"}
              </label>
              <select
                value={filterSector}
                onChange={(e) => setFilterSector(e.target.value as Sector | "")}
                className="w-full p-2 border rounded-lg text-sm"
              >
                <option value="">{language === "de" ? "Alle Sektoren" : "All sectors"}</option>
                {uniqueSectors.map(sector => (
                  <option key={sector} value={sector}>{sector}</option>
                ))}
              </select>
            </div>

            {/* Expertise Filter */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {language === "de" ? "Expertise" : "Expertise"}
              </label>
              <select
                value={filterExpertise}
                onChange={(e) => setFilterExpertise(e.target.value as ExpertiseDomain | "")}
                className="w-full p-2 border rounded-lg text-sm"
              >
                <option value="">{language === "de" ? "Alle Bereiche" : "All areas"}</option>
                {uniqueExpertise.map(exp => (
                  <option key={exp} value={exp}>
                    {exp.replace(/_/g, " ").toLowerCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Newcomer Filter */}
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {language === "de" ? "Erfahrung" : "Experience"}
              </label>
              <select
                value={filterNewcomer === null ? "" : filterNewcomer ? "true" : "false"}
                onChange={(e) => setFilterNewcomer(e.target.value === "" ? null : e.target.value === "true")}
                className="w-full p-2 border rounded-lg text-sm"
              >
                <option value="">{language === "de" ? "Alle" : "All"}</option>
                <option value="false">{language === "de" ? "Erfahren" : "Experienced"}</option>
                <option value="true">{language === "de" ? "Newcomer" : "Newcomer"}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Sort Bar (for list view) */}
      {viewMode === "list" && filteredPartners.length > 0 && (
        <div className="flex items-center gap-4 px-4 py-2 bg-gray-100 rounded-lg mb-4 text-sm">
          <span className="text-gray-500">{language === "de" ? "Sortieren:" : "Sort by:"}</span>
          {[
            { field: "name" as SortField, label: language === "de" ? "Name" : "Name" },
            { field: "country" as SortField, label: language === "de" ? "Land" : "Country" },
            { field: "type" as SortField, label: language === "de" ? "Typ" : "Type" },
            { field: "projects" as SortField, label: language === "de" ? "Projekte" : "Projects" },
            { field: "date" as SortField, label: language === "de" ? "Datum" : "Date" },
          ].map(({ field, label }) => (
            <button
              key={field}
              onClick={() => toggleSort(field)}
              className={`flex items-center gap-1 px-2 py-1 rounded ${
                sortField === field ? "bg-white shadow text-[#003399]" : "hover:bg-white"
              }`}
            >
              {label}
              {sortField === field && (
                sortOrder === "asc" ? <SortAsc size={14} /> : <SortDesc size={14} />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Partner Display */}
      {filteredPartners.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border">
          <div className="text-gray-400 mb-4">
            <Building2 size={48} className="mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {search || hasActiveFilters
              ? (language === "de" ? "Keine Partner gefunden" : "No partners found")
              : (language === "de" ? "Noch keine Partner" : "No partners yet")}
          </h3>
          <p className="text-gray-500 mb-4">
            {search || hasActiveFilters
              ? (language === "de" ? "Versuche andere Suchkriterien" : "Try different search criteria")
              : (language === "de" ? "Füge deinen ersten Partner hinzu" : "Add your first partner to get started")}
          </p>
          {!search && !hasActiveFilters && (
            <Link
              href="/partners/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#003399] text-white rounded-lg hover:bg-[#002266]"
            >
              <Plus size={18} />
              {language === "de" ? "Partner hinzufügen" : "Add Partner"}
            </Link>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* Grid View */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPartners.map((partner) => (
            <div
              key={partner.id}
              className="bg-white rounded-xl border p-4 hover:shadow-lg transition-all"
            >
              {/* Header with Flag */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{getFlag(partner.country)}</span>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {partner.acronym || partner.organizationName}
                    </h3>
                    {partner.acronym && (
                      <p className="text-sm text-gray-500 line-clamp-1">
                        {partner.organizationName}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {partner.city && `${partner.city}, `}
                      {COUNTRY_NAMES[partner.country] || partner.country}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {showDeleteConfirm === partner.id ? (
                    <>
                      <button
                        onClick={() => handleDelete(partner.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="Confirm delete"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(null)}
                        className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href={`/partners/${partner.id}`}
                        className="p-1.5 text-gray-400 hover:text-[#003399] hover:bg-blue-50 rounded"
                      >
                        <Edit size={16} />
                      </Link>
                      <button
                        onClick={() => setShowDeleteConfirm(partner.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Organization Type */}
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <Building2 size={14} />
                {ORGANIZATION_TYPE_LABELS[partner.organizationType]}
              </div>

              {/* Primary Contact */}
              {partner.contacts && partner.contacts.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-2 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <UserCircle size={16} className="text-gray-400" />
                    <span className="font-medium text-gray-700">
                      {partner.contacts[0].firstName} {partner.contacts[0].lastName}
                    </span>
                    {partner.contacts[0].role && (
                      <span className="text-xs text-gray-500">
                        ({partner.contacts[0].role})
                      </span>
                    )}
                  </div>
                  {partner.contacts[0].email && (
                    <a
                      href={`mailto:${partner.contacts[0].email}`}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline ml-6 mt-1"
                    >
                      <Mail size={12} />
                      {partner.contacts[0].email}
                    </a>
                  )}
                  {partner.contacts.length > 1 && (
                    <p className="text-xs text-gray-400 ml-6 mt-1">
                      +{partner.contacts.length - 1} {language === "de" ? "weitere Kontakte" : "more contacts"}
                    </p>
                  )}
                </div>
              )}

              {/* Expertise Tags */}
              {partner.expertiseAreas && partner.expertiseAreas.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {partner.expertiseAreas.slice(0, 2).map((exp, idx) => (
                    <span
                      key={exp.id || idx}
                      className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
                    >
                      {(exp.domain || 'Unknown').replace(/_/g, " ").toLowerCase()}
                    </span>
                  ))}
                  {partner.expertiseAreas.length > 2 && (
                    <span className="text-xs text-gray-400">
                      +{partner.expertiseAreas.length - 2}
                    </span>
                  )}
                </div>
              )}

              {/* Stats Row */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {partner.previousProjects?.length || 0} EU {language === "de" ? "Projekte" : "projects"}
                </span>
                <div className="flex items-center gap-2">
                  {partner.isNewcomer && (
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                      Newcomer
                    </span>
                  )}
                  {partner.generatedDescriptions && partner.generatedDescriptions.length > 0 && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <FileText size={10} />
                      {partner.generatedDescriptions.length}
                    </span>
                  )}
                </div>
              </div>

              {/* Action Link */}
              <div className="mt-3 pt-3 border-t flex items-center justify-between">
                <Link
                  href={`/partners/${partner.id}`}
                  className="text-sm text-[#003399] hover:underline font-medium"
                >
                  {language === "de" ? "Details ansehen →" : "View Details →"}
                </Link>
                <Link
                  href={`/partners/${partner.id}?tab=ai`}
                  className="text-xs text-purple-600 hover:underline flex items-center gap-1"
                >
                  <Sparkles size={12} />
                  {language === "de" ? "KI-Beschreibung" : "AI Description"}
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-gray-600">
                  {language === "de" ? "Organisation" : "Organization"}
                </th>
                <th className="text-left p-4 font-medium text-gray-600">
                  {language === "de" ? "Land" : "Country"}
                </th>
                <th className="text-left p-4 font-medium text-gray-600">
                  {language === "de" ? "Typ" : "Type"}
                </th>
                <th className="text-left p-4 font-medium text-gray-600">
                  {language === "de" ? "Kontakt" : "Contact"}
                </th>
                <th className="text-left p-4 font-medium text-gray-600">
                  {language === "de" ? "Projekte" : "Projects"}
                </th>
                <th className="text-right p-4 font-medium text-gray-600">
                  {language === "de" ? "Aktionen" : "Actions"}
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredPartners.map((partner, idx) => (
                <tr
                  key={partner.id}
                  className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? "" : "bg-gray-50/50"}`}
                >
                  <td className="p-4">
                    <div className="font-medium text-gray-900">
                      {partner.acronym || partner.organizationName}
                    </div>
                    {partner.acronym && (
                      <div className="text-sm text-gray-500 line-clamp-1">
                        {partner.organizationName}
                      </div>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{getFlag(partner.country)}</span>
                      <span className="text-sm">
                        {COUNTRY_NAMES[partner.country] || partner.country}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {ORGANIZATION_TYPE_LABELS[partner.organizationType]}
                  </td>
                  <td className="p-4">
                    {partner.contacts && partner.contacts.length > 0 ? (
                      <div>
                        <div className="text-sm font-medium">
                          {partner.contacts[0].firstName} {partner.contacts[0].lastName}
                        </div>
                        {partner.contacts[0].email && (
                          <a
                            href={`mailto:${partner.contacts[0].email}`}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {partner.contacts[0].email}
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-gray-600">
                      {partner.previousProjects?.length || 0}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/partners/${partner.id}`}
                        className="p-2 text-gray-400 hover:text-[#003399] hover:bg-blue-50 rounded"
                      >
                        <Edit size={16} />
                      </Link>
                      <button
                        onClick={() => setShowDeleteConfirm(partner.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
