import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Cable, Loader2, Moon, PlugZap, Sun } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { EmptyState, StatusBadge } from "@/components/common/status";
import { can } from "@/services/authService";
import {
  testBinding,
  type DeviceBinding,
  type DeviceProtocol,
  type DeviceTestResult,
} from "@/services/deviceService";
import { usePlatform } from "@/state/platform";
import { useTheme } from "@/state/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [
      { title: "System Settings · Arogya Kavach" },
      {
        name: "description",
        content:
          "Wire gateways to real hardware endpoints, control telemetry simulation and set the control room theme.",
      },
      { property: "og:title", content: "System Settings · Arogya Kavach" },
      {
        property: "og:description",
        content: "Device wiring, polling intervals and appearance settings for the safety platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const protocols: { value: DeviceProtocol; label: string }[] = [
  { value: "HTTP_JSON", label: "HTTP JSON endpoint" },
  { value: "GOOGLE_SHEETS", label: "Google Apps Script relay" },
  { value: "MQTT_BRIDGE", label: "MQTT → HTTP bridge" },
];

function SettingsPage() {
  const platform = usePlatform();
  const { theme, setTheme } = useTheme();
  const allowed = can(platform.user?.role, "settings");

  if (!allowed) {
    return (
      <AppShell title="System Settings" subtitle="Restricted area">
        <EmptyState
          title="Administrator access required"
          description="Only site administrators can change device wiring and platform settings."
        />
      </AppShell>
    );
  }

  return (
    <AppShell title="System Settings" subtitle="Device wiring, telemetry and appearance">
      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)] xl:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Cable className="size-4 text-muted-foreground" /> Gateway device wiring
            </h2>
            <span className="label-caps text-muted-foreground">
              {platform.liveDeviceCount} live · last sync {platform.lastDeviceSync ?? "—"}
            </span>
          </div>
          <p className="mb-4 text-xs leading-relaxed text-muted-foreground">
            Point a gateway at the HTTP endpoint exposed by its physical concentrator. The endpoint
            should return a JSON array of node readings with a <code>workerId</code> field. Live
            readings override the simulated stream for those nodes.
          </p>
          <ul className="space-y-3">
            {platform.gateways.map((gateway) => (
              <GatewayBinding key={gateway.gatewayId} gatewayId={gateway.gatewayId} />
            ))}
          </ul>
        </section>

        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
            <h2 className="mb-3 text-sm font-semibold">Telemetry</h2>
            <label className="flex items-start justify-between gap-3 rounded-lg border p-3">
              <span>
                <span className="text-sm font-medium">Simulated stream</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Keep demo telemetry running for nodes without a wired device.
                </span>
              </span>
              <input
                type="checkbox"
                checked={platform.simulationEnabled}
                onChange={(event) => platform.setSimulationEnabled(event.target.checked)}
                className="mt-1 size-4 accent-[var(--primary)]"
              />
            </label>
          </section>

          <section className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
            <h2 className="mb-3 text-sm font-semibold">Appearance</h2>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "light" as const, label: "Light", icon: Sun },
                  { value: "dark" as const, label: "Dark", icon: Moon },
                ]
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                    theme === option.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-accent",
                  )}
                >
                  <option.icon className="size-4" /> {option.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              The control room theme is remembered on this device.
            </p>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function GatewayBinding({ gatewayId }: { gatewayId: string }) {
  const platform = usePlatform();
  const gateway = platform.getGateway(gatewayId);
  const stored = platform.getBinding(gatewayId);
  const [draft, setDraft] = useState<DeviceBinding>(stored);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<DeviceTestResult | null>(null);

  useEffect(() => {
    setDraft(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gatewayId]);

  if (!gateway) return null;

  const update = <K extends keyof DeviceBinding>(key: K, value: DeviceBinding[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const runTest = async () => {
    setTesting(true);
    setResult(await testBinding(draft));
    setTesting(false);
  };

  return (
    <li className="rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="numeric text-sm font-medium">{gateway.gatewayId}</p>
          <p className="text-xs text-muted-foreground">
            {gateway.name} · {platform.zoneLabel(gateway.zoneId)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={gateway.status} />
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-medium",
              stored.mode === "LIVE"
                ? "bg-[var(--ok-soft)] text-[var(--ok)]"
                : "bg-muted text-muted-foreground",
            )}
          >
            {stored.mode === "LIVE" ? "Wired to device" : "Simulated"}
          </span>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Mode">
          <select
            value={draft.mode}
            onChange={(event) => update("mode", event.target.value as DeviceBinding["mode"])}
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
          >
            <option value="MOCK">Simulated telemetry</option>
            <option value="LIVE">Live device</option>
          </select>
        </Field>
        <Field label="Protocol">
          <select
            value={draft.protocol}
            onChange={(event) => update("protocol", event.target.value as DeviceProtocol)}
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
          >
            {protocols.map((protocol) => (
              <option key={protocol.value} value={protocol.value}>
                {protocol.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Device endpoint URL" className="sm:col-span-2">
          <input
            value={draft.endpoint}
            onChange={(event) => update("endpoint", event.target.value)}
            placeholder="https://gateway.local/api/readings"
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
          />
        </Field>
        <Field label="Hardware device ID">
          <input
            value={draft.deviceId}
            onChange={(event) => update("deviceId", event.target.value)}
            placeholder="ESP32-GW-001"
            className="h-9 w-full rounded-md border bg-background px-2 text-sm"
          />
        </Field>
        <Field label="Poll interval (seconds)">
          <input
            type="number"
            min={2}
            max={120}
            value={draft.pollSeconds}
            onChange={(event) => update("pollSeconds", Number(event.target.value) || 5)}
            className="numeric h-9 w-full rounded-md border bg-background px-2 text-sm"
          />
        </Field>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={runTest} disabled={testing}>
          {testing ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <PlugZap className="size-3.5" />
          )}
          Test connection
        </Button>
        <Button
          size="sm"
          onClick={() => {
            platform.saveBinding(draft);
            setResult({ ok: true, message: "Wiring saved for this gateway." });
          }}
        >
          Save wiring
        </Button>
        {result ? (
          <span
            className={cn(
              "text-xs",
              result.ok ? "text-[var(--ok)]" : "text-[var(--crit)]",
            )}
          >
            {result.message}
            {result.latencyMs != null ? ` (${result.latencyMs} ms)` : ""}
          </span>
        ) : null}
      </div>
    </li>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="label-caps mb-1 block text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
