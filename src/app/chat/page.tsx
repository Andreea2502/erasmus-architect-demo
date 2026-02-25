'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, FileText, RefreshCw } from 'lucide-react';
import { useLanguageStore } from '@/store/language-store';
import { queryWithRAG, vectorStore } from '@/lib/rag-system';
import { callGemini } from '@/lib/ai-service';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { documentName: string; pageNumber?: number }[];
  timestamp: Date;
}

export default function ChatPage() {
  const { language } = useLanguageStore();
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMounted(true);
    // Welcome message
    setMessages([{
      id: '1',
      role: 'assistant',
      content: language === 'de'
        ? 'Hallo! Ich bin dein Erasmus+ Experte. Ich kann dir bei allen Fragen zum Programmleitfaden 2026, zur Antragstellung und zur Projektplanung helfen. Was möchtest du wissen?'
        : 'Hello! I\'m your Erasmus+ expert. I can help you with all questions about the Programme Guide 2026, application process, and project planning. What would you like to know?',
      timestamp: new Date(),
    }]);
  }, [language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Check if we have documents in the knowledge base
      const docs = vectorStore.getDocuments();
      let response: string;
      let sources: { documentName: string; pageNumber?: number }[] = [];

      if (docs.length > 0) {
        // Use RAG if we have documents
        const result = await queryWithRAG(userMessage.content, {
          includeGuide: true,
          includeStudies: true,
          language,
        });
        response = result.answer;
        sources = result.sources;
      } else {
        // Direct AI call without RAG
        const systemContext = language === 'de'
          ? `Du bist ein erfahrener Erasmus+ Berater und kennst den Programmleitfaden 2026 sehr gut.
Antworte präzise und hilfreich auf Deutsch. Gib konkrete Tipps und Beispiele.
Wenn du etwas nicht weißt, sage es ehrlich.`
          : `You are an experienced Erasmus+ advisor who knows the Programme Guide 2026 very well.
Answer precisely and helpfully. Give concrete tips and examples.
If you don't know something, say so honestly.`;

        response = await callGemini(userMessage.content, systemContext);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        sources: sources.length > 0 ? sources : undefined,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: language === 'de'
          ? 'Entschuldigung, es gab einen Fehler. Bitte versuche es erneut.'
          : 'Sorry, there was an error. Please try again.',
        timestamp: new Date(),
      }]);
    }

    setLoading(false);
  };

  const suggestions = language === 'de'
    ? [
        'Welche EU-Prioritäten sollte ich 2026 adressieren?',
        'Was sind die Unterschiede zwischen KA220 und KA210?',
        'Wie schreibe ich eine überzeugende Needs Analysis?',
        'Welche Evaluierungskriterien sind am wichtigsten?',
      ]
    : [
        'Which EU priorities should I address in 2026?',
        'What are the differences between KA220 and KA210?',
        'How do I write a compelling Needs Analysis?',
        'Which evaluation criteria are most important?',
      ];

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#fafafa]">
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center px-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[#003399] to-[#0055cc] rounded-xl flex items-center justify-center">
            <Bot className="text-white" size={20} />
          </div>
          <div>
            <h1 className="font-semibold text-gray-900">
              {language === 'de' ? 'Erasmus+ Experte' : 'Erasmus+ Expert'}
            </h1>
            <p className="text-xs text-gray-500">
              {language === 'de' ? 'KI-Berater für Projektanträge' : 'AI advisor for applications'}
            </p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 bg-[#003399] rounded-lg flex items-center justify-center flex-shrink-0">
                <Bot size={16} className="text-white" />
              </div>
            )}
            <div
              className={`max-w-2xl rounded-2xl p-4 ${
                message.role === 'user'
                  ? 'bg-[#003399] text-white'
                  : 'bg-white border border-gray-200'
              }`}
            >
              <p className="whitespace-pre-wrap text-sm">{message.content}</p>

              {/* Sources */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-1">
                    {language === 'de' ? 'Quellen:' : 'Sources:'}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {message.sources.map((source, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded"
                      >
                        <FileText size={10} />
                        {source.documentName}
                        {source.pageNumber && ` S.${source.pageNumber}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {message.role === 'user' && (
              <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <User size={16} className="text-gray-600" />
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 bg-[#003399] rounded-lg flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-gray-500">
                <RefreshCw size={16} className="animate-spin" />
                <span className="text-sm">
                  {language === 'de' ? 'Denke nach...' : 'Thinking...'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Suggestions when no messages */}
        {messages.length === 1 && (
          <div className="pt-8">
            <p className="text-sm text-gray-500 mb-4 text-center">
              {language === 'de' ? 'Oder probiere eine dieser Fragen:' : 'Or try one of these questions:'}
            </p>
            <div className="grid sm:grid-cols-2 gap-2 max-w-2xl mx-auto">
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(suggestion)}
                  className="text-left p-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-700 hover:border-[#003399] hover:bg-blue-50 transition-all"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                placeholder={language === 'de'
                  ? 'Frag mich etwas zum Erasmus+ Programm...'
                  : 'Ask me something about Erasmus+ programme...'}
                className="w-full p-4 pr-12 bg-gray-50 border-0 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-[#003399] focus:bg-white resize-none"
                rows={1}
                style={{ minHeight: '56px', maxHeight: '200px' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-4 bg-[#003399] text-white rounded-xl hover:bg-[#002266] disabled:bg-gray-200 disabled:text-gray-400 transition-all"
            >
              <Send size={20} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
