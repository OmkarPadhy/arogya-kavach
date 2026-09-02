import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Crosshair, Search } from "lucide-react";

import { AppShell } from "@/components/layout/AppShell";
import { Input } from "@/components/ui/input";
import { EmptyState, StatusBadge, formatSensor } from "@/components/common/status";
import { usePlatform } from "@/state/platform";
import type { SafetyStatus } from "@/data/types";

export const Route = createFileRoute("/workers/")({
  head: () => ({
    meta: [
      { title: "Worker Monitoring · Arogya Kavach" },
      {
        name: "description",
        content:
          "Live roster of monitored workers with vitals, gas exposure, fall alerts, network state and last contact.",
      },
      { property: "og:title", content: "Worker Monitoring · Arogya Kavach" },
      {
        property: "og:description",
        content: "Search, filter and locate every helmet node reporting to the safety platform.",
      },
    ],
  }),
  component: WorkersPage,
});

type SortKey = "workerId" | "status" | "bpm" | "lastSeen";

export function WorkersPage() {
  const platform = usePlatform();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"ALL" | SafetyStatus>("ALL");
  const [zone, setZone] = useState("ALL");
  const [sort, setSort] = useState<SortKey>("workerId");

  const rows = useMemo(() => {
    const filtered = platform.workers.filter((worker) => {
      const matchesQuery =
        !query ||
        worker.workerId.toLowerCase().includes(query.toLowerCase()) ||
        worker.name.toLowerCase().includes(query.toLowerCase());
      const matchesStatus = status === "ALL" || worker.status === status;
      const matchesZone = zone === "ALL" || worker.zoneId === zone;
      return matchesQuery && matchesStatus && matchesZone;
    });

    const rank: Record<SafetyStatus, number> = {
      CRITICAL: 0,
      WARNING: 1,
      OFFLINE: 2,
      NORMAL: 3,
    };

    return [...filtered].sort((a, b) => {
      if (sort === "status") return rank[a.status] - rank[b.status];
      if (sort === "bpm") return (b.bpm ?? -1) - (a.bpm ?? -1);
      if (sort === "lastSeen") return b.lastSeen.localeCompare(a.lastSeen);
      return a.workerId.localeCompare(b.workerId);
    });
  }, [platform.workers, query, status, zone, sort]);

  return (
    <AppShell
      title="Worker Monitoring"
      subtitle={`${platform.workers.length} helmet nodes registered on this site`}
    >
      <div className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search worker ID or name"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          <Select value={status} onChange={(value) => setStatus(value as "ALL" | SafetyStatus)}>
            <option value="ALL">All statuses</option>
            <option value="NORMAL">Normal</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
            <option value="OFFLINE">Offline</option>
          </Select>

          <Select value={zone} onChange={setZone}>
            <option value="ALL">All zones</option>
            {platform.zones.map((item) => (
              <option key={item.zoneId} value={item.zoneId}>
                {item.code} · {item.name}
              </option>
            ))}
          </Select>

          <Select value={sort} onChange={(value) => setSort(value as SortKey)}>
            <option value="workerId">Sort: Worker ID</option>
            <option value="status">Sort: Severity</option>
            <option value="bpm">Sort: BPM</option>
            <option value="lastSeen">Sort: Last seen</option>
          </Select>
        </div>

        {rows.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No workers found"
              description="No monitored worker matches the current search and filter combination."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="label-caps border-b text-left text-muted-foreground">
                  {[
                    "Worker",
                    "Name",
                    "Zone",
                    "Status",
                    "BPM",
                    "SpO₂",
                    "Temp",
                    "Gas",
                    "Fall",
                    "Network",
                    "Last seen",
                    "",
                  ].map((heading) => (
                    <th key={heading} className="px-4 py-2 whitespace-nowrap">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((worker) => (
                  <tr
                    key={worker.workerId}
                    className="cursor-pointer border-b transition-colors last:border-0 hover:bg-accent/40"
                    onClick={() =>
                      navigate({
                        to: "/workers/$workerId",
                        params: { workerId: worker.workerId },
                      })
                    }
                  >
                    <td className="numeric px-4 py-2 font-medium">{worker.workerId}</td>
                    <td className="px-4 py-2 whitespace-nowrap">{worker.name}</td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {platform.getZone(worker.zoneId)?.code}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={worker.status} />
                    </td>
                    <td className="numeric px-4 py-2">{formatSensor(worker.bpm)}</td>
                    <td className="numeric px-4 py-2">{formatSensor(worker.spo2, "%")}</td>
                    <td className="numeric px-4 py-2">
                      {formatSensor(worker.temperature, "°C", 1)}
                    </td>
                    <td className="numeric px-4 py-2">{formatSensor(worker.gasPct, "%", 1)}</td>
                    <td className="px-4 py-2">
                      <span className={worker.fallAlert ? "font-semibold text-crit" : ""}>
                        {worker.fallAlert ? "YES" : "NO"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {worker.networkStatus}
                    </td>
                    <td className="numeric px-4 py-2 text-xs text-muted-foreground">
                      {worker.lastSeen}
                    </td>
                    <td className="px-4 py-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          platform.focus({ kind: "worker", id: worker.workerId });
                          void navigate({ to: "/environment" });
                        }}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors hover:bg-accent"
                      >
                        <Crosshair className="size-3" /> Locate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 rounded-md border bg-background px-3 text-sm"
    >
      {children}
    </select>
  );
}
