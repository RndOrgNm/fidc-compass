import { RedirectToSignUp } from "@clerk/clerk-react";

/**
 * Sends the user to Clerk’s hosted Account Portal sign-up.
 */
export default function Register() {
  return <RedirectToSignUp />;
}
