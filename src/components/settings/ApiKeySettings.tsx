'use client';

import { useState, useEffect } from 'react';
import { Settings, Key, Check, AlertTriangle } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslation } from '@/lib/i18n';
import { useLanguageStore } from '@/store/language-store';

export function ApiKeySettings() {
    const { language } = useLanguageStore();
    const { t } = useTranslation(language);
    const [apiKey, setApiKey] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    useEffect(() => {
        // Load from localStorage on mount
        const storedKey = localStorage.getItem('erasmus_gemini_api_key');
        if (storedKey) {
            setApiKey(storedKey);
        }
    }, []);

    const handleSave = () => {
        if (apiKey.trim()) {
            localStorage.setItem('erasmus_gemini_api_key', apiKey.trim());
        } else {
            localStorage.removeItem('erasmus_gemini_api_key');
        }
        setIsSaved(true);
        setTimeout(() => {
            setIsSaved(false);
            setIsOpen(false);
        }, 1000);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-900">
                    <Settings className="h-5 w-5" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5 text-blue-600" />
                        Gemini API Key
                    </DialogTitle>
                    <DialogDescription>
                        {language === 'de'
                            ? 'Gib deinen eigenen Gemini API Key ein, um Limits zu vermeiden. Der Key wird nur lokal in deinem Browser gespeichert.'
                            : 'Enter your own Gemini API Key to avoid rate limits. The key is stored locally in your browser only.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <label htmlFor="api-key" className="text-sm font-medium">
                            API Key
                        </label>
                        <Input
                            id="api-key"
                            type="password"
                            placeholder="AIzaSy..."
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            {language === 'de'
                                ? 'Du kannst einen kostenlosen Key hier erstellen:'
                                : 'You can create a free key here:'}{' '}
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                            >
                                Google AI Studio
                            </a>
                        </p>
                    </div>

                    <div className="rounded-md bg-yellow-50 p-3">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-yellow-800">
                                    {language === 'de' ? 'Wichtiger Hinweis' : 'Important Note'}
                                </h3>
                                <div className="mt-2 text-sm text-yellow-700">
                                    <p>
                                        {language === 'de'
                                            ? 'Ohne eigenen Key können Anfragen fehlschlagen (Error 429). Dein Key hat höhere Limits.'
                                            : 'Without your own key, requests may fail (Error 429). Your key has higher limits.'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="sm:justify-between">
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            {language === 'de' ? 'Abbrechen' : 'Cancel'}
                        </Button>
                    </DialogClose>
                    <Button type="button" onClick={handleSave} className="bg-[#003399] hover:bg-[#002266]">
                        {isSaved ? (
                            <>
                                <Check className="mr-2 h-4 w-4" />
                                {language === 'de' ? 'Gespeichert' : 'Saved'}
                            </>
                        ) : (
                            language === 'de' ? 'Speichern' : 'Save'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
