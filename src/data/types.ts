/**
 * Domain model for the Arogya Kavach platform.
 *
 * These types are provider-agnostic: today they are filled by the mock
 * provider, later by a Google Apps Script / Google Sheets provider.
 *
 * Sensor readings use `number | null`. `null` means "sensor unavailable"
 * (the physical node reports 0 in that case) and must never be rendered
 * as a real measurement.
 */

export type SafetyStatus = "NORMAL" | "WARNING" | "CRITICAL" | "OFFLINE";
export type NetworkStatus = "CONNECTED" | "WEAK" | "DISCONNECTED";
export type SystemStatus = "ONLINE" | "DEGRADED" | "OFFLINE";
export type SiteStatus = "NORMAL" | "WARNING" | "CRITICAL";
export type UserRole = "ADMIN" | "SAFETY_SUPERVISOR" | "OPERATOR";

export type SensorValue = number | null;

export interface Worker {
  workerId: string;
  name: string;
  role: string;
  zoneId: string;
  gatewayId: string;
  /** Real-world position reported by the node. */
  latitude: SensorValue;
  longitude: SensorValue;
  /** Virtual-environment coordinates (see lib/coordinateMapping). */
  x: number;
  y: number;
  z: number;
  status: SafetyStatus;
  bpm: SensorValue;
  spo2: SensorValue;
  temperature: SensorValue;
  humidity: SensorValue;
  gasRaw: SensorValue;
  gasPct: SensorValue;
  fallAlert: boolean;
  battery: number;
  lastSeen: string;
  networkStatus: NetworkStatus;
}

export interface Zone {
  zoneId: string;
  code: string;
  name: string;
  description: string;
  /** Footprint in virtual environment units. */
  x: number;
  z: number;
  width: number;
  depth: number;
  underground: boolean;
  gatewayId: string;
}

export interface Gateway {
  gatewayId: string;
  name: string;
  zoneId: string;
  x: number;
  y: number;
  z: number;
  status: "ONLINE" | "DEGRADED" | "OFFLINE";
  network: string;
  signal: "GOOD" | "FAIR" | "POOR";
  lastData: string;
}

export type AlertType =
  | "FALL DETECTED"
  | "GAS HAZARD"
  | "HEALTH ANOMALY"
  | "SOS / EMERGENCY"
  | "NETWORK LOSS"
  | "WORKER OFFLINE"
  | "ENVIRONMENTAL WARNING";

export type AlertSeverity = "CRITICAL" | "WARNING" | "INFO";
export type AlertState = "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED";

export interface SafetyAlert {
  alertId: string;
  workerId: string;
  zoneId: string;
  type: AlertType;
  severity: AlertSeverity;
  timestamp: string;
  status: AlertState;
  note: string;
}

export interface SensorSample {
  time: string;
  bpm: SensorValue;
  spo2: SensorValue;
  temperature: SensorValue;
  humidity: SensorValue;
  gasPct: SensorValue;
}

export interface PlatformUser {
  username: string;
  displayName: string;
  role: UserRole;
  status: "ACTIVE" | "SUSPENDED";
  lastLogin: string;
}

export interface Site {
  siteId: string;
  name: string;
  systemStatus: SystemStatus;
}

export interface Snapshot {
  site: Site;
  workers: Worker[];
  zones: Zone[];
  gateways: Gateway[];
  alerts: SafetyAlert[];
  updatedAt: string;
}
