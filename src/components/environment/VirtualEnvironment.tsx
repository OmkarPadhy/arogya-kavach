import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Crosshair,
  Expand,
  Grid2x2,
  LayoutGrid,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge, StatusDot, formatSensor, statusTone } from "@/components/common/status";
import { usePlatform, type EnvironmentLayer } from "@/state/platform";
import type { HoverInfo, SiteScene } from "@/three/SiteScene";

const layerOptions: { key: EnvironmentLayer; label: string }[] = [
  { key: "workers", label: "Workers" },
  { key: "gateways", label: "Gateways" },
  { key: "network", label: "Network" },
  { key: "zones", label: "Zones" },
  { key: "alerts", label: "Alerts" },
  { key: "equipment", label: "Equipment" },
];

export function VirtualEnvironment({
  className,
  showFilters = true,
  showDetails = true,
}: {
  className?: string | undefined;
  showFilters?: boolean | undefined;
  showDetails?: boolean | undefined;
}) {
  const platform = usePlatform();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<SiteScene | null>(null);
  const [hover, setHover] = useState<HoverInfo | null>(null);
  const [sceneReady, setSceneReady] = useState(false);

  const {
    workers,
    zones,
    gateways,
    alerts,
    layers,
    selection,
    focusRequest,
    focus,
    setSelection,
    toggleLayer,
  } = platform;

  useEffect(() => {
    let disposed = false;
    const container = containerRef.current;
    if (!container) return;

    void import("@/three/SiteScene").then(({ SiteScene: Scene }) => {
      if (disposed || !containerRef.current) return;
      sceneRef.current = new Scene(containerRef.current, {
        onHover: (info) => setHover(info),
        onSelect: (kind, id) => focus({ kind, id }),
      });
      setSceneReady(true);
    });

    const observer = new ResizeObserver(() => sceneRef.current?.resize());
    observer.observe(container);

    return () => {
      disposed = true;
      observer.disconnect();
      sceneRef.current?.dispose();
      sceneRef.current = null;
      setSceneReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sceneReady) return;
    sceneRef.current?.update({
      workers,
      zones,
      gateways,
      alerts,
      layers,
      selectedId: selection?.id ?? null,
    });
  }, [sceneReady, workers, zones, gateways, alerts, layers, selection]);

  useEffect(() => {
    if (!sceneReady || !focusRequest) return;
    sceneRef.current?.focus(focusRequest.kind, focusRequest.id);
  }, [sceneReady, focusRequest]);

  const hoveredWorker = hover?.kind === "worker" ? platform.getWorker(hover.id) : undefined;
  const hoveredGateway = hover?.kind === "gateway" ? platform.getGateway(hover.id) : undefined;
  const hoveredZone = hover?.kind === "zone" ? platform.getZone(hover.id) : undefined;

  const selectedWorker = selection?.kind === "worker" ? platform.getWorker(selection.id) : undefined;
  const selectedGateway =
    selection?.kind === "gateway" ? platform.getGateway(selection.id) : undefined;
  const selectedZone = selection?.kind === "zone" ? platform.getZone(selection.id) : undefined;

  const zoneWorkers = useMemo(
    () => (selectedZone ? workers.filter((w) => w.zoneId === selectedZone.zoneId) : []),
    [selectedZone, workers],
  );
  const gatewayWorkers = useMemo(
    () => (selectedGateway ? workers.filter((w) => w.gatewayId === selectedGateway.gatewayId) : []),
    [selectedGateway, workers],
  );

  const requestFullscreen = () => {
    const element = containerRef.current?.parentElement;
    if (!element) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void element.requestFullscreen?.();
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-panel-border bg-panel",
        className,
      )}
    >
      <div ref={containerRef} className="absolute inset-0" />

      {!sceneReady ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="label-caps text-panel-muted">Initialising virtual site…</p>
        </div>
      ) : null}

      {/* Site header */}
      <div className="pointer-events-none absolute top-3 left-3 rounded-lg border border-panel-border bg-panel-elevated/85 px-3 py-2 backdrop-blur">
        <p className="label-caps text-panel-muted">Virtual Site</p>
        <p className="text-sm font-semibold text-panel-foreground">
          {platform.snapshot?.site.name ?? "Arogya Industrial Site"}
        </p>
        <div className="mt-1 flex items-center gap-2 text-[11px] text-panel-muted">
          <StatusDot tone={statusTone(platform.stats.siteStatus)} />
          Site status: {platform.stats.siteStatus} · {platform.stats.activeWorkers}/
          {platform.stats.totalWorkers} active
        </div>
      </div>

      {/* Layer filters */}
      {showFilters ? (
        <div className="absolute top-3 right-3 w-40 rounded-lg border border-panel-border bg-panel-elevated/85 p-3 backdrop-blur">
          <p className="label-caps mb-2 text-panel-muted">Layers</p>
          <div className="space-y-1.5">
            {layerOptions.map((option) => (
              <label
                key={option.key}
                className="flex cursor-pointer items-center gap-2 text-xs text-panel-foreground"
              >
                <input
                  type="checkbox"
                  className="size-3.5 accent-[var(--primary)]"
                  checked={layers[option.key]}
                  onChange={() => toggleLayer(option.key)}
                />
                {option.label}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {/* Camera controls */}
      <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-1.5">
        {[
          { icon: Plus, label: "Zoom in", action: () => sceneRef.current?.zoomBy(0.72) },
          { icon: Minus, label: "Zoom out", action: () => sceneRef.current?.zoomBy(1.38) },
          { icon: RotateCcw, label: "Reset view", action: () => sceneRef.current?.resetView() },
          { icon: Grid2x2, label: "Top view", action: () => sceneRef.current?.topView() },
          { icon: LayoutGrid, label: "3D view", action: () => sceneRef.current?.perspectiveView() },
          { icon: Expand, label: "Fit environment", action: () => sceneRef.current?.fitAll() },
          { icon: Maximize2, label: "Fullscreen", action: requestFullscreen },
        ].map(({ icon: Icon, label, action }) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            onClick={action}
            className="inline-flex size-9 items-center justify-center rounded-md border border-panel-border bg-panel-elevated/85 text-panel-foreground backdrop-blur transition-colors hover:bg-panel-elevated"
          >
            <Icon className="size-4" />
          </button>
        ))}
      </div>

      {/* Hover tooltip */}
      {hover && (hoveredWorker || hoveredGateway || hoveredZone) ? (
        <div
          className="pointer-events-none absolute z-20 w-56 rounded-lg border border-panel-border bg-panel-elevated/95 p-3 shadow-[var(--shadow-panel)] backdrop-blur"
          style={{
            left: Math.min(hover.x + 16, (containerRef.current?.clientWidth ?? 600) - 240),
            top: Math.max(8, hover.y - 60),
          }}
        >
          {hoveredWorker ? (
            <>
              <p className="label-caps text-panel-foreground">WORKER {hoveredWorker.workerId}</p>
              <dl className="mt-2 space-y-1 text-xs text-panel-muted">
                <Row label="Status" value={hoveredWorker.status} />
                <Row label="Zone" value={platform.getZone(hoveredWorker.zoneId)?.code ?? "—"} />
                <Row label="BPM" value={formatSensor(hoveredWorker.bpm)} />
                <Row label="SpO₂" value={formatSensor(hoveredWorker.spo2, "%")} />
                <Row label="Gas" value={formatSensor(hoveredWorker.gasPct, "%", 1)} />
              </dl>
            </>
          ) : null}
          {hoveredGateway ? (
            <>
              <p className="label-caps text-panel-foreground">GATEWAY {hoveredGateway.gatewayId}</p>
              <dl className="mt-2 space-y-1 text-xs text-panel-muted">
                <Row label="Status" value={hoveredGateway.status} />
                <Row label="Network" value={hoveredGateway.network} />
                <Row label="Signal" value={hoveredGateway.signal} />
              </dl>
            </>
          ) : null}
          {hoveredZone ? (
            <>
              <p className="label-caps text-panel-foreground">{hoveredZone.code}</p>
              <dl className="mt-2 space-y-1 text-xs text-panel-muted">
                <Row label="Area" value={hoveredZone.name} />
                <Row
                  label="Workers"
                  value={String(workers.filter((w) => w.zoneId === hoveredZone.zoneId).length)}
                />
              </dl>
            </>
          ) : null}
        </div>
      ) : null}

      {/* Selection detail panel */}
      {showDetails && selection ? (
        <div className="fade-up absolute top-3 right-3 z-30 w-72 rounded-lg border border-panel-border bg-panel-elevated/95 p-4 shadow-[var(--shadow-panel)] backdrop-blur sm:top-3 sm:right-3 md:right-48">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="label-caps text-panel-muted">
                {selection.kind === "worker"
                  ? "Worker"
                  : selection.kind === "gateway"
                    ? "Gateway"
                    : "Zone"}
              </p>
              <p className="text-base font-semibold text-panel-foreground">
                {selectedWorker?.workerId ?? selectedGateway?.gatewayId ?? selectedZone?.code}
              </p>
            </div>
            <button
              type="button"
              aria-label="Close panel"
              onClick={() => setSelection(null)}
              className="rounded-md p-1 text-panel-muted transition-colors hover:bg-panel hover:text-panel-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          {selectedWorker ? (
            <div className="mt-3 space-y-2 text-xs text-panel-muted">
              <StatusBadge status={selectedWorker.status} />
              <Row label="Name" value={selectedWorker.name} />
              <Row label="Role" value={selectedWorker.role} />
              <Row label="Zone" value={platform.getZone(selectedWorker.zoneId)?.name ?? "—"} />
              <Row label="BPM" value={formatSensor(selectedWorker.bpm)} />
              <Row label="SpO₂" value={formatSensor(selectedWorker.spo2, "%")} />
              <Row label="Temperature" value={formatSensor(selectedWorker.temperature, " °C", 1)} />
              <Row label="Humidity" value={formatSensor(selectedWorker.humidity, "%", 1)} />
              <Row label="Gas" value={formatSensor(selectedWorker.gasPct, "%", 1)} />
              <Row label="Fall alert" value={selectedWorker.fallAlert ? "YES" : "NO"} />
              <Row label="Network" value={selectedWorker.networkStatus} />
              <Row label="Last update" value={selectedWorker.lastSeen} />
              <Button
                className="mt-2 w-full"
                size="sm"
                onClick={() =>
                  navigate({
                    to: "/workers/$workerId",
                    params: { workerId: selectedWorker.workerId },
                  })
                }
              >
                View full profile
              </Button>
            </div>
          ) : null}

          {selectedGateway ? (
            <div className="mt-3 space-y-2 text-xs text-panel-muted">
              <StatusBadge status={selectedGateway.status} />
              <Row label="Name" value={selectedGateway.name} />
              <Row label="Network" value={selectedGateway.network} />
              <Row label="Signal" value={selectedGateway.signal} />
              <Row label="Connected workers" value={String(gatewayWorkers.length)} />
              <Row
                label="Active links"
                value={String(
                  gatewayWorkers.filter((w) => w.networkStatus !== "DISCONNECTED").length,
                )}
              />
              <Row
                label="Offline links"
                value={String(
                  gatewayWorkers.filter((w) => w.networkStatus === "DISCONNECTED").length,
                )}
              />
              <Row label="Last data" value={selectedGateway.lastData} />
              <Button
                className="mt-2 w-full"
                size="sm"
                variant="secondary"
                onClick={() => navigate({ to: "/network" })}
              >
                View network
              </Button>
            </div>
          ) : null}

          {selectedZone ? (
            <div className="mt-3 space-y-2 text-xs text-panel-muted">
              <p className="text-panel-foreground">{selectedZone.name}</p>
              <p>{selectedZone.description}</p>
              <Row label="Workers" value={String(zoneWorkers.length)} />
              <Row
                label="Status"
                value={
                  zoneWorkers.some((w) => w.status === "CRITICAL")
                    ? "CRITICAL"
                    : zoneWorkers.some((w) => w.status === "WARNING")
                      ? "WARNING"
                      : "NORMAL"
                }
              />
              <Row
                label="Active alerts"
                value={String(
                  alerts.filter((a) => a.zoneId === selectedZone.zoneId && a.status === "ACTIVE")
                    .length,
                )}
              />
              <Row label="Gateway" value={selectedZone.gatewayId} />
              <Button
                className="mt-2 w-full"
                size="sm"
                variant="secondary"
                onClick={() => focus({ kind: "zone", id: selectedZone.zoneId })}
              >
                <Crosshair className="size-3.5" /> Inspect zone
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-panel-muted">{label}</dt>
      <dd className="numeric text-right text-panel-foreground">{value}</dd>
    </div>
  );
}
