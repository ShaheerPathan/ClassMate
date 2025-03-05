import { useRef, useEffect, useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader2, Send, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Source {
  page: number;
  content: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sourcePages?: number[];
  sources?: Source[];
  timestamp?: Date;
  _id?: string;
}

interface ChatInterfaceProps {
  messages: Message[];
  loading: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function ChatInterface({
  messages,
  loading,
  input,
  onInputChange,
  onSubmit
}: ChatInterfaceProps) {
  const [showSourcesMap, setShowSourcesMap] = useState<{[key: string]: boolean}>({});
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const formatTimestamp = (date?: Date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const toggleSources = (messageId: string) => {
    setShowSourcesMap(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] bg-background rounded-lg shadow-lg border">
      {/* Chat Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Scriba Assistant</h2>
        <p className="text-sm text-muted-foreground">Ask questions about your document</p>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => {
            const messageId = message._id || `msg-${index}`;
            const showSources = showSourcesMap[messageId];
            
            return (
              <div
                key={messageId}
                className={cn(
                  "flex gap-3 w-full",
                  message.role === 'assistant' ? 'justify-start' : 'justify-end'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                )}
                <Card
                  className={cn(
                    "max-w-[80%] p-4",
                    message.role === 'assistant' 
                      ? 'bg-primary/10 rounded-tl-none' 
                      : 'bg-secondary/10 rounded-tr-none'
                  )}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {message.role === 'assistant' ? 'AI Assistant' : 'You'}
                      </span>
                      {message.timestamp && (
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(message.timestamp)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    {message.role === 'assistant' && message.sourcePages && message.sourcePages.length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span>Source pages: {message.sourcePages.join(', ')}</span>
                          {message.sources && message.sources.length > 0 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => toggleSources(messageId)}
                            >
                              {showSources ? 'Hide excerpts' : 'Show excerpts'}
                            </Button>
                          )}
                        </div>
                        {showSources && message.sources && message.sources.length > 0 && (
                          <div className="mt-2 pl-2 border-l-2 border-muted">
                            <div className="text-xs text-muted-foreground space-y-2">
                              {message.sources.map((source, idx) => (
                                <div key={idx} className="space-y-1">
                                  <span className="font-medium">Page {source.page}</span>
                                  <p className="text-xs opacity-80">{source.content}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
                {message.role === 'user' && (
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-secondary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-secondary-foreground" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <form onSubmit={onSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder="Ask a question ..."
            disabled={loading}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={loading || !input.trim()}
            size="icon"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
} 