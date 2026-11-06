import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2, MessageSquare, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { MARKDOWN_COMPONENTS } from "@/components/chat/markdown";
import { ToolActivityCard } from "@/components/chat/ToolActivityCard";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { useThreadConversation } from "@/hooks/useThreadConversation";
import type { ChatItem } from "@/lib/agui/chatItems";
import {
  findProposalThread,
  listThreads,
  openThreadFromTask,
  type ProposalRef,
  type ProposalThread,
} from "@/lib/api/threadsService";

const LABEL = "Conversar sobre esta proposta";

/**
 * The conversation about a proposal: the conversation the person already has about it, or a new one
 * that starts with what the Agent did when it made the proposal.
 */
async function conversationAbout(origin: ProposalThread): Promise<string> {
  const mine = await listThreads();
  const existing = mine.find(
    (thread) =>
      thread.context_from?.thread_id === origin.thread_id &&
      thread.context_from?.until_message_id === origin.until_message_id,
  );
  if (existing) return existing.id;
  const opened = await openThreadFromTask({
    thread_id: origin.thread_id,
    until_message_id: origin.until_message_id,
  });
  return opened.id;
}

/** Questions and answers, drawn as the chat page draws them. */
function Bubbles({ items }: { items: ChatItem[] }) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.id} className={`flex ${item.kind === "user" ? "justify-end" : "justify-start"}`}>
          <div className="min-w-0 max-w-[92%]">
            {item.kind === "assistant" && <ToolActivityCard items={item.toolCalls} />}
            {(item.kind === "user" || item.text) && (
              <div
                className={`${
                  item.kind === "assistant"
                    ? "rounded-2xl rounded-bl-none bg-primary text-primary-foreground"
                    : "rounded-2xl rounded-br-none bg-muted text-foreground"
                } break-words px-3.5 py-2.5 text-[13px] ${
                  item.kind === "assistant" && item.toolCalls.length ? "mt-2" : ""
                }`}
              >
                <div className="prose prose-sm max-w-none break-words dark:prose-invert">
                  <ReactMarkdown components={MARKDOWN_COMPONENTS}>{item.text}</ReactMarkdown>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function ConversationPanel({ threadId }: { threadId: string }) {
  const { inheritedItems, items, isLoading, isRunning, canSend, send } = useThreadConversation(threadId);
  const [draft, setDraft] = useState("");
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [items, isRunning]);

  const submit = () => {
    const text = draft.trim();
    if (!text || isRunning || !canSend) return;
    setDraft("");
    void send(text);
  };

  const consultas = inheritedItems.reduce(
    (total, item) => total + (item.kind === "assistant" ? item.toolCalls.length : 0),
    0,
  );
  const waiting = isRunning && items.at(-1)?.kind === "user";

  return (
    <>
      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {isLoading && (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        {inheritedItems.length > 0 && (
          <Collapsible className="rounded-lg border border-border bg-muted/30">
            <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-muted-foreground">
              <span>
                O que o Agente fez nesta análise
                {consultas > 0 && ` · ${consultas} ${consultas === 1 ? "consulta" : "consultas"}`}
              </span>
              <ChevronDown className="h-3.5 w-3.5" />
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t border-border px-3 py-3">
              <Bubbles items={inheritedItems} />
            </CollapsibleContent>
          </Collapsible>
        )}
        {!isLoading && items.length === 0 && (
          <p className="py-6 text-center text-[13px] text-muted-foreground">
            Pergunte o que quiser sobre esta proposta e o arquivo de onde ela veio.
          </p>
        )}
        <Bubbles items={items} />
        {waiting && (
          <div className="flex gap-1 px-1" aria-label="O Agente está respondendo">
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "0ms" }} />
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "150ms" }} />
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: "300ms" }} />
          </div>
        )}
        <div ref={end} />
      </div>
      <div className="flex gap-2 border-t border-border px-5 py-3">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder="Pergunte sobre a proposta…"
          rows={2}
          className="min-h-0 resize-none text-[13px]"
          disabled={isRunning || !canSend}
        />
        <Button
          type="button"
          size="icon"
          aria-label="Enviar"
          onClick={submit}
          disabled={!draft.trim() || isRunning || !canSend}
        >
          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </>
  );
}

/**
 * The chat icon next to a proposal, and the side panel it opens: a conversation about that
 * proposal, with the Agent that made it. The icon is shown only for a proposal a task made — one
 * from before the agent ran in the agent-services has no run to talk about. The decision stays on
 * the card: the panel answers questions, it does not approve or reject.
 */
export function ProposalChat({ proposal }: { proposal: ProposalRef }) {
  const key = "obrigacaoId" in proposal ? `o:${proposal.obrigacaoId}` : `d:${proposal.documentoId}`;
  const [origin, setOrigin] = useState<ProposalThread | null>(null);
  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setOrigin(null);
    setThreadId(null);
    findProposalThread(proposal)
      .then((found) => {
        if (!cancelled) setOrigin(found);
      })
      .catch((error) => {
        // Not being able to ask only hides the icon: the card works without it.
        console.error("Error looking for the proposal's thread:", error);
      });
    return () => {
      cancelled = true;
    };
    // `proposal` is rebuilt on every render; its key is what identifies it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!origin) return null;

  const openPanel = async () => {
    setOpen(true);
    if (threadId || opening) return;
    setOpening(true);
    try {
      setThreadId(await conversationAbout(origin));
    } catch (error) {
      console.error("Error opening the conversation:", error);
      toast({
        title: "Erro ao abrir a conversa",
        description: error instanceof Error ? error.message : "Não foi possível abrir a conversa",
        variant: "destructive",
      });
      setOpen(false);
    } finally {
      setOpening(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground hover:text-foreground"
        aria-label={LABEL}
        title={LABEL}
        onClick={() => void openPanel()}
      >
        <MessageSquare className="h-4 w-4" />
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" hideOverlay className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b border-border px-5 py-4 text-left">
            <SheetTitle className="text-base">Conversa sobre a proposta</SheetTitle>
            <SheetDescription className="text-[12px]">
              Pergunte ao Agente que a fez. A decisão continua no cartão da proposta.
            </SheetDescription>
          </SheetHeader>
          {threadId ? (
            <ConversationPanel threadId={threadId} />
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
