import React from 'react';
import { Lightbulb } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface PromptInstructionInputProps {
    value: string;
    onChange: (value: string) => void;
    className?: string;
}

export function PromptInstructionInput({ value, onChange, className = '' }: PromptInstructionInputProps) {
    return (
        <div className={`mb-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100 ${className}`}>
            <label className="block text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                Spezifische KI-Anweisungen & fehlende Themen (Optional)
            </label>
            <p className="text-xs text-blue-700 mb-3">
                Möchtest du Aspekte ergänzen, die bisher zu kurz kamen (z.B. "Fokus auf nachhaltiges Prompting")? Diese Anweisungen lenken die Generierung von Konzepten, Zielen, Work Packages und dem Entwurf.
            </p>
            <Textarea
                placeholder="Hier gewünschte Schwerpunkte oder exakte Vorgaben für die KI eintragen..."
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="min-h-[80px] bg-white border-blue-200 focus:border-blue-400 focus:ring-blue-400"
            />
        </div>
    );
}
