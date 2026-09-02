import { createFileRoute } from "@tanstack/react-router";
import { Boxes, Cpu, Radio, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { usePlatform } from "@/state/platform";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About the Platform · Arogya Kavach" },
      {
        name: "description",
        content:
          "How Arogya Kavach connects helmet sensor nodes, LoRa gateways and the 3D control room view.",
      },
      { property: "og:title", content: "About the Platform · Arogya Kavach" },
      {
        property: "og:description",
        content: "Architecture, hardware stack and data flow behind the worker safety platform.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AboutPage,
});

const pipeline = [
  {
    icon: Cpu,
    title: "Helmet node",
    body: "ESP32 with MAX30102 pulse oximetry, MPU6050 fall detection, DHT22 climate and MQ-series gas sensing. Unavailable sensors report null, never a fabricated zero.",
  },
  {
    icon: Radio,
    title: "LoRa gateway",
    body: "865 MHz concentrators bridge underground and surface zones, forwarding node packets with link quality and last-seen timestamps.",
  },
  {
    icon: Boxes,
    title: "Virtual environment",
    body: "Live positions map into a 3D site twin with zones, alert columns and data-flow particles for instant spatial awareness.",
  },
  {
    icon: ShieldCheck,
    title: "Response workflow",
    body: "Alerts are triaged by severity, acknowledged and resolved with a full audit trail per worker and zone.",
  },
];

function AboutPage() {
  const platform = usePlatform();

  return (
    <AppShell title="About" subtitle="Platform architecture and data flow">
      <div className="grid gap-4 xl:grid-cols-3">
        <section className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)] xl:col-span-2">
          <h2 className="text-base font-semibold">Arogya Kavach</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Arogya Kavach is a connected worker safety platform for industrial and underground
            sites. It streams vitals, environment and location telemetry from helmet-mounted sensor
            nodes into a live 3D control room, so supervisors can see who is at risk, where they
            are, and how the mesh is performing — in one view.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {pipeline.map((item) => (
              <div key={item.title} className="rounded-lg border p-3">
                <p className="flex items-center gap-2 text-sm font-medium">
                  <item.icon className="size-4 text-primary" /> {item.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="text-sm font-semibold">Deployment</h2>
          <dl className="mt-3 space-y-2 text-xs">
            <Row label="Site" value={platform.snapshot?.site.name ?? "—"} />
            <Row label="Zones" value={platform.zones.length} />
            <Row label="Gateways" value={platform.gateways.length} />
            <Row label="Helmet nodes" value={platform.workers.length} />
            <Row
              label="Wired devices"
              value={`${platform.liveDeviceCount} live / ${platform.gateways.length}`}
            />
            <Row label="Last device sync" value={platform.lastDeviceSync ?? "Not synced"} />
            <Row label="Version" value="1.0.0 · prototype" />
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Telemetry is simulated until a gateway is wired to a real device endpoint in System
            Settings. Once wired, live readings replace the simulated stream for that gateway's
            nodes.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="numeric font-medium">{value}</dd>
    </div>
  );
}
