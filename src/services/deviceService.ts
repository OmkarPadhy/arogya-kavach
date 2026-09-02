import type { Worker } from "@/data/types";

/**
 * Gateway → real device wiring.
 *
 * Each gateway can be bound to a physical device endpoint (an ESP32/LoRa
 * bridge, an Apps Script relay, or any HTTP source) that returns telemetry.
 * Bindings are stored locally so the prototype can be pointed at real
 * hardware without a backend deploy.
 */

export type DeviceMode = "MOCK" | "LIVE";
export type DeviceProtocol = "HTTP_JSON" | "GOOGLE_SHEETS" | "MQTT_BRIDGE";

export interface DeviceBinding {
  gatewayId: string;
  mode: DeviceMode;
  protocol: DeviceProtocol;
  endpoint: string;
  deviceId: string;
  pollSeconds: number;
  authHeader?: string;
}

export interface DeviceReading {
  workerId: string;
  bpm?: number | null;
  spo2?: number | null;
  temperature?: number | null;
  humidity?: number | null;
  gasPct?: number | null;
  battery?: number | null;
  fallAlert?: boolean;
  lat?: number | null;
  long?: number | null;
}

export interface DeviceTestResult {
  ok: boolean;
  message: string;
  latencyMs?: number;
  sampleCount?: number;
}

const BINDINGS_KEY = "arogya-kavach.device-bindings";

export function defaultBinding(gatewayId: string): DeviceBinding {
  return {
    gatewayId,
    mode: "MOCK",
    protocol: "HTTP_JSON",
    endpoint: "",
    deviceId: "",
    pollSeconds: 5,
  };
}

export function loadBindings(): Record<string, DeviceBinding> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(BINDINGS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, DeviceBinding>) : {};
  } catch {
    return {};
  }
}

export function saveBindings(bindings: Record<string, DeviceBinding>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(BINDINGS_KEY, JSON.stringify(bindings));
}

function headers(binding: DeviceBinding): HeadersInit {
  return binding.authHeader
    ? { Accept: "application/json", Authorization: binding.authHeader }
    : { Accept: "application/json" };
}

function normalise(payload: unknown): DeviceReading[] {
  const rows = Array.isArray(payload)
    ? payload
    : ((payload as { readings?: unknown[]; data?: unknown[] })?.readings ??
      (payload as { data?: unknown[] })?.data ??
      []);
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row) => row as Record<string, unknown>)
    .filter((row) => typeof row["workerId"] === "string" || typeof row["worker_id"] === "string")
    .map((row) => {
      const num = (key: string) => {
        const value = row[key];
        return typeof value === "number" ? value : value == null ? null : Number(value);
      };
      return {
        workerId: String(row["workerId"] ?? row["worker_id"]),
        bpm: num("bpm"),
        spo2: num("spo2"),
        temperature: num("temperature"),
        humidity: num("humidity"),
        gasPct: num("gasPct"),
        battery: num("battery"),
        fallAlert: Boolean(row["fallAlert"]),
        lat: num("lat"),
        long: num("long"),
      } satisfies DeviceReading;
    });
}

export async function testBinding(binding: DeviceBinding): Promise<DeviceTestResult> {
  if (!binding.endpoint.trim()) return { ok: false, message: "Endpoint URL is required." };
  const started = performance.now();
  try {
    const response = await fetch(binding.endpoint, { headers: headers(binding) });
    const latencyMs = Math.round(performance.now() - started);
    if (!response.ok)
      return { ok: false, message: `Device responded ${response.status}.`, latencyMs };
    const readings = normalise(await response.json());
    return {
      ok: true,
      message: readings.length
        ? `Connected — ${readings.length} node reading(s) received.`
        : "Connected, but no recognisable node readings in the payload.",
      latencyMs,
      sampleCount: readings.length,
    };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Device unreachable.",
    };
  }
}

export async function fetchDeviceReadings(binding: DeviceBinding): Promise<DeviceReading[]> {
  if (binding.mode !== "LIVE" || !binding.endpoint.trim()) return [];
  try {
    const response = await fetch(binding.endpoint, { headers: headers(binding) });
    if (!response.ok) return [];
    return normalise(await response.json());
  } catch {
    return [];
  }
}

/** Merge live device readings onto the current worker list. */
export function mergeReadings(workers: Worker[], readings: DeviceReading[]): Worker[] {
  if (!readings.length) return workers;
  const byId = new Map(readings.map((reading) => [reading.workerId, reading]));
  return workers.map((worker) => {
    const reading = byId.get(worker.workerId);
    if (!reading) return worker;
    const next: Worker = { ...worker };
    if (reading.bpm != null && !Number.isNaN(reading.bpm)) next.bpm = reading.bpm;
    if (reading.spo2 != null && !Number.isNaN(reading.spo2)) next.spo2 = reading.spo2;
    if (reading.temperature != null && !Number.isNaN(reading.temperature))
      next.temperature = reading.temperature;
    if (reading.humidity != null && !Number.isNaN(reading.humidity))
      next.humidity = reading.humidity;
    if (reading.gasPct != null && !Number.isNaN(reading.gasPct)) next.gasPct = reading.gasPct;
    if (reading.battery != null && !Number.isNaN(reading.battery)) next.battery = reading.battery;
    if (reading.lat != null && !Number.isNaN(reading.lat)) next.latitude = reading.lat;
    if (reading.long != null && !Number.isNaN(reading.long)) next.longitude = reading.long;

    if (typeof reading.fallAlert === "boolean") next.fallAlert = reading.fallAlert;
    next.networkStatus = "CONNECTED";
    return next;
  });
}
