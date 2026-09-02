import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Boxes, HardHat, Radio, ShieldAlert, Users } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { VirtualEnvironment } from "@/components/environment/VirtualEnvironment";
import { Button } from "@/components/ui/button";
import { EmptyState, StatusBadge, StatusDot, statusTone } from "@/components/common/status";
import { usePlatform } from "@/state/platform";

export const Route = createFileRoute("/overview")({
  head: () => ({
    meta: [
      { title: "Control Center · Arogya Kavach" },
      {
        name: "description",
        content:
          "Site-wide control center: worker KPIs, live 3D environment, active alerts and network status.",
      },
      { property: "og:title", content: "Arogya Kavach Control Center" },
      {
        property: "og:description",
        content: "Live worker safety KPIs, incidents and network health for the industrial site.",
      },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const platform = usePlatform();
  const navigate = useNavigate();
  const { stats, alerts, workers, gateways } = platform;

  const openAlerts = alerts.filter((alert) => alert.status !== "RESOLVED");
  const recent = alerts.slice(0, 5);

  return (
    <AppShell
      title="Main Control Center"
      subtitle={`${platform.snapshot?.site.name ?? ""} · site status ${stats.siteStatus}`}
      actions={
        <Button size="sm" onClick={() => navigate({ to: "/environment" })}>
          <Boxes className="size-4" /> Open live environment
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi label="Total workers" value={stats.totalWorkers} icon={<Users className="size-4" />} />
        <Kpi
          label="Active workers"
          value={stats.activeWorkers}
          icon={<HardHat className="size-4" />}
          hint={`${stats.offlineWorkers} offline`}
        />
        <Kpi
          label="Active alerts"
          value={stats.activeAlerts}
          icon={<ShieldAlert className="size-4" />}
          tone={stats.activeAlerts > 0 ? "crit" : "ok"}
        />
        <Kpi
          label="Gateways"
          value={`${stats.gatewaysOnline}/${stats.gatewaysTotal}`}
          icon={<Radio className="size-4" />}
        />
        <Kpi
          label="Network status"
          value={stats.systemStatus}
          hint={`${stats.networkHealth}% nodes linked`}
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.9fr_1fr]">
        <VirtualEnvironment className="h-[540px]" showFilters={false} />

        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
            <header className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Active alerts</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/alerts" })}>
                All <ArrowRight className="size-3.5" />
              </Button>
            </header>
            {openAlerts.length === 0 ? (
              <EmptyState
                title="No active alerts"
                description="All monitored workers are currently operating without active incidents."
              />
            ) : (
              <ul className="space-y-2">
                {openAlerts.slice(0, 4).map((alert) => (
                  <li key={alert.alertId}>
                    <button
                      type="button"
                      onClick={() => {
                        platform.focus({ kind: "worker", id: alert.workerId });
                        void navigate({ to: "/environment" });
                      }}
                      className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-accent/50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{alert.type}</span>
                        <StatusBadge status={alert.severity} />
                      </div>
                      <p className="numeric mt-1 text-xs text-muted-foreground">
                        {alert.workerId} · {platform.getZone(alert.zoneId)?.code} · {alert.timestamp}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
            <h2 className="mb-3 text-sm font-semibold">Worker status</h2>
            <div className="grid grid-cols-2 gap-2">
              {(["NORMAL", "WARNING", "CRITICAL", "OFFLINE"] as const).map((status) => (
                <div key={status} className="rounded-lg border px-3 py-2">
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <StatusDot tone={statusTone(status)} /> {status}
                  </p>
                  <p className="numeric mt-1 text-xl font-semibold">
                    {workers.filter((worker) => worker.status === status).length}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
            <h2 className="mb-3 text-sm font-semibold">Network</h2>
            <ul className="space-y-2 text-sm">
              {gateways.map((gateway) => (
                <li key={gateway.gatewayId} className="flex items-center justify-between gap-2">
                  <span className="numeric text-muted-foreground">{gateway.gatewayId}</span>
                  <span className="truncate text-xs text-muted-foreground">{gateway.network}</span>
                  <StatusBadge status={gateway.status} />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <section className="mt-4 rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
        <h2 className="mb-3 text-sm font-semibold">Recent incidents</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="label-caps border-b text-left text-muted-foreground">
                <th className="py-2 pr-4">Alert</th>
                <th className="py-2 pr-4">Worker</th>
                <th className="py-2 pr-4">Type</th>
                <th className="py-2 pr-4">Zone</th>
                <th className="py-2 pr-4">Time</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((alert) => (
                <tr key={alert.alertId} className="border-b last:border-0">
                  <td className="numeric py-2 pr-4">{alert.alertId}</td>
                  <td className="numeric py-2 pr-4">{alert.workerId}</td>
                  <td className="py-2 pr-4">{alert.type}</td>
                  <td className="py-2 pr-4">{platform.getZone(alert.zoneId)?.code}</td>
                  <td className="numeric py-2 pr-4">{alert.timestamp}</td>
                  <td className="py-2">
                    <StatusBadge status={alert.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  hint?: string | undefined;
  icon?: React.ReactNode | undefined;
  tone?: "ok" | "crit" | undefined;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between text-muted-foreground">
        <p className="label-caps">{label}</p>
        {icon}
      </div>
      <p
        className={
          "numeric mt-2 text-3xl font-semibold " + (tone === "crit" ? "text-crit" : "text-foreground")
        }
      >
        {typeof value === "number" ? String(value).padStart(2, "0") : value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint ?? "\u00a0"}</p>
    </div>
  );
}
