import { cn } from "@/lib/utils";
import type {
  AlertSeverity,
  AlertState,
  NetworkStatus,
  SafetyStatus,
  SensorValue,
  SiteStatus,
  SystemStatus,
} from "@/data/types";

type Tone = "ok" | "warn" | "crit" | "offline" | "info";

const toneClasses: Record<Tone, string> = {
  ok: "bg-ok-soft text-ok border-ok/25",
  warn: "bg-warn-soft text-warn border-warn/30",
  crit: "bg-crit-soft text-crit border-crit/25",
  offline: "bg-offline-soft text-muted-foreground border-border",
  info: "bg-info-soft text-primary border-primary/20",
};

const dotClasses: Record<Tone, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  crit: "bg-crit",
  offline: "bg-offline",
  info: "bg-primary",
};

export function statusTone(
  status: SafetyStatus | SystemStatus | SiteStatus | NetworkStatus | AlertSeverity | AlertState,
): Tone {
  switch (status) {
    case "NORMAL":
    case "ONLINE":
    case "CONNECTED":
    case "RESOLVED":
      return "ok";
    case "WARNING":
    case "DEGRADED":
    case "WEAK":
    case "ACKNOWLEDGED":
      return "warn";
    case "CRITICAL":
      return "crit";
    case "OFFLINE":
    case "DISCONNECTED":
      return "offline";
    default:
      return "info";
  }
}

export function StatusDot({
  tone,
  pulse,
}: {
  tone: Tone;
  pulse?: boolean | undefined;
}) {
  return (
    <span
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        dotClasses[tone],
        pulse && "pulse-crit",
      )}
    />
  );
}

export function StatusPill({
  label,
  tone,
  className,
  pulse,
}: {
  label: string;
  tone: Tone;
  className?: string | undefined;
  pulse?: boolean | undefined;
}) {
  return (
    <span
      className={cn(
        "label-caps inline-flex items-center gap-1.5 rounded-md border px-2 py-1",
        toneClasses[tone],
        className,
      )}
    >
      <StatusDot tone={tone} pulse={pulse} />
      {label}
    </span>
  );
}

export function StatusBadge({
  status,
  className,
}: {
  status: SafetyStatus | SystemStatus | SiteStatus | NetworkStatus | AlertSeverity | AlertState;
  className?: string | undefined;
}) {
  const tone = statusTone(status);
  return (
    <StatusPill
      label={status}
      tone={tone}
      className={className}
      pulse={tone === "crit"}
    />
  );
}

/** Formats a sensor reading, distinguishing unavailable sensors from real zeros. */
export function formatSensor(value: SensorValue, unit = "", digits = 0) {
  if (value === null || value === undefined) return "—";
  return `${value.toFixed(digits)}${unit}`;
}

export function SensorReadout({
  label,
  value,
  unit = "",
  digits = 0,
  hint,
  tone,
}: {
  label: string;
  value: SensorValue;
  unit?: string | undefined;
  digits?: number | undefined;
  hint?: string | undefined;
  tone?: Tone | undefined;
}) {
  const unavailable = value === null || value === undefined;
  return (
    <div className="rounded-lg border bg-card p-4 shadow-[var(--shadow-card)]">
      <p className="label-caps text-muted-foreground">{label}</p>
      <p
        className={cn(
          "numeric mt-2 text-2xl font-semibold",
          unavailable && "text-muted-foreground",
          !unavailable && tone === "warn" && "text-warn",
          !unavailable && tone === "crit" && "text-crit",
        )}
      >
        {formatSensor(value, unit, digits)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {unavailable ? "Sensor unavailable" : (hint ?? "\u00a0")}
      </p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode | undefined;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card/60 px-6 py-12 text-center">
      {icon ? <div className="mb-3 text-muted-foreground">{icon}</div> : null}
      <p className="label-caps text-foreground">{title}</p>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
