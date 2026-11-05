import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { useLocation, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Bot, Send, MessageSquare, Plus, Loader2, ChevronLeft, ChevronRight, X, Trash2, UserCog, RefreshCw, ChevronDown, Mic, MicOff } from "lucide-react";
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
import { RAG_API_BASE_URL, FUNDS_AGENT_API_URL } from "@/lib/api/config";
import { apiFetch } from "@/lib/api/client";
import { useChat } from "@/contexts/ChatContext";
import type { ToolCallView } from "@/lib/agui/chatItems";
import { PdfViewerCanvas } from "@/components/PdfViewerCanvas";

const MARKDOWN_COMPONENTS = {
  h2: ({node, ...props}: any) => <h2 className="text-xl font-semibold mt-6 mb-3" {...props} />,
  h3: ({node, ...props}: any) => <h3 className="text-lg font-semibold mt-4 mb-2" {...props} />,
  p: ({node, ...props}: any) => <p className="mb-3" {...props} />,
  ul: ({node, ...props}: any) => <ul className="list-disc list-outside mb-3 space-y-1 ml-6 [&_ul]:ml-6 [&_ul_ul]:ml-6" {...props} />,
  ol: ({node, ...props}: any) => <ol className="list-decimal list-outside mb-3 space-y-1 ml-6 [&_ol]:ml-6 [&_ol_ol]:ml-6" {...props} />,
  li: ({node, ...props}: any) => <li className="leading-relaxed pl-2" {...props} />,
  strong: ({node, ...props}: any) => <strong className="font-semibold" {...props} />,
  table: ({node, ...props}: any) => <table className="border-collapse border border-gray-300 my-4" {...props} />,
  th: ({node, ...props}: any) => <th className="border border-gray-300 px-4 py-2 bg-gray-100 font-semibold" {...props} />,
  td: ({node, ...props}: any) => <td className="border border-gray-300 px-4 py-2" {...props} />,
};

/** The tools an answer called: running until their result arrives, with what they reported. */
function ToolActivityCard({ items }: { items: ToolCallView[] }) {
  if (!items.length) return null;
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item.id} className="min-w-[280px] rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <div className="flex items-center gap-2 text-xs font-medium">
            {item.status === "running" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
            ) : (
              <span
                className={`h-2 w-2 rounded-full ${item.status === "error" ? "bg-destructive" : "bg-success"}`}
              />
            )}
            <span>{item.name}</span>
            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">call</Badge>
          </div>
          {item.progress && (
            <div className="mt-2">
              <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
                <span>Progress</span>
                <span>{item.progress.current}/{item.progress.total}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, (item.progress.current / item.progress.total) * 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
          {item.logs.length > 0 && (
            <div className="mt-2 max-h-32 space-y-0.5 overflow-y-auto rounded-md bg-slate-950 px-3 py-2 font-mono text-[11px] text-blue-300">
              {item.logs.map((log, j) => (
                <div key={j}>&gt;_ {log}</div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Agent() {
  const { user } = useUser();
  const firstName = user?.fullName?.split(" ").slice(0, 2).join(" ") ?? user?.firstName ?? "";
  const location = useLocation();
  const { conversationId: conversationIdFromUrl } = useParams<{ conversationId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    agents,
    selectedAgentId,
    selectAgent,
    setDefaultAgent,
    threads,
    currentThreadId,
    setCurrentThreadId,
    items,
    isRunning,
    isLoadingThreads,
    loadAgents,
    refreshThreads,
    loadMessages,
    sendMessage,
    deleteThread,
    resetToInitialState,
  } = useChat();

  // UI-specific local state
  const [inputValue, setInputValue] = useState("");
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(100);
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
      setPdfViewerOpen(false);
      setCurrentPage(1);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, resetToInitialState]);

  // The menu comes from the registry. Once it is loaded, the agent of the link (?agent=<id>) is
  // the selected one; with none, or one that is not in the list, the first of the list.
  const agentFromUrl = searchParams.get("agent");
  useEffect(() => {
    loadAgents().then((loaded) => {
      if (!loaded.length) return;
      const wanted = loaded.find((a) => a.id === agentFromUrl) ?? loaded[0];
      setDefaultAgent(wanted.id);
    });
    // Only when the page opens: later, the menu and the open thread decide the agent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The address always names the agent in use.
  useEffect(() => {
    if (!selectedAgentId || agentFromUrl === selectedAgentId) return;
    setSearchParams((p) => {
      const next = new URLSearchParams(p);
      next.set("agent", selectedAgentId);
      return next;
    }, { replace: true });
  }, [agentFromUrl, selectedAgentId, setSearchParams]);

  // Sync conversationId from URL
  useEffect(() => {
    if (conversationIdFromUrl && conversationIdFromUrl !== currentThreadId) {
      setCurrentThreadId(conversationIdFromUrl);
    }
  }, [conversationIdFromUrl, setCurrentThreadId]);

  // --- Data loading ---
  useEffect(() => {
    refreshThreads();
  }, [refreshThreads]);

  // Load messages when conversation changes
  useEffect(() => {
    if (currentThreadId) {
      loadMessages(currentThreadId);
    }
  }, [currentThreadId, loadMessages]);

  // Sync state -> URL when conversation is set
  useEffect(() => {
    if (!currentThreadId || !selectedAgentId) return;
    if (currentThreadId === conversationIdFromUrl) return;
    const params = new URLSearchParams();
    params.set("agent", selectedAgentId);
    navigate(`/agent/${encodeURIComponent(currentThreadId)}?${params}`, { replace: true });
  }, [currentThreadId, conversationIdFromUrl, selectedAgentId, navigate]);

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

  // Follow the answer as it grows, unless the person has scrolled up
  useEffect(() => {
    if (isNearBottom()) {
      shouldAutoScrollRef.current = true;
      scrollToBottom();
    }
  }, [items]);

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

  const buildAgentUrl = (conversationId?: string, agent = selectedAgentId) => {
    const params = new URLSearchParams();
    if (agent) params.set("agent", agent);
    const query = params.toString();
    return conversationId
      ? `/agent/${encodeURIComponent(conversationId)}?${query}`
      : `/agent?${query}`;
  };

  const handleConversationChange = (conversationId: string) => {
    setCurrentThreadId(conversationId);
    setInputValue("");
    navigate(buildAgentUrl(conversationId), { replace: true });
  };

  const handleNewConversation = () => {
    resetToInitialState();
    setInputValue("");
    setPdfViewerOpen(false);
    setCurrentPage(1);
    navigate(buildAgentUrl(), { replace: true });
  };

  // A thread has one agent only: another agent opens another conversation.
  const handleAgentChange = (agentId: string) => {
    selectAgent(agentId);
    setInputValue("");
    setPdfViewerOpen(false);
    setCurrentPage(1);
    navigate(buildAgentUrl(undefined, agentId), { replace: true });
  };

  const handleDeleteConversation = async (conversationId: string) => {
    if (!confirm("Tem certeza que deseja excluir esta conversa?")) {
      return;
    }
    const wasCurrent = conversationId === currentThreadId || conversationId === conversationIdFromUrl;
    await deleteThread(conversationId);
    if (wasCurrent) {
      navigate(buildAgentUrl(), { replace: true });
    }
  };

  // PDF.js canvas-based viewer — reliable page navigation (Chrome's iframe PDF viewer ignores #page=N)
  const pdfDataRef = useRef<ArrayBuffer | null>(null);
  const pdfFetchStartedRef = useRef(false);

  const openPdfViewer = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    setPdfViewerOpen(true);
  };

  const nextPage = () => {
    if (currentPage < totalPages) setCurrentPage((p) => Math.min(p + 1, totalPages));
  };

  const prevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => Math.max(p - 1, 1));
  };

  // Prefetch PDF on mount
  useEffect(() => {
    if (pdfFetchStartedRef.current) return;
    pdfFetchStartedRef.current = true;
    apiFetch(`${RAG_API_BASE_URL}/static/pdf/resol175consolid.pdf`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as { detail?: string })?.detail || `Erro ${res.status}`);
        }
        return res.arrayBuffer();
      })
      .then((buf) => { pdfDataRef.current = buf; })
      .catch((err) => {
        pdfFetchStartedRef.current = false;
        console.error("PDF prefetch failed:", err);
      });
  }, []);

  // When viewer opens: pass pdfData (from cache or fetch)
  useEffect(() => {
    if (!pdfViewerOpen) {
      setPdfData(null);
      setPdfLoadError(null);
      return;
    }
    if (pdfDataRef.current) {
      setPdfData(pdfDataRef.current);
      setPdfLoading(false);
      return;
    }
    setPdfLoading(true);
    setPdfLoadError(null);
    let cancelled = false;
    const interval = setInterval(() => {
      if (cancelled || !pdfDataRef.current) return;
      clearInterval(interval);
      clearTimeout(timeout);
      setPdfData(pdfDataRef.current);
      setPdfLoading(false);
    }, 150);
    const timeout = setTimeout(() => {
      if (cancelled || pdfDataRef.current) return;
      clearInterval(interval);
      apiFetch(`${RAG_API_BASE_URL}/static/pdf/resol175consolid.pdf`)
        .then(async (res) => {
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error((err as { detail?: string })?.detail || `Erro ${res.status}`);
          }
          return res.arrayBuffer();
        })
        .then((buf) => {
          if (cancelled) return;
          pdfDataRef.current = buf;
          setPdfData(buf);
          setPdfLoadError(null);
        })
        .catch((err) => {
          if (!cancelled) {
            setPdfLoadError(err?.message || "Não foi possível carregar o documento");
            toast({ title: "Erro ao carregar PDF", description: err?.message, variant: "destructive" });
          }
        })
        .finally(() => { if (!cancelled) setPdfLoading(false); });
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [pdfViewerOpen]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isRunning) return;
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

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
        setIsTranscribing(true);
        try {
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          const form = new FormData();
          form.append("file", blob, `audio.${mimeType.split("/")[1]}`);
          const res = await apiFetch(`${FUNDS_AGENT_API_URL}/transcribe`, { method: "POST", body: form });
          if (!res.ok) throw new Error("Transcription request failed");
          const { text } = await res.json();
          if (text?.trim()) {
            setInputValue((prev) => (prev ? `${prev} ${text.trim()}` : text.trim()));
            textareaRef.current?.focus();
          }
        } catch {
          toast({ title: "Erro na transcrição", description: "Não foi possível transcrever o áudio.", variant: "destructive" });
        } finally {
          setIsTranscribing(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch {
      toast({ title: "Microfone indisponível", description: "Permita o acesso ao microfone e tente novamente.", variant: "destructive" });
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return format(new Date(timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const effectiveConversationId = currentThreadId || conversationIdFromUrl || undefined;
  const currentConversation = threads.find(t => t.id === effectiveConversationId);
  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  // The answer being written: the last one, while a run is going.
  const lastItem = items[items.length - 1];
  const waitingForAnswer = isRunning && !(lastItem?.kind === "assistant" && (lastItem.text || lastItem.toolCalls.length));

  return (
    <div className="flex h-[calc(100vh-7rem)] relative -mx-6 -mb-0">
      {/* Main Chat Area */}
      <div className={`flex flex-col transition-all duration-300 ${pdfViewerOpen ? 'w-[65%] min-w-0' : 'w-full'} h-full relative z-0`}>
      {/* Header */}
        <div className="border-b bg-card p-4 flex flex-wrap items-center gap-4 flex-shrink-0">
        <Select value={effectiveConversationId} onValueChange={handleConversationChange} disabled={isRunning}>
          <SelectTrigger className="w-[400px]">
            <SelectValue>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="truncate">
                  {currentConversation ? currentConversation.title || "Nova conversa" : "Selecione uma conversa"}
                </span>
              </div>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {isLoadingThreads ? (
              <SelectItem value="loading" disabled>
                Carregando...
              </SelectItem>
            ) : threads.length === 0 ? (
              <SelectItem value="empty" disabled>
                Nenhuma conversa
              </SelectItem>
            ) : (
              threads.map((thread) => (
                <SelectItem key={thread.id} value={thread.id}>
                <div className="flex items-center justify-between gap-2 w-full group">
                  <div className="flex flex-col gap-1 py-1 min-w-0">
                    <span className="font-medium truncate">{thread.title || "Nova conversa"}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTimestamp(thread.updated_at)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleDeleteConversation(thread.id);
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
            disabled={isRunning}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir
          </Button>
        )}
        <Button onClick={handleNewConversation} variant="outline" size="sm" disabled={isRunning}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Conversa
        </Button>
        <Button
          onClick={async () => {
            await refreshThreads();
            if (currentThreadId) {
              await loadMessages(currentThreadId);
            }
          }}
          variant="outline"
          size="sm"
          disabled={isLoadingThreads || isRunning}
          title="Atualizar lista de conversas e mensagens"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingThreads ? "animate-spin" : ""}`} />
          Atualizar
        </Button>

        <div className="ml-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isRunning || !agents.length}>
                <UserCog className="h-4 w-4 mr-2" />
                {selectedAgent?.name ?? "Agente"}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuRadioGroup value={selectedAgentId ?? undefined} onValueChange={handleAgentChange}>
                {agents.map((agent) => (
                  <DropdownMenuRadioItem key={agent.id} value={agent.id}>
                    {agent.name}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-4 space-y-4 min-w-0 w-full">
        {items.length === 0 ? (
          <>
            {!isRunning ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-semibold">Olá{firstName ? `, ${firstName}` : ""}!</h2>
              <p className="text-muted-foreground">Como posso ajudar hoje?</p>
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
            {items.map((message) => {
              return (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.kind === "user" ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  {message.kind === "assistant" && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Bot className="h-5 w-5 text-primary-foreground" />
                    </div>
                  )}

                  <div className="flex-1 max-w-[75%] min-w-0">
                    {message.kind === "assistant" && <ToolActivityCard items={message.toolCalls} />}
                    {(message.kind === "user" || message.text) && (
                    <div
                      className={`${
                        message.kind === "assistant"
                          ? "bg-primary text-primary-foreground rounded-2xl rounded-bl-none"
                          : "bg-muted text-foreground rounded-2xl rounded-br-none"
                      } px-4 py-3 break-words ${message.kind === "assistant" && message.toolCalls.length ? "mt-2" : ""}`}
                    >
                      <div className="prose prose-sm dark:prose-invert max-w-none break-words">
                        <ReactMarkdown components={MARKDOWN_COMPONENTS}>
                          {message.text}
                        </ReactMarkdown>
                      </div>
                    </div>
                    )}

                    {/* Sources Section */}
                    {message.kind === "assistant" && message.sources.length > 0 && (
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

            {waitingForAnswer && (
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
            disabled={isRunning}
          />
          <Button
            type="button"
            variant={isRecording ? "destructive" : "outline"}
            size="lg"
            onClick={toggleRecording}
            disabled={isRunning || isTranscribing}
            title={isRecording ? "Parar gravação" : "Gravar áudio"}
            className={isRecording ? "animate-pulse" : ""}
          >
            {isTranscribing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : isRecording ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5" />
            )}
          </Button>
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isRunning}
            size="lg"
          >
            {isRunning ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
          </div>
        </div>
        <div className="px-4 pb-0 text-center">
          <p className="text-xs text-muted-foreground">
            O Agente IA pode cometer erros. Confira informações importantes.
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
              {!pdfLoading && (
                <PdfViewerCanvas
                  pdfData={pdfData}
                  currentPage={currentPage}
                  onTotalPages={setTotalPages}
                  className="w-full h-full min-h-[400px]"
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
