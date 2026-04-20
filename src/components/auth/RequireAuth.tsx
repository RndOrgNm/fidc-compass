import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/clerk-react";
import type { ReactNode } from "react";

/**
 * Gate for routes that require an authenticated Clerk user.
 *
 * When signed out, redirects to Clerk’s hosted Account Portal (same UX as
 * visiting `/login`). After sign-in, Clerk returns the user to the app.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  return (
    <>
      <SignedIn>{children}</SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
