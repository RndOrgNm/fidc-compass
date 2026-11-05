import { createContext, useCallback, useContext, useMemo, useRef, useState, ReactNode } from "react";
import type { Message } from "@ag-ui/core";

import { toast } from "@/hooks/use-toast";
import { buildChatItems, type ChatItem } from "@/lib/agui/chatItems";
import { streamRun } from "@/lib/agui/streamRun";
import {
  ApiRequestError,
  ThreadBusyError,
  deleteThread as removeThread,
  getThread,
  getThreadMessages,
  listChatAgents,
  listThreads,
  runThread,
  type ChatAgent,
  type Thread,
} from "@/lib/api/threadsService";

interface ChatContextType {
  /** The agents of the chat menu, from the registry. */
  agents: ChatAgent[];
  isLoadingAgents: boolean;
  selectedAgentId: string | null;
  /** Picks the agent of the next conversation: the open thread is left, since it has one agent only. */
  selectAgent: (agentId: string) => void;
  /** Picks an agent only if none is chosen yet (the open thread's agent, or the link's, wins). */
  setDefaultAgent: (agentId: string) => void;

  /** The threads of the selected agent, latest first. */
  threads: Thread[];
  isLoadingThreads: boolean;
  currentThreadId: string | null;
  setCurrentThreadId: (id: string | null) => void;

  /** The open thread as the chat shows it: questions, and one answer under each. */
  items: ChatItem[];
  /** A run is going: nothing can be sent until it ends. */
  isRunning: boolean;

  loadAgents: () => Promise<ChatAgent[]>;
  refreshThreads: (agentId?: string) => Promise<void>;
  loadMessages: (threadId: string) => Promise<void>;
  sendMessage: (query: string) => Promise<void>;
  deleteThread: (threadId: string) => Promise<void>;
  resetToInitialState: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

/** The title is written after the answer ends, so the list is read once more a little later. */
const TITLE_REFRESH_DELAY_MS = 3000;

function reasonOf(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [agents, setAgents] = useState<ChatAgent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  // Read inside callbacks that must not run twice at once, whatever the render they came from.
  const isRunningRef = useRef(false);

  const items = useMemo(() => buildChatItems(messages), [messages]);

  const resetToInitialState = useCallback(() => {
    setCurrentThreadId(null);
    setMessages([]);
  }, []);

  const loadAgents = useCallback(async () => {
    setIsLoadingAgents(true);
    try {
      const loaded = await listChatAgents();
      setAgents(loaded);
      return loaded;
    } catch (error) {
      console.error("Error loading agents:", error);
      toast({
        title: "Erro ao carregar os agentes",
        description: reasonOf(error, "Não foi possível carregar a lista de agentes"),
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoadingAgents(false);
    }
  }, []);

  const refreshThreads = useCallback(
    async (agentId?: string) => {
      const agent = agentId ?? selectedAgentId;
      if (!agent) return;
      setIsLoadingThreads(true);
      try {
        setThreads(await listThreads(agent));
      } catch (error) {
        console.error("Error loading threads:", error);
        toast({
          title: "Erro ao carregar conversas",
          description: reasonOf(error, "Não foi possível carregar as conversas"),
          variant: "destructive",
        });
      } finally {
        setIsLoadingThreads(false);
      }
    },
    [selectedAgentId],
  );

  const selectAgent = useCallback(
    (agentId: string) => {
      if (agentId === selectedAgentId) return;
      setSelectedAgentId(agentId);
      resetToInitialState();
    },
    [selectedAgentId, resetToInitialState],
  );

  const setDefaultAgent = useCallback((agentId: string) => {
    setSelectedAgentId((current) => current ?? agentId);
  }, []);

  const loadMessages = useCallback(async (threadId: string) => {
    if (!threadId) {
      setMessages([]);
      return;
    }
    // The run in progress is the source of truth for its thread.
    if (isRunningRef.current) return;

    try {
      const [thread, loaded] = await Promise.all([getThread(threadId), getThreadMessages(threadId)]);
      // A thread has one agent only: opening it moves the menu to that agent.
      setSelectedAgentId(thread.agent_id);
      setMessages(loaded);
    } catch (error) {
      // A thread that does not exist yet (a link, or a first run still being accepted) is empty.
      if (error instanceof ApiRequestError && error.status === 404) {
        setMessages([]);
        return;
      }
      console.error("Error loading messages:", error);
      toast({
        title: "Erro ao carregar mensagens",
        description: reasonOf(error, "Não foi possível carregar as mensagens"),
        variant: "destructive",
      });
    }
  }, []);

  const sendMessage = useCallback(
    async (query: string) => {
      if (!query.trim() || isRunningRef.current || !selectedAgentId) return;

      const agentId = selectedAgentId;
      const threadId = currentThreadId ?? crypto.randomUUID();
      const question: Message = { id: crypto.randomUUID(), role: "user", content: query };

      isRunningRef.current = true;
      setIsRunning(true);
      setMessages((prev) => [...prev, question]);

      try {
        let events;
        try {
          events = await runThread({ threadId, agentId, messages: [question] });
        } catch (error) {
          // Refused before any event: the question was never part of the thread.
          setMessages((prev) => prev.filter((m) => m.id !== question.id));
          if (error instanceof ThreadBusyError) {
            toast({
              title: "Esta conversa já está respondendo",
              description: "Aguarde a resposta terminar e envie de novo.",
              variant: "destructive",
            });
          } else {
            console.error("Error sending message:", error);
            toast({
              title: "Erro ao enviar mensagem",
              description: reasonOf(error, "Não foi possível enviar a mensagem"),
              variant: "destructive",
            });
          }
          return;
        }

        // The thread exists from its first run: only now does the page move to its address.
        if (!currentThreadId) setCurrentThreadId(threadId);

        try {
          const outcome = await streamRun(events, setMessages);
          if (outcome) {
            toast({ title: "A resposta falhou", description: outcome.error, variant: "destructive" });
          }
        } catch (error) {
          console.error("Error reading the answer:", error);
          toast({
            title: "A conexão foi interrompida",
            description: "Reabra a conversa para ver o que foi gravado.",
            variant: "destructive",
          });
        }

        await refreshThreads(agentId);
        setTimeout(() => void refreshThreads(agentId), TITLE_REFRESH_DELAY_MS);
      } finally {
        isRunningRef.current = false;
        setIsRunning(false);
      }
    },
    [selectedAgentId, currentThreadId, refreshThreads],
  );

  const deleteThread = useCallback(
    async (threadId: string) => {
      if (!threadId || !threadId.trim()) {
        toast({ title: "Erro", description: "ID da conversa inválido", variant: "destructive" });
        return;
      }
      try {
        await removeThread(threadId);
        if (threadId === currentThreadId) resetToInitialState();
        await refreshThreads();
        toast({ title: "Conversa excluída", description: "A conversa foi excluída com sucesso." });
      } catch (error) {
        console.error("Error deleting thread:", error);
        toast({
          title: "Erro ao excluir conversa",
          description: reasonOf(error, "Não foi possível excluir a conversa"),
          variant: "destructive",
        });
      }
    },
    [currentThreadId, refreshThreads, resetToInitialState],
  );

  const value: ChatContextType = {
    agents,
    isLoadingAgents,
    selectedAgentId,
    selectAgent,
    setDefaultAgent,
    threads,
    isLoadingThreads,
    currentThreadId,
    setCurrentThreadId,
    items,
    isRunning,
    loadAgents,
    refreshThreads,
    loadMessages,
    sendMessage,
    deleteThread,
    resetToInitialState,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
