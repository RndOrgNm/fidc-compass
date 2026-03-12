import { useState, useEffect, useRef } from "react";
import { useLocation, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Bot, Send, MessageSquare, Plus, Loader2, ChevronLeft, ChevronRight, X, Trash2, UserCog, ChevronDown, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import { RAG_API_BASE_URL } from "@/lib/api/config";
import { useChat } from "@/contexts/ChatContext";

export default function Agent() {
  const location = useLocation();
  const { conversationId: conversationIdFromUrl } = useParams<{ conversationId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    conversations,
    currentConversationId,
    messages,
    isLoading,
    isLoadingConversations,
    streamingMessage,
    selectedAgent,
    setSelectedAgent,
    setCurrentConversationId,
    setStreamingMessage,
    refreshConversations,
    loadMessages,
    sendMessage,
    deleteConversation,
    resetToInitialState,
  } = useChat();

  // UI-specific local state
  const [inputValue, setInputValue] = useState("");
  const [displayedText, setDisplayedText] = useState("");
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = 100;
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  // Check for reset state from navigation
  useEffect(() => {
    const state = location.state as { reset?: boolean } | null;
    if (state?.reset) {
      resetToInitialState();
      setInputValue("");
      setDisplayedText("");
      setPdfViewerOpen(false);
      setCurrentPage(1);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, resetToInitialState]);

  // URL → state: agent and conversationId from URL
  useEffect(() => {
    const agentFromUrl = searchParams.get("agent");
    if (agentFromUrl === "funds" || agentFromUrl === "cvm") {
      setSelectedAgent(agentFromUrl);
    } else if (selectedAgent) {
      setSearchParams((p) => {
        const next = new URLSearchParams(p);
        next.set("agent", selectedAgent);
        return next;
      }, { replace: true });
    }
  }, [searchParams, setSelectedAgent, selectedAgent, setSearchParams]);

  // Sync conversationId from URL
  useEffect(() => {
    if (conversationIdFromUrl && conversationIdFromUrl !== currentConversationId) {
      setCurrentConversationId(conversationIdFromUrl);
    }
  }, [conversationIdFromUrl, setCurrentConversationId]);

  // --- Data loading ---
  useEffect(() => {
    refreshConversations();
  }, [refreshConversations]);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    }
  }, [currentConversationId, loadMessages]);

  // Sync state -> URL when conversation is set
  useEffect(() => {
    if (!currentConversationId) return;
    if (currentConversationId === conversationIdFromUrl) return;
    const params = new URLSearchParams();
    params.set("agent", selectedAgent);
    navigate(`/agent/${encodeURIComponent(currentConversationId)}?${params}`, { replace: true });
  }, [currentConversationId, conversationIdFromUrl, selectedAgent, navigate]);

  const scrollToBottom = () => {
    if (shouldAutoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  };

  const isNearBottom = () => {
    if (!messagesContainerRef.current) return true;
    const container = messagesContainerRef.current;
    const threshold = 100; // pixels from bottom
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    return distanceFromBottom < threshold;
  };

  // Only scroll on new messages, NOT during text streaming
  useEffect(() => {
    if (isNearBottom()) {
      shouldAutoScrollRef.current = true;
      scrollToBottom();
    }
  }, [messages]);

  // Track user scroll - if they scroll up, disable auto-scroll
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const isAtBottom = isNearBottom();
      shouldAutoScrollRef.current = isAtBottom;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Streaming text animation
  useEffect(() => {
    if (!streamingMessage) return;

    let index = 0;
    const fullText = streamingMessage.content;
    let mounted = true;
    setDisplayedText("");

    const interval = setInterval(() => {
      if (!mounted) {
        clearInterval(interval);
        return;
      }

      if (index < fullText.length) {
        // Add 3-5 characters at a time for faster display
        const chunkSize = Math.min(4, fullText.length - index);
        setDisplayedText(fullText.slice(0, index + chunkSize));
        index += chunkSize;
      } else {
        clearInterval(interval);
        if (mounted) {
          setStreamingMessage(null);
        }
      }
    }, 8);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [streamingMessage, setStreamingMessage]);

  const buildAgentUrl = (conversationId?: string, agent = selectedAgent) => {
    const params = new URLSearchParams();
    params.set("agent", agent);
    const query = params.toString();
    return conversationId
      ? `/agent/${encodeURIComponent(conversationId)}?${query}`
      : `/agent?${query}`;
  };

  const handleConversationChange = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setInputValue("");
    setStreamingMessage(null);
    setDisplayedText("");
    navigate(buildAgentUrl(conversationId), { replace: true });
  };

  const handleNewConversation = () => {
    resetToInitialState();
    setInputValue("");
    setDisplayedText("");
    setPdfViewerOpen(false);
    setCurrentPage(1);
    navigate(buildAgentUrl(), { replace: true });
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta conversa?")) {
      return;
    }
    const wasCurrent = conversationId === currentConversationId || conversationId === conversationIdFromUrl;
    await deleteConversation(conversationId);
    if (wasCurrent) {
      navigate(buildAgentUrl(), { replace: true });
    }
  };

  const openPdfViewer = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    setPdfViewerOpen(true);
  };

  // Fetch PDF as blob when viewer opens — avoids iframe mixed-content and embedding issues
  const pdfBlobUrlRef = useRef<string | null>(null);
  const pdfViewerOpenRef = useRef(pdfViewerOpen);
  pdfViewerOpenRef.current = pdfViewerOpen;

  useEffect(() => {
    if (!pdfViewerOpen) {
      if (pdfBlobUrlRef.current) {
        URL.revokeObjectURL(pdfBlobUrlRef.current);
        pdfBlobUrlRef.current = null;
      }
      setPdfBlobUrl(null);
      setPdfLoadError(null);
      return;
    }
    setPdfLoading(true);
    setPdfLoadError(null);
    const url = `${RAG_API_BASE_URL}/static/pdf/resol175consolid.pdf`;
    fetch(url)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { detail?: string })?.detail || `Erro ${res.status}`);
        }
        return res.blob();
      })
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        if (pdfViewerOpenRef.current) {
          pdfBlobUrlRef.current = blobUrl;
          setPdfBlobUrl(blobUrl);
        } else {
          URL.revokeObjectURL(blobUrl);
        }
      })
      .catch((err) => {
        if (pdfViewerOpenRef.current) {
          setPdfLoadError(err?.message || "Não foi possível carregar o documento");
          toast({
            title: "Erro ao carregar PDF",
            description: err?.message || "Verifique se o documento está disponível.",
            variant: "destructive",
          });
        }
      })
      .finally(() => setPdfLoading(false));
  }, [pdfViewerOpen]);

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage(prev => prev + 1);
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage(prev => prev - 1);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    const query = inputValue.trim();
    setInputValue("");
    await sendMessage(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (text: string) => {
    setInputValue(text);
    textareaRef.current?.focus();
  };

  const formatTimestamp = (timestamp: string) => {
    return format(new Date(timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const effectiveConversationId = currentConversationId || conversationIdFromUrl || undefined;
  const currentConversation = conversations.find(c => c.conversation_id === (currentConversationId || conversationIdFromUrl));
  const displayMessages = messages.map(msg => ({
    ...msg,
    content: msg.message_id === streamingMessage?.message_id ? displayedText : msg.content
  }));

  return (
    <div className="flex h-[calc(100vh-7rem)] relative -mx-6 -mb-0">
      {/* Main Chat Area */}
      <div className={`flex flex-col transition-all duration-300 ${pdfViewerOpen ? 'w-[65%] min-w-0' : 'w-full'} h-full relative z-0`}>
      {/* Header */}
        <div className="border-b bg-card p-4 flex flex-wrap items-center gap-4 flex-shrink-0">
        <Select value={effectiveConversationId} onValueChange={handleConversationChange}>
          <SelectTrigger className="w-[400px]">
            <SelectValue>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="truncate">{currentConversation?.title || "Selecione uma conversa"}</span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {isLoadingConversations ? (
              <SelectItem value="loading" disabled>
                Carregando...
              </SelectItem>
            ) : conversations.length === 0 ? (
              <SelectItem value="empty" disabled>
                Nenhuma conversa
              </SelectItem>
            ) : (
              conversations.map((conv) => (
                <SelectItem key={conv.conversation_id} value={conv.conversation_id}>
                <div className="flex items-center justify-between gap-2 w-full group">
                  <div className="flex flex-col gap-1 py-1 min-w-0">
                    <span className="font-medium truncate">{conv.title}</span>
                    {conv.lastMessageAt && (
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(conv.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteConversation(conv.conversation_id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-opacity flex-shrink-0"
                    aria-label="Excluir conversa"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        
        {effectiveConversationId && (
          <Button 
            onClick={() => handleDeleteConversation(effectiveConversationId)} 
            variant="outline" 
            size="sm"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
        )}
        <Button onClick={handleNewConversation} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nova Conversa
        </Button>
        <Button
          onClick={async () => {
            await refreshConversations();
            if (currentConversationId) {
              await loadMessages(currentConversationId);
            }
          }}
          variant="outline"
          size="sm"
          disabled={isLoadingConversations}
          title="Atualizar lista de conversas e mensagens"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingConversations ? "animate-spin" : ""}`} />
          Atualizar
        </Button>

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <UserCog className="h-4 w-4 mr-2" />
                {selectedAgent === "cvm" ? "CVM Agent" : "Funds Agent"}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup
                value={selectedAgent}
                onValueChange={(v) => {
                  const agent = v as "cvm" | "funds";
                  setSelectedAgent(agent);
                  navigate(buildAgentUrl(undefined, agent), { replace: true });
                }}
              >
                <DropdownMenuRadioItem value="cvm">CVM Agent</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="funds">Funds Agent</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-4 min-w-0 w-full">
        {displayMessages.length === 0 ? (
          <>
            {!isLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold">Olá! Sou seu assistente inteligente.</h2>
              <p className="text-muted-foreground">Como posso ajudá-lo hoje?</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-accent px-4 py-2"
                    onClick={() => handleSuggestionClick("Quais divulgações obrigatórias um fundo deve apresentar: advertência, rentabilidade mensal e em 12 meses, PL médio em 12 meses, taxas, público‑alvo, rating, benchmark e obrigação de divulgação após mudanças?")}
              >
                    Divulgação após mudanças na política
              </Badge>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-accent px-4 py-2"
                    onClick={() => handleSuggestionClick("É admissível denominar um FIDC ou uma classe de cotas mencionando cotas de outros FIDC ou fazendo referência ao tratamento tributário? Quais são os limites nessa denominação?")}
              >
                    Limites de denominação de FIDC
              </Badge>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-accent px-4 py-2"
                    onClick={() => handleSuggestionClick("É possível criar uma classe de cotas destinada a investidores profissionais que dispense limites de investimento, permita que o cedente receba a liquidação imediatamente e garanta voto livre aos titulares? Quais são os limites e obrigações do administrador nessa estrutura?")}
              >
                    Cotas para investidores profissionais
              </Badge>
            </div>
          </div>
            ) : (
              <div className="flex gap-3 px-6 py-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-bl-none px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-2 h-2 bg-primary-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-2 h-2 bg-primary-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <>
            {displayMessages.map((message) => {
              const displayContent = message.message_id === streamingMessage?.message_id
                ? displayedText
                : (message.content ?? "");
              
              return (
                <div
                  key={message.message_id}
                  className={`flex gap-3 ${
                    message.role === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Bot className="h-5 w-5 text-primary-foreground" />
                    </div>
                  )}
                  
                  <div className="flex-1 max-w-[75%] min-w-0">
                    <div
                      className={`${
                        message.role === "assistant"
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-bl-none"
                          : "bg-muted text-foreground rounded-2xl rounded-br-none"
                      } px-4 py-3 break-words`}
                    >
                      <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                        <ReactMarkdown
                          components={{
                            h2: ({node, ...props}) => <h2 className="text-xl font-semibold mt-6 mb-3" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />,
                            p: ({node, ...props}) => <p className="mb-3" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc list-outside mb-3 space-y-1 ml-6 [&_ul]:ml-6 [&_ul_ul]:ml-6" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal list-outside mb-3 space-y-1 ml-6 [&_ol]:ml-6 [&_ol_ol]:ml-6" {...props} />,
                            li: ({node, ...props}) => <li className="leading-relaxed pl-2" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
                            table: ({node, ...props}) => <table className="border-collapse border border-gray-300 my-4" {...props} />,
                            th: ({node, ...props}) => <th className="border border-gray-300 px-4 py-2 bg-gray-100 font-semibold" {...props} />,
                            td: ({node, ...props}) => <td className="border border-gray-300 px-4 py-2" {...props} />,
                          }}
                        >
                          {displayContent}
                        </ReactMarkdown>
                      </div>
                      <div className="text-xs mt-2 opacity-70">
                        {formatTimestamp(message.created_at)}
                      </div>
                    </div>
                    
                    {/* Sources Section */}
                    {message.role === "assistant" && message.sources && message.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/40">
                        <p className="text-xs text-muted-foreground mb-2">Fontes:</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {message.sources.map((source, idx) => {
                            const pageNumber = source.page_number;
                            const sectionText = source.section_text || "";
                            const sectionId = source.section_id || `Fonte ${idx + 1}`;
                            
                            return (
                            <Button
                              key={idx}
                              variant="outline"
                              size="sm"
                              className="flex flex-col items-start h-auto py-2 px-3 hover:bg-accent"
                                onClick={() => {
                                  if (pageNumber) {
                                    openPdfViewer(pageNumber);
                                  } else {
                                    toast({
                                      title: "Informação não disponível",
                                      description: "Número da página não disponível para esta fonte",
                                    });
                                  }
                                }}
                                title={sectionText.substring(0, 150) + (sectionText.length > 150 ? "..." : "")}
                                disabled={!pageNumber}
                            >
                              <span className="text-xs font-medium truncate w-full text-left">
                                  {sectionId}
                              </span>
                                {pageNumber && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                    Pág. {pageNumber}
                              </Badge>
                                )}
                            </Button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="bg-primary text-primary-foreground rounded-2xl rounded-bl-none px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary-foreground rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-2 h-2 bg-primary-foreground rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-2 h-2 bg-primary-foreground rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t bg-card flex-shrink-0 pt-6">
        <div className="px-4 pb-4">
        <div className="flex gap-3 items-end">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            className="resize-none"
            rows={1}
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            size="lg"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
          </div>
        </div>
        <div className="px-4 pb-0 text-center">
          <p className="text-xs text-muted-foreground">
            O Chatbot pode cometer erros. Confira informações importantes.
          </p>
        </div>
        </div>
      </div>
      
      {/* PDF Viewer Sidebar */}
      <Sheet open={pdfViewerOpen} onOpenChange={setPdfViewerOpen} modal={false}>
        <SheetContent 
          side="right" 
          className="!w-[35%] !max-w-none p-0 flex flex-col [&>button]:hidden border-l !z-40"
          hideOverlay
        >
          <SheetHeader className="px-6 py-4 border-b flex-shrink-0 flex-row items-center justify-between">
            <SheetTitle>Documento CVM - Página {currentPage}</SheetTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPdfViewerOpen(false)}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetHeader>
          
          <div className="flex-1 overflow-hidden bg-slate-100 p-4 flex items-center justify-center">
            <div className="w-full h-full bg-white shadow-xl rounded-lg overflow-hidden flex items-center justify-center">
              {pdfLoading && (
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="text-sm">Carregando documento...</span>
                </div>
              )}
              {pdfLoadError && !pdfLoading && (
                <div className="flex flex-col items-center gap-2 text-destructive p-4 text-center">
                  <span className="text-sm font-medium">Não foi possível carregar o PDF</span>
                  <span className="text-xs">{pdfLoadError}</span>
                </div>
              )}
              {pdfBlobUrl && !pdfLoading && (
                <iframe
                  src={`${pdfBlobUrl}#page=${currentPage}&toolbar=0&navpanes=0&scrollbar=0&view=FitV`}
                  className="border-0 w-full h-full"
                  title={`CVM Document - Page ${currentPage}`}
                />
              )}
            </div>
          </div>
          
          <SheetFooter className="px-6 py-4 border-t flex items-center justify-between flex-shrink-0">
            <span className="text-sm text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={prevPage}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                onClick={nextPage}
                disabled={currentPage === totalPages}
              >
                Próxima
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
