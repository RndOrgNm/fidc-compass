import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { PropostaPdfViewerSheet } from "./PropostaPdfViewerSheet";

// The real viewer draws with pdf.js and needs a browser; here it only shows the page it was
// asked for and lets a test play the reader scrolling to another one.
vi.mock("@/components/PdfPagesViewer", () => ({
  PdfPagesViewer: ({
    page,
    onPageChange,
    onTotalPages,
  }: {
    page: number;
    onPageChange: (n: number) => void;
    onTotalPages: (n: number) => void;
  }) => {
    onTotalPages(20);
    return (
      <div data-testid="pdf-canvas">
        página renderizada: {page}
        <button onClick={() => onPageChange(15)}>rolar até a 15</button>
      </div>
    );
  },
}));

const cl42 = { trecho: "Cláusula 4.2", page: 7, texto: "índice e data-base do reajuste" };
const anexo = { trecho: "Anexo II", page: 12, pageEnd: 13, texto: "tabela de amortização" };
const wordParagraph = { trecho: "Parágrafo 3", page: null, texto: "Texto de um arquivo Word." };

function renderSheet(props: Partial<React.ComponentProps<typeof PropostaPdfViewerSheet>> = {}) {
  return render(
    <PropostaPdfViewerSheet
      open
      onOpenChange={() => {}}
      arquivoNome="Acordo_de_Socios.pdf"
      fileData={new ArrayBuffer(1)}
      fonte={cl42}
      {...props}
    />,
  );
}

describe("PropostaPdfViewerSheet", () => {
  beforeEach(() => {
    vi.spyOn(window, "open").mockImplementation(() => null);
  });

  it("shows a loading state while the file is loading", () => {
    renderSheet({ fileData: null, loading: true });

    expect(screen.getByText("Carregando documento...")).toBeInTheDocument();
    expect(screen.queryByTestId("pdf-canvas")).not.toBeInTheDocument();
  });

  it("opens directly at the source's first page, without repeating the cited text", () => {
    renderSheet({ fonte: anexo });

    expect(screen.getByText("página renderizada: 12")).toBeInTheDocument();
    expect(screen.getByText("Página 12 de 20")).toBeInTheDocument();
    expect(screen.queryByText(/tabela de amortização/)).not.toBeInTheDocument();
  });

  it("follows the reader scrolling through the document: the page counter and Anterior/Próxima", async () => {
    const user = userEvent.setup();
    renderSheet({ fonte: { ...cl42, page: 3 } });

    await user.click(screen.getByRole("button", { name: "rolar até a 15" }));

    expect(screen.getByText("Página 15 de 20")).toBeInTheDocument();
    // Anterior goes back from where the reader is, not from where the source was.
    await user.click(screen.getByRole("button", { name: /anterior/i }));
    expect(screen.getByText("página renderizada: 14")).toBeInTheDocument();
  });

  it("shows only the cited text, without page controls, when there is no file to draw", () => {
    renderSheet({ fileData: null, fonte: wordParagraph });

    expect(screen.queryByText("Carregando documento...")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pdf-canvas")).not.toBeInTheDocument();
    expect(screen.getByText(/visualização do arquivo não está disponível/i)).toBeInTheDocument();
    expect(screen.getByText(/Texto de um arquivo Word\./)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /próxima/i })).not.toBeInTheDocument();
  });

  it("starts at page 1 when the source has no page", () => {
    renderSheet({ fonte: wordParagraph });

    expect(screen.getByText("página renderizada: 1")).toBeInTheDocument();
  });

  it("navigates pages with Anterior/Próxima and clamps at the edges", async () => {
    const user = userEvent.setup();
    renderSheet({ fonte: { ...cl42, page: 1 } });

    const anterior = screen.getByRole("button", { name: /anterior/i });
    const proxima = screen.getByRole("button", { name: /próxima/i });

    expect(anterior).toBeDisabled();

    await user.click(proxima);
    expect(screen.getByText("página renderizada: 2")).toBeInTheDocument();
    expect(anterior).toBeEnabled();

    await user.click(anterior);
    expect(screen.getByText("página renderizada: 1")).toBeInTheDocument();
    expect(anterior).toBeDisabled();
  });

  it("only renders the 'Abrir no OneDrive' button when rawUrl is provided", async () => {
    const user = userEvent.setup();
    const { rerender } = renderSheet();

    expect(screen.queryByRole("button", { name: /abrir no onedrive/i })).not.toBeInTheDocument();

    rerender(
      <PropostaPdfViewerSheet
        open
        onOpenChange={() => {}}
        arquivoNome="Acordo_de_Socios.pdf"
        fileData={new ArrayBuffer(1)}
        fonte={cl42}
        rawUrl="https://onedrive.example/Acordo_de_Socios.pdf"
      />,
    );

    await user.click(screen.getByRole("button", { name: /abrir no onedrive/i }));

    expect(window.open).toHaveBeenCalledWith(
      "https://onedrive.example/Acordo_de_Socios.pdf",
      "_blank",
      "noopener,noreferrer",
    );
  });
});
