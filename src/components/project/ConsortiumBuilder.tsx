"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import {
  ConsortiumMember,
  COUNTRY_NAMES,
  ORGANIZATION_TYPE_LABELS,
} from "@/store/types";
import {
  Plus,
  Trash2,
  Users,
  Crown,
  Building2,
  Globe,
  AlertCircle,
  CheckCircle,
  Search,
} from "lucide-react";

interface ConsortiumBuilderProps {
  consortium: ConsortiumMember[];
  onUpdate: (consortium: ConsortiumMember[]) => void;
  projectId?: string;
}

export function ConsortiumBuilder({
  consortium,
  onUpdate,
  projectId,
}: ConsortiumBuilderProps) {
  const partners = useAppStore((state) => state.partners);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const availablePartners = partners.filter(
    (p) => !consortium.some((m) => m.partnerId === p.id)
  );

  const filteredPartners = availablePartners.filter(
    (p) =>
      p.organizationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.acronym && p.acronym.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getPartner = (partnerId: string) => {
    return partners.find((p) => p.id === partnerId);
  };

  const addMember = (partnerId: string, role: "COORDINATOR" | "PARTNER") => {
    let updatedConsortium = [...consortium];

    // If adding as coordinator, demote existing coordinator
    if (role === "COORDINATOR") {
      updatedConsortium = updatedConsortium.map((m) =>
        m.role === "COORDINATOR" ? { ...m, role: "PARTNER" as const } : m
      );
    }

    const newMember: ConsortiumMember = {
      id: crypto.randomUUID(),
      partnerId,
      role,
      budgetShare: 0,
      workPackageLeadership: [],
    };

    onUpdate([...updatedConsortium, newMember]);
    setShowAddModal(false);
    setSearchTerm("");
  };

  const updateMember = (memberId: string, updates: Partial<ConsortiumMember>) => {
    let updatedConsortium = consortium.map((m) =>
      m.id === memberId ? { ...m, ...updates } : m
    );

    // If promoting to coordinator, demote others
    if (updates.role === "COORDINATOR") {
      updatedConsortium = updatedConsortium.map((m) =>
        m.id !== memberId && m.role === "COORDINATOR"
          ? { ...m, role: "PARTNER" as const }
          : m
      );
    }

    onUpdate(updatedConsortium);
  };

  const removeMember = (memberId: string) => {
    onUpdate(consortium.filter((m) => m.id !== memberId));
  };

  // Calculate stats
  const countries = new Set(
    consortium.map((m) => getPartner(m.partnerId)?.country).filter(Boolean)
  );
  const hasCoordinator = consortium.some((m) => m.role === "COORDINATOR");
  const totalBudgetShare = consortium.reduce((sum, m) => sum + (m.budgetShare || 0), 0);

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{consortium.length}</div>
          <div className="text-sm text-gray-500">Partners</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{countries.size}</div>
          <div className="text-sm text-gray-500">Countries</div>
        </div>
        <div
          className={`rounded-lg p-4 ${
            hasCoordinator ? "bg-green-50" : "bg-red-50"
          }`}
        >
          <div className="flex items-center gap-2">
            {hasCoordinator ? (
              <CheckCircle className="text-green-600" size={20} />
            ) : (
              <AlertCircle className="text-red-600" size={20} />
            )}
            <span
              className={`text-sm font-medium ${
                hasCoordinator ? "text-green-700" : "text-red-700"
              }`}
            >
              {hasCoordinator ? "Coordinator Set" : "No Coordinator"}
            </span>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">{totalBudgetShare}%</div>
          <div className="text-sm text-gray-500">Budget Allocated</div>
        </div>
      </div>

      {/* Eligibility Check */}
      {consortium.length > 0 && countries.size < 3 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-yellow-600 shrink-0" size={20} />
          <div>
            <p className="font-medium text-yellow-800">
              Minimum 3 countries required
            </p>
            <p className="text-sm text-yellow-700">
              KA2 projects require partners from at least 3 different EU/Programme
              countries. Currently: {countries.size} countr
              {countries.size === 1 ? "y" : "ies"}
            </p>
          </div>
        </div>
      )}

      {/* Add Partner Button */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-medium text-gray-900">Consortium Partners</h3>
          <p className="text-sm text-gray-500">
            Add partners from your CRM to the consortium
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-[#003399] text-white rounded-lg hover:bg-[#002266] text-sm"
          disabled={availablePartners.length === 0}
        >
          <Plus size={16} />
          Add Partner
        </button>
      </div>

      {/* Consortium List */}
      {consortium.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Users size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="font-medium text-gray-900 mb-2">No partners added yet</h3>
          <p className="text-gray-500 mb-4">
            Add partners from your CRM to build your consortium
          </p>
          {partners.length === 0 ? (
            <a
              href="/partners/new"
              className="text-[#003399] hover:underline text-sm"
            >
              Create your first partner →
            </a>
          ) : (
            <button
              onClick={() => setShowAddModal(true)}
              className="text-[#003399] hover:underline text-sm"
            >
              Browse available partners
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Coordinator first */}
          {consortium
            .sort((a, b) => (a.role === "COORDINATOR" ? -1 : 1))
            .map((member) => {
              const partner = getPartner(member.partnerId);
              if (!partner) return null;

              return (
                <div
                  key={member.id}
                  className={`border rounded-lg p-4 ${
                    member.role === "COORDINATOR"
                      ? "border-[#ffcc00] bg-yellow-50/30"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          member.role === "COORDINATOR"
                            ? "bg-[#ffcc00] text-[#003399]"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {member.role === "COORDINATOR" ? (
                          <Crown size={20} />
                        ) : (
                          <Building2 size={20} />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-gray-900">
                            {partner.acronym || partner.organizationName}
                          </h4>
                          {member.role === "COORDINATOR" && (
                            <span className="text-xs bg-[#ffcc00] text-[#003399] px-2 py-0.5 rounded-full font-medium">
                              Coordinator
                            </span>
                          )}
                        </div>
                        {partner.acronym && (
                          <p className="text-sm text-gray-500">
                            {partner.organizationName}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Globe size={14} />
                            {COUNTRY_NAMES[partner.country] || partner.country}
                          </span>
                          <span>
                            {ORGANIZATION_TYPE_LABELS[partner.organizationType]}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <label className="block text-xs text-gray-500 mb-1">
                          Budget Share
                        </label>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={member.budgetShare || 0}
                            onChange={(e) =>
                              updateMember(member.id, {
                                budgetShare: Math.min(100, Math.max(0, Number(e.target.value))),
                              })
                            }
                            className="w-16 px-2 py-1 text-sm border rounded text-right"
                            min={0}
                            max={100}
                          />
                          <span className="text-sm text-gray-500">%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {member.role !== "COORDINATOR" && (
                          <button
                            onClick={() =>
                              updateMember(member.id, { role: "COORDINATOR" })
                            }
                            className="p-2 text-gray-400 hover:text-[#ffcc00] hover:bg-yellow-50 rounded"
                            title="Make Coordinator"
                          >
                            <Crown size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => removeMember(member.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title="Remove from consortium"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expertise tags */}
                  {partner.expertiseAreas.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {partner.expertiseAreas.slice(0, 4).map((exp) => (
                        <span
                          key={exp.id}
                          className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded"
                        >
                          {exp.domain.replace(/_/g, " ").toLowerCase()}
                        </span>
                      ))}
                      {partner.expertiseAreas.length > 4 && (
                        <span className="text-xs text-gray-400">
                          +{partner.expertiseAreas.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}

      {/* Add Partner Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-900">Add Partner to Consortium</h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSearchTerm("");
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search partners..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4">
              {filteredPartners.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {availablePartners.length === 0
                      ? "All partners are already in the consortium"
                      : "No partners match your search"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredPartners.map((partner) => (
                    <div
                      key={partner.id}
                      className="border rounded-lg p-3 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {partner.acronym || partner.organizationName}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>
                              {COUNTRY_NAMES[partner.country] || partner.country}
                            </span>
                            <span>•</span>
                            <span>
                              {ORGANIZATION_TYPE_LABELS[partner.organizationType]}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!hasCoordinator && (
                            <button
                              onClick={() => addMember(partner.id, "COORDINATOR")}
                              className="flex items-center gap-1 px-3 py-1 bg-[#ffcc00] text-[#003399] rounded text-sm font-medium hover:bg-yellow-400"
                            >
                              <Crown size={14} />
                              Coordinator
                            </button>
                          )}
                          <button
                            onClick={() => addMember(partner.id, "PARTNER")}
                            className="px-3 py-1 bg-[#003399] text-white rounded text-sm hover:bg-[#002266]"
                          >
                            Add as Partner
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-gray-50">
              <a
                href="/partners/new"
                className="text-sm text-[#003399] hover:underline"
              >
                + Create new partner
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
