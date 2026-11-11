import type { Message } from "@ag-ui/core";
import { describe, expect, it } from "vitest";

import { passagesFromMessages, resolveMarkers, type PassageTable } from "./citations";

const passagesActivity = (id: string, passages: unknown[]): Message =>
  ({ id, role: "activity", activityType: "passages", content: { passages } }) as Message;

const ART_45 = {
  ref: "sj6tdsf",
  label: "Art. 45 — Anexo FIDC",
  text: "Art. 45. A aplicação em direitos creditórios de um mesmo devedor está limitada a 20%…",
  page_start: 158,
  page_end: null,
};
const ART_44 = { ref: "s22rtsf", label: "Art. 44 — Anexo FIDC", text: "Art. 44. Em até 180 dias…", page_start: 158 };
const CHUNK_33 = { ref: "c33", label: null, text: "A prestação de contas é mensal.", page_start: 5, page_end: 6 };

function tableOf(...passages: unknown[]): PassageTable {
  return passagesFromMessages([passagesActivity("act", passages)]);
}

describe("passagesFromMessages", () => {
  it("reads what the service reported the Agent read, keyed by the id the model cites", () => {
    const table = tableOf(ART_45, CHUNK_33);
    expect(table.get("sj6tdsf")).toEqual({
      ref: "sj6tdsf",
      label: "Art. 45 — Anexo FIDC",
      text: ART_45.text,
      pageStart: 158,
      pageEnd: null,
    });
    expect(table.get("c33")).toMatchObject({ label: null, pageStart: 5, pageEnd: 6 });
  });

  it("gathers the passages of every turn of the thread", () => {
    const table = passagesFromMessages([
      passagesActivity("a1", [ART_44]),
      { id: "u2", role: "user", content: "E o 45?" },
      passagesActivity("a2", [ART_45]),
    ]);
    expect([...table.keys()]).toEqual(["s22rtsf", "sj6tdsf"]);
  });

  it("ignores other activities and passages that are not well formed", () => {
    const table = passagesFromMessages([
      { id: "x", role: "activity", activityType: "mcp_tool_call", content: { passages: [ART_44] } } as Message,
      passagesActivity("a1", [null, "x", { ref: "s1", text: 5 }, { text: "no ref" }, ART_45]),
      { id: "bad", role: "activity", activityType: "passages", content: { passages: "none" } } as Message,
    ]);
    expect([...table.keys()]).toEqual(["sj6tdsf"]);
  });

  it("is empty for a thread that reported nothing", () => {
    expect(passagesFromMessages([{ id: "u1", role: "user", content: "Oi" }]).size).toBe(0);
  });
});

describe("resolveMarkers", () => {
  const table = tableOf(ART_44, ART_45, CHUNK_33);

  it("numbers the sources in the order they first appear and turns each marker into a link", () => {
    const { text, citations } = resolveMarkers("O limite é de 20% [sj6tdsf]. Em 180 dias [s22rtsf].", table);
    expect(text).toBe("O limite é de 20% [[1]](#cite-1). Em 180 dias [[2]](#cite-2).");
    expect(citations.map((c) => [c.n, c.ref, c.label])).toEqual([
      [1, "sj6tdsf", "Art. 45 — Anexo FIDC"],
      [2, "s22rtsf", "Art. 44 — Anexo FIDC"],
    ]);
  });

  it("gives the same passage cited twice the same number, and one source", () => {
    const { text, citations } = resolveMarkers(
      "A administração convoca os Sócios [c33]. Eles se reúnem em 5 dias [c33].",
      table,
    );
    expect(text).toBe("A administração convoca os Sócios [[1]](#cite-1). Eles se reúnem em 5 dias [[1]](#cite-1).");
    expect(citations).toHaveLength(1);
    expect(citations[0]).toMatchObject({ n: 1, ref: "c33", pageStart: 5, pageEnd: 6 });
  });

  it("shows a marker that is not in the table as an unknown source, never as one that was read, and never takes it out", () => {
    const { text, citations } = resolveMarkers("Vale 20% [sj6tdsf] e mais algo [szzzzzz], ou [c999].", table);
    expect(text).toBe("Vale 20% [[1]](#cite-1) e mais algo [[szzzzzz?]](#cite-unknown:szzzzzz), ou [[c999?]](#cite-unknown:c999).");
    expect(citations.map((c) => c.ref)).toEqual(["sj6tdsf"]);
  });

  it("resolves an id the model cut short when it starts exactly one passage", () => {
    const { text, citations } = resolveMarkers("Vale 20% [sj6tds] e de novo [sj6tdsf].", table);
    expect(text).toBe("Vale 20% [[1]](#cite-1) e de novo [[1]](#cite-1).");
    expect(citations.map((c) => c.ref)).toEqual(["sj6tdsf"]);
  });

  it("shows a short id that starts no passage or more than one as unknown", () => {
    const two: PassageTable = new Map([
      ["sj6tdsf", { ref: "sj6tdsf", label: null, text: "a", pageStart: 1, pageEnd: 1 }],
      ["sj6tdxy", { ref: "sj6tdxy", label: null, text: "b", pageStart: 2, pageEnd: 2 }],
    ]);
    expect(resolveMarkers("A [sj6td] e B [s9x2k1].", two)).toEqual({
      text: "A [[sj6td?]](#cite-unknown:sj6td) e B [[s9x2k1?]](#cite-unknown:s9x2k1).",
      citations: [],
    });
  });

  describe("an id the model copied with a character wrong", () => {
    const art4 = { ref: "si7faxl", label: "Art. 4 — Anexo FIDC", text: "Art. 4º Da denominação…", page_start: 138 };

    it("is the passage one character apart: one lost from the middle (the real case), added, or changed", () => {
      for (const written of ["s7faxl", "si7faxxl", "si7fazl"]) {
        const { text, citations } = resolveMarkers(`A denominação [${written}].`, tableOf(art4));
        expect(text, written).toBe("A denominação [[1]](#cite-1).");
        expect(citations.map((c) => c.ref)).toEqual(["si7faxl"]);
      }
    });

    it("is unknown when two characters are wrong, or two passages are one character away", () => {
      expect(resolveMarkers("A [s7fazl].", tableOf(art4)).text).toBe("A [[s7fazl?]](#cite-unknown:s7fazl).");
      const near = tableOf(art4, { ...art4, ref: "si7fazl" });
      expect(resolveMarkers("A [si7faql].", near).text).toBe("A [[si7faql?]](#cite-unknown:si7faql).");
      expect(resolveMarkers("A [s7fabl].", near).text).toBe("A [[s7fabl?]](#cite-unknown:s7fabl).");
    });
  });

  describe("`s4` for Art. 4, as the model writes it", () => {
    const art4 = { ref: "si7faxl", label: "Art. 4 — Anexo FIDC", text: "Art. 4º Da denominação…", page_start: 138 };
    const art5 = { ref: "ssk7zzz", label: "Art. 5 — Anexo FIDC", text: "Art. 5º As classes…", page_start: 138 };
    const art44 = { ref: "s22rtsf", label: "Art. 44 — Anexo FIDC", text: "Art. 44. Em até 180 dias…", page_start: 158 };

    it("is the one passage labelled with that article, cited as many times as it is written", () => {
      const { text, citations } = resolveMarkers(
        "A denominação inclui a expressão [s4][s5]. Pode usar outra [s4]. E o prazo é de 180 dias [s44].",
        tableOf(art4, art5, art44),
      );
      expect(text).toBe(
        "A denominação inclui a expressão [[1]](#cite-1)[[2]](#cite-2). Pode usar outra [[1]](#cite-1). E o prazo é de 180 dias [[3]](#cite-3).",
      );
      expect(citations.map((c) => c.ref)).toEqual(["si7faxl", "ssk7zzz", "s22rtsf"]);
    });

    it("is unknown when two passages carry the article, or none does", () => {
      const twoArt4 = tableOf(art4, { ...art4, ref: "sab12cd", label: "Art. 4 — Parte Geral" });
      expect(resolveMarkers("A [s4].", twoArt4)).toEqual({ text: "A [[s4?]](#cite-unknown:s4).", citations: [] });
      expect(resolveMarkers("A [s9].", tableOf(art4))).toEqual({ text: "A [[s9?]](#cite-unknown:s9).", citations: [] });
    });

    it("is not looked up in a label that is no article", () => {
      expect(resolveMarkers("A [s4].", tableOf(CHUNK_33))).toEqual({ text: "A [[s4?]](#cite-unknown:s4).", citations: [] });
    });
  });

  it("does not take a plain short word for an id", () => {
    const text = "Veja [sobre] e [segue].";
    expect(resolveMarkers(text, table)).toEqual({ text, citations: [] });
  });

  it("leaves other bracketed text alone", () => {
    const text = "Veja [Artigo 10] e a lista [1] e [nota] e [link](http://x.org).";
    expect(resolveMarkers(text, table)).toEqual({ text, citations: [] });
  });

  it("hides a marker that has only half arrived while the answer streams", () => {
    expect(resolveMarkers("O limite é de 20% [sj6", table).text).toBe("O limite é de 20% ");
    expect(resolveMarkers("O limite é de 20% [c", table).text).toBe("O limite é de 20% ");
    expect(resolveMarkers("O limite é de 20% [", table).text).toBe("O limite é de 20% [");
  });

  it("does nothing with an answer that cites nothing, and shows no marker when no passage was ever recorded", () => {
    expect(resolveMarkers("Sem fontes.", table)).toEqual({ text: "Sem fontes.", citations: [] });
    expect(resolveMarkers("Vale [sj6tdsf].", new Map()).text).toBe("Vale.");
  });
});
