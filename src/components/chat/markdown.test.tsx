import { render, screen } from "@testing-library/react";
import ReactMarkdown from "react-markdown";
import { describe, expect, it } from "vitest";

import { resolveMarkers, type PassageTable } from "@/lib/agui/citations";
import { MARKDOWN_PLUGINS, markdownComponents } from "./markdown";

describe("a table the Agent writes", () => {
  const source = { n: 1, ref: "sj6tdsf", label: "Art. 45 — Anexo FIDC", text: "Art. 45…", pageStart: 158, pageEnd: null };
  const table = [
    "| Obrigação | Prazo | Fonte |",
    "|---|---|---|",
    "| Informe mensal à CVM | até 15 dias após o fim do mês | [[1]](#cite-1) |",
    "| Envio ao SCR | mensal | [[1]](#cite-1) |",
  ].join("\n");

  it("is drawn as a table, with the numbered source clickable inside a cell", () => {
    render(
      <ReactMarkdown remarkPlugins={MARKDOWN_PLUGINS} components={markdownComponents([source], () => {})}>
        {table}
      </ReactMarkdown>,
    );

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual(["Obrigação", "Prazo", "Fonte"]);
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(screen.getAllByRole("button", { name: /Fonte 1:/ })).toHaveLength(2);
  });

  it("was the text of one line, pipes and all, without the GFM plugin: the reason for this test", () => {
    render(<ReactMarkdown components={markdownComponents([source], () => {})}>{table}</ReactMarkdown>);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByText(/\|---\|---\|---\|/)).toBeInTheDocument();
  });
});

describe("markdownComponents", () => {
  it("draws a citation no passage answers to with what the model wrote and a ?, in plain sight", () => {
    const read: PassageTable = new Map([
      ["sj6tdsf", { ref: "sj6tdsf", label: "Art. 45", text: "a", pageStart: 1, pageEnd: null }],
    ]);
    const { text } = resolveMarkers("Vale 20% [s9x2k1].", read);
    render(<ReactMarkdown components={markdownComponents([], () => {})}>{text}</ReactMarkdown>);
    const unknown = screen.getByText("[s9x2k1?]");
    expect(unknown.tagName).toBe("SPAN");
  });
});
