import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ToolCallView } from "@/lib/agui/chatItems";
import { ToolActivityCard } from "./ToolActivityCard";

const call = (changes: Partial<ToolCallView> = {}): ToolCallView => ({
  id: "c1",
  name: "regulatory-search__retrieve_regulation_context",
  args: '{"query":"denominação"}',
  status: "done",
  logs: [],
  ...changes,
});

describe("ToolActivityCard", () => {
  it("shows the arguments and the result of a call when its line is opened", () => {
    render(<ToolActivityCard items={[call({ result: '{"documents":[{"ref":"s3k9x2m"}]}' })]} />);
    expect(screen.queryByText("Resultado")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText('{"query":"denominação"}')).toBeInTheDocument();
    expect(screen.getByText("Resultado")).toBeInTheDocument();
    expect(screen.getByText('{"documents":[{"ref":"s3k9x2m"}]}')).toBeInTheDocument();
  });

  it("cuts a very long result", () => {
    render(<ToolActivityCard items={[call({ result: "x".repeat(9000) })]} />);
    fireEvent.click(screen.getByRole("button"));
    const shown = screen.getByText(/^x+…$/);
    expect(shown.textContent?.length).toBe(8001);
  });

  it("a call with nothing to show is not expandable", () => {
    render(<ToolActivityCard items={[call({ args: "" })]} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
