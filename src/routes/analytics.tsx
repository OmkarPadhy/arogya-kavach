import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, AlertTriangle, HeartPulse, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/layout/AppShell";
import { usePlatform } from "@/state/platform";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Safety Analytics · Arogya Kavach" },
      {
        name: "description",
        content:
          "Trends across incidents, vitals, gas exposure and zone risk for the connected worker safety mesh.",
      },
      { property: "og:title", content: "Safety Analytics · Arogya Kavach" },
      {
        property: "og:description",
        content: "Incident trends, vitals distribution and zone risk scoring for site supervisors.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});

const TONE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function AnalyticsPage() {
  const platform = usePlatform();
  const { workers, zones, alerts } = platform;

  const alertsByType = useMemo(() => {
    const counts = new Map<string, number>();
    alerts.forEach((alert) => counts.set(alert.type, (counts.get(alert.type) ?? 0) + 1));
    return [...counts.entries()].map(([name, value]) => ({ name, value }));
  }, [alerts]);

  const statusMix = useMemo(() => {
    const counts = { NORMAL: 0, WARNING: 0, CRITICAL: 0, OFFLINE: 0 };
    workers.forEach((worker) => {
      counts[worker.status] += 1;
    });
    return [...Object.entries(counts)].map(([name, value]) => ({ name, value }));
  }, [workers]);

  const zoneRisk = useMemo(
    () =>
      zones.map((zone) => {
        const zoneWorkers = workers.filter((worker) => worker.zoneId === zone.zoneId);
        const zoneAlerts = alerts.filter(
          (alert) => alert.zoneId === zone.zoneId && alert.status !== "RESOLVED",
        );
        const risk =
          zoneAlerts.filter((a) => a.severity === "CRITICAL").length * 30 +
          zoneAlerts.filter((a) => a.severity === "WARNING").length * 15 +
          zoneWorkers.filter((w) => w.status === "CRITICAL").length * 20 +
          zoneWorkers.filter((w) => w.status === "WARNING").length * 10;
        return {
          name: zone.code,
          risk: Math.min(100, risk),
          workers: zoneWorkers.length,
        };
      }),
    [zones, workers, alerts],
  );

  const vitals = useMemo(
    () =>
      workers
        .filter((worker) => worker.bpm != null)
        .map((worker) => ({
          name: worker.workerId,
          bpm: worker.bpm ?? 0,
          spo2: worker.spo2 ?? 0,
          gas: worker.gasPct ?? 0,
        })),
    [workers],
  );

  const shiftTrend = useMemo(() => {
    // Derived from the current alert log, bucketed by hour of the shift.
    const buckets = new Map<string, { hour: string; alerts: number; critical: number }>();
    alerts.forEach((alert) => {
      const hour = `${alert.timestamp.slice(0, 2)}:00`;
      const entry = buckets.get(hour) ?? { hour, alerts: 0, critical: 0 };
      entry.alerts += 1;
      if (alert.severity === "CRITICAL") entry.critical += 1;
      buckets.set(hour, entry);
    });
    return [...buckets.values()].sort((a, b) => a.hour.localeCompare(b.hour));
  }, [alerts]);

  const avg = (values: number[]) =>
    values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : 0;

  return (
    <AppShell
      title="Safety Analytics"
      subtitle="Trends across incidents, vitals and zone exposure"
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={AlertTriangle}
          label="Total incidents"
          value={alerts.length}
          hint={`${platform.stats.resolvedAlerts} resolved`}
        />
        <Metric
          icon={HeartPulse}
          label="Average heart rate"
          value={`${avg(vitals.map((v) => v.bpm))} bpm`}
          hint="Across reporting nodes"
        />
        <Metric
          icon={Activity}
          label="Average SpO₂"
          value={`${avg(vitals.map((v) => v.spo2))}%`}
          hint="Across reporting nodes"
        />
        <Metric
          icon={TrendingUp}
          label="Peak gas level"
          value={`${vitals.length ? Math.max(...vitals.map((v) => v.gas)) : 0}%`}
          hint="Highest node reading"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Incident trend by shift hour">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={shiftTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="hour" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--popover-foreground)",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="alerts"
                stroke="var(--chart-1)"
                fill="var(--chart-1)"
                fillOpacity={0.18}
              />
              <Area
                type="monotone"
                dataKey="critical"
                stroke="var(--chart-4)"
                fill="var(--chart-4)"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Zone risk score">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={zoneRisk}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--popover-foreground)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="risk" radius={[6, 6, 0, 0]}>
                {zoneRisk.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={entry.risk > 50 ? "var(--chart-4)" : TONE[index % TONE.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Vitals by node">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={vitals}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--popover-foreground)",
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="bpm" stroke="var(--chart-4)" dot={false} />
              <Line type="monotone" dataKey="spo2" stroke="var(--chart-2)" dot={false} />
              <Line type="monotone" dataKey="gas" stroke="var(--chart-3)" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Alert mix and workforce status">
          <div className="grid gap-2 sm:grid-cols-2">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--popover-foreground)",
                    fontSize: 12,
                  }}
                />
                <Pie data={alertsByType} dataKey="value" nameKey="name" outerRadius={80}>
                  {alertsByType.map((entry, index) => (
                    <Cell key={entry.name} fill={TONE[index % TONE.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <ul className="space-y-2 self-center text-xs">
              {statusMix.map((entry, index) => (
                <li key={entry.name} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2.5 rounded-full"
                      style={{ background: TONE[index % TONE.length] }}
                    />
                    {entry.name}
                  </span>
                  <span className="numeric font-medium">{entry.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Activity;
  label: string;
  value: string | number;
  hint: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="label-caps flex items-center gap-2 text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className="numeric mt-2 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-[var(--shadow-card)]">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {children}
    </section>
  );
}
