import type {
  Gateway,
  PlatformUser,
  SafetyAlert,
  SensorSample,
  Site,
  Worker,
  Zone,
} from "./types";

/**
 * Centralized mock dataset for the "Arogya Industrial Site" demo.
 * Everything the UI shows originates here (through the data service),
 * so this file is the single thing that gets swapped for live data later.
 */

export const mockSite: Site = {
  siteId: "SITE-01",
  name: "Arogya Industrial Site",
  systemStatus: "ONLINE",
};

export const mockZones: Zone[] = [
  {
    zoneId: "Z-E",
    code: "ZONE E",
    name: "Entry / Exit",
    description: "Surface muster point, check-in and emergency assembly area.",
    x: -48,
    z: 4,
    width: 22,
    depth: 26,
    underground: false,
    gatewayId: "G-002",
  },
  {
    zoneId: "Z-A",
    code: "ZONE A",
    name: "Primary Work Area",
    description: "Main surface operations floor with processing equipment.",
    x: -16,
    z: -18,
    width: 34,
    depth: 28,
    underground: false,
    gatewayId: "G-002",
  },
  {
    zoneId: "Z-B",
    code: "ZONE B",
    name: "Tunnel / Production Area",
    description: "Underground production drift served by the primary gateway.",
    x: 18,
    z: 8,
    width: 46,
    depth: 18,
    underground: true,
    gatewayId: "G-001",
  },
  {
    zoneId: "Z-C",
    code: "ZONE C",
    name: "Maintenance Area",
    description: "Equipment servicing bay and spare parts store.",
    x: -14,
    z: 26,
    width: 30,
    depth: 20,
    underground: false,
    gatewayId: "G-002",
  },
  {
    zoneId: "Z-D",
    code: "ZONE D",
    name: "Restricted Area",
    description: "Restricted blasting and ventilation shaft sector.",
    x: 40,
    z: -22,
    width: 24,
    depth: 22,
    underground: true,
    gatewayId: "G-001",
  },
];

export const mockGateways: Gateway[] = [
  {
    gatewayId: "G-001",
    name: "Underground Gateway",
    zoneId: "Z-B",
    x: 14,
    y: 0,
    z: 8,
    status: "ONLINE",
    network: "LoRa 865 MHz",
    signal: "GOOD",
    lastData: "23:42:56",
  },
  {
    gatewayId: "G-002",
    name: "Surface Gateway",
    zoneId: "Z-E",
    x: -44,
    y: 0,
    z: 4,
    status: "ONLINE",
    network: "LoRa 865 MHz",
    signal: "FAIR",
    lastData: "23:42:51",
  },
];

export const mockWorkers: Worker[] = [
  {
    workerId: "W-001",
    name: "R. Mohanty",
    role: "Shift Operator",
    zoneId: "Z-A",
    gatewayId: "G-002",
    latitude: 20.2961,
    longitude: 85.8245,
    x: -22,
    y: 0,
    z: -22,
    status: "NORMAL",
    bpm: 76,
    spo2: 98,
    temperature: 36.6,
    humidity: 62.4,
    gasRaw: 118,
    gasPct: 6.2,
    fallAlert: false,
    battery: 88,
    lastSeen: "23:42:54",
    networkStatus: "CONNECTED",
  },
  {
    workerId: "W-002",
    name: "S. Behera",
    role: "Drill Operator",
    zoneId: "Z-A",
    gatewayId: "G-002",
    latitude: 20.2963,
    longitude: 85.8249,
    x: -9,
    y: 0,
    z: -13,
    status: "NORMAL",
    bpm: 82,
    spo2: 97,
    temperature: 36.9,
    humidity: 64.1,
    gasRaw: 132,
    gasPct: 7.1,
    fallAlert: false,
    battery: 74,
    lastSeen: "23:42:55",
    networkStatus: "CONNECTED",
  },
  {
    workerId: "W-003",
    name: "A. Nayak",
    role: "Production Worker",
    zoneId: "Z-B",
    gatewayId: "G-001",
    latitude: 20.2971,
    longitude: 85.8261,
    x: 6,
    y: 0,
    z: 10,
    status: "NORMAL",
    bpm: 78,
    spo2: 98,
    temperature: 36.7,
    humidity: 64.0,
    gasRaw: 140,
    gasPct: 7.4,
    fallAlert: false,
    battery: 91,
    lastSeen: "23:42:51",
    networkStatus: "CONNECTED",
  },
  {
    workerId: "W-004",
    name: "P. Sahu",
    role: "Maintenance Technician",
    zoneId: "Z-C",
    gatewayId: "G-002",
    latitude: 20.2955,
    longitude: 85.8238,
    x: -18,
    y: 0,
    z: 28,
    status: "CRITICAL",
    bpm: 121,
    spo2: 89,
    temperature: 37.9,
    humidity: 71.5,
    gasRaw: 210,
    gasPct: 11.4,
    fallAlert: true,
    battery: 46,
    lastSeen: "23:42:56",
    networkStatus: "CONNECTED",
  },
  {
    workerId: "W-005",
    name: "K. Jena",
    role: "Production Worker",
    zoneId: "Z-B",
    gatewayId: "G-001",
    latitude: 20.2974,
    longitude: 85.8267,
    x: 24,
    y: 0,
    z: 5,
    status: "WARNING",
    bpm: 104,
    spo2: 94,
    temperature: 38.4,
    humidity: 78.9,
    gasRaw: 486,
    gasPct: 24.8,
    fallAlert: false,
    battery: 63,
    lastSeen: "23:42:53",
    networkStatus: "CONNECTED",
  },
  {
    workerId: "W-006",
    name: "M. Pradhan",
    role: "Ventilation Crew",
    zoneId: "Z-D",
    gatewayId: "G-001",
    latitude: 20.2979,
    longitude: 85.8272,
    x: 40,
    y: 0,
    z: -20,
    status: "WARNING",
    bpm: 96,
    spo2: 95,
    temperature: 37.4,
    humidity: 69.2,
    gasRaw: 372,
    gasPct: 19.1,
    fallAlert: false,
    battery: 55,
    lastSeen: "23:42:49",
    networkStatus: "WEAK",
  },
  {
    workerId: "W-007",
    name: "D. Barik",
    role: "Haulage Operator",
    zoneId: "Z-B",
    gatewayId: "G-001",
    latitude: 20.2969,
    longitude: 85.8258,
    x: 32,
    y: 0,
    z: 12,
    status: "NORMAL",
    bpm: 74,
    spo2: 99,
    temperature: 36.4,
    humidity: 60.8,
    gasRaw: 126,
    gasPct: 6.6,
    fallAlert: false,
    battery: 82,
    lastSeen: "23:42:52",
    networkStatus: "CONNECTED",
  },
  {
    workerId: "W-008",
    name: "T. Swain",
    role: "Safety Marshal",
    zoneId: "Z-E",
    gatewayId: "G-002",
    latitude: 20.2949,
    longitude: 85.8231,
    x: -46,
    y: 0,
    z: 10,
    status: "NORMAL",
    bpm: 71,
    spo2: 98,
    temperature: 36.5,
    humidity: 58.2,
    gasRaw: 104,
    gasPct: 5.4,
    fallAlert: false,
    battery: 95,
    lastSeen: "23:42:55",
    networkStatus: "CONNECTED",
  },
  {
    workerId: "W-009",
    name: "L. Mishra",
    role: "Electrician",
    zoneId: "Z-C",
    gatewayId: "G-002",
    latitude: null,
    longitude: null,
    x: -6,
    y: 0,
    z: 24,
    status: "OFFLINE",
    bpm: null,
    spo2: null,
    temperature: 30.9,
    humidity: 79.2,
    gasRaw: null,
    gasPct: null,
    fallAlert: false,
    battery: 12,
    lastSeen: "23:21:08",
    networkStatus: "DISCONNECTED",
  },
  {
    workerId: "W-010",
    name: "H. Rout",
    role: "Surveyor",
    zoneId: "Z-A",
    gatewayId: "G-002",
    latitude: 20.2966,
    longitude: 85.8252,
    x: -26,
    y: 0,
    z: -10,
    status: "NORMAL",
    bpm: 80,
    spo2: 97,
    temperature: 36.8,
    humidity: 63.3,
    gasRaw: 122,
    gasPct: 6.4,
    fallAlert: false,
    battery: 69,
    lastSeen: "23:42:50",
    networkStatus: "CONNECTED",
  },
];

export const mockAlerts: SafetyAlert[] = [
  {
    alertId: "ALT-1042",
    workerId: "W-004",
    zoneId: "Z-C",
    type: "FALL DETECTED",
    severity: "CRITICAL",
    timestamp: "23:42:56",
    status: "ACTIVE",
    note: "Impact signature detected by helmet IMU. No movement recorded since event.",
  },
  {
    alertId: "ALT-1041",
    workerId: "W-005",
    zoneId: "Z-B",
    type: "GAS HAZARD",
    severity: "WARNING",
    timestamp: "23:39:12",
    status: "ACTIVE",
    note: "Gas concentration above the advisory threshold for more than 90 seconds.",
  },
  {
    alertId: "ALT-1040",
    workerId: "W-009",
    zoneId: "Z-C",
    type: "WORKER OFFLINE",
    severity: "WARNING",
    timestamp: "23:21:08",
    status: "ACTIVE",
    note: "Node stopped reporting. Last packet received via gateway G-002.",
  },
  {
    alertId: "ALT-1039",
    workerId: "W-006",
    zoneId: "Z-D",
    type: "ENVIRONMENTAL WARNING",
    severity: "WARNING",
    timestamp: "23:12:44",
    status: "ACKNOWLEDGED",
    note: "Elevated temperature and humidity in restricted sector.",
  },
  {
    alertId: "ALT-1038",
    workerId: "W-002",
    zoneId: "Z-A",
    type: "HEALTH ANOMALY",
    severity: "WARNING",
    timestamp: "22:54:03",
    status: "RESOLVED",
    note: "Sustained elevated heart rate. Worker rested and values normalised.",
  },
  {
    alertId: "ALT-1037",
    workerId: "W-006",
    zoneId: "Z-D",
    type: "NETWORK LOSS",
    severity: "INFO",
    timestamp: "22:38:19",
    status: "RESOLVED",
    note: "Temporary link loss to gateway G-001 during shaft transit.",
  },
  {
    alertId: "ALT-1036",
    workerId: "W-003",
    zoneId: "Z-B",
    type: "SOS / EMERGENCY",
    severity: "CRITICAL",
    timestamp: "21:05:37",
    status: "RESOLVED",
    note: "Manual SOS button pressed during drill. Confirmed as a test activation.",
  },
];

export const mockUsers: PlatformUser[] = [
  {
    username: "admin01",
    displayName: "Site Administrator",
    role: "ADMIN",
    status: "ACTIVE",
    lastLogin: "02 Sep 2026, 23:10",
  },
  {
    username: "safety01",
    displayName: "Safety Supervisor",
    role: "SAFETY_SUPERVISOR",
    status: "ACTIVE",
    lastLogin: "02 Sep 2026, 22:41",
  },
  {
    username: "operator01",
    displayName: "Control Room Operator",
    role: "OPERATOR",
    status: "ACTIVE",
    lastLogin: "02 Sep 2026, 20:07",
  },
  {
    username: "operator02",
    displayName: "Night Shift Operator",
    role: "OPERATOR",
    status: "SUSPENDED",
    lastLogin: "28 Aug 2026, 06:12",
  },
];

/**
 * Deterministic pseudo-random generator so the mock history is stable
 * between renders and between server and client.
 */
function seeded(seed: number) {
  let value = seed;
  return () => {
    value = (value * 1664525 + 1013904223) % 4294967296;
    return value / 4294967296;
  };
}

function round(n: number, digits = 1) {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** Builds 48 samples (~4 hours at 5 min spacing) of plausible sensor history. */
export function buildSensorHistory(worker: Worker): SensorSample[] {
  const seed = worker.workerId
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 7);
  const random = seeded(seed);
  const samples: SensorSample[] = [];
  const points = 48;

  const offline = worker.status === "OFFLINE";
  const baseBpm = worker.bpm ?? 78;
  const baseSpo2 = worker.spo2 ?? 97;
  const baseTemp = worker.temperature ?? 36.7;
  const baseHum = worker.humidity ?? 62;
  const baseGas = worker.gasPct ?? 7;

  for (let i = 0; i < points; i++) {
    const progress = i / (points - 1);
    const drift = Math.sin(progress * Math.PI * 1.6 + seed) * 0.5 + 0.5;
    const noise = () => (random() - 0.5) * 2;
    const minutesAgo = (points - 1 - i) * 5;
    const stamp = new Date(Date.UTC(2026, 8, 2, 23, 45, 0) - minutesAgo * 60_000);
    const time = `${String(stamp.getUTCHours()).padStart(2, "0")}:${String(
      stamp.getUTCMinutes(),
    ).padStart(2, "0")}`;

    const lostLink = offline && progress > 0.55;

    samples.push({
      time,
      bpm: lostLink ? null : Math.round(baseBpm - 6 + drift * 9 + noise() * 3),
      spo2: lostLink ? null : Math.min(100, Math.round(baseSpo2 - 1 + drift * 2 + noise())),
      temperature: round(baseTemp - 0.5 + drift * 0.9 + noise() * 0.2),
      humidity: round(baseHum - 3 + drift * 5 + noise() * 1.2),
      gasPct: lostLink ? null : round(Math.max(0, baseGas - 2 + drift * 4 + noise() * 0.8)),
    });
  }

  return samples;
}
