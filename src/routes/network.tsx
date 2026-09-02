import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Radio, Signal, WifiOff } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { EmptyState, StatusBadge, StatusDot, statusTone } from "@/components/common/status";
import { usePlatform } from "@/state/platform";

export const Route = createFileRoute("/network")({
  head: () => ({
    meta: [
      { title: "Network Monitoring · Arogya Kavach" },
      {
        name: "description",
        content:
          "LoRa mesh health: gateway status, connected helmet nodes, link quality and disconnected devices.",
      },
      { property: "og:title", content: "Network Monitoring · Arogya Kavach" },
      {
        property: "og:description",
        content: "Track gateway uptime and node connectivity across the underground and surface mesh.",
      },
    ],
  }),
  component: NetworkPage,
});

export function NetworkPage() {
  const platform = usePlatform();
  const navigate = useNavigate();
  const offline = platform.workers.filter((worker) => worker.networkStatus !== "CONNECTED");

  return (
    <AppShell title="Network Monitoring" subtitle="Gateway and node connectivity across the mesh">
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Network health"
          value={`${platform.stats.networkHealth}%`}
          hint="Connected nodes / total"
        />
        <Metric
          label="Gateways online"
          value={`${platform.stats.gatewaysOnline}/${platform.stats.gatewaysTotal}`}
          hint="Concentrators reachable"
        />
        <Metric
          label="Connected nodes"
          value={`${platform.stats.connectedNodes}/${platform.stats.totalWorkers}`}
          hint="Helmet radios linked"
        />
        <Metric label="Active links" value={platform.stats.activeLinks} hint="Node ↔ gateway" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Radio className="size-4 text-muted-foreground" /> Gateways
          </h2>
          <ul className="space-y-3">
            {platform.gateways.map((gateway) => {
              const nodes = platform.workers.filter((w) => w.gatewayId === gateway.gatewayId);
              const linked = nodes.filter((w) => w.networkStatus === "CONNECTED").length;
              return (
                <li key={gateway.gatewayId} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="numeric font-medium">{gateway.gatewayId}</span>
                    <span className="flex items-center gap-2">
                      {platform.getBinding(gateway.gatewayId).mode === "LIVE" ? (
                        <span className="rounded-full bg-[var(--ok-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--ok)]">
                          Wired device
                        </span>
                      ) : (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          Simulated
                        </span>
                      )}
                      <StatusBadge status={gateway.status} />
                    </span>
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {gateway.name} · {platform.zoneLabel(gateway.zoneId)}
                  </p>
                  <div className="numeric mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>
                      {linked}/{nodes.length} nodes linked
                    </span>
                    <span>Last heartbeat {gateway.lastData}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-ok"
                      style={{ width: `${nodes.length ? (linked / nodes.length) * 100 : 0}%` }}
                    />
                  </div>
                  <Button
                    className="mt-3"
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      platform.focus({ kind: "gateway", id: gateway.gatewayId });
                      void navigate({ to: "/environment" });
                    }}
                  >
                    Locate gateway
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <WifiOff className="size-4 text-muted-foreground" /> Disconnected nodes
          </h2>
          {offline.length === 0 ? (
            <EmptyState
              title="All nodes connected"
              description="Every helmet radio currently reports a healthy uplink to its gateway."
            />
          ) : (
            <ul className="space-y-2">
              {offline.map((worker) => (
                <li
                  key={worker.workerId}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3"
                >
                  <div>
                    <p className="numeric text-sm font-medium">
                      {worker.workerId} · {worker.name}
                    </p>
                    <p className="numeric text-xs text-muted-foreground">
                      {platform.zoneLabel(worker.zoneId)} · last seen {worker.lastSeen}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={worker.networkStatus} />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        navigate({
                          to: "/workers/$workerId",
                          params: { workerId: worker.workerId },
                        })
                      }
                    >
                      Open
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)] xl:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <Signal className="size-4 text-muted-foreground" /> Node link table
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="label-caps border-b text-left text-muted-foreground">
                  {["Node", "Gateway", "Zone", "Link", "Battery", "Last seen"].map((heading) => (
                    <th key={heading} className="px-3 py-2 whitespace-nowrap">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {platform.workers.map((worker) => (
                  <tr key={worker.workerId} className="border-b last:border-0">
                    <td className="numeric px-3 py-2">{worker.workerId}</td>
                    <td className="numeric px-3 py-2">{worker.gatewayId}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {platform.getZone(worker.zoneId)?.code}
                    </td>
                    <td className="px-3 py-2">
                      <span className="flex items-center gap-2 text-xs">
                        <StatusDot tone={statusTone(worker.networkStatus)} />
                        {worker.networkStatus}
                      </span>
                    </td>
                    <td className="numeric px-3 py-2">{worker.battery}%</td>
                    <td className="numeric px-3 py-2 text-xs text-muted-foreground">
                      {worker.lastSeen}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

function Metric({ label, value, hint }: { label: string; value: string | number; hint: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="label-caps text-muted-foreground">{label}</p>
      <p className="numeric mt-2 text-3xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
