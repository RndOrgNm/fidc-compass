import { describe, expect, it, vi } from "vitest";

// PDF.js as it behaves in the browser: it takes over the buffer it is given and leaves it empty, and
// on an empty buffer getDocument throws at once, before it returns the loading task.
vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => ({
  GlobalWorkerOptions: {},
  getDocument: ({ data }: { data: ArrayBuffer }) => {
    new Uint8Array(data); // "Cannot perform Construct on a detached ArrayBuffer" when it is empty
    structuredClone(data, { transfer: [data] });
    return { promise: Promise.resolve({ numPages: 1 }) };
  },
}));

import { loadPdf } from "./loadPdf";

const bytes = () => new TextEncoder().encode("%PDF-1.1").buffer as ArrayBuffer;

describe("loadPdf", () => {
  it("opens the same bytes again after the first time, and leaves them whole", async () => {
    const kept = bytes();

    await expect(loadPdf(kept)).resolves.toMatchObject({ numPages: 1 });
    expect(kept.byteLength).toBe(8);
    await expect(loadPdf(kept)).resolves.toMatchObject({ numPages: 1 });
    await expect(loadPdf(kept)).resolves.toMatchObject({ numPages: 1 });
  });

  it("fails as a rejected promise, never as a throw, when the bytes are already gone", async () => {
    const emptied = bytes();
    structuredClone(emptied, { transfer: [emptied] });

    let promise: Promise<unknown> | undefined;
    expect(() => {
      promise = loadPdf(emptied);
    }).not.toThrow();
    await expect(promise).rejects.toBeInstanceOf(TypeError);
  });
});
