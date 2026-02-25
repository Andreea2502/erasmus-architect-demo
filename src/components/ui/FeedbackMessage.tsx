import React from 'react';
import { XCircle, CheckCircle, RefreshCw, AlertTriangle, LucideIcon } from 'lucide-react';
import { Button } from './button';

type MessageType = 'error' | 'success' | 'warning' | 'info';

interface FeedbackMessageProps {
    type: MessageType;
    message: string;
    onRetry?: () => void;
    className?: string;
    retryText?: string;
}

const config: Record<MessageType, { bg: string, border: string, text: string, icon: LucideIcon, retryClasses: string }> = {
    error: {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-700',
        icon: XCircle,
        retryClasses: 'text-red-600 hover:text-red-800 hover:bg-red-100'
    },
    success: {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-700',
        icon: CheckCircle,
        retryClasses: 'text-green-600 hover:text-green-800 hover:bg-green-100'
    },
    warning: {
        bg: 'bg-orange-50',
        border: 'border-orange-200',
        text: 'text-orange-700',
        icon: AlertTriangle,
        retryClasses: 'text-orange-600 hover:text-orange-800 hover:bg-orange-100'
    },
    info: {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-700',
        icon: AlertTriangle,
        retryClasses: 'text-blue-600 hover:text-blue-800 hover:bg-blue-100'
    }
};

export function FeedbackMessage({
    type,
    message,
    onRetry,
    className = '',
    retryText = 'Erneut'
}: FeedbackMessageProps) {
    const styles = config[type];
    const Icon = styles.icon;

    return (
        <div className={`p-3 ${styles.bg} border ${styles.border} rounded-lg text-sm ${styles.text} flex items-center gap-2 ${className}`}>
            <Icon className="h-4 w-4 flex-shrink-0" />
            <span>{type === 'error' ? 'Fehler:' : ''} {message}</span>
            {onRetry && (
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRetry}
                    className={`ml-auto ${styles.retryClasses}`}
                >
                    <RefreshCw className="h-3 w-3 mr-1" /> {retryText}
                </Button>
            )}
        </div>
    );
}
