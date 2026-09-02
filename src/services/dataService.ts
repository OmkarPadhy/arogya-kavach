import {
  buildSensorHistory,
  mockAlerts,
  mockGateways,
  mockSite,
  mockUsers,
  mockWorkers,
  mockZones,
} from "@/data/mockSite";
import { geoToScene } from "@/lib/coordinateMapping";
import type {
  PlatformUser,
  SafetyAlert,
  SensorSample,
  Snapshot,
  Worker,
} from "@/data/types";

/**
 * ============================================================
 * AROGYA KAVACH DATA SERVICE
 * ============================================================
 *
 * DEMO MODE:
 *   Uses the existing simulated/mock workers.
 *
 * REAL PROTOTYPE MODE:
 *   Uses the single physical helmet W-001 through
 *   the Google Apps Script sensor API.
 *
 * Real Google Sheet columns:
 *
 * Date | BPM | SpO2 | Temp | Humidity |
 * Gas_Raw | Gas_Pct | Lat | Lng | Fall_Alert
 *
 * No Worker_ID column is required.
 * ============================================================
 */


/* ============================================================
   GOOGLE APPS SCRIPT SENSOR API
   ============================================================ */

const SENSOR_API_URL =
  "https://script.google.com/macros/s/AKfycbzbiLvIOSHE9aGnwLH21xp31D3Dk-o1PwihhQP-PtqgRObTGeCScru9pLMCQswKjEIX/exec";


/* ============================================================
   TYPES RETURNED BY GOOGLE APPS SCRIPT
   ============================================================ */

interface RealSensorReading {
  workerId: string;
  date: string;

  bpm: number | null;
  spo2: number | null;
  temperature: number | null;
  humidity: number | null;

  gasRaw: number | null;
  gasPct: number | null;

  latitude: number | null;
  longitude: number | null;

  fallAlert: boolean;
}

interface SnapshotResponse {
  ok: boolean;
  worker: RealSensorReading | null;
  updatedAt: string;
  error?: string;
}

interface HistoryResponse {
  ok: boolean;
  workerId: string;
  history: RealSensorReading[];
  updatedAt: string;
  error?: string;
}


/* ============================================================
   DATA PROVIDER INTERFACE
   ============================================================ */

export interface DataProvider {
  readonly id: string;

  getSnapshot(): Promise<Snapshot>;

  getSensorHistory(workerId: string): Promise<SensorSample[]>;

  getUsers(): Promise<PlatformUser[]>;

  /**
   * Produces the next simulated tick.
   *
   * Demo provider:
   *   advances mock telemetry.
   *
   * Real provider:
   *   does not simulate anything.
   */
  advance(snapshot: Snapshot): Snapshot;
}


/* ============================================================
   COMMON HELPERS
   ============================================================ */

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function clamp(
  value: number,
  min: number,
  max: number,
) {
  return Math.min(max, Math.max(min, value));
}

function round(
  value: number,
  digits = 1,
) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function stamp(date: Date) {
  return [
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  ]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}


/* ============================================================
   MOCK TELEMETRY HELPERS
   ============================================================ */

function drift(
  value: number,
  amount: number,
  min: number,
  max: number,
  digits = 0,
) {
  const next =
    value +
    (Math.random() - 0.5) *
      amount *
      2;

  return round(
    clamp(next, min, max),
    digits,
  );
}


function deriveStatus(
  worker: Worker,
): Worker["status"] {

  if (
    worker.networkStatus ===
    "DISCONNECTED"
  ) {
    return "OFFLINE";
  }

  if (worker.fallAlert) {
    return "CRITICAL";
  }

  if (
    (worker.spo2 ?? 100) < 90 ||
    (worker.bpm ?? 70) > 118
  ) {
    return "CRITICAL";
  }

  if (
    (worker.gasPct ?? 0) > 15 ||
    (worker.bpm ?? 70) > 95 ||
    (worker.temperature ?? 36) > 38
  ) {
    return "WARNING";
  }

  return "NORMAL";
}


/* ============================================================
   JSONP REQUEST
   ============================================================
 *
 * Apps Script Web Apps can redirect their ContentService
 * response, so the browser uses JSONP rather than depending
 * on normal cross-origin fetch behaviour.
 * ============================================================ */

function requestJsonp<T>(
  url: string,
  params: Record<string, string> = {},
): Promise<T> {

  return new Promise((resolve, reject) => {

    if (
      !url ||
      url ===
        "PASTE_YOUR_SENSOR_APPS_SCRIPT_EXEC_URL_HERE"
    ) {
      reject(
        new Error(
          "Sensor API URL has not been configured.",
        ),
      );
      return;
    }

    const callbackName =
      `arogyaKavach_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2)}`;

    const query = new URLSearchParams({
      ...params,
      callback: callbackName,
    });

    const script =
      document.createElement("script");

    const cleanup = () => {
      try {
        delete (
          window as unknown as Record<
            string,
            unknown
          >
        )[callbackName];
      } catch {
        // Ignore cleanup errors.
      }

      script.remove();
    };

    const timeout = window.setTimeout(() => {
      cleanup();

      reject(
        new Error(
          "Sensor API request timed out.",
        ),
      );
    }, 10000);

    (
      window as unknown as Record<
        string,
        unknown
      >
    )[callbackName] = (data: T) => {
      window.clearTimeout(timeout);
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      window.clearTimeout(timeout);
      cleanup();

      reject(
        new Error(
          "Unable to connect to sensor API.",
        ),
      );
    };

    script.src =
      `${url}?${query.toString()}`;

    document.body.appendChild(script);
  });
}


/* ============================================================
   REAL MODE STATUS
   ============================================================ */

function getStoredPlatformMode():
  | "DEMO"
  | "REAL" {

  if (
    typeof window ===
    "undefined"
  ) {
    return "DEMO";
  }

  try {
    const raw =
      localStorage.getItem(
        "arogya-kavach.session",
      );

    if (!raw) {
      return "DEMO";
    }

    const session = JSON.parse(raw);

    return session?.mode === "REAL"
      ? "REAL"
      : "DEMO";

  } catch {
    return "DEMO";
  }
}


/* ============================================================
   REAL WORKER STATUS
   ============================================================ */

function deriveRealStatus(
  reading: RealSensorReading,
): Worker["status"] {

  if (reading.fallAlert) {
    return "CRITICAL";
  }

  if (
    reading.spo2 !== null &&
    reading.spo2 < 90
  ) {
    return "CRITICAL";
  }

  if (
    reading.bpm !== null &&
    reading.bpm > 118
  ) {
    return "CRITICAL";
  }

  if (
    reading.gasPct !== null &&
    reading.gasPct > 15
  ) {
    return "WARNING";
  }

  if (
    reading.bpm !== null &&
    reading.bpm > 95
  ) {
    return "WARNING";
  }

  if (
    reading.temperature !== null &&
    reading.temperature > 38
  ) {
    return "WARNING";
  }

  return "NORMAL";
}


/* ============================================================
   REAL WORKER → PLATFORM WORKER
   ============================================================ */

function convertRealWorker(
  reading: RealSensorReading,
): Worker {

  /*
   * Use the first existing zone/gateway as the
   * prototype deployment location.
   *
   * These are platform metadata, not sensor readings.
   */

  const zone =
    mockZones[0];

  const gateway =
    mockGateways[0];

  /*
   * Convert real latitude/longitude into the
   * Three.js site coordinate system.
   */

  const scenePosition =
    geoToScene(
      reading.latitude,
      reading.longitude,
    );

  const x =
    scenePosition?.x ??
    zone.x +
      zone.width / 2;

  const z =
    scenePosition?.z ??
    zone.z +
      zone.depth / 2;

  const status =
    deriveRealStatus(reading);

  return {
    workerId: "W-001",

    name: "Prototype Helmet 01",

    role: "Field Worker",

    zoneId: zone.zoneId,

    gatewayId: gateway.gatewayId,

    latitude:
      reading.latitude,

    longitude:
      reading.longitude,

    x,

    y: 1.2,

    z,

    status,

    bpm:
      reading.bpm,

    spo2:
      reading.spo2,

    temperature:
      reading.temperature,

    humidity:
      reading.humidity,

    gasRaw:
      reading.gasRaw,

    gasPct:
      reading.gasPct,

    fallAlert:
      reading.fallAlert,

    /*
     * Battery is not currently present in the
     * Google Sheet, so it is kept at 0 rather
     * than inventing a battery measurement.
     */
    battery: 0,

    lastSeen:
      formatLastSeen(
        reading.date,
      ),

    networkStatus:
      "CONNECTED",
  };
}


/* ============================================================
   DATE DISPLAY
   ============================================================ */

function formatLastSeen(
  isoDate: string,
): string {

  const date =
    new Date(isoDate);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "--:--:--";
  }

  return [
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
  ]
    .map((part) =>
      String(part).padStart(2, "0"),
    )
    .join(":");
}


/* ============================================================
   REAL ALERT GENERATION
   ============================================================ */

function buildRealAlerts(
  worker: Worker,
): SafetyAlert[] {

  const alerts: SafetyAlert[] = [];

  const timestamp =
    worker.lastSeen;

  if (worker.fallAlert) {
    alerts.push({
      alertId: "REAL-FALL-001",

      workerId:
        worker.workerId,

      zoneId:
        worker.zoneId,

      type:
        "FALL DETECTED",

      severity:
        "CRITICAL",

      timestamp,

      status:
        "ACTIVE",

      note:
        "Fall event detected by prototype helmet.",
    });
  }

  if (
    worker.gasPct !== null &&
    worker.gasPct > 15
  ) {
    alerts.push({
      alertId: "REAL-GAS-001",

      workerId:
        worker.workerId,

      zoneId:
        worker.zoneId,

      type:
        "GAS HAZARD",

      severity:
        worker.gasPct > 25
          ? "CRITICAL"
          : "WARNING",

      timestamp,

      status:
        "ACTIVE",

      note:
        `Gas concentration reading: ${worker.gasPct}%`,
    });
  }

  if (
    worker.spo2 !== null &&
    worker.spo2 < 90
  ) {
    alerts.push({
      alertId: "REAL-HEALTH-001",

      workerId:
        worker.workerId,

      zoneId:
        worker.zoneId,

      type:
        "HEALTH ANOMALY",

      severity:
        "CRITICAL",

      timestamp,

      status:
        "ACTIVE",

      note:
        `SpO₂ reading: ${worker.spo2}%`,
    });
  }

  if (
    worker.bpm !== null &&
    worker.bpm > 118
  ) {
    alerts.push({
      alertId: "REAL-HEALTH-002",

      workerId:
        worker.workerId,

      zoneId:
        worker.zoneId,

      type:
        "HEALTH ANOMALY",

      severity:
        "CRITICAL",

      timestamp,

      status:
        "ACTIVE",

      note:
        `Heart rate reading: ${worker.bpm} BPM`,
    });
  }

  if (
    worker.temperature !== null &&
    worker.temperature > 38
  ) {
    alerts.push({
      alertId: "REAL-ENV-001",

      workerId:
        worker.workerId,

      zoneId:
        worker.zoneId,

      type:
        "ENVIRONMENTAL WARNING",

      severity:
        "WARNING",

      timestamp,

      status:
        "ACTIVE",

      note:
        `Temperature reading: ${worker.temperature}°C`,
    });
  }

  return alerts;
}


/* ============================================================
   REAL DATA PROVIDER
   ============================================================ */

export const realDataProvider:
  DataProvider = {

  id: "GoogleSheetsDataProvider",

  async getSnapshot() {

    const response =
      await requestJsonp<SnapshotResponse>(
        SENSOR_API_URL,
        {
          action: "snapshot",
        },
      );

    if (!response.ok) {
      throw new Error(
        response.error ??
          "Sensor API returned an error.",
      );
    }

    /*
     * No reading yet.
     *
     * Return an empty worker list rather than
     * creating fake telemetry.
     */

    if (!response.worker) {

      return {
        site: clone(mockSite),

        workers: [],

        zones: clone(mockZones),

        gateways: clone(mockGateways),

        alerts: [],

        updatedAt:
          response.updatedAt ??
          "--:--:--",
      };
    }

    const worker =
      convertRealWorker(
        response.worker,
      );

    const alerts =
      buildRealAlerts(worker);

    return {

      site: {
        ...clone(mockSite),

        systemStatus:
          "ONLINE",
      },

      workers: [
        worker,
      ],

      zones:
        clone(mockZones),

      gateways:
        clone(mockGateways),

      alerts,

      updatedAt:
        worker.lastSeen,
    };
  },


  async getSensorHistory(
    workerId: string,
  ) {

    if (workerId !== "W-001") {
      return [];
    }

    const response =
      await requestJsonp<HistoryResponse>(
        SENSOR_API_URL,
        {
          action: "history",
        },
      );

    if (!response.ok) {
      throw new Error(
        response.error ??
          "Sensor history API returned an error.",
      );
    }

    return response.history.map(
      (reading) => ({
        time:
          formatLastSeen(
            reading.date,
          ),

        bpm:
          reading.bpm,

        spo2:
          reading.spo2,

        temperature:
          reading.temperature,

        humidity:
          reading.humidity,

        gasPct:
          reading.gasPct,
      }),
    );
  },


  async getUsers() {
    return clone(mockUsers);
  },


  advance(snapshot: Snapshot) {

    /*
     * NEVER simulate real prototype telemetry.
     *
     * Real mode is refreshed by fetching the
     * Google Sheet again.
     */

    return snapshot;
  },
};


/* ============================================================
   DEMO DATA PROVIDER
   ============================================================ */

export const mockDataProvider:
  DataProvider = {

  id: "MockDataProvider",

  async getSnapshot() {

    return {

      site:
        clone(mockSite),

      workers:
        clone(mockWorkers),

      zones:
        clone(mockZones),

      gateways:
        clone(mockGateways),

      alerts:
        clone(mockAlerts),

      updatedAt:
        mockWorkers[0]?.lastSeen ??
        "--:--:--",
    };
  },


  async getSensorHistory(
    workerId: string,
  ) {

    const worker =
      mockWorkers.find(
        (item) =>
          item.workerId ===
          workerId,
      );

    if (!worker) {
      return [];
    }

    return buildSensorHistory(
      worker,
    );
  },


  async getUsers() {
    return clone(mockUsers);
  },


  advance(snapshot: Snapshot) {

    const now =
      new Date();

    const workers =
      snapshot.workers.map(
        (worker) => {

          if (
            worker.networkStatus ===
            "DISCONNECTED"
          ) {

            return {
              ...worker,

              battery:
                Math.max(
                  0,
                  worker.battery,
                ),
            };
          }

          const next: Worker = {

            ...worker,

            bpm:
              worker.bpm === null
                ? null
                : drift(
                    worker.bpm,
                    2.5,
                    55,
                    132,
                  ),

            spo2:
              worker.spo2 === null
                ? null
                : drift(
                    worker.spo2,
                    0.6,
                    86,
                    100,
                  ),

            temperature:
              worker.temperature === null
                ? null
                : drift(
                    worker.temperature,
                    0.12,
                    34,
                    39.5,
                    1,
                  ),

            humidity:
              worker.humidity === null
                ? null
                : drift(
                    worker.humidity,
                    0.6,
                    40,
                    92,
                    1,
                  ),

            gasPct:
              worker.gasPct === null
                ? null
                : drift(
                    worker.gasPct,
                    0.5,
                    0,
                    42,
                    1,
                  ),

            lastSeen:
              stamp(now),
          };

          next.gasRaw =
            next.gasPct === null
              ? null
              : Math.round(
                  next.gasPct * 19.4,
                );

          next.status =
            deriveStatus(next);

          return next;
        },
      );

    return {

      ...snapshot,

      workers,

      updatedAt:
        stamp(now),
    };
  },
};


/* ============================================================
   ACTIVE DATA SERVICE
   ============================================================
 *
 * The provider is selected automatically from the
 * authenticated platform mode.
 *
 * DEMO → mockDataProvider
 * REAL → realDataProvider
 * ============================================================ */

export const dataService:
  DataProvider = {

  get id() {

    return getStoredPlatformMode() ===
      "REAL"
      ? realDataProvider.id
      : mockDataProvider.id;
  },


  async getSnapshot() {

    const provider =
      getStoredPlatformMode() ===
      "REAL"
        ? realDataProvider
        : mockDataProvider;

    return provider.getSnapshot();
  },


  async getSensorHistory(
    workerId: string,
  ) {

    const provider =
      getStoredPlatformMode() ===
      "REAL"
        ? realDataProvider
        : mockDataProvider;

    return provider.getSensorHistory(
      workerId,
    );
  },


  async getUsers() {

    /*
     * User authentication is already handled
     * separately by authService.
     */

    return mockDataProvider.getUsers();
  },


  advance(snapshot: Snapshot) {

    const provider =
      getStoredPlatformMode() ===
      "REAL"
        ? realDataProvider
        : mockDataProvider;

    return provider.advance(
      snapshot,
    );
  },
};


/* ============================================================
   ALERT STATE HELPER
   ============================================================ */

export function applyAlertState(
  alerts: SafetyAlert[],
  alertId: string,
  status: SafetyAlert["status"],
): SafetyAlert[] {

  return alerts.map(
    (alert) =>
      alert.alertId === alertId
        ? {
            ...alert,
            status,
          }
        : alert,
  );
}
