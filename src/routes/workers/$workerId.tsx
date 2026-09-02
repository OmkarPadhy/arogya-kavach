import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, BatteryMedium, Crosshair, Radio } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  SensorReadout,
  StatusBadge,
  formatSensor,
} from "@/components/common/status";
import { dataService } from "@/services/dataService";
import { formatCoordinate } from "@/lib/coordinateMapping";
import { usePlatform } from "@/state/platform";
import type { SensorSample } from "@/data/types";

export const Route = createFileRoute("/workers/$workerId")({
  head: ({ params }) => ({
    meta: [
      { title: `Worker ${params.workerId} · Arogya Kavach` },
      {
        name: "description",
        content: `Full safety profile for worker node ${params.workerId}: vitals, environment, gas exposure, position and history.`,
      },
      { property: "og:title", content: `Worker ${params.workerId} profile` },
      {
        property: "og:description",
        content: "Sensor readings, historical trends and location for a monitored worker node.",
      },
    ],
  }),
  component: WorkerProfilePage,
});

function WorkerProfilePage() {
  const { workerId } = useParams({ from: "/workers/$workerId" });
  const platform = usePlatform();
  const navigate = useNavigate();
  const worker = platform.getWorker(workerId);
  const [history, setHistory] = useState<SensorSample[]>([]);

  useEffect(() => {
    let cancelled = false;
    void dataService.getSensorHistory(workerId).then((samples) => {
      if (!cancelled) setHistory(samples);
    });
    return () => {
      cancelled = true;
    };
  }, [workerId]);

  if (!worker) {
    return (
      <AppShell title="Worker profile">
        <EmptyState
          title="Worker not found"
          description="This worker node is not registered on the current site snapshot."
        />
      </AppShell>
    );
  }

  const zone = platform.getZone(worker.zoneId);
  const alerts = platform.alerts.filter((alert) => alert.workerId === worker.workerId);
  const noData = worker.bpm === null && worker.spo2 === null;

  return (
    <AppShell
      title={`Worker ${worker.workerId}`}
      subtitle={`${worker.name} · ${worker.role}`}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/workers" })}>
            <ArrowLeft className="size-4" /> Roster
          </Button>
          <Button
            size="sm"
            onClick={() => {
              platform.focus({ kind: "worker", id: worker.workerId });
              void navigate({ to: "/environment" });
            }}
          >
            <Crosshair className="size-4" /> Locate in environment
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center gap-3">
              <StatusBadge status={worker.status} />
              <StatusBadge status={worker.networkStatus} />
              <span className="numeric text-xs text-muted-foreground">
                Last update {worker.lastSeen}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <BatteryMedium className="size-4" /> {worker.battery}%
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Radio className="size-4" /> {worker.gatewayId}
              </span>
              <span className="text-xs text-muted-foreground">
                {zone ? `${zone.code} · ${zone.name}` : worker.zoneId}
              </span>
            </div>

            {noData ? (
              <div className="mt-4 rounded-lg border border-warn/30 bg-warn-soft px-4 py-3">
                <p className="label-caps text-warn">No sensor data</p>
                <p className="mt-1 text-sm text-foreground/80">
                  The worker node has not reported valid sensor data. Last communication:{" "}
                  <span className="numeric">{worker.lastSeen}</span>.
                </p>
              </div>
            ) : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <SensorReadout
                label="BPM"
                value={worker.bpm}
                hint="Heart rate"
                tone={worker.bpm && worker.bpm > 110 ? "crit" : worker.bpm && worker.bpm > 95 ? "warn" : undefined}
              />
              <SensorReadout
                label="SpO₂"
                value={worker.spo2}
                unit="%"
                hint="Oxygen saturation"
                tone={worker.spo2 && worker.spo2 < 92 ? "crit" : undefined}
              />
              <SensorReadout
                label="Temperature"
                value={worker.temperature}
                unit=" °C"
                digits={1}
                hint="Ambient / body"
              />
              <SensorReadout label="Humidity" value={worker.humidity} unit="%" digits={1} hint="Ambient" />
              <SensorReadout label="Gas raw" value={worker.gasRaw} hint="ADC counts" />
              <SensorReadout
                label="Gas"
                value={worker.gasPct}
                unit="%"
                digits={1}
                hint="Concentration"
                tone={worker.gasPct && worker.gasPct > 20 ? "warn" : undefined}
              />
              <div className="rounded-lg border bg-card p-4 shadow-[var(--shadow-card)]">
                <p className="label-caps text-muted-foreground">Fall alert</p>
                <p
                  className={
                    "numeric mt-2 text-2xl font-semibold " +
                    (worker.fallAlert ? "text-crit" : "text-foreground")
                  }
                >
                  {worker.fallAlert ? "YES" : "NO"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Helmet IMU</p>
              </div>
              <div className="rounded-lg border bg-card p-4 shadow-[var(--shadow-card)]">
                <p className="label-caps text-muted-foreground">Battery</p>
                <p className="numeric mt-2 text-2xl font-semibold">{worker.battery}%</p>
                <p className="mt-1 text-xs text-muted-foreground">Node power</p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
            <h2 className="mb-1 text-sm font-semibold">Sensor history</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Last 4 hours of recorded telemetry for this node.
            </p>
            {history.length === 0 ? (
              <EmptyState
                title="No history"
                description="No historical records are available for this worker node yet."
              />
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                <HistoryChart title="Heart rate (BPM)" data={history} dataKey="bpm" color="var(--chart-1)" />
                <HistoryChart title="SpO₂ (%)" data={history} dataKey="spo2" color="var(--chart-2)" domain={[85, 100]} />
                <HistoryChart title="Temperature (°C)" data={history} dataKey="temperature" color="var(--chart-3)" />
                <HistoryChart title="Humidity (%)" data={history} dataKey="humidity" color="var(--chart-5)" />
                <HistoryChart title="Gas (%)" data={history} dataKey="gasPct" color="var(--chart-4)" area />
              </div>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
            <h2 className="mb-3 text-sm font-semibold">Location</h2>
            <dl className="space-y-2 text-sm">
              <Row label="Latitude" value={formatCoordinate(worker.latitude, "lat")} />
              <Row label="Longitude" value={formatCoordinate(worker.longitude, "lng")} />
              <Row label="Current zone" value={zone ? `${zone.code} · ${zone.name}` : "—"} />
              <Row
                label="Scene position"
                value={`x ${worker.x} · y ${worker.y} · z ${worker.z}`}
              />
            </dl>
            {worker.latitude === null ? (
              <p className="mt-3 text-xs text-muted-foreground">
                Position sensor unavailable — the last known zone is shown instead.
              </p>
            ) : null}
            <Button
              className="mt-3 w-full"
              variant="secondary"
              size="sm"
              onClick={() => {
                platform.focus({ kind: "worker", id: worker.workerId });
                void navigate({ to: "/environment" });
              }}
            >
              <Crosshair className="size-4" /> Locate in environment
            </Button>
          </section>

          <section className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
            <h2 className="mb-3 text-sm font-semibold">Incidents for this worker</h2>
            {alerts.length === 0 ? (
              <EmptyState title="No incidents" description="No alerts recorded for this node." />
            ) : (
              <ul className="space-y-2">
                {alerts.map((alert) => (
                  <li key={alert.alertId} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{alert.type}</span>
                      <StatusBadge status={alert.status} />
                    </div>
                    <p className="numeric mt-1 text-xs text-muted-foreground">
                      {alert.alertId} · {alert.timestamp}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="numeric text-right">{value}</dd>
    </div>
  );
}

function HistoryChart({
  title,
  data,
  dataKey,
  color,
  domain,
  area = false,
}: {
  title: string;
  data: SensorSample[];
  dataKey: keyof SensorSample;
  color: string;
  domain?: [number, number] | undefined;
  area?: boolean | undefined;
}) {
  const values = data
    .map((sample) => sample[dataKey])
    .filter((value): value is number => typeof value === "number");
  const current = values.at(-1);
  const min = values.length ? Math.min(...values) : null;
  const max = values.length ? Math.max(...values) : null;

  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-baseline justify-between">
        <p className="label-caps text-muted-foreground">{title}</p>
        <p className="numeric text-sm font-semibold">
          {current !== undefined ? current.toFixed(1) : "—"}
        </p>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          {area ? (
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={11} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" domain={domain ?? ["auto", "auto"]} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Area type="monotone" dataKey={dataKey} stroke={color} fill={color} fillOpacity={0.18} strokeWidth={2} connectNulls />
            </AreaChart>
          ) : (
            <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={11} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" domain={domain ?? ["auto", "auto"]} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} connectNulls />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
      <p className="numeric mt-2 text-[11px] text-muted-foreground">
        min {min?.toFixed(1) ?? "—"} · max {max?.toFixed(1) ?? "—"}
      </p>
    </div>
  );
}
