/** The part of the Clerk browser object that apiFetch uses. */
interface ClerkBrowser {
  session?: { getToken(): Promise<string | null> } | null;
  redirectToSignIn(): Promise<unknown> | unknown;
}

function clerk(): ClerkBrowser | undefined {
  return (window as unknown as { Clerk?: ClerkBrowser }).Clerk;
}

export interface ApiAuth {
  /** The session token to send, or null when nobody is signed in. */
  getToken: () => Promise<string | null>;
  /** Called once when the backend refuses the token, however many calls fail together. */
  onUnauthorized: () => Promise<unknown> | unknown;
}

const defaultAuth: ApiAuth = {
  getToken: async () => (await clerk()?.session?.getToken()) ?? null,
  onUnauthorized: () => clerk()?.redirectToSignIn(),
};

let auth: ApiAuth = defaultAuth;
let signingIn = false;

/** Replaces how apiFetch gets the token and what a 401 does; with no argument, restores Clerk. */
export function configureApiAuth(next: Partial<ApiAuth> = {}): void {
  auth = { ...defaultAuth, ...next };
  signingIn = false;
}

/**
 * fetch with the Clerk session token in `Authorization: Bearer`. The caller still reads the
 * Response; a 401 also sends the person to the Clerk sign-in, once.
 */
export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = await auth.getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // A string body is JSON here; FormData sets its own boundary and must be left alone.
  if (typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(input, { ...init, headers });

  if (response.status === 401 && !signingIn) {
    signingIn = true;
    try {
      await auth.onUnauthorized();
    } finally {
      signingIn = false;
    }
  }
  return response;
}

export interface ApiError {
  detail: string;
}

export interface ApiSource {
  document_id?: string;
  section_id?: string;
  category?: string;
  page_number?: number;
  section_text?: string;
  [key: string]: any;
}
