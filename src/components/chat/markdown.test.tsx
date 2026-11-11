import { render, screen } from "@testing-library/react";
import ReactMarkdown from "react-markdown";
import { describe, expect, it } from "vitest";

import { resolveMarkers } from "@/lib/agui/citations";
import { markdownComponents } from "./markdown";

describe("markdownComponents", () => {
  it("draws a citation no passage answers to with what the model wrote and a ?, in plain sight", () => {
    const { text } = resolveMarkers("Vale 20% [s4].", new Map());
    render(<ReactMarkdown components={markdownComponents([], () => {})}>{text}</ReactMarkdown>);
    const unknown = screen.getByText("[s4?]");
    expect(unknown.tagName).toBe("SPAN");
  });
});
