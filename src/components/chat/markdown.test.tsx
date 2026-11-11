import { render, screen } from "@testing-library/react";
import ReactMarkdown from "react-markdown";
import { describe, expect, it } from "vitest";

import { resolveMarkers, type PassageTable } from "@/lib/agui/citations";
import { markdownComponents } from "./markdown";

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
