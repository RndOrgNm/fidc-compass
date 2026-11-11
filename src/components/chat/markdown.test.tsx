import { render, screen } from "@testing-library/react";
import ReactMarkdown from "react-markdown";
import { describe, expect, it } from "vitest";

import { markdownComponents } from "./markdown";

describe("markdownComponents", () => {
  it("draws a citation no passage answers to as [?], saying what the model wrote", () => {
    render(<ReactMarkdown components={markdownComponents([], () => {})}>{"Vale 20% [[?]](#cite-unknown:s4)."}</ReactMarkdown>);
    const unknown = screen.getByText("[?]");
    expect(unknown).toHaveAttribute("title", expect.stringContaining("“s4”"));
    expect(unknown.tagName).toBe("SPAN");
  });
});
