import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User, MessageCircle } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AnalysisResponse, AnalysisConversation } from "@shared/schema";
import { cn } from "@/lib/utils";

interface AnalysisChatProps {
  analysis: AnalysisResponse;
}

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  message: string;
  createdAt: string;
}

export function AnalysisChat({ analysis }: AnalysisChatProps) {
  const [message, setMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Fetch conversation history
  const { data: conversations = [] } = useQuery<ChatMessage[]>({
    queryKey: [`/api/analyses/${analysis.id}/conversations`],
    enabled: !!analysis.id,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (userMessage: string) => {
      const res = await apiRequest('POST', `/api/analyses/${analysis.id}/chat`, {
        message: userMessage,
      });
      return res.json();
    },
    onSuccess: () => {
      setMessage('');
      // Invalidate conversations to get the latest messages
      queryClient.invalidateQueries({ 
        queryKey: [`/api/analyses/${analysis.id}/conversations`] 
      });
    },
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [conversations]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  if (!isExpanded) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <Button
            variant="outline"
            onClick={() => setIsExpanded(true)}
            className="w-full flex items-center justify-center space-x-2 h-12"
          >
            <MessageCircle className="h-5 w-5" />
            <span>Ask AI about this analysis</span>
          </Button>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Bot className="h-5 w-5 text-blue-500" />
            <span>Analysis Discussion</span>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </Button>
        </div>
        <p className="text-sm text-gray-600">
          Ask questions about the analysis results, candidate rankings, or get deeper insights
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Chat Messages */}
        <ScrollArea ref={scrollAreaRef} className="h-80 w-full border rounded-lg">
          <div className="p-4 space-y-4">
            {conversations.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Bot className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">Start a conversation about your analysis results</p>
                <p className="text-xs text-gray-400 mt-1">
                  Ask about rankings, underdogs, or specific candidates
                </p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "flex items-start space-x-3",
                    conv.role === 'user' ? "flex-row-reverse space-x-reverse" : ""
                  )}
                >
                  <Avatar className={cn(
                    "h-8 w-8",
                    conv.role === 'user' ? "bg-blue-100" : "bg-gray-100"
                  )}>
                    <AvatarFallback>
                      {conv.role === 'user' ? (
                        <User className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Bot className="h-4 w-4 text-gray-600" />
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className={cn(
                    "flex-1 max-w-[80%]",
                    conv.role === 'user' ? "text-right" : ""
                  )}>
                    <div className={cn(
                      "rounded-lg px-3 py-2 text-sm",
                      conv.role === 'user' 
                        ? "bg-blue-500 text-white" 
                        : "bg-gray-100 text-gray-900"
                    )}>
                      {conv.message}
                    </div>
                    <p className={cn(
                      "text-xs text-gray-500 mt-1",
                      conv.role === 'user' ? "text-right" : ""
                    )}>
                      {new Date(conv.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            
            {/* Loading indicator */}
            {sendMessageMutation.isPending && (
              <div className="flex items-start space-x-3">
                <Avatar className="h-8 w-8 bg-gray-100">
                  <AvatarFallback>
                    <Bot className="h-4 w-4 text-gray-600" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="bg-gray-100 rounded-lg px-3 py-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <form onSubmit={handleSubmit} className="flex items-center space-x-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ask about the analysis results..."
            disabled={sendMessageMutation.isPending}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!message.trim() || sendMessageMutation.isPending}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>

        {/* Quick suggestions */}
        {conversations.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {[
              "Why did you pick the underdog candidate?",
              "Compare the top 2 candidates",
              "What skills are missing from candidate 3?",
              "Explain the scoring methodology",
            ].map((suggestion) => (
              <Button
                key={suggestion}
                variant="outline"
                size="sm"
                onClick={() => setMessage(suggestion)}
                disabled={sendMessageMutation.isPending}
                className="text-xs"
              >
                {suggestion}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}