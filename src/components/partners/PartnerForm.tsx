"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store/app-store";
import { useLanguageStore } from "@/store/language-store";
import { createTranslator } from "@/lib/translations";
import {
  Partner,
  ExpertiseArea,
  TargetGroupAccess,
  PreviousProject,
  Contact,
  ORGANIZATION_TYPE_LABELS,
  EXPERTISE_DOMAIN_LABELS,
  TARGET_GROUP_LABELS,
  COUNTRY_NAMES,
  OrganizationType,
  ExpertiseDomain,
  TargetGroup,
  Sector,
} from "@/store/types";
import { v4 as uuidv4 } from "uuid";
import {
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Building2,
  User,
  Briefcase,
  Target,
  History,
  Upload,
  UserPlus,
} from "lucide-react";
import { ProjectImporter } from "./ProjectImporter";

interface PartnerFormProps {
  partnerId?: string;
  initialData?: Partner;
  onSave?: (data: Partial<Partner>) => void;
  onCancel?: () => void;
}

export function PartnerForm({ partnerId, initialData, onSave, onCancel }: PartnerFormProps) {
  const router = useRouter();
  const { language } = useLanguageStore();
  const t = createTranslator(language);
  const addPartner = useAppStore((state) => state.addPartner);
  const updatePartner = useAppStore((state) => state.updatePartner);
  const getPartner = useAppStore((state) => state.getPartner);

  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Partner>>({
    organizationName: "",
    acronym: "",
    country: "AT",
    city: "",
    website: "",
    email: "",
    phone: "",
    organizationType: "NGO",
    missionStatement: "",
    staffSize: "SMALL_10_49",
    geographicScope: "NATIONAL",
    contacts: [],
    expertiseAreas: [],
    targetGroups: [],
    previousProjects: [],
    sectorsActive: [],
    workingLanguages: ["en"],
    isNewcomer: false,
    tags: [],
    notes: "",
  });

  // Load existing partner data
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else if (partnerId) {
      const partner = getPartner(partnerId);
      if (partner) {
        setFormData(partner);
      }
    }
  }, [partnerId, initialData, getPartner]);

  const handleSave = () => {
    setIsSaving(true);

    if (onSave) {
      onSave(formData);
      setIsSaving(false);
      return;
    }

    if (partnerId) {
      updatePartner(partnerId, formData);
    } else {
      addPartner({
        ...formData,
        organizationName: formData.organizationName || "New Partner",
        country: formData.country || "AT",
        organizationType: formData.organizationType || "NGO",
        missionStatement: formData.missionStatement || "",
        contacts: formData.contacts || [],
        expertiseAreas: formData.expertiseAreas || [],
        targetGroups: formData.targetGroups || [],
        previousProjects: formData.previousProjects || [],
        sectorsActive: formData.sectorsActive || [],
        workingLanguages: formData.workingLanguages || ["en"],
        isNewcomer: formData.isNewcomer || false,
        tags: formData.tags || [],
        dataQuality: 50,
      } as Omit<Partner, "id" | "createdAt" | "updatedAt">);
    }

    setTimeout(() => {
      setIsSaving(false);
      router.push("/partners");
    }, 500);
  };

  const addProject = () => {
    setFormData((prev) => ({
      ...prev,
      previousProjects: [
        ...(prev.previousProjects || []),
        {
          id: uuidv4(),
          title: "",
          programme: "ERASMUS_KA2",
          year: new Date().getFullYear() - 1,
          role: "PARTNER" as const,
        },
      ],
    }));
  };

  const removeProject = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      previousProjects: prev.previousProjects?.filter((p) => p.id !== id) || [],
    }));
  };

  const handleImportProject = (importedProject: PreviousProject) => {
    setFormData((prev) => ({
      ...prev,
      previousProjects: [...(prev.previousProjects || []), importedProject],
    }));
  };

  const addContact = () => {
    setFormData((prev) => ({
      ...prev,
      contacts: [
        ...(prev.contacts || []),
        {
          id: uuidv4(),
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          role: "Member",
          isPrimary: false,
        },
      ],
    }));
  };

  const removeContact = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      contacts: prev.contacts?.filter((c) => c.id !== id) || [],
    }));
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onCancel || (() => router.push("/partners"))}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {partnerId ? (language === "de" ? "Partner bearbeiten" : "Edit Partner") : (language === "de" ? "Neuer Partner" : "Add New Partner")}
            </h1>
            <p className="text-gray-500">
              {partnerId ? formData.organizationName : (language === "de" ? "Neues Partnerprofil erstellen" : "Create a new partner profile")}
            </p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 bg-[#003399] text-white rounded-lg hover:bg-[#002266] disabled:opacity-50"
        >
          <Save size={18} />
          {isSaving ? t.buttons.saving : t.buttons.savePartner}
        </button>
      </div>

      {/* Unified Content Container */}
      <div className="bg-white rounded-xl border p-8 space-y-12 shadow-sm">

        {/* SECTION 1: BASIC DATA */}
        <section id="basic-data" className="scroll-mt-20">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2 pb-3 border-b border-gray-100">
            <div className="p-2 bg-blue-50 text-[#003399] rounded-lg">
              <Building2 size={20} />
            </div>
            {language === "de" ? "Grunddaten" : "Basic Information"}
          </h3>

          <div className="space-y-6">
            {/* Organization Name */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === "de" ? "Organisationsname *" : "Organization Name *"}
                </label>
                <input
                  type="text"
                  value={formData.organizationName || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, organizationName: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#003399] focus:border-transparent transition-all"
                  placeholder={language === "de" ? "Vollständiger rechtlicher Name" : "Full legal name"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === "de" ? "Akronym" : "Acronym"}
                </label>
                <input
                  type="text"
                  value={formData.acronym || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, acronym: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#003399] focus:border-transparent transition-all"
                  placeholder="e.g. TU Wien"
                />
              </div>
            </div>

            {/* Country & City */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === "de" ? "Land *" : "Country *"}
                </label>
                <select
                  value={formData.country || "AT"}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, country: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#003399] focus:border-transparent bg-white"
                >
                  {Object.entries(COUNTRY_NAMES).map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === "de" ? "Stadt" : "City"}
                </label>
                <input
                  type="text"
                  value={formData.city || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, city: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#003399] focus:border-transparent"
                />
              </div>
            </div>

            {/* Organization Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Type *
              </label>
              <select
                value={formData.organizationType || "NGO"}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    organizationType: e.target.value as OrganizationType,
                  }))
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#003399] focus:border-transparent bg-white"
              >
                {Object.entries(ORGANIZATION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Mission Statement */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mission Statement
              </label>
              <textarea
                value={formData.missionStatement || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, missionStatement: e.target.value }))
                }
                rows={4}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#003399] focus:border-transparent resize-y"
                placeholder="What does this organization do? Who is the target group?"
              />
            </div>

            {/* Newcomer Status */}
            <div className="flex items-center gap-2 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
              <input
                type="checkbox"
                id="newcomer"
                checked={formData.isNewcomer || false}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, isNewcomer: e.target.checked }))
                }
                className="w-4 h-4 text-[#003399] border-gray-300 rounded focus:ring-[#003399]"
              />
              <label htmlFor="newcomer" className="text-sm font-medium text-gray-700">
                This is a newcomer organization (no previous Erasmus+ experience)
              </label>
            </div>

            {/* Contact Info */}
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, website: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#003399] focus:border-transparent"
                  placeholder="https://"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#003399] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#003399] focus:border-transparent"
                />
              </div>
            </div>

            {/* EU IDs */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  PIC Number
                </label>
                <input
                  type="text"
                  value={formData.picNumber || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, picNumber: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#003399] focus:border-transparent"
                  placeholder="9-digit EU Participant ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  OID Number
                </label>
                <input
                  type="text"
                  value={formData.oidNumber || ""}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, oidNumber: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#003399] focus:border-transparent"
                  placeholder="Organisation ID"
                />
              </div>
            </div>

            {/* Contact Persons */}
            <div className="pt-6 border-t border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  {language === "de" ? "Ansprechpartner" : "Contact Persons"}
                </label>
                <button
                  onClick={addContact}
                  className="flex items-center gap-1 text-sm text-[#003399] hover:underline bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors hover:bg-blue-100"
                >
                  <UserPlus size={16} />
                  {language === "de" ? "Person hinzufügen" : "Add Person"}
                </button>
              </div>

              {formData.contacts?.length === 0 ? (
                <p className="text-gray-500 text-sm italic bg-gray-50 p-6 rounded-lg border border-dashed text-center">
                  {language === "de" ? "Keine Ansprechpartner hinzugefügt." : "No contact persons added yet."}
                </p>
              ) : (
                <div className="space-y-4">
                  {formData.contacts?.map((contact, index) => (
                    <div key={contact.id} className="border rounded-xl p-4 bg-gray-50/30 relative group hover:bg-white hover:shadow-sm transition-all border-gray-200">
                      <button
                        onClick={() => removeContact(contact.id)}
                        className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Remove contact"
                      >
                        <Trash2 size={16} />
                      </button>

                      <div className="grid md:grid-cols-2 gap-4 pr-6">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Vorname</label>
                          <input
                            type="text"
                            value={contact.firstName || ""}
                            onChange={(e) => {
                              const updated = [...(formData.contacts || [])];
                              updated[index] = { ...updated[index], firstName: e.target.value };
                              setFormData((prev) => ({ ...prev, contacts: updated }));
                            }}
                            className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-1 focus:ring-[#003399]"
                            placeholder="First Name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Nachname</label>
                          <input
                            type="text"
                            value={contact.lastName || ""}
                            onChange={(e) => {
                              const updated = [...(formData.contacts || [])];
                              updated[index] = { ...updated[index], lastName: e.target.value };
                              setFormData((prev) => ({ ...prev, contacts: updated }));
                            }}
                            className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-1 focus:ring-[#003399]"
                            placeholder="Last Name"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                          <input
                            type="email"
                            value={contact.email || ""}
                            onChange={(e) => {
                              const updated = [...(formData.contacts || [])];
                              updated[index] = { ...updated[index], email: e.target.value };
                              setFormData((prev) => ({ ...prev, contacts: updated }));
                            }}
                            className="w-full px-3 py-2 border rounded-lg text-sm bg-white focus:ring-1 focus:ring-[#003399]"
                            placeholder="email@example.com"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Telefon / Rolle</label>
                          <div className="flex gap-2">
                            <input
                              type="tel"
                              value={contact.phone || ""}
                              onChange={(e) => {
                                const updated = [...(formData.contacts || [])];
                                updated[index] = { ...updated[index], phone: e.target.value };
                                setFormData((prev) => ({ ...prev, contacts: updated }));
                              }}
                              className="w-1/2 px-3 py-2 border rounded-lg text-sm bg-white focus:ring-1 focus:ring-[#003399]"
                              placeholder="+43..."
                            />
                            <input
                              type="text"
                              value={contact.role || ""}
                              onChange={(e) => {
                                const updated = [...(formData.contacts || [])];
                                updated[index] = { ...updated[index], role: e.target.value };
                                setFormData((prev) => ({ ...prev, contacts: updated }));
                              }}
                              className="w-1/2 px-3 py-2 border rounded-lg text-sm bg-white focus:ring-1 focus:ring-[#003399]"
                              placeholder="Role"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* SECTION 2: SECTORS & NOTES */}
        <section id="expertise" className="scroll-mt-20">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2 pb-3 border-b border-gray-100">
            <div className="p-2 bg-purple-50 text-purple-700 rounded-lg">
              <Briefcase size={20} />
            </div>
            {language === "de" ? "Sektoren & Notizen" : "Sectors & Notes"}
          </h3>

          <div className="space-y-6">

            {/* Sectors Active */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Active Sectors
              </label>
              <div className="flex flex-wrap gap-2">
                {(["SCH", "VET", "ADU", "YOU"] as Sector[]).map((sector) => {
                  const isActive = formData.sectorsActive?.includes(sector);
                  const labels: Record<Sector, string> = {
                    SCH: "School Education",
                    VET: "VET",
                    ADU: "Adult Education",
                    YOU: "Youth",
                  };
                  return (
                    <button
                      key={sector}
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          sectorsActive: isActive
                            ? prev.sectorsActive?.filter((s) => s !== sector) || []
                            : [...(prev.sectorsActive || []), sector],
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${isActive
                        ? "bg-[#003399] text-white border-[#003399]"
                        : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                        }`}
                    >
                      {labels[sector]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Internal Notes
              </label>
              <textarea
                value={formData.notes || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={3}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#003399] focus:border-transparent"
                placeholder="Any internal notes about this partner..."
              />
            </div>
          </div>
        </section>

        {/* SECTION 3: PROJECTS */}
        <section id="projects" className="scroll-mt-20">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2 pb-3 border-b border-gray-100">
            <div className="p-2 bg-green-50 text-green-700 rounded-lg">
              <History size={20} />
            </div>
            {language === "de" ? "Frühere Projekte" : "Previous Projects"}
          </h3>

          <div className="space-y-6">
            <div className="flex items-center justify-between mb-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
              <span className="text-sm text-gray-600 font-medium">Projektliste verwalten</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={addProject}
                  className="flex items-center gap-1 text-sm text-[#003399] hover:underline bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
                >
                  <Plus size={16} />
                  {language === "de" ? "Projekt hinzufügen" : "Add Project"}
                </button>
                <ProjectImporter
                  onImport={handleImportProject}
                  trigger={
                    <button className="flex items-center gap-1 text-sm text-[#003399] hover:underline bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
                      <Upload size={16} />
                      {language === "de" ? "Aus Nachweis importieren" : "Import from Evidence"}
                    </button>
                  }
                />
              </div>
            </div>

            {formData.previousProjects?.length === 0 ? (
              <p className="text-gray-500 text-sm italic text-center py-8 border-2 border-dashed rounded-xl border-gray-100">
                {language === "de" ? "Keine früheren Projekte eingetragen." : "No previous projects added yet."}
              </p>
            ) : (
              <div className="space-y-4">
                {formData.previousProjects?.map((proj, index) => (
                  <div key={proj.id} className="border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow bg-white">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 grid md:grid-cols-2 gap-4">
                        <input
                          type="text"
                          value={proj.title || ""}
                          onChange={(e) => {
                            const updated = [...(formData.previousProjects || [])];
                            updated[index] = { ...updated[index], title: e.target.value };
                            setFormData((prev) => ({ ...prev, previousProjects: updated }));
                          }}
                          className="px-3 py-2 border rounded-lg text-sm font-medium"
                          placeholder="Project title"
                        />
                        <div className="flex gap-2">
                          <select
                            value={proj.programme || 'ERASMUS_KA2'}
                            onChange={(e) => {
                              const updated = [...(formData.previousProjects || [])];
                              updated[index] = { ...updated[index], programme: e.target.value };
                              setFormData((prev) => ({ ...prev, previousProjects: updated }));
                            }}
                            className="flex-1 px-3 py-2 border rounded-lg text-sm bg-gray-50"
                          >
                            <option value="ERASMUS_KA1">Erasmus+ KA1</option>
                            <option value="ERASMUS_KA2">Erasmus+ KA2</option>
                            <option value="ERASMUS_KA3">Erasmus+ KA3</option>
                            <option value="HORIZON_EUROPE">Horizon Europe</option>
                            <option value="ESF">ESF</option>
                            <option value="INTERREG">Interreg</option>
                            <option value="OTHER">Other</option>
                          </select>
                          <input
                            type="number"
                            value={proj.year}
                            onChange={(e) => {
                              const updated = [...(formData.previousProjects || [])];
                              updated[index] = {
                                ...updated[index],
                                year: parseInt(e.target.value),
                              };
                              setFormData((prev) => ({ ...prev, previousProjects: updated }));
                            }}
                            className="w-24 px-3 py-2 border rounded-lg text-sm bg-gray-50"
                            placeholder="Year"
                          />
                          <select
                            value={proj.role}
                            onChange={(e) => {
                              const updated = [...(formData.previousProjects || [])];
                              updated[index] = {
                                ...updated[index],
                                role: e.target.value as "COORDINATOR" | "PARTNER",
                              };
                              setFormData((prev) => ({ ...prev, previousProjects: updated }));
                            }}
                            className="px-3 py-2 border rounded-lg text-sm bg-gray-50"
                          >
                            <option value="COORDINATOR">Coordinator</option>
                            <option value="PARTNER">Partner</option>
                          </select>
                        </div>
                      </div>
                      <button
                        onClick={() => removeProject(proj.id)}
                        className="ml-3 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <textarea
                      value={proj.description || ""}
                      onChange={(e) => {
                        const updated = [...(formData.previousProjects || [])];
                        updated[index] = { ...updated[index], description: e.target.value };
                        setFormData((prev) => ({ ...prev, previousProjects: updated }));
                      }}
                      className="w-full px-3 py-2 border rounded-lg text-sm text-gray-600 bg-gray-50/50 focus:bg-white transition-colors"
                      placeholder="Brief description of the project and role..."
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}
