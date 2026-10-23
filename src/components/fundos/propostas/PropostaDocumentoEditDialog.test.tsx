import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PropostaDocumentoEditDialog } from "./PropostaDocumentoEditDialog";
import type { DocumentoResponse } from "@/lib/api/documentoService";

const doc = {
  id: "doc-1",
  ativo_id: "ativo-1",
  tipo: "contrato_social",
  cadencia: "mensal",
  periodo_referencia: "2026-08",
  observacao: "nota antiga",
  status: "pendente",
  criado_em: "2026-01-01T00:00:00Z",
  atualizado_em: "2026-01-01T00:00:00Z",
} as unknown as DocumentoResponse;

function stubFetch(response: { ok: boolean; status?: number; json?: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue({ status: 200, json: () => Promise.resolve({}), ...response });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const sentBody = (fetchMock: ReturnType<typeof vi.fn>) => JSON.parse(fetchMock.mock.calls[0][1].body);

afterEach(() => vi.unstubAllGlobals());

describe("PropostaDocumentoEditDialog", () => {
  it("opens with the proposal's current values", () => {
    render(<PropostaDocumentoEditDialog doc={doc} open onOpenChange={() => {}} onSaved={() => {}} />);

    expect(screen.getByLabelText("Período de referência")).toHaveValue("2026-08");
    expect(screen.getByLabelText("Observação")).toHaveValue("nota antiga");
  });

  it("saves the edited fields, then reports it and closes; it never approves", async () => {
    const fetchMock = stubFetch({ ok: true });
    const onSaved = vi.fn();
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<PropostaDocumentoEditDialog doc={doc} open onOpenChange={onOpenChange} onSaved={onSaved} />);

    await user.clear(screen.getByLabelText("Período de referência"));
    await user.type(screen.getByLabelText("Período de referência"), " 2026-09 ");
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/documentos\/doc-1$/);
    expect(fetchMock.mock.calls[0][1].method).toBe("PATCH");
    expect(sentBody(fetchMock)).toEqual({
      periodo_referencia: "2026-09",
      observacao: "nota antiga",
      cadencia: "mensal",
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps the dialog open and does not report a save that failed", async () => {
    const fetchMock = stubFetch({ ok: false, status: 500, json: () => Promise.resolve({ detail: "falhou" }) });
    const onSaved = vi.fn();
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<PropostaDocumentoEditDialog doc={doc} open onOpenChange={onOpenChange} onSaved={onSaved} />);

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled());
    expect(onSaved).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it("does not send the cadence while it follows a linked prazo", async () => {
    const fetchMock = stubFetch({ ok: true });
    const linked = { ...doc, prazo: { obrigacao_id: "o1", topico: "x", cadencia: "mensal" } } as unknown as DocumentoResponse;
    const user = userEvent.setup();
    render(<PropostaDocumentoEditDialog doc={linked} open onOpenChange={() => {}} onSaved={() => {}} />);

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(sentBody(fetchMock)).not.toHaveProperty("cadencia");
  });
});
