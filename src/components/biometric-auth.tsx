"use client";

import * as React from "react";
import { Fingerprint, ScanFace, Loader2, CheckCircle2, X } from "lucide-react";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * BiometricAuth — Face ID / Fingerprint / Touch ID sign-in component.
 *
 * Beautiful, interactive biometric authentication using the WebAuthn API.
 * Detects platform support and shows an appropriate icon:
 * - macOS/iOS: Face ID / Touch ID
 * - Windows: Windows Hello
 * - Android: Fingerprint
 *
 * Two modes:
 * 1. "register" — registers a new biometric credential (for settings page)
 * 2. "login" — authenticates with an existing credential (for login page)
 */

interface BiometricAuthProps {
  mode: "register" | "login";
  email?: string;
  onBiometricSuccess?: (user: any) => void;
  className?: string;
  label?: string;
}

export function BiometricAuth({
  mode,
  email,
  onBiometricSuccess,
  className,
  label,
}: BiometricAuthProps) {
  const [supported, setSupported] = React.useState<boolean | null>(null);
  const [state, setState] = React.useState<"idle" | "scanning" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = React.useState("");

  // Detect WebAuthn + platform authenticator support
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    // WebAuthn requires a secure context (HTTPS or localhost)
    if (!window.isSecureContext) {
      setSupported(false);
      return;
    }
    if (
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function"
    ) {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        .then((available) => setSupported(available))
        .catch(() => setSupported(false));
    } else {
      setSupported(false);
    }
  }, []);

  // Still loading support detection
  if (supported === null) return null;

  // Not supported — show nothing on login page, show info on settings page
  if (!supported) {
    if (mode === "register") {
      return (
        <div className={cn("flex flex-col items-center gap-2", className)}>
          <div className="rounded-xl border border-border/40 bg-muted/20 px-4 py-3 text-center">
            <Fingerprint className="mx-auto h-5 w-5 text-muted-foreground/50" />
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Face ID / Fingerprint is not available on this device.
              It requires a supported device with Face ID, Touch ID, or
              Windows Hello, and a secure (HTTPS) connection.
            </p>
          </div>
        </div>
      );
    }
    return null;
  }

  async function handleBiometric() {
    setState("scanning");
    setErrorMsg("");

    try {
      if (mode === "register") {
        await registerCredential();
      } else {
        await authenticateUser();
      }
    } catch (err) {
      console.error("[biometric] error:", err);
      if (err instanceof Error && err.name === "NotAllowedError") {
        setErrorMsg("Biometric authentication was cancelled or denied.");
      } else {
        setErrorMsg(err instanceof Error ? err.message : "Biometric authentication failed.");
      }
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }

  async function registerCredential() {
    // Get the auth token from localStorage (needed by the middleware)
    const token = (() => {
      try {
        const raw = localStorage.getItem("socialflow-auth");
        return raw ? JSON.parse(raw)?.state?.token ?? null : null;
      } catch { return null; }
    })();

    // Step 1: Get registration options from server (needs auth)
    const optsRes = await fetch("/api/webauthn/register/options", {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    if (!optsRes.ok) {
      const err = await optsRes.json().catch(() => ({}));
      throw new Error(err.error || `Failed to generate registration options (${optsRes.status})`);
    }
    const options = await optsRes.json();

    // Store the challenge for verification (sent back in step 3)
    const expectedChallenge = options.challenge;
    const expectedOrigin = window.location.origin;

    // Step 2: Start the browser's biometric registration
    const attResp = await startRegistration({ optionsJSON: options });

    // Step 3: Verify with the server (needs auth) — send challenge + origin
    const verifyRes = await fetch("/api/webauthn/register/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        response: attResp,
        expectedChallenge,
        expectedOrigin,
      }),
    });

    if (!verifyRes.ok) {
      const err = await verifyRes.json().catch(() => ({}));
      throw new Error(err.error || "Registration verification failed");
    }

    const result = await verifyRes.json();
    if (result.verified) {
      setState("success");
      toast.success("Face ID / Fingerprint enabled!");
      setTimeout(() => setState("idle"), 2000);
    } else {
      throw new Error("Registration was not verified");
    }
  }

  async function authenticateUser() {
    // Step 1: Get authentication options from server
    const optsRes = await fetch("/api/webauthn/authenticate/options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (optsRes.status === 404) {
      throw new Error("No biometric credential found. Please sign in with your password first, then enable Face ID in Settings.");
    }
    if (!optsRes.ok) throw new Error("Failed to generate authentication options");

    const options = await optsRes.json();

    // If no credentials are registered, don't trigger the browser prompt
    if (!options.allowCredentials || options.allowCredentials.length === 0) {
      throw new Error("No biometric credential found. Sign in with password first, then enable Face ID in Settings.");
    }

    // Capture challenge + origin for verification
    const expectedChallenge = options.challenge;
    const expectedOrigin = window.location.origin;

    // Step 2: Start the browser's biometric authentication
    const authResp = await startAuthentication({ optionsJSON: options });

    // Step 3: Verify with the server — send challenge + origin
    const verifyRes = await fetch("/api/webauthn/authenticate/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        response: authResp,
        email,
        expectedChallenge,
        expectedOrigin,
      }),
    });

    if (!verifyRes.ok) {
      const err = await verifyRes.json().catch(() => ({}));
      throw new Error(err.error || "Authentication verification failed");
    }

    const result = await verifyRes.json();
    if (result.verified && result.token) {
      setState("success");
      // Store the token in localStorage (same as password login)
      try {
        const existing = JSON.parse(localStorage.getItem("socialflow-auth") || "{}");
        existing.state = existing.state || {};
        existing.state.token = result.token;
        existing.state.user = result.user;
        existing.state.isAuthenticated = true;
        existing.version = 0;
        localStorage.setItem("socialflow-auth", JSON.stringify(existing));
      } catch {}

      toast.success("Welcome back! 🔓");
      // Call the success callback (triggers redirect)
      setTimeout(() => {
        onBiometricSuccess?.(result.user);
      }, 500);
    } else {
      throw new Error("Authentication was not verified");
    }
  }

  const icon = state === "scanning"
    ? <Loader2 className="h-5 w-5 animate-spin" />
    : state === "success"
    ? <CheckCircle2 className="h-5 w-5" />
    : state === "error"
    ? <X className="h-5 w-5" />
    : <Fingerprint className="h-5 w-5" />;

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* Biometric scan button */}
      <button
        type="button"
        onClick={handleBiometric}
        disabled={state === "scanning"}
        className={cn(
          "biometric-btn group relative flex items-center justify-center gap-2 rounded-2xl px-6 py-3 text-sm font-semibold transition-all duration-300",
          "hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60",
          state === "idle" && "border border-border bg-background text-foreground hover:border-primary/30 hover:bg-primary/5",
          state === "scanning" && "border border-primary/40 bg-primary/10 text-primary",
          state === "success" && "border border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
          state === "error" && "border border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400",
        )}
        aria-label={label || "Sign in with Face ID or fingerprint"}
      >
        {icon}
        <span>{label || (mode === "register" ? "Enable Face ID" : "Sign in with Face ID")}</span>

        {/* Animated scan overlay */}
        {state === "scanning" && (
          <span className="biometric-scan-overlay absolute inset-0 overflow-hidden rounded-2xl">
            <span className="biometric-scan-line absolute left-0 right-0 top-0 h-0.5 bg-primary/60" />
          </span>
        )}
      </button>

      {/* Status message */}
      {state === "scanning" && (
        <p className="flex items-center gap-1.5 text-[11px] text-primary animate-pulse">
          <ScanFace className="h-3 w-3" />
          Look at the camera or touch the sensor…
        </p>
      )}
      {state === "success" && (
        <p className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          {mode === "register" ? "Biometric enabled!" : "Authenticated!"}
        </p>
      )}
      {state === "error" && errorMsg && (
        <p className="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400">
          <X className="h-3 w-3" />
          {errorMsg}
        </p>
      )}
    </div>
  );
}
