import { RedirectToSignIn } from "@clerk/clerk-react";

/**
 * Sends the user to Clerk’s hosted Account Portal sign-in (not an embedded form).
 * Keeps `/login` working for bookmarks and `afterSignOutUrl`.
 */
export default function Login() {
  return <RedirectToSignIn />;
}
