import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { usePdfBytes } from "./usePdfBytes";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("usePdfBytes", () => {
  it("does nothing without a url", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => usePdfBytes(null));

    expect(result.current).toEqual({ data: null, loading: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("downloads the file and exposes its bytes", async () => {
    const bytes = new ArrayBuffer(4);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, arrayBuffer: () => Promise.resolve(bytes) }),
    );

    const { result } = renderHook(() => usePdfBytes("https://files.example/a.pdf"));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.data).toBe(bytes));
    expect(result.current.loading).toBe(false);
  });

  it("falls back to no data, not a spinner, when the download fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));

    const { result } = renderHook(() => usePdfBytes("https://files.example/a.pdf"));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
  });
});
