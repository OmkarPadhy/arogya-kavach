import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Crosshair, ExternalLink } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { VirtualEnvironment } from "@/components/environment/VirtualEnvironment";
import { EmptyState, StatusBadge } from "@/components/common/status";
import { usePlatform } from "@/state/platform";

export const Route = createFileRoute("/environment")({
  head: () => ({
    meta: [
      { title: "Live Environment · Arogya Kavach" },
      {
        name: "description",
        content:
          "Interactive 3D view of the industrial site with worker nodes, gateways, network links and spatial alerts.",
      },
      {
        property: "og:title",
        content: "Live Virtual Site · Arogya Kavach",
      },
      {
        property: "og:description",
        content:
          "Explore the mine and plant in 3D, select workers and inspect incidents in place.",
      },
    ],
  }),
  component: EnvironmentPage,
});

function EnvironmentPage() {
  const platform = usePlatform();
  const navigate = useNavigate();

  const openAlerts = platform.alerts.filter(
    (alert) => alert.status !== "RESOLVED",
  );

  function locateWorkerOnGoogleEarth(workerId: string) {
    const worker = platform.workers.find(
      (item) => item.workerId === workerId,
    );

    if (!worker) {
      return;
    }

    const latitude = worker.latitude;
    const longitude = worker.longitude;

    /*
     * Do not open Google Earth when GPS is unavailable.
     */
    if (
      latitude === null ||
      longitude === null ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return;
    }

    /*
     * Google Earth Web coordinate search.
     *
     * Example:
     * https://earth.google.com/web/search/20.2965,85.8252
     */
    const earthUrl =
      `https://earth.google.com/web/search/${latitude},${longitude}`;

    window.open(
      earthUrl,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <AppShell
      title="Live Environment"
      subtitle="Interactive virtual site — orbit, pan, zoom and select any monitored object"
      fullBleed
    >
      <div className="grid h-[calc(100vh-4rem)] gap-3 p-3 xl:grid-cols-[1fr_320px]">
        <VirtualEnvironment className="h-full min-h-[420px]" />

        <div className="flex min-h-0 flex-col gap-3">

          {/* =====================================================
              ACTIVE ALERTS
              ===================================================== */}

          <section className="min-h-0 flex-1 overflow-y-auto rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
            <h2 className="mb-3 text-sm font-semibold">
              Active alerts
            </h2>

            {openAlerts.length === 0 ? (
              <EmptyState
                title="No active alerts"
                description="All monitored workers are currently operating without active incidents."
              />
            ) : (
              <ul className="space-y-2">
                {openAlerts.map((alert) => {
                  const worker =
                    platform.workers.find(
                      (item) =>
                        item.workerId ===
                        alert.workerId,
                    );

                  const hasGps =
                    worker?.latitude !== null &&
                    worker?.latitude !== undefined &&
                    worker?.longitude !== null &&
                    worker?.longitude !== undefined &&
                    Number.isFinite(
                      worker?.latitude,
                    ) &&
                    Number.isFinite(
                      worker?.longitude,
                    );

                  return (
                    <li key={alert.alertId}>
                      <div className="w-full rounded-lg border p-3">

                        {/* Alert information */}
                        <button
                          type="button"
                          onClick={() =>
                            platform.focus({
                              kind: "worker",
                              id: alert.workerId,
                            })
                          }
                          className="w-full text-left"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">
                              {alert.type}
                            </span>

                            <StatusBadge
                              status={
                                alert.severity
                              }
                            />
                          </div>

                          <p className="numeric mt-1 text-xs text-muted-foreground">
                            {alert.workerId} ·{" "}
                            {
                              platform.getZone(
                                alert.zoneId,
                              )?.code
                            }{" "}
                            · {alert.timestamp}
                          </p>
                        </button>

                        {/* Locate button */}
                        <button
                          type="button"
                          disabled={!hasGps}
                          onClick={() =>
                            locateWorkerOnGoogleEarth(
                              alert.workerId,
                            )
                          }
                          className={`mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
                            hasGps
                              ? "text-primary hover:underline"
                              : "cursor-not-allowed text-muted-foreground"
                          }`}
                        >
                          {hasGps ? (
                            <>
                              <Crosshair className="size-3" />
                              Locate on Google Earth
                              <ExternalLink className="size-3" />
                            </>
                          ) : (
                            <>
                              <Crosshair className="size-3" />
                              GPS unavailable
                            </>
                          )}
                        </button>

                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* =====================================================
              ZONES
              ===================================================== */}

          <section className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
            <h2 className="mb-3 text-sm font-semibold">
              Zones
            </h2>

            <ul className="space-y-1.5">
              {platform.zones.map((zone) => {
                const zoneWorkers =
                  platform.workers.filter(
                    (worker) =>
                      worker.zoneId ===
                      zone.zoneId,
                  );

                return (
                  <li key={zone.zoneId}>
                    <button
                      type="button"
                      onClick={() =>
                        platform.focus({
                          kind: "zone",
                          id: zone.zoneId,
                        })
                      }
                      className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50"
                    >
                      <span>
                        <span className="label-caps text-muted-foreground">
                          {zone.code}
                        </span>

                        <span className="block text-xs">
                          {zone.name}
                        </span>
                      </span>

                      <span className="numeric text-xs text-muted-foreground">
                        {zoneWorkers.length} workers
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* =====================================================
              GATEWAYS
              ===================================================== */}

          <section className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
            <h2 className="mb-3 text-sm font-semibold">
              Gateways
            </h2>

            <ul className="space-y-1.5">
              {platform.gateways.map(
                (gateway) => (
                  <li
                    key={
                      gateway.gatewayId
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        platform.focus({
                          kind: "gateway",
                          id: gateway.gatewayId,
                        })
                      }
                      className="flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors hover:bg-accent/50"
                    >
                      <span className="numeric">
                        {gateway.gatewayId}
                      </span>

                      <StatusBadge
                        status={
                          gateway.status
                        }
                      />
                    </button>
                  </li>
                ),
              )}
            </ul>

            <button
              type="button"
              onClick={() =>
                navigate({
                  to: "/network",
                })
              }
              className="mt-3 w-full rounded-md border px-3 py-2 text-xs font-medium transition-colors hover:bg-accent"
            >
              Open network monitoring
            </button>
          </section>

        </div>
      </div>
    </AppShell>
  );
}