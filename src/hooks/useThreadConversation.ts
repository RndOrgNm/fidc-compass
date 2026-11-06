import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Message } from "@ag-ui/core";

import { toast } from "@/hooks/use-toast";
import { buildChatItems } from "@/lib/agui/chatItems";
import { splitInherited } from "@/lib/agui/inherited";
import { streamRun } from "@/lib/agui/streamRun";
import { getThread, getThreadMessages, runThread, ThreadBusyError } from "@/lib/api/threadsService";

function reasonOf(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/**
 * One conversation that lives on its own: a side panel talks about one proposal while the page of
 * the chat, with its own thread, stays as it is. It reads the thread, runs the person's questions on
 * it with the thread's agent, and follows the answer as it streams.
 *
 * The messages a thread inherited from a task come apart from the conversation's own, to be shown
 * in a block of their own.
 */
export function useThreadConversation(threadId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  // Read inside the send callback, which must not run twice at once whatever the render it came from.
  const isRunningRef = useRef(false);

  useEffect(() => {
    setMessages([]);
    setAgentId(null);
    if (!threadId) return;
    let cancelled = false;
    setIsLoading(true);
    Promise.all([getThread(threadId), getThreadMessages(threadId)])
      .then(([thread, loaded]) => {
        if (cancelled) return;
        // A thread has one agent only: its questions run with that one.
        setAgentId(thread.agent_id);
        setMessages(loaded);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Error loading the conversation:", error);
        toast({
          title: "Erro ao carregar a conversa",
          description: reasonOf(error, "Não foi possível carregar a conversa"),
          variant: "destructive",
        });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  const send = useCallback(
    async (query: string) => {
      if (!query.trim() || isRunningRef.current || !threadId || !agentId) return;

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
          toast(
            error instanceof ThreadBusyError
              ? {
                  title: "Esta conversa já está respondendo",
                  description: "Aguarde a resposta terminar e envie de novo.",
                  variant: "destructive",
                }
              : {
                  title: "Erro ao enviar mensagem",
                  description: reasonOf(error, "Não foi possível enviar a mensagem"),
                  variant: "destructive",
                },
          );
          return;
        }

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
      } finally {
        isRunningRef.current = false;
        setIsRunning(false);
      }
    },
    [threadId, agentId],
  );

  const { inheritedItems, items } = useMemo(() => {
    const { inherited, own } = splitInherited(messages);
    return { inheritedItems: buildChatItems(inherited), items: buildChatItems(own) };
  }, [messages]);

  return { inheritedItems, items, isLoading, isRunning, canSend: Boolean(threadId && agentId), send };
}
