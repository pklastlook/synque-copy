"use client";

import * as React from "react";
import { X, MailCheck, Loader2, MailWarning } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-store";
import { cn } from "@/lib/utils";

/**
 * P2-CORE — Dismissible "Verify your email" banner.
 *
 * Shows at the top of the AppShell whenever `user.emailVerified` is null.
 * The user can:
 *   - Click "Resend verification email" to call /api/auth/resend-verification
 *   - Dismiss the banner for the current session (state is held in
 *     sessionStorage so it comes back next session if still unverified)
 *
 * Also listens for the `?verified=true` / `?verified=false` query params
 * (set by the GET /api/auth/verify-email redirect) and shows the right
 * toast + refreshes the user object from the server so the banner
 * disappears without a hard page reload.
 */
export function VerifyEmailBanner() {
  const { user, fetchUser, updateUser } = useAuth();
  const [dismissed, setDismissed] = React.useState(false);
  const [sending, setSending] = React.useState(false);

  // Read the ?verified= query on mount — the verify-email GET redirect lands here.
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const verified = url.searchParams.get("verified");
    if (!verified) return;

    // Strip the query so it doesn't persist on every navigation.
    url.searchParams.delete("verified");
    url.searchParams.delete("error");
    url.searchParams.delete("alreadyVerified");
    window.history.replaceState({}, "", url.toString());

    if (verified === "true") {
      toast.success("Email verified — welcome aboard!", {
        description: "You now have full access to all features.",
      });
      // Optimistically mark + refetch to be sure.
      updateUser({ emailVerified: new Date().toISOString() });
      fetchUser();
    } else {
      const err = url.searchParams.get("error");
      const msg =
        err === "expired"
          ? "This verification link has expired. Please request a new one."
          : err === "already_used"
          ? "This verification link has already been used. Please request a new one."
          : "We couldn't verify your email — the link may be invalid.";
      toast.error("Verification failed", { description: msg });
    }
  }, []);

  // Don't render if the user is verified, missing, or has dismissed the banner.
  if (!user) return null;
  if (user.emailVerified) return null;
  if (dismissed) return null;

  async function resend() {
    setSending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        credentials: "include",
      });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        sent?: boolean;
        alreadyVerified?: boolean;
        verifyUrl?: string;
        message?: string;
        error?: string;
      };
      if (!res.ok) {
        toast.error(json.error ?? "Failed to resend verification email");
        return;
      }
      if (json.alreadyVerified) {
        // Server says we're already verified — refresh the user object.
        updateUser({ emailVerified: new Date().toISOString() });
        fetchUser();
        toast.success("Your email is already verified.");
        return;
      }
      if (json.sent) {
        toast.success("Verification email sent", {
          description: "Check your inbox — the link expires in 24 hours.",
        });
        return;
      }
      // No mail server — surface the dev URL.
      if (json.verifyUrl) {
        toast.info("Mail server not configured", {
          description: "Open the verification link from the server response.",
          duration: 8000,
        });
        return;
      }
      toast.success("Verification email sent");
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      role="status"
      className={cn(
        "border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-[12px] text-amber-900 dark:text-amber-100",
      )}
    >
      <div className="flex items-center justify-center gap-2">
        <MailWarning className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          Please verify your email to access all features.{" "}
          <button
            type="button"
            onClick={resend}
            disabled={sending}
            className="font-semibold underline underline-offset-2 hover:text-amber-700 disabled:opacity-50 dark:hover:text-amber-50"
          >
            {sending ? "Sending…" : "Resend verification email"}
          </button>
        </span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss verification banner"
          className="ml-1 grid h-5 w-5 place-items-center rounded-full text-amber-700/60 transition hover:bg-amber-500/15 hover:text-amber-700 dark:text-amber-100/60 dark:hover:text-amber-100"
        >
          {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
        </button>
      </div>
    </div>
  );
}

/**
 * Tiny inline success badge used inside the AppShell when the verification
 * toast fires (purely cosmetic — kept for future use).
 */
export function VerifyEmailSuccessBadge() {
  return <MailCheck className="h-3.5 w-3.5" aria-hidden />;
}
