import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch, configureApiAuth } from "./client";

const fetchMock = vi.fn();

function sentHeaders(): Headers {
  return fetchMock.mock.calls[0][1].headers as Headers;
}

beforeEach(() => {
  fetchMock.mockReset();
  fetchMock.mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  configureApiAuth();
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  it("sends the session token as a bearer", async () => {
    configureApiAuth({ getToken: async () => "tok-1" });
    await apiFetch("https://api.test/threads");
    expect(sentHeaders().get("Authorization")).toBe("Bearer tok-1");
  });

  it("asks for the token on every call, so a renewed one is used", async () => {
    const getToken = vi.fn().mockResolvedValueOnce("old").mockResolvedValueOnce("new");
    configureApiAuth({ getToken });
    await apiFetch("https://api.test/a");
    await apiFetch("https://api.test/b");
    expect((fetchMock.mock.calls[0][1].headers as Headers).get("Authorization")).toBe("Bearer old");
    expect((fetchMock.mock.calls[1][1].headers as Headers).get("Authorization")).toBe("Bearer new");
  });

  it("sends no Authorization when nobody is signed in", async () => {
    configureApiAuth({ getToken: async () => null });
    await apiFetch("https://api.test/threads");
    expect(sentHeaders().has("Authorization")).toBe(false);
  });

  it("keeps the caller's method, body and headers", async () => {
    configureApiAuth({ getToken: async () => "tok" });
    await apiFetch("https://api.test/threads", {
      method: "PATCH",
      body: '{"title":"x"}',
      headers: { "X-Trace": "1" },
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.test/threads");
    expect(init.method).toBe("PATCH");
    expect(init.body).toBe('{"title":"x"}');
    expect(sentHeaders().get("X-Trace")).toBe("1");
  });

  it("marks a string body as JSON unless the caller chose a type", async () => {
    configureApiAuth({ getToken: async () => "tok" });
    await apiFetch("https://api.test/a", { method: "POST", body: "{}" });
    expect(sentHeaders().get("Content-Type")).toBe("application/json");

    fetchMock.mockClear();
    await apiFetch("https://api.test/b", {
      method: "POST",
      body: "x",
      headers: { "Content-Type": "text/plain" },
    });
    expect(sentHeaders().get("Content-Type")).toBe("text/plain");
  });

  it("leaves a FormData body to set its own content type", async () => {
    configureApiAuth({ getToken: async () => "tok" });
    await apiFetch("https://api.test/transcribe", { method: "POST", body: new FormData() });
    expect(sentHeaders().has("Content-Type")).toBe(false);
  });

  it("returns the response untouched", async () => {
    configureApiAuth({ getToken: async () => "tok" });
    fetchMock.mockResolvedValue(new Response('{"detail":"nope"}', { status: 404 }));
    const response = await apiFetch("https://api.test/threads/x");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ detail: "nope" });
  });
});

describe("apiFetch on 401", () => {
  it("sends the person to sign in and still returns the response", async () => {
    const onUnauthorized = vi.fn();
    configureApiAuth({ getToken: async () => "tok", onUnauthorized });
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));

    const response = await apiFetch("https://api.test/threads");

    expect(response.status).toBe(401);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("does it once when several calls fail together", async () => {
    let finish!: () => void;
    const onUnauthorized = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)));
    configureApiAuth({ getToken: async () => "tok", onUnauthorized });
    fetchMock.mockImplementation(async () => new Response("{}", { status: 401 }));

    const calls = Promise.all([
      apiFetch("https://api.test/a"),
      apiFetch("https://api.test/b"),
      apiFetch("https://api.test/c"),
    ]);
    await vi.waitFor(() => expect(onUnauthorized).toHaveBeenCalled());
    finish();
    await calls;

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it("does nothing for other errors", async () => {
    const onUnauthorized = vi.fn();
    configureApiAuth({ getToken: async () => "tok", onUnauthorized });
    for (const status of [403, 404, 500]) {
      fetchMock.mockResolvedValue(new Response("{}", { status }));
      await apiFetch("https://api.test/threads");
    }
    expect(onUnauthorized).not.toHaveBeenCalled();
  });
});

describe("apiFetch with Clerk in the browser", () => {
  afterEach(() => {
    delete (window as unknown as { Clerk?: unknown }).Clerk;
  });

  it("takes the token from the current Clerk session", async () => {
    (window as unknown as { Clerk: unknown }).Clerk = {
      session: { getToken: async () => "clerk-token" },
      redirectToSignIn: vi.fn(),
    };
    await apiFetch("https://api.test/threads");
    expect(sentHeaders().get("Authorization")).toBe("Bearer clerk-token");
  });

  it("goes to the Clerk sign-in on 401", async () => {
    const redirectToSignIn = vi.fn();
    (window as unknown as { Clerk: unknown }).Clerk = {
      session: { getToken: async () => "clerk-token" },
      redirectToSignIn,
    };
    fetchMock.mockResolvedValue(new Response("{}", { status: 401 }));
    await apiFetch("https://api.test/threads");
    expect(redirectToSignIn).toHaveBeenCalledTimes(1);
  });

  it("sends no token while Clerk has not loaded", async () => {
    await apiFetch("https://api.test/threads");
    expect(sentHeaders().has("Authorization")).toBe(false);
  });
});
