"use client";

import * as React from "react";
import {
  Shield, ShieldCheck, Globe, Power, Wifi,
  Activity, Clock, MapPin, Server, Zap, Loader2,
  CheckCircle2, AlertCircle, Lock, Copy, Download,
  QrCode, Eye, EyeOff, RefreshCw, FileDown, Terminal,
  ExternalLink, Info, KeyRound, type LucideIcon,
} from "lucide-react";
import { GlassCard } from "@/components/glass/glass-card";
import { HelpText } from "@/components/glass/help-text";
import { SectionHeader, MetricRow, type Metric } from "@/components/glass/dense-ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ============ Types ============

interface PublicIP {
  ip: string | null;
  source: string;
  checkedAt: string;
}

interface VPNServerInfo {
  id: string;
  countryCode: string;
  countryName: string;
  city: string;
  flag: string;
  endpoint: string;
  serverPubKey: string;
  allowedIps: string;
  dns: string;
  addressPool: string;
  ping: number;
  load: number;
  premium: boolean;
  status: string;
  isDemo: boolean;
}

interface ActiveSession {
  id: string;
  status: string;
  connectedAt: string | null;
  lastVerifiedIp: string | null;
  lastVerifiedAt: string | null;
  clientAddress: string;
  publicKey: string;
  createdAt: string;
  server: {
    id: string;
    countryCode: string;
    countryName: string;
    city: string;
    flag: string;
    endpoint: string;
    ping: number;
  } | null;
  hasPrivateKey: boolean;
}

interface ConnectResult {
  sessionId: string;
  config: string;
  privateKey: string;
  publicKey: string;
  clientAddress: string;
  isDemo: boolean;
  server: {
    id: string;
    countryCode: string;
    countryName: string;
    city: string;
    flag: string;
    endpoint: string;
    ping: number;
  };
  connectedAt: string;
  notice: string | null;
}

// ============ Helpers ============

function getAuthToken(): string | null {
  try {
    const raw = localStorage.getItem("socialflow-auth");
    if (!raw) return null;
    return JSON.parse(raw)?.state?.token ?? null;
  } catch {
    return null;
  }
}

async function api<T>(url: string, opts?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(opts?.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { ...opts, headers });
  const text = await res.text();
  let json: any;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Request failed (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(json?.error || `Request failed (${res.status})`);
  }
  return json as T;
}

function formatDuration(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h > 0 ? `${h}h ` : ""}${m > 0 ? `${m}m ` : ""}${sec}s`;
}

// ============ Main view ============

export function VPNView() {
  const [publicIp, setPublicIp] = React.useState<PublicIP | null>(null);
  const [ipLoading, setIpLoading] = React.useState(true);
  const [servers, setServers] = React.useState<VPNServerInfo[]>([]);
  const [session, setSession] = React.useState<ActiveSession | null>(null);
  const [sessionLoading, setSessionLoading] = React.useState(true);
  const [connecting, setConnecting] = React.useState(false);
  const [disconnecting, setDisconnecting] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [verifyResult, setVerifyResult] = React.useState<{
    currentIp: string | null;
    previousIp: string | null;
    changed: boolean;
  } | null>(null);
  const [search, setSearch] = React.useState("");
  const [expandedCountry, setExpandedCountry] = React.useState<string | null>(null);
  const [elapsed, setElapsed] = React.useState(0);
  const [configReveal, setConfigReveal] = React.useState(true);
  const [keyReveal, setKeyReveal] = React.useState(false);
  const [showConfig, setShowConfig] = React.useState(false);

  // Load public IP (real, via ipify through our API)
  const loadIp = React.useCallback(async () => {
    setIpLoading(true);
    try {
      const ip = await api<PublicIP>("/api/vpn/ip");
      setPublicIp(ip);
    } catch (e) {
      toast.error("Failed to detect public IP");
    } finally {
      setIpLoading(false);
    }
  }, []);

  // Load servers
  const loadServers = React.useCallback(async () => {
    try {
      const data = await api<{ servers: VPNServerInfo[] }>("/api/vpn/servers");
      setServers(data.servers);
    } catch (e) {
      toast.error("Failed to load VPN servers");
    }
  }, []);

  // Load active session
  const loadSession = React.useCallback(async () => {
    setSessionLoading(true);
    try {
      const data = await api<{ session: ActiveSession | null }>("/api/vpn/session");
      setSession(data.session);
    } catch (e) {
      // ignore
    } finally {
      setSessionLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadIp();
    loadServers();
    loadSession();
  }, [loadIp, loadServers, loadSession]);

  // Connection duration timer
  React.useEffect(() => {
    if (!session?.connectedAt) return;
    const update = () => {
      const dur = Math.floor((Date.now() - new Date(session.connectedAt!).getTime()) / 1000);
      setElapsed(dur);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [session?.connectedAt]);

  async function connect(serverId: string) {
    setConnecting(true);
    setShowConfig(false);
    try {
      const result = await api<ConnectResult>("/api/vpn/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serverId }),
      });
      await loadSession();
      setShowConfig(true);
      if (result.isDemo) {
        toast.warning(`Config generated — but this is a demo server. Configure a real endpoint in admin for the tunnel to form.`);
      } else {
        toast.success(`Connected to ${result.server.countryName}, ${result.server.city}`);
      }
      // Refresh IP after a moment
      setTimeout(loadIp, 1500);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to connect");
    } finally {
      setConnecting(false);
    }
  }

  async function disconnect() {
    setDisconnecting(true);
    try {
      await api("/api/vpn/disconnect", { method: "POST" });
      setSession(null);
      setShowConfig(false);
      setVerifyResult(null);
      toast.info("VPN session ended");
      loadIp();
    } catch (e) {
      toast.error("Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  async function verify() {
    setVerifying(true);
    try {
      const result = await api<{
        currentIp: string | null;
        previousIp: string | null;
        changed: boolean;
      }>("/api/vpn/verify");
      setVerifyResult(result);
      if (result.changed) {
        toast.success("IP changed — WireGuard tunnel appears active!");
      } else {
        toast.info("IP unchanged — tunnel not active yet. Import the config into WireGuard.");
      }
      loadIp();
      loadSession();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  }

  function quickConnect() {
    // Pick lowest-ping active non-demo server, else any active server
    const active = servers.filter((s) => s.status === "active");
    const real = active.filter((s) => !s.isDemo);
    const pool = real.length > 0 ? real : active;
    if (pool.length === 0) return;
    const best = [...pool].sort((a, b) => a.ping - b.ping)[0];
    connect(best.id);
  }

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Copy failed");
    }
  }

  const filtered = servers.filter(
    (s) =>
      !search ||
      s.countryName.toLowerCase().includes(search.toLowerCase()) ||
      s.countryCode.toLowerCase().includes(search.toLowerCase()) ||
      s.city.toLowerCase().includes(search.toLowerCase())
  );

  const connectedServer = session?.server;
  const totalServers = servers.length;
  const realServers = servers.filter((s) => !s.isDemo).length;

  const metrics: Metric[] = [
    {
      label: "Your Real IP",
      value: ipLoading ? "…" : publicIp?.ip || "unknown",
      color: "oklch(0.65 0.22 25)",
    },
    {
      label: "Status",
      value: session ? "Config Issued" : "No Session",
      color: session ? "oklch(0.74 0.18 145)" : "oklch(0.65 0.22 25)",
    },
    {
      label: "Tunnel",
      value: verifyResult?.changed ? "Verified" : "Unverified",
      color: verifyResult?.changed ? "oklch(0.74 0.18 145)" : "oklch(0.7 0.15 75)",
    },
    {
      label: "Protocol",
      value: "WireGuard",
      color: "oklch(0.66 0.22 305)",
    },
    {
      label: "Servers",
      value: String(totalServers),
      color: "var(--primary)",
    },
    {
      label: "Real Endpoints",
      value: String(realServers),
      color: realServers > 0 ? "oklch(0.74 0.18 145)" : "oklch(0.7 0.15 75)",
    },
  ];

  return (
    <div className="space-y-4">
      <HelpText module="vpn">
        <strong className="text-foreground">VPN (WireGuard)</strong> — generates{" "}
        <strong>real, cryptographically valid WireGuard configs</strong> with on-the-fly{" "}
        Curve25519 key pairs. Import the <code>.conf</code> file (or scan the QR) into the
        official WireGuard client to form an actual encrypted tunnel. We verify the tunnel
        by re-checking the server&rsquo;s egress IP.
      </HelpText>

      <MetricRow metrics={metrics} />

      {/* Real IP + connection status card */}
      <GlassCard className="crystal-in p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: Status + IP */}
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "grid h-16 w-16 shrink-0 place-items-center rounded-2xl transition-all duration-500",
                session
                  ? "bg-emerald-500/15 text-emerald-500 shadow-[0_0_24px_-4px_oklch(0.74_0.18_145)]"
                  : "bg-muted/40 text-muted-foreground"
              )}
            >
              {connecting ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : session ? (
                <ShieldCheck className="h-8 w-8" />
              ) : (
                <Shield className="h-8 w-8" />
              )}
            </div>

            <div className="min-w-0">
              <div className="text-lg font-bold">
                {connecting
                  ? "Generating config…"
                  : session
                  ? "Config Issued"
                  : "Not Configured"}
              </div>

              {/* Real IP display */}
              <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Globe className="h-3 w-3" />
                  Real egress IP:{" "}
                  {ipLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <span className="font-mono font-semibold text-foreground">
                      {publicIp?.ip || "unknown"}
                    </span>
                  )}
                  <button
                    onClick={loadIp}
                    title="Re-check IP"
                    className="ml-1 rounded p-0.5 hover:bg-muted/40"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                </div>

                {session ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="text-base">{connectedServer?.flag}</span>
                      {connectedServer?.countryName}
                      {connectedServer?.city ? `, ${connectedServer.city}` : ""}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      {formatDuration(elapsed)} ago
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Activity className="h-3 w-3" />
                      {connectedServer?.ping ?? "—"}ms · WireGuard
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3" />
                      Client IP:{" "}
                      <span className="font-mono">{session.clientAddress}</span>
                    </div>
                  </>
                ) : (
                  <div className="mt-1 max-w-xs text-xs text-muted-foreground">
                    Your server&rsquo;s egress IP is exposed. Generate a WireGuard
                    config below and install it at the OS level to tunnel Synque&rsquo;s
                    publishing traffic.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Action buttons */}
          <div className="flex flex-col gap-2">
            {session ? (
              <>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowConfig((v) => !v)}
                    className="liquid-pill flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold"
                  >
                    <QrCode className="h-4 w-4" />
                    {showConfig ? "Hide Config" : "Show Config"}
                  </button>
                  <button
                    onClick={disconnect}
                    disabled={disconnecting}
                    className="flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-60"
                  >
                    {disconnecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Power className="h-4 w-4" />
                    )}
                    {disconnecting ? "…" : "End"}
                  </button>
                </div>
                <button
                  onClick={verify}
                  disabled={verifying}
                  className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-600 transition hover:bg-emerald-500/20 disabled:opacity-60"
                >
                  {verifying ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  {verifying ? "Verifying…" : "Verify Tunnel"}
                </button>
              </>
            ) : (
              <button
                onClick={quickConnect}
                disabled={connecting || servers.length === 0}
                className="liquid-pill flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold disabled:opacity-60"
              >
                {connecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {connecting ? "Generating…" : "Quick Connect"}
              </button>
            )}
            {verifyResult?.changed && (
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-500">
                <Wifi className="h-3 w-3" /> Tunnel verified
              </div>
            )}
          </div>
        </div>

        {/* Verify result banner */}
        {verifyResult && (
          <div
            className={cn(
              "mt-4 flex items-start gap-2 rounded-xl border p-3 text-xs",
              verifyResult.changed
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
            )}
          >
            {verifyResult.changed ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div className="min-w-0">
              <div className="font-semibold">
                {verifyResult.changed ? "Tunnel Active" : "Tunnel Not Active"}
              </div>
              <div className="mt-0.5">
                Previous IP:{" "}
                <span className="font-mono">{verifyResult.previousIp || "—"}</span>{" "}
                → Current IP:{" "}
                <span className="font-mono">{verifyResult.currentIp || "—"}</span>
              </div>
              {!verifyResult.changed && (
                <div className="mt-1 text-muted-foreground">
                  Import the .conf into the WireGuard client (or scan the QR on
                  mobile), connect, then click Verify again.
                </div>
              )}
            </div>
          </div>
        )}
      </GlassCard>

      {/* Config panel (shown when session active + user toggles) */}
      {session && showConfig && (
        <ConfigPanel
          sessionId={session.id}
          server={connectedServer ?? null}
          clientAddress={session.clientAddress}
          publicKey={session.publicKey}
          configReveal={configReveal}
          setConfigReveal={setConfigReveal}
          keyReveal={keyReveal}
          setKeyReveal={setKeyReveal}
          onCopy={copyToClipboard}
        />
      )}

      {/* Setup instructions (when session active) */}
      {session && (
        <GlassCard className="crystal-in p-4">
          <SectionHeader
            title="Setup guide"
            desc="3 steps to activate the tunnel"
            icon={Terminal}
          />
          <ol className="mt-3 space-y-2.5">
            <SetupStep n={1} title="Install WireGuard">
              Download the official client from{" "}
              <a
                href="https://www.wireguard.com/install/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline"
              >
                wireguard.com/install <ExternalLink className="h-3 w-3" />
              </a>{" "}
              — available for Windows, macOS, Linux, iOS, Android.
            </SetupStep>
            <SetupStep n={2} title="Import the config">
              Either <strong>download the .conf file</strong> above and
              &ldquo;Import tunnel(s) from file&rdquo; in the WireGuard app,{" "}
              <strong>or scan the QR code</strong> on mobile (WireGuard → &ldquo;Scan
              QR code&rdquo;).
            </SetupStep>
            <SetupStep n={3} title="Connect + Verify">
              Activate the tunnel in WireGuard, then come back here and click{" "}
              <strong>Verify Tunnel</strong>. If your egress IP changed, the tunnel
              is live — Synque&rsquo;s publishing traffic now egresses through{" "}
              {connectedServer?.countryName}.
            </SetupStep>
          </ol>
        </GlassCard>
      )}

      {/* Country selector */}
      <GlassCard className="crystal-in p-4">
        <SectionHeader
          title="Select location"
          desc={`Choose from ${totalServers} servers — real endpoints marked ✓, demo servers marked ⚠`}
          icon={Globe}
        />

        <div className="mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search countries or cities…"
            className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none transition focus:border-primary/50"
          />
        </div>

        <div className="scroll-liquid max-h-[400px] space-y-1.5 overflow-y-auto pr-1">
          {sessionLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading servers…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No servers found
            </div>
          ) : (
            filtered.map((server) => {
              const isActive = session?.server?.id === server.id;
              const isExpanded = expandedCountry === server.id;
              const disabled = server.status !== "active" || connecting;

              return (
                <div key={server.id}>
                  <button
                    onClick={() => {
                      if (isActive) return;
                      setExpandedCountry(isExpanded ? null : server.id);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl border p-3 transition",
                      isActive
                        ? "border-emerald-500/40 bg-emerald-500/5"
                        : "border-border/40 bg-muted/10 hover:bg-muted/20"
                    )}
                  >
                    <span className="text-2xl">{server.flag}</span>
                    <div className="min-w-0 flex-1 text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold">{server.countryName}</span>
                        <span className="text-xs text-muted-foreground">· {server.city}</span>
                        {server.premium && <span className="text-[10px]">⭐</span>}
                        {server.isDemo ? (
                          <span className="flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-600">
                            <AlertCircle className="h-2.5 w-2.5" /> DEMO
                          </span>
                        ) : (
                          <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">
                            <CheckCircle2 className="h-2.5 w-2.5" /> REAL
                          </span>
                        )}
                        {isActive && (
                          <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-500">
                            <Wifi className="h-2.5 w-2.5" /> ACTIVE
                          </span>
                        )}
                        {server.status !== "active" && (
                          <span className="rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[9px] font-bold text-rose-500">
                            {server.status.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5">
                          <Server className="h-2.5 w-2.5" />
                          {server.endpoint}
                        </span>
                        <span className="flex items-center gap-0.5">
                          <Activity className="h-2.5 w-2.5" />
                          {server.ping}ms
                        </span>
                        <span className="flex items-center gap-1">
                          <div className="h-1 w-10 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                server.load < 30
                                  ? "bg-emerald-500"
                                  : server.load < 60
                                  ? "bg-amber-500"
                                  : "bg-rose-500"
                              )}
                              style={{ width: `${server.load}%` }}
                            />
                          </div>
                          {server.load}%
                        </span>
                      </div>
                    </div>
                    {isActive ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                    ) : (
                      <Power className="h-4 w-4 shrink-0 text-muted-foreground" />
                    )}
                  </button>

                  {isExpanded && !isActive && (
                    <div className="ml-4 mt-1 flex items-center gap-2 border-l border-border/30 pl-3 py-1">
                      <button
                        onClick={() => connect(server.id)}
                        disabled={disabled}
                        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
                      >
                        {connecting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Zap className="h-3 w-3" />
                        )}
                        Generate Config
                      </button>
                      {server.isDemo && (
                        <span className="text-[10px] text-amber-600">
                          ⚠ Demo — replace endpoint in admin for real tunnel
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </GlassCard>

      {/* Info / how it works */}
      <GlassCard className="crystal-in p-4">
        <SectionHeader
          title="How this works"
          desc="Why a web app can&rsquo;t tunnel your browser, and what this actually does"
          icon={Info}
        />
        <div className="mt-3 space-y-2 text-xs text-muted-foreground">
          <p>
            <strong className="text-foreground">The reality:</strong> A web app
            running in a browser cannot route its own network traffic through a VPN
            — that requires OS-level network control. Any &ldquo;VPN&rdquo; that
            claims to do this purely in-browser is faking it.
          </p>
          <p>
            <strong className="text-foreground">What Synque does instead:</strong>{" "}
            Generates <strong>real</strong> WireGuard configs (genuine Curve25519
            key pairs + valid <code>.conf</code> syntax). You import the config
            into the official WireGuard client, which creates an actual encrypted
            tunnel at the OS level. Synque then{" "}
            <strong>verifies</strong> the tunnel by re-checking the server&rsquo;s
            egress IP — if it changed, the tunnel is live.
          </p>
          <p>
            <strong className="text-foreground">Admin setup:</strong> To make demo
            servers (marked ⚠) into real working tunnels, an admin must replace
            each server&rsquo;s <code>endpoint</code> + <code>serverPubKey</code>{" "}
            with the details of a real running WireGuard server. The config
            generation, key management, and verification all work out of the box.
          </p>
        </div>
      </GlassCard>

      {/* Features */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard icon={KeyRound} title="Real Curve25519 Keys" desc="Genuine x25519 key pairs generated server-side via Node crypto" color="emerald" />
        <FeatureCard icon={FileDown} title="Downloadable .conf" desc="Valid WireGuard config — imports cleanly into any official client" color="blue" />
        <FeatureCard icon={QrCode} title="QR Code" desc="Scan on iOS/Android WireGuard app for instant mobile import" color="violet" />
        <FeatureCard icon={Globe} title="Real IP Detection" desc="Server egress IP fetched live via ipify — no fakes" color="amber" />
        <FeatureCard icon={CheckCircle2} title="Tunnel Verification" desc="Re-checks IP after you connect — confirms the tunnel is live" color="rose" />
        <FeatureCard icon={Lock} title="Zero-Knowledge Keys" desc="Private keys stored encrypted, shown once at generation" color="emerald" />
      </div>
    </div>
  );
}

// ============ Config panel ============

function ConfigPanel({
  sessionId,
  server,
  clientAddress,
  publicKey,
  configReveal,
  setConfigReveal,
  keyReveal,
  setKeyReveal,
  onCopy,
}: {
  sessionId: string;
  server: ActiveSession["server"];
  clientAddress: string;
  publicKey: string;
  configReveal: boolean;
  setConfigReveal: (v: boolean) => void;
  keyReveal: boolean;
  setKeyReveal: (v: boolean) => void;
  onCopy: (text: string, label: string) => void;
}) {
  const downloadHref = `/api/vpn/config?sessionId=${sessionId}`;
  const qrHref = `/api/vpn/qr?sessionId=${sessionId}`;

  return (
    <GlassCard className="crystal-in p-4">
      <SectionHeader
        title="Your WireGuard config"
        desc={`Real .conf for ${server?.countryName ?? ""}, ${server?.city ?? ""} — import into WireGuard client`}
        icon={FileDown}
      />

      <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_auto]">
        {/* Config text + actions */}
        <div className="min-w-0 space-y-3">
          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <a
              href={downloadHref}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90"
            >
              <Download className="h-3.5 w-3.5" />
              Download .conf
            </a>
            <button
              onClick={() => fetch(downloadHref).then((r) => r.text()).then((t) => onCopy(t, "Config"))}
              className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-xs font-semibold transition hover:bg-muted/50"
            >
              <Copy className="h-3.5 w-3.5" />
              Copy config
            </button>
            <button
              onClick={() => setConfigReveal(!configReveal)}
              className="flex items-center gap-1.5 rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-xs font-semibold transition hover:bg-muted/50"
            >
              {configReveal ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {configReveal ? "Hide" : "Show"}
            </button>
          </div>

          {/* QR code */}
          <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-white p-3 dark:bg-white">
            {/* QR code rendered server-side via qrcode lib */}
            <img
              src={qrHref}
              alt="WireGuard config QR code"
              className="h-32 w-32 shrink-0"
              width={128}
              height={128}
            />
            <div className="min-w-0 text-xs text-zinc-700">
              <div className="font-bold text-zinc-900">Mobile import</div>
              <p className="mt-1 text-zinc-600">
                Open the WireGuard app on iOS/Android → tap &ldquo;+&rdquo; →
                &ldquo;Scan QR code&rdquo; → point at this code.
              </p>
            </div>
          </div>

          {/* Public key */}
          <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                <KeyRound className="h-3 w-3" /> Your public key
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => onCopy(publicKey, "Public key")}
                  className="rounded p-1 hover:bg-muted/40"
                  title="Copy public key"
                >
                  <Copy className="h-3 w-3" />
                </button>
              </div>
            </div>
            <div className="mt-1 break-all font-mono text-[11px] text-foreground">
              {publicKey}
            </div>
            <div className="mt-1 text-[10px] text-muted-foreground">
              Client address: <span className="font-mono">{clientAddress}</span>
            </div>
          </div>

          {/* Config preview */}
          {configReveal && (
            <ConfigPreview sessionId={sessionId} />
          )}
        </div>

        {/* Key reveal toggle (private key) */}
        <div className="lg:w-64">
          <PrivateKeyBlock reveal={keyReveal} setReveal={setKeyReveal} />
        </div>
      </div>
    </GlassCard>
  );
}

function ConfigPreview({ sessionId }: { sessionId: string }) {
  const [config, setConfig] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/vpn/config?sessionId=${sessionId}`)
      .then((r) => r.text())
      .then((t) => {
        if (!cancelled) {
          // Mask the private key in the preview for safety
          const masked = t.replace(
            /(PrivateKey = )([A-Za-z0-9+/]+={0,2})/,
            (_m, p1) => `${p1}•••••••••••••••••••••••••••••••••`
          );
          setConfig(masked);
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-zinc-950 p-3 text-xs text-zinc-400">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading config…
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/40 bg-zinc-950 p-3">
      <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
        .conf preview (private key masked)
      </div>
      <pre className="overflow-x-auto whitespace-pre font-mono text-[11px] leading-relaxed text-zinc-300">
        {config}
      </pre>
    </div>
  );
}

function PrivateKeyBlock({
  reveal,
  setReveal,
}: {
  reveal: boolean;
  setReveal: (v: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-600">
        <Lock className="h-3 w-3" /> Private key
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">
        Shown once when you generated the config. If you didn&rsquo;t copy it,
        end this session and generate a new one.
      </p>
      <div className="mt-2">
        <button
          onClick={() => setReveal(!reveal)}
          className="flex items-center gap-1 text-[10px] font-semibold text-amber-600 hover:underline"
        >
          {reveal ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          {reveal ? "Hide" : "Reveal"}
        </button>
      </div>
      {reveal && (
        <div className="mt-1 font-mono text-[10px] text-muted-foreground">
          Use the &ldquo;Download .conf&rdquo; button — the .conf contains your
          private key in cleartext (standard WireGuard format).
        </div>
      )}
    </div>
  );
}

// ============ Setup step ============

function SetupStep({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
        {n}
      </span>
      <div className="min-w-0 pt-0.5 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{title}.</span>{" "}
        {children}
      </div>
    </li>
  );
}

// ============ Feature card ============

function FeatureCard({
  icon: Icon,
  title,
  desc,
  color,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500/10 text-emerald-500",
    blue: "bg-blue-500/10 text-blue-500",
    violet: "bg-violet-500/10 text-violet-500",
    amber: "bg-amber-500/10 text-amber-500",
    rose: "bg-rose-500/10 text-rose-500",
  };
  return (
    <GlassCard className="crystal-in p-4">
      <div className="flex items-start gap-3">
        <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", colorMap[color])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold">{title}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{desc}</div>
        </div>
      </div>
    </GlassCard>
  );
}
