"use client";

import * as React from "react";
import {
  Shield, ShieldCheck, Globe, Power, Wifi, WifiOff,
  Activity, Clock, MapPin, Server, Zap, Loader2,
  CheckCircle2, AlertCircle, Lock, Unlock,
  type LucideIcon,
} from "lucide-react";
import { useApi } from "@/lib/hooks";
import { GlassCard } from "@/components/glass/glass-card";
import { HelpText } from "@/components/glass/help-text";
import { SectionHeader, MetricRow, Pill, type Metric } from "@/components/glass/dense-ui";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ============ Types ============

interface VPNStatus {
  connected: boolean;
  country: string | null;
  countryCode: string | null;
  city: string | null;
  ip: string | null;
  connectedAt: string | null;
  duration: number | null; // seconds
  protocol: string | null;
  serverName: string | null;
  latency: number | null;
}

interface Country {
  code: string;
  name: string;
  flag: string;
  cities: { name: string; servers: number; load: number }[];
  ping: number | null;
  premium: boolean;
}

// ============ Country data (with flags) ============

const COUNTRIES: Country[] = [
  { code: "US", name: "United States", flag: "🇺🇸", cities: [{ name: "New York", servers: 12, load: 34 }, { name: "Los Angeles", servers: 8, load: 52 }, { name: "Miami", servers: 6, load: 28 }, { name: "Chicago", servers: 5, load: 41 }], ping: 45, premium: false },
  { code: "UK", name: "United Kingdom", flag: "🇬🇧", cities: [{ name: "London", servers: 10, load: 38 }, { name: "Manchester", servers: 4, load: 22 }], ping: 62, premium: false },
  { code: "DE", name: "Germany", flag: "🇩🇪", cities: [{ name: "Frankfurt", servers: 8, load: 31 }, { name: "Berlin", servers: 5, load: 44 }], ping: 58, premium: false },
  { code: "FR", name: "France", flag: "🇫🇷", cities: [{ name: "Paris", servers: 6, load: 35 }], ping: 65, premium: false },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", cities: [{ name: "Amsterdam", servers: 9, load: 27 }], ping: 55, premium: false },
  { code: "CA", name: "Canada", flag: "🇨🇦", cities: [{ name: "Toronto", servers: 7, load: 33 }, { name: "Vancouver", servers: 4, load: 29 }], ping: 48, premium: false },
  { code: "JP", name: "Japan", flag: "🇯🇵", cities: [{ name: "Tokyo", servers: 6, load: 42 }], ping: 120, premium: true },
  { code: "SG", name: "Singapore", flag: "🇸🇬", cities: [{ name: "Singapore", servers: 5, load: 39 }], ping: 110, premium: true },
  { code: "AU", name: "Australia", flag: "🇦🇺", cities: [{ name: "Sydney", servers: 5, load: 36 }], ping: 135, premium: true },
  { code: "AE", name: "UAE", flag: "🇦🇪", cities: [{ name: "Dubai", servers: 4, load: 25 }], ping: 95, premium: true },
  { code: "PK", name: "Pakistan", flag: "🇵🇰", cities: [{ name: "Karachi", servers: 3, load: 18 }, { name: "Lahore", servers: 2, load: 22 }], ping: 15, premium: false },
  { code: "IN", name: "India", flag: "🇮🇳", cities: [{ name: "Mumbai", servers: 4, load: 31 }, { name: "Delhi", servers: 3, load: 28 }], ping: 25, premium: false },
  { code: "TR", name: "Turkey", flag: "🇹🇷", cities: [{ name: "Istanbul", servers: 4, load: 33 }], ping: 75, premium: false },
  { code: "BR", name: "Brazil", flag: "🇧🇷", cities: [{ name: "São Paulo", servers: 4, load: 41 }], ping: 105, premium: true },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", cities: [{ name: "Johannesburg", servers: 3, load: 29 }], ping: 125, premium: true },
];

// ============ Main view ============

export function VPNView() {
  const [status, setStatus] = React.useState<VPNStatus>({
    connected: false, country: null, countryCode: null, city: null,
    ip: null, connectedAt: null, duration: null, protocol: null,
    serverName: null, latency: null,
  });
  const [selectedCountry, setSelectedCountry] = React.useState<string | null>(null);
  const [selectedCity, setSelectedCity] = React.useState<string | null>(null);
  const [connecting, setConnecting] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [elapsed, setElapsed] = React.useState(0);

  // Simulate connection status (in production this would call the VPN mini-service)
  React.useEffect(() => {
    // Load saved status from localStorage
    try {
      const saved = JSON.parse(localStorage.getItem("synque-vpn-status") || "{}");
      if (saved.connected) {
        setStatus(saved);
      }
    } catch {}
  }, []);

  // Timer for connection duration
  React.useEffect(() => {
    if (!status.connected || !status.connectedAt) return;
    const interval = setInterval(() => {
      const dur = Math.floor((Date.now() - new Date(status.connectedAt!).getTime()) / 1000);
      setElapsed(dur);
    }, 1000);
    return () => clearInterval(interval);
  }, [status.connected, status.connectedAt]);

  // Save status to localStorage
  React.useEffect(() => {
    try {
      localStorage.setItem("synque-vpn-status", JSON.stringify(status));
    } catch {}
  }, [status]);

  function connect(countryCode: string, city: string | null) {
    setConnecting(true);
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (!country) return;

    // Simulate VPN connection (in production: call /api/vpn/connect)
    setTimeout(() => {
      const newStatus: VPNStatus = {
        connected: true,
        country: country.name,
        countryCode: country.code,
        city: city || country.cities[0].name,
        ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        connectedAt: new Date().toISOString(),
        duration: 0,
        protocol: "WireGuard",
        serverName: `${country.code.toLowerCase()}-${city?.toLowerCase().replace(/\s/g, "") || country.cities[0].name.toLowerCase().replace(/\s/g, "")}-01`,
        latency: country.ping,
      };
      setStatus(newStatus);
      setConnecting(false);
      toast.success(`Connected to ${country.name}${city ? `, ${city}` : ""}`);
    }, 2000);
  }

  function disconnect() {
    setConnecting(true);
    setTimeout(() => {
      setStatus({
        connected: false, country: null, countryCode: null, city: null,
        ip: null, connectedAt: null, duration: null, protocol: null,
        serverName: null, latency: null,
      });
      setElapsed(0);
      setConnecting(false);
      toast.info("VPN disconnected");
    }, 1000);
  }

  function quickConnect() {
    // Auto-select best server (lowest ping)
    const best = [...COUNTRIES].sort((a, b) => (a.ping ?? 999) - (b.ping ?? 999))[0];
    connect(best.code, best.cities[0].name);
  }

  const filtered = COUNTRIES.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  );

  const metrics: Metric[] = [
    { label: "Status", value: status.connected ? "Connected" : "Disconnected", color: status.connected ? "oklch(0.74 0.18 145)" : "oklch(0.65 0.22 25)" },
    { label: "Country", value: status.country || "—", color: "var(--primary)" },
    { label: "Ping", value: status.latency ? `${status.latency}ms` : "—", color: "oklch(0.72 0.18 75)" },
    { label: "Protocol", value: status.protocol || "—", color: "oklch(0.66 0.22 305)" },
    { label: "Servers", value: "85", color: "var(--primary)" },
    { label: "Countries", value: String(COUNTRIES.length), color: "var(--primary)" },
  ];

  function formatDuration(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? `${h}h ` : ""}${m > 0 ? `${m}m ` : ""}${sec}s`;
  }

  return (
    <div className="space-y-4">
      <HelpText module="vpn">
        <strong className="text-foreground">VPN</strong> — protect your social media accounts with
        per-account IP rotation. Connect to any of {COUNTRIES.length} countries and route your
        publishing through a secure tunnel to avoid IP-based suspension detection.
      </HelpText>

      <MetricRow metrics={metrics} />

      {/* Connection status card */}
      <GlassCard className="crystal-in p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* Left: Status + IP */}
          <div className="flex items-center gap-4">
            {/* Big shield icon */}
            <div
              className={cn(
                "grid h-16 w-16 shrink-0 place-items-center rounded-2xl transition-all duration-500",
                status.connected
                  ? "bg-emerald-500/15 text-emerald-500 shadow-[0_0_24px_-4px_oklch(0.74_0.18_145)]"
                  : "bg-muted/40 text-muted-foreground"
              )}
            >
              {connecting ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : status.connected ? (
                <ShieldCheck className="h-8 w-8" />
              ) : (
                <Shield className="h-8 w-8" />
              )}
            </div>

            <div className="min-w-0">
              <div className="text-lg font-bold">
                {connecting ? "Connecting…" : status.connected ? "Protected" : "Not Connected"}
              </div>
              {status.connected ? (
                <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{COUNTRIES.find(c => c.code === status.countryCode)?.flag}</span>
                    {status.country}{status.city ? `, ${status.city}` : ""}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Lock className="h-3 w-3" />
                    IP: <span className="font-mono font-semibold text-foreground">{status.ip}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    {formatDuration(elapsed)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-3 w-3" />
                    {status.latency}ms · {status.protocol}
                  </div>
                </div>
              ) : (
                <div className="mt-1 text-xs text-muted-foreground">
                  Your real IP is exposed. Connect to protect your accounts.
                </div>
              )}
            </div>
          </div>

          {/* Right: Action buttons */}
          <div className="flex flex-col gap-2">
            {status.connected ? (
              <button
                onClick={disconnect}
                disabled={connecting}
                className="flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-rose-600 disabled:opacity-60"
              >
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}
                {connecting ? "Disconnecting…" : "Disconnect"}
              </button>
            ) : (
              <button
                onClick={quickConnect}
                disabled={connecting}
                className="liquid-pill flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold disabled:opacity-60"
              >
                {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                {connecting ? "Connecting…" : "Quick Connect"}
              </button>
            )}
            {status.connected && (
              <div className="flex items-center justify-center gap-1.5 text-[10px] text-emerald-500">
                <Wifi className="h-3 w-3" /> Secure tunnel active
              </div>
            )}
          </div>
        </div>
      </GlassCard>

      {/* Country selector */}
      <GlassCard className="crystal-in p-4">
        <SectionHeader
          title="Select location"
          desc={`Choose from ${COUNTRIES.length} countries — premium servers marked with ⭐`}
          icon={Globe}
        />

        {/* Search */}
        <div className="mb-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search countries…"
            className="w-full rounded-xl border border-border/50 bg-muted/30 px-3 py-2 text-sm outline-none transition focus:border-primary/50"
          />
        </div>

        {/* Country grid */}
        <div className="scroll-liquid max-h-[400px] space-y-1.5 overflow-y-auto pr-1">
          {filtered.map((country) => {
            const isActive = status.countryCode === country.code;
            const isExpanded = selectedCountry === country.code;

            return (
              <div key={country.code}>
                <button
                  onClick={() => {
                    if (isActive) return;
                    setSelectedCountry(isExpanded ? null : country.code);
                    setSelectedCity(null);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-3 transition",
                    isActive
                      ? "border-emerald-500/40 bg-emerald-500/5"
                      : "border-border/40 bg-muted/10 hover:bg-muted/20"
                  )}
                >
                  {/* Flag */}
                  <span className="text-2xl">{country.flag}</span>

                  {/* Country info */}
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">{country.name}</span>
                      {country.premium && <span className="text-[10px]">⭐</span>}
                      {isActive && (
                        <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9px] font-bold text-emerald-500">
                          <Wifi className="h-2.5 w-2.5" /> ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Server className="h-2.5 w-2.5" />
                        {country.cities.reduce((s, c) => s + c.servers, 0)} servers
                      </span>
                      {country.ping && (
                        <span className="flex items-center gap-0.5">
                          <Activity className="h-2.5 w-2.5" />
                          {country.ping}ms
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  {isActive ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                  ) : (
                    <Power className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>

                {/* City selection (expandable) */}
                {isExpanded && !isActive && (
                  <div className="ml-4 mt-1 space-y-1 border-l border-border/30 pl-3">
                    {country.cities.map((city) => (
                      <button
                        key={city.name}
                        onClick={() => connect(country.code, city.name)}
                        disabled={connecting}
                        className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-muted/20 disabled:opacity-50"
                      >
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{city.name}</span>
                        <span className="text-[10px] text-muted-foreground">{city.servers} servers</span>
                        {/* Load bar */}
                        <div className="ml-auto flex items-center gap-1">
                          <div className="h-1 w-12 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                city.load < 30 ? "bg-emerald-500" : city.load < 60 ? "bg-amber-500" : "bg-rose-500"
                              )}
                              style={{ width: `${city.load}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-muted-foreground">{city.load}%</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Features */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard icon={Lock} title="AES-256 Encryption" desc="Military-grade encryption protects every byte of your traffic" color="emerald" />
        <FeatureCard icon={Server} title="85+ Servers" desc={`${COUNTRIES.length} countries, multiple cities, load-balanced`} color="blue" />
        <FeatureCard icon={Activity} title="Zero Logs" desc="We don't log your activity, IP, or DNS queries" color="violet" />
        <FeatureCard icon={Zap} title="WireGuard Protocol" desc="Fastest VPN protocol with minimal latency overhead" color="amber" />
        <FeatureCard icon={ShieldCheck} title="Kill Switch" desc="Blocks all traffic if VPN drops — no IP leaks" color="rose" />
        <FeatureCard icon={Globe} title="DNS Leak Protection" desc="Encrypted DNS prevents ISP tracking of your queries" color="emerald" />
      </div>
    </div>
  );
}

// ============ Feature card ============

function FeatureCard({ icon: Icon, title, desc, color }: { icon: LucideIcon; title: string; desc: string; color: string }) {
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
