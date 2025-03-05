'use client';

import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import PdfViewer from './PdfViewer';
import ChatInterface from './ChatInterface';
import PacmanLoader from 'react-spinners/PacmanLoader';

interface Source {
  page: number;
  content: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sourcePages: number[];
  sources?: Source[];
  timestamp: Date;
  _id: string;
}

// Interface for the raw message data from the server
interface ServerMessage {
  role: 'user' | 'assistant';
  content: string;
  sourcePages: number[];
  sources?: Source[];
  timestamp: string;
  _id: string;
}

interface PdfChatProps {
  documentId: string;
}

export default function PdfChat({ documentId }: PdfChatProps) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const { toast } = useToast();
  const { data: session } = useSession();

  // Load chat history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await fetch(`/api/pdf/${documentId}/history`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'x-user-id': session?.user?.id || '',
          },
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to load chat history');
        }
        
        const data = await response.json();
        console.log('Received chat history:', data); // Debug log
        
        // Check if data is an array (direct chat history)
        if (Array.isArray(data)) {
          const formattedHistory = data.map((msg: ServerMessage) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
            sourcePages: msg.sourcePages || [] // Ensure sourcePages is always an array
          }));
          setMessages(formattedHistory);
        } else if (data && data.chatHistory) {
          // Handle case where chat history is wrapped in an object
          const formattedHistory = data.chatHistory.map((msg: ServerMessage) => ({
            ...msg,
            timestamp: new Date(msg.timestamp),
            sourcePages: msg.sourcePages || []
          }));
          setMessages(formattedHistory);
        } else {
          console.log('No valid chat history found:', data);
          setMessages([]);
        }
      } catch (err) {
        console.error('Error loading chat history:', err);
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to load chat history",
          variant: "destructive",
        });
        setMessages([]);
      } finally {
        setInitialLoading(false);
      }
    };

    if (session?.user?.id) {
      loadHistory();
    } else {
      setInitialLoading(false);
    }
  }, [documentId, toast, session?.user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !session?.user?.id) return;

    const userMessage = input;
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`/api/pdf/${documentId}/chat`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'x-user-id': session.user.id,
        },
        body: JSON.stringify({ content: userMessage }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get response');
      }

      const data = await response.json();
      console.log('Received chat response:', data); // Debug log
      
      // Check if chatHistory is directly in the response or nested
      const chatHistory = Array.isArray(data) ? data : data.chatHistory;
      
      if (chatHistory) {
        const formattedHistory = chatHistory.map((msg: ServerMessage) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
          sourcePages: msg.sourcePages || [] // Ensure sourcePages is always an array
        }));
        setMessages(formattedHistory);

        // If source pages are provided, jump to the first referenced page
        const lastMessage = chatHistory[chatHistory.length - 1];
        if (lastMessage && lastMessage.sourcePages?.length > 0) {
          setCurrentPage(lastMessage.sourcePages[0]);
        }
      } else {
        console.error('Invalid chat response format:', data);
        toast({
          title: "Error",
          description: "Received invalid response format from server",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Chat error:', err);
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to get response",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <PacmanLoader color="#538B81" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-4 p-4 bg-muted/10">
      <div className="w-[55%] relative">
        <PdfViewer
          documentId={documentId}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      </div>
      <div className="w-[45%]">
        <ChatInterface
          messages={messages}
          loading={loading}
          input={input}
          onInputChange={setInput}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
} 