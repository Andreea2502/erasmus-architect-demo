/**
 * Centralized translation utility for Partner Detail page and related components
 * Supports: EN, DE, RO, HR, PT
 */

export type Language = "en" | "de" | "ro" | "hr" | "pt";

export interface Translations {
    // Tab labels
    tabs: {
        edit: string;
        aiDescriptions: string;
        documents: string;
    };

    // Common buttons
    buttons: {
        save: string;
        saving: string;
        savePartner: string;
        edit: string;
        delete: string;
        copy: string;
        correct: string;
        generate: string;
        generating: string;
        upload: string;
        download: string;
        add: string;
        cancel: string;
        send: string;
        selectFile: string;
        addReport: string;
    };

    // Partner Detail page
    partnerDetail: {
        backToOverview: string;
        partnerNotFound: string;
        contacts: string;
    };

    // AI Descriptions tab
    aiDescriptions: {
        generateNew: string;
        intro: string;
        additionalInfo: string;
        additionalInfoDescription: string;
        textPlaceholder: string;
        uploadDocument: string;
        addedInformation: string;
        projectContext: string;
        generateDescription: string;
        generateDescriptionWords: string;
        savedDescriptions: string;
        words: string;
        enterTitle: string;
        correctionInstruction: string;
        correctionPlaceholder: string;
        whatToCorrect: string;
        correctionPlaceholderSaved: string;
    };

    // Documents tab
    documents: {
        title: string;
        dragFiles: string;
        noDocuments: string;
        noDocsTitle: string;
        previousProjects: string;
    };

    // Form labels
    form: {
        projectTitle: string;
        projectTitlePlaceholder: string;
    };

    // Error messages
    errors: {
        generationFailed: string;
        correctionFailed: string;
        apiKeyMissing: string;
        networkError: string;
        tryAgain: string;
    };
}

const translations: Record<Language, Translations> = {
    en: {
        tabs: {
            edit: "Edit",
            aiDescriptions: "AI Descriptions",
            documents: "Documents",
        },
        buttons: {
            save: "Save",
            saving: "Saving...",
            savePartner: "Save Partner",
            edit: "Edit",
            delete: "Delete",
            copy: "Copy",
            correct: "Correct",
            generate: "Generate",
            generating: "Generating...",
            upload: "Upload",
            download: "Download",
            add: "Add",
            cancel: "Cancel",
            send: "Send",
            selectFile: "Select file",
            addReport: "Add report",
        },
        partnerDetail: {
            backToOverview: "Back to overview",
            partnerNotFound: "Partner not found",
            contacts: "contacts",
        },
        aiDescriptions: {
            generateNew: "Generate New Description",
            intro: "Generate a comprehensive description using AI based on available data.",
            additionalInfo: "Additional Information (optional)",
            additionalInfoDescription: "Add keywords, sentences, or documents that are not on the website but are important.",
            textPlaceholder: "e.g.: Member of national association, 15 years EU project experience, specialized in digital literacy...",
            uploadDocument: "Upload document",
            addedInformation: "Added information:",
            projectContext: "Project Context (optional)",
            generateDescription: "Generate Description",
            generateDescriptionWords: "Generate Description (1000-1500 words)",
            savedDescriptions: "Saved Descriptions",
            words: "words",
            enterTitle: "Enter title...",
            correctionInstruction: "Correction Instruction",
            correctionPlaceholder: "e.g.: The member count is outdated, it's now 150 members",
            whatToCorrect: "What should be corrected?",
            correctionPlaceholderSaved: "e.g.: The member info is outdated, it's now 200 members",
        },
        documents: {
            title: "Documents & Project Reports",
            dragFiles: "Drag files here",
            noDocuments: "No documents uploaded yet. Upload project reports, certificates, or references.",
            noDocsTitle: "No documents",
            previousProjects: "Previous EU Projects",
        },
        form: {
            projectTitle: "Project Title",
            projectTitlePlaceholder: "Optional: Project title for context",
        },
        errors: {
            generationFailed: "Failed to generate description. Please try again.",
            correctionFailed: "Failed to apply correction. Please try again.",
            apiKeyMissing: "AI service not configured. Please contact your administrator.",
            networkError: "Network error. Please check your connection and try again.",
            tryAgain: "Try again",
        },
    },
    de: {
        tabs: {
            edit: "Bearbeiten",
            aiDescriptions: "KI-Beschreibungen",
            documents: "Dokumente",
        },
        buttons: {
            save: "Speichern",
            saving: "Speichern...",
            savePartner: "Partner speichern",
            edit: "Bearbeiten",
            delete: "Löschen",
            copy: "Kopieren",
            correct: "Korrigieren",
            generate: "Generieren",
            generating: "Generiere...",
            upload: "Hochladen",
            download: "Herunterladen",
            add: "Hinzufügen",
            cancel: "Abbrechen",
            send: "Senden",
            selectFile: "Datei auswählen",
            addReport: "Bericht hinzufügen",
        },
        partnerDetail: {
            backToOverview: "Zurück zur Übersicht",
            partnerNotFound: "Partner nicht gefunden",
            contacts: "Kontakte",
        },
        aiDescriptions: {
            generateNew: "Neue Beschreibung generieren",
            intro: "Generieren Sie eine umfassende Beschreibung mit KI basierend auf den verfügbaren Daten.",
            additionalInfo: "Zusätzliche Informationen (optional)",
            additionalInfoDescription: "Füge Stichworte, Sätze oder Dokumente hinzu, die nicht auf der Website stehen aber wichtig sind.",
            textPlaceholder: "z.B.: Mitglied im Deutschen Volkshochschulverband, 15 Jahre Erfahrung mit EU-Projekten, spezialisiert auf digitale Grundbildung...",
            uploadDocument: "Dokument hochladen",
            addedInformation: "Hinzugefügte Informationen:",
            projectContext: "Projekt-Kontext (optional)",
            generateDescription: "Beschreibung generieren",
            generateDescriptionWords: "Beschreibung generieren (1000-1500 Wörter)",
            savedDescriptions: "Gespeicherte Beschreibungen",
            words: "Wörter",
            enterTitle: "Titel eingeben...",
            correctionInstruction: "Korrektur-Anweisung",
            correctionPlaceholder: "z.B.: Die Mitgliederzahl ist veraltet, es sind jetzt 150 Mitglieder",
            whatToCorrect: "Was soll korrigiert werden?",
            correctionPlaceholderSaved: "z.B.: Die Info zu den Mitgliedern ist veraltet, mittlerweile sind es 200",
        },
        documents: {
            title: "Dokumente & Projektberichte",
            dragFiles: "Dateien hierher ziehen",
            noDocuments: "Noch keine Dokumente hochgeladen. Lade Projektberichte, Zertifikate oder Referenzen hoch.",
            noDocsTitle: "Keine Dokumente",
            previousProjects: "Frühere EU-Projekte",
        },
        form: {
            projectTitle: "Projekttitel",
            projectTitlePlaceholder: "Optional: Projekttitel für Kontext",
        },
        errors: {
            generationFailed: "Beschreibung konnte nicht generiert werden. Bitte versuchen Sie es erneut.",
            correctionFailed: "Korrektur konnte nicht angewendet werden. Bitte versuchen Sie es erneut.",
            apiKeyMissing: "KI-Service nicht konfiguriert. Bitte kontaktieren Sie Ihren Administrator.",
            networkError: "Netzwerkfehler. Bitte überprüfen Sie Ihre Verbindung und versuchen Sie es erneut.",
            tryAgain: "Erneut versuchen",
        },
    },
    ro: {
        tabs: {
            edit: "Editează",
            aiDescriptions: "Descrieri AI",
            documents: "Documente",
        },
        buttons: {
            save: "Salvează",
            saving: "Se salvează...",
            savePartner: "Salvează partenerul",
            edit: "Editează",
            delete: "Șterge",
            copy: "Copiază",
            correct: "Corectează",
            generate: "Generează",
            generating: "Se generează...",
            upload: "Încarcă",
            download: "Descarcă",
            add: "Adaugă",
            cancel: "Anulează",
            send: "Trimite",
            selectFile: "Selectează fișier",
            addReport: "Adaugă raport",
        },
        partnerDetail: {
            backToOverview: "Înapoi la prezentarea generală",
            partnerNotFound: "Partenerul nu a fost găsit",
            contacts: "contacte",
        },
        aiDescriptions: {
            generateNew: "Generează o descriere nouă",
            intro: "Generați o descriere cuprinzătoare utilizând AI pe baza datelor disponibile.",
            additionalInfo: "Informații suplimentare (opțional)",
            additionalInfoDescription: "Adăugați cuvinte cheie, propoziții sau documente care nu sunt pe site, dar sunt importante.",
            textPlaceholder: "de ex.: Membru al asociației naționale, 15 ani de experiență în proiecte UE, specializat în alfabetizare digitală...",
            uploadDocument: "Încarcă document",
            addedInformation: "Informații adăugate:",
            projectContext: "Contextul proiectului (opțional)",
            generateDescription: "Generează descrierea",
            generateDescriptionWords: "Generează descrierea (1000-1500 cuvinte)",
            savedDescriptions: "Descrieri salvate",
            words: "cuvinte",
            enterTitle: "Introduceți titlul...",
            correctionInstruction: "Instrucțiune de corectare",
            correctionPlaceholder: "de ex.: Numărul de membri este învechit, acum sunt 150 de membri",
            whatToCorrect: "Ce trebuie corectat?",
            correctionPlaceholderSaved: "de ex.: Informațiile despre membri sunt învechite, acum sunt 200 de membri",
        },
        documents: {
            title: "Documente și rapoarte de proiect",
            dragFiles: "Trageți fișierele aici",
            noDocuments: "Nu au fost încă încărcate documente. Încărcați rapoarte de proiect, certificate sau referințe.",
            noDocsTitle: "Niciun document",
            previousProjects: "Proiecte UE anterioare",
        },
        form: {
            projectTitle: "Titlul proiectului",
            projectTitlePlaceholder: "Opțional: Titlul proiectului pentru context",
        },
        errors: {
            generationFailed: "Nu s-a putu genera descrierea. Vă rugăm să încercați din nou.",
            correctionFailed: "Nu s-a putut aplica corecția. Vă rugăm să încercați din nou.",
            apiKeyMissing: "Serviciul AI nu este configurat. Vă rugăm să contactați administratorul.",
            networkError: "Eroare de rețea. Vă rugăm să verificați conexiunea și să încercați din nou.",
            tryAgain: "Încearcă din nou",
        },
    },
    hr: {
        tabs: {
            edit: "Uredi",
            aiDescriptions: "AI Opisi",
            documents: "Dokumenti",
        },
        buttons: {
            save: "Spremi",
            saving: "Spremanje...",
            savePartner: "Spremi partnera",
            edit: "Uredi",
            delete: "Obriši",
            copy: "Kopiraj",
            correct: "Ispravi",
            generate: "Generiraj",
            generating: "Generiranje...",
            upload: "Prenesi",
            download: "Preuzmi",
            add: "Dodaj",
            cancel: "Odustani",
            send: "Pošalji",
            selectFile: "Odaberi datoteku",
            addReport: "Dodaj izvještaj",
        },
        partnerDetail: {
            backToOverview: "Povratak na pregled",
            partnerNotFound: "Partner nije pronađen",
            contacts: "kontakti",
        },
        aiDescriptions: {
            generateNew: "Generiraj novi opis",
            intro: "Generirajte sveobuhvatan opis pomoću AI na temelju dostupnih podataka.",
            additionalInfo: "Dodatne informacije (opcionalno)",
            additionalInfoDescription: "Dodajte ključne riječi, rečenice ili dokumente koji nisu na web stranici, ali su važni.",
            textPlaceholder: "npr.: Član nacionalne udruge, 15 godina iskustva u EU projektima, specijaliziran za digitalnu pismenost...",
            uploadDocument: "Prenesi dokument",
            addedInformation: "Dodane informacije:",
            projectContext: "Kontekst projekta (opcionalno)",
            generateDescription: "Generiraj opis",
            generateDescriptionWords: "Generiraj opis (1000-1500 riječi)",
            savedDescriptions: "Spremljeni opisi",
            words: "riječi",
            enterTitle: "Unesite naslov...",
            correctionInstruction: "Upute za ispravak",
            correctionPlaceholder: "npr.: Broj članova je zastario, sada ima 150 članova",
            whatToCorrect: "Što treba ispraviti?",
            correctionPlaceholderSaved: "npr.: Informacije o članovima su zastarjele, sada ima 200 članova",
        },
        documents: {
            title: "Dokumenti i izvještaji o projektima",
            dragFiles: "Povucite datoteke ovdje",
            noDocuments: "Još nema učitanih dokumenata. Učitajte izvještaje o projektima, certifikate ili reference.",
            noDocsTitle: "Nema dokumenata",
            previousProjects: "Prethodni EU projekti",
        },
        form: {
            projectTitle: "Naslov projekta",
            projectTitlePlaceholder: "Opcionalno: Naslov projekta za kontekst",
        },
        errors: {
            generationFailed: "Generiranje opisa nije uspjelo. Molimo pokušajte ponovno.",
            correctionFailed: "Primjena ispravka nije uspjela. Molimo pokušajte ponovno.",
            apiKeyMissing: "AI usluga nije konfigurirana. Molimo kontaktirajte administratora.",
            networkError: "Mrežna pogreška. Molimo provjerite vezu i pokušajte ponovno.",
            tryAgain: "Pokušaj ponovno",
        },
    },
    pt: {
        tabs: {
            edit: "Editar",
            aiDescriptions: "Descrições IA",
            documents: "Documentos",
        },
        buttons: {
            save: "Guardar",
            saving: "A guardar...",
            savePartner: "Guardar parceiro",
            edit: "Editar",
            delete: "Eliminar",
            copy: "Copiar",
            correct: "Corrigir",
            generate: "Gerar",
            generating: "A gerar...",
            upload: "Carregar",
            download: "Descarregar",
            add: "Adicionar",
            cancel: "Cancelar",
            send: "Enviar",
            selectFile: "Selecionar ficheiro",
            addReport: "Adicionar relatório",
        },
        partnerDetail: {
            backToOverview: "Voltar à visão geral",
            partnerNotFound: "Parceiro não encontrado",
            contacts: "contactos",
        },
        aiDescriptions: {
            generateNew: "Gerar nova descrição",
            intro: "Gerar uma descrição abrangente usando IA com base nos dados disponíveis.",
            additionalInfo: "Informações adicionais (opcional)",
            additionalInfoDescription: "Adicione palavras-chave, frases ou documentos que não estão no site mas são importantes.",
            textPlaceholder: "ex.: Membro da associação nacional, 15 anos de experiência em projetos UE, especializado em literacia digital...",
            uploadDocument: "Carregar documento",
            addedInformation: "Informações adicionadas:",
            projectContext: "Contexto do projeto (opcional)",
            generateDescription: "Gerar descrição",
            generateDescriptionWords: "Gerar descrição (1000-1500 palavras)",
            savedDescriptions: "Descrições guardadas",
            words: "palavras",
            enterTitle: "Introduzir título...",
            correctionInstruction: "Instrução de correção",
            correctionPlaceholder: "ex.: O número de membros está desatualizado, agora são 150 membros",
            whatToCorrect: "O que deve ser corrigido?",
            correctionPlaceholderSaved: "ex.: A informação sobre membros está desatualizada, agora são 200 membros",
        },
        documents: {
            title: "Documentos e relatórios de projetos",
            dragFiles: "Arraste ficheiros aqui",
            noDocuments: "Ainda não foram carregados documentos. Carregue relatórios de projetos, certificados ou referências.",
            noDocsTitle: "Nenhum documento",
            previousProjects: "Projetos UE anteriores",
        },
        form: {
            projectTitle: "Título do projeto",
            projectTitlePlaceholder: "Opcional: Título do projeto para contexto",
        },
        errors: {
            generationFailed: "Falha ao gerar descrição. Por favor, tente novamente.",
            correctionFailed: "Falha ao aplicar correção. Por favor, tente novamente.",
            apiKeyMissing: "Serviço de IA não configurado. Por favor, contacte o seu administrador.",
            networkError: "Erro de rede. Por favor, verifique a sua ligação e tente novamente.",
            tryAgain: "Tentar novamente",
        },
    },
};

/**
 * Get translations for a specific language
 */
export function getTranslations(language: string): Translations {
    const lang = language.toLowerCase() as Language;
    return translations[lang] || translations.en;
}

/**
 * Create a translation function for a specific language
 */
export function createTranslator(language: string) {
    const t = getTranslations(language);
    return t;
}
