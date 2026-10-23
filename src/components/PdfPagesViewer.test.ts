import { describe, expect, it } from "vitest";

import { pageAtScroll } from "./PdfPagesViewer";

// Three pages of 1000px with 12px gaps, inside a 600px-high viewer.
const tops = [12, 1024, 2036];

describe("pageAtScroll", () => {
  it("is the first page at the top of the document", () => {
    expect(pageAtScroll(tops, 0, 600)).toBe(1);
  });

  it("stays on a page until the next one rises above the line a third of the way down", () => {
    // The line is at scrollTop + 210: page 2 starts at 1024.
    expect(pageAtScroll(tops, 800, 600)).toBe(1);
    expect(pageAtScroll(tops, 815, 600)).toBe(2);
  });

  it("is the last page at the end of the document", () => {
    expect(pageAtScroll(tops, 2500, 600)).toBe(3);
  });

  it("is page 1 when there is nothing to measure", () => {
    expect(pageAtScroll([], 100, 600)).toBe(1);
  });
});
