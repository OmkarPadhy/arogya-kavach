import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Crosshair, ShieldAlert } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { EmptyState, StatusBadge } from "@/components/common/status";
import { can } from "@/services/authService";
import { usePlatform } from "@/state/platform";
import type { AlertSeverity, AlertState } from "@/data/types";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts & Incidents · Arogya Kavach" },
      {
        name: "description",
        content:
          "Triage safety incidents: fall detection, gas hazards, health anomalies, SOS calls and network loss events.",
      },
      { property: "og:title", content: "Alerts & Incidents · Arogya Kavach" },
      {
        property: "og:description",
        content: "Acknowledge, resolve and locate active safety incidents across the site.",
      },
    ],
  }),
  component: AlertsPage,
});

export function AlertsPage() {
  const platform = usePlatform();
  const navigate = useNavigate();
  const [severity, setSeverity] = useState<"ALL" | AlertSeverity>("ALL");
  const [state, setState] = useState<"ALL" | AlertState>("ALL");
  const allowed = can(platform.user?.role, "alerts");

  const rows = useMemo(
    () =>
      platform.alerts.filter(
        (alert) =>
          (severity === "ALL" || alert.severity === severity) &&
          (state === "ALL" || alert.status === state),
      ),
    [platform.alerts, severity, state],
  );

  const counts = {
    critical: platform.alerts.filter((a) => a.severity === "CRITICAL" && a.status !== "RESOLVED")
      .length,
    warning: platform.alerts.filter((a) => a.severity === "WARNING" && a.status !== "RESOLVED")
      .length,
    acknowledged: platform.alerts.filter((a) => a.status === "ACKNOWLEDGED").length,
    resolved: platform.alerts.filter((a) => a.status === "RESOLVED").length,
  };

  return (
    <AppShell
      title="Alerts & Incidents"
      subtitle="Every safety event raised by helmet nodes and gateways"
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Critical open" value={counts.critical} tone="text-crit" />
        <Metric label="Warnings open" value={counts.warning} tone="text-warn" />
        <Metric label="Acknowledged" value={counts.acknowledged} />
        <Metric label="Resolved" value={counts.resolved} tone="text-ok" />
      </div>

      <div className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <ShieldAlert className="size-4 text-muted-foreground" />
          <select
            value={severity}
            onChange={(event) => setSeverity(event.target.value as "ALL" | AlertSeverity)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="ALL">All severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="WARNING">Warning</option>
            <option value="INFO">Info</option>
          </select>
          <select
            value={state}
            onChange={(event) => setState(event.target.value as "ALL" | AlertState)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="ALL">All states</option>
            <option value="ACTIVE">Active</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
          </select>
          {!allowed ? (
            <span className="text-xs text-muted-foreground">
              Your role can view incidents but not change their state.
            </span>
          ) : null}
        </div>

        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No alerts match"
              description="Try widening the severity or state filters to see more incidents."
            />
          </div>
        ) : (
          <ul className="divide-y">
            {rows.map((alert) => (
              <li key={alert.alertId} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-56">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{alert.type}</span>
                      <StatusBadge status={alert.severity} />
                      <StatusBadge status={alert.status} />
                    </div>
                    <p className="numeric mt-1 text-xs text-muted-foreground">
                      {alert.alertId} · {alert.workerId} · {platform.zoneLabel(alert.zoneId)} ·{" "}
                      {alert.timestamp}
                    </p>
                    <p className="mt-2 max-w-2xl text-sm text-foreground/80">{alert.note}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        navigate({
                          to: "/workers/$workerId",
                          params: { workerId: alert.workerId },
                        })
                      }
                    >
                      Worker profile
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        platform.focus({ kind: "worker", id: alert.workerId });
                        void navigate({ to: "/environment" });
                      }}
                    >
                      <Crosshair className="size-4" /> Locate
                    </Button>
                    <Button
                      size="sm"
                      disabled={!allowed || alert.status !== "ACTIVE"}
                      onClick={() => platform.setAlertStatus(alert.alertId, "ACKNOWLEDGED")}
                    >
                      Acknowledge
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!allowed || alert.status === "RESOLVED"}
                      onClick={() => platform.setAlertStatus(alert.alertId, "RESOLVED")}
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="label-caps text-muted-foreground">{label}</p>
      <p className={"numeric mt-2 text-3xl font-semibold " + (tone ?? "")}>{value}</p>
    </div>
  );
}
