import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type {
  Gateway,
  PlatformUser,
  SafetyAlert,
  SiteStatus,
  Snapshot,
  SystemStatus,
  Worker,
  Zone,
} from "@/data/types";

import {
  applyAlertState,
  dataService,
} from "@/services/dataService";

import {
  authService,
  type AuthSessionUser,
} from "@/services/authService";

import {
  defaultBinding,
  fetchDeviceReadings,
  loadBindings,
  mergeReadings,
  saveBindings,
  type DeviceBinding,
} from "@/services/deviceService";

export type EnvironmentLayer =
  | "workers"
  | "gateways"
  | "network"
  | "zones"
  | "alerts"
  | "equipment";

export type SelectionKind =
  | "worker"
  | "gateway"
  | "zone";

export interface Selection {
  kind: SelectionKind;
  id: string;
}

export interface FocusRequest extends Selection {
  nonce: number;
}

interface PlatformContextValue {
  ready: boolean;

  user: AuthSessionUser | null;

  mode: "DEMO" | "REAL" | null;

  signIn: (user: AuthSessionUser) => void;
  signOut: () => void;

  snapshot: Snapshot | null;

  workers: Worker[];
  zones: Zone[];
  gateways: Gateway[];
  alerts: SafetyAlert[];

  getWorker: (
    workerId: string,
  ) => Worker | undefined;

  getZone: (
    zoneId: string,
  ) => Zone | undefined;

  getGateway: (
    gatewayId: string,
  ) => Gateway | undefined;

  zoneLabel: (zoneId: string) => string;

  selection: Selection | null;

  setSelection: (
    selection: Selection | null,
  ) => void;

  focusRequest: FocusRequest | null;

  focus: (selection: Selection) => void;

  layers: Record<
    EnvironmentLayer,
    boolean
  >;

  toggleLayer: (
    layer: EnvironmentLayer,
  ) => void;

  simulationEnabled: boolean;

  setSimulationEnabled: (
    enabled: boolean,
  ) => void;

  setAlertStatus: (
    alertId: string,
    status: SafetyAlert["status"],
  ) => void;

  deviceBindings: Record<
    string,
    DeviceBinding
  >;

  getBinding: (
    gatewayId: string,
  ) => DeviceBinding;

  saveBinding: (
    binding: DeviceBinding,
  ) => void;

  liveDeviceCount: number;

  lastDeviceSync: string | null;

  stats: {
    totalWorkers: number;
    activeWorkers: number;
    offlineWorkers: number;
    activeAlerts: number;
    criticalAlerts: number;
    resolvedAlerts: number;
    gatewaysOnline: number;
    gatewaysTotal: number;
    connectedNodes: number;
    activeLinks: number;
    networkHealth: number;
    systemStatus: SystemStatus;
    siteStatus: SiteStatus;
  };
}

const PlatformContext =
  createContext<PlatformContextValue | null>(
    null,
  );

const defaultLayers: Record<
  EnvironmentLayer,
  boolean
> = {
  workers: true,
  gateways: true,
  network: true,
  zones: true,
  alerts: true,
  equipment: false,
};

export function PlatformProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [ready, setReady] =
    useState(false);

  const [user, setUser] =
    useState<AuthSessionUser | null>(
      null,
    );

  const [snapshot, setSnapshot] =
    useState<Snapshot | null>(null);

  const [selection, setSelection] =
    useState<Selection | null>(null);

  const [focusRequest, setFocusRequest] =
    useState<FocusRequest | null>(null);

  const [layers, setLayers] =
    useState(defaultLayers);

  const [
    simulationEnabled,
    setSimulationEnabled,
  ] = useState(true);

  const [deviceBindings, setDeviceBindings] =
    useState<
      Record<string, DeviceBinding>
    >({});

  const [
    lastDeviceSync,
    setLastDeviceSync,
  ] = useState<string | null>(null);

  const nonce = useRef(0);

  /*
   * Restore saved session and device bindings.
   */
  useEffect(() => {
    const restoredUser =
      authService.restore();

    if (restoredUser) {
      setUser(restoredUser);

      /*
       * DEMO = simulated telemetry
       * REAL = Google Sheets / Apps Script telemetry
       */
      setSimulationEnabled(
        restoredUser.mode === "DEMO",
      );
    }

    setDeviceBindings(loadBindings());

    let cancelled = false;

    dataService
      .getSnapshot()
      .then((next) => {
        if (cancelled) return;

        setSnapshot(next);
        setReady(true);
      })
      .catch((error) => {
        console.error(
          "Failed to load platform snapshot:",
          error,
        );

        if (!cancelled) {
          setReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * ============================================================
   * REAL PROTOTYPE — GOOGLE SHEETS AUTO REFRESH
   * ============================================================
   *
   * In REAL mode, fetch the latest sensor data every 5 seconds.
   *
   * Physical helmet:
   *   Helmet 01 / W-001
   *
   * Data path:
   *   Physical Helmet
   *        ↓
   *   Google Sheet
   *        ↓
   *   Google Apps Script
   *        ↓
   *   dataService.getSnapshot()
   *        ↓
   *   Dashboard
   *
   * DEMO mode is NOT affected by this polling loop.
   */
  useEffect(() => {
    if (user?.mode !== "REAL") {
      return;
    }

    let cancelled = false;

    const refreshRealData = async () => {
      try {
        const next =
          await dataService.getSnapshot();

        if (cancelled) {
          return;
        }

        setSnapshot(next);

        setLastDeviceSync(
          new Date().toLocaleTimeString(
            [],
            {
              hour12: false,
            },
          ),
        );
      } catch (error) {
        console.error(
          "Real prototype data refresh failed:",
          error,
        );
      }
    };

    /*
     * Fetch immediately after entering REAL mode.
     */
    void refreshRealData();

    /*
     * Then refresh every 5 seconds.
     */
    const timer =
      window.setInterval(
        () => {
          void refreshRealData();
        },
        5000,
      );

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [user?.mode]);

  /*
   * Demo-mode simulated telemetry.
   *
   * This is intentionally disabled for REAL mode.
   */
  useEffect(() => {
    if (!simulationEnabled) {
      return;
    }

    if (user?.mode === "REAL") {
      return;
    }

    const timer =
      window.setInterval(() => {
        setSnapshot((current) =>
          current
            ? dataService.advance(
                current,
              )
            : current,
        );
      }, 4000);

    return () =>
      window.clearInterval(timer);
  }, [
    simulationEnabled,
    user?.mode,
  ]);

  /*
   * Existing physical-device bindings.
   */
  const liveBindings = useMemo(
    () =>
      Object.values(
        deviceBindings,
      ).filter(
        (binding) =>
          binding.mode === "LIVE" &&
          binding.endpoint.trim(),
      ),
    [deviceBindings],
  );

  /*
   * Poll existing wired devices.
   *
   * This remains separate from the Google Sheets
   * REAL prototype polling above.
   */
  useEffect(() => {
    if (!liveBindings.length) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const batches =
          await Promise.all(
            liveBindings.map(
              (binding) =>
                fetchDeviceReadings(
                  binding,
                ),
            ),
          );

        const readings =
          batches.flat();

        if (
          cancelled ||
          !readings.length
        ) {
          return;
        }

        setSnapshot((current) =>
          current
            ? {
                ...current,

                workers:
                  mergeReadings(
                    current.workers,
                    readings,
                  ),

                updatedAt:
                  new Date().toLocaleTimeString(
                    [],
                    {
                      hour12: false,
                    },
                  ),
              }
            : current,
        );

        setLastDeviceSync(
          new Date().toLocaleTimeString(
            [],
            {
              hour12: false,
            },
          ),
        );
      } catch (error) {
        console.error(
          "Device polling failed:",
          error,
        );
      }
    };

    void poll();

    const seconds = Math.max(
      2,
      Math.min(
        ...liveBindings.map(
          (binding) =>
            binding.pollSeconds || 5,
        ),
      ),
    );

    const timer =
      window.setInterval(
        () => void poll(),
        seconds * 1000,
      );

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [liveBindings]);

  /*
   * Save physical device binding.
   */
  const saveBinding = useCallback(
    (binding: DeviceBinding) => {
      setDeviceBindings(
        (current) => {
          const next = {
            ...current,
            [binding.gatewayId]:
              binding,
          };

          saveBindings(next);

          return next;
        },
      );
    },
    [],
  );

  /*
   * Login.
   */
  const signIn = useCallback(
    (nextUser: AuthSessionUser) => {
      setUser(nextUser);

      /*
       * DEMO = simulated telemetry
       * REAL = Google Sheets telemetry
       */
      setSimulationEnabled(
        nextUser.mode === "DEMO",
      );

      /*
       * Clear previous selection.
       */
      setSelection(null);
      setFocusRequest(null);
    },
    [],
  );

  /*
   * Logout.
   */
  const signOut = useCallback(() => {
    void authService.logout();

    setUser(null);
    setSelection(null);
    setFocusRequest(null);

    setSimulationEnabled(false);
  }, []);

  /*
   * Focus an object in the 3D environment.
   */
  const focus = useCallback(
    (next: Selection) => {
      nonce.current += 1;

      setSelection(next);

      setFocusRequest({
        ...next,
        nonce: nonce.current,
      });
    },
    [],
  );

  /*
   * Toggle 3D environment layers.
   */
  const toggleLayer = useCallback(
    (layer: EnvironmentLayer) => {
      setLayers((current) => ({
        ...current,
        [layer]:
          !current[layer],
      }));
    },
    [],
  );

  /*
   * Update alert state.
   */
  const setAlertStatus = useCallback(
    (
      alertId: string,
      status: SafetyAlert["status"],
    ) => {
      setSnapshot((current) =>
        current
          ? {
              ...current,
              alerts:
                applyAlertState(
                  current.alerts,
                  alertId,
                  status,
                ),
            }
          : current,
      );
    },
    [],
  );

  const workers =
    snapshot?.workers ?? [];

  const zones =
    snapshot?.zones ?? [];

  const gateways =
    snapshot?.gateways ?? [];

  const alerts =
    snapshot?.alerts ?? [];

  /*
   * Platform statistics.
   */
  const stats = useMemo(() => {
    const offlineWorkers =
      workers.filter(
        (worker) =>
          worker.status ===
          "OFFLINE",
      ).length;

    const openAlerts =
      alerts.filter(
        (alert) =>
          alert.status !==
          "RESOLVED",
      );

    const criticalAlerts =
      openAlerts.filter(
        (alert) =>
          alert.severity ===
          "CRITICAL",
      ).length;

    const gatewaysOnline =
      gateways.filter(
        (gateway) =>
          gateway.status ===
          "ONLINE",
      ).length;

    const connectedNodes =
      workers.filter(
        (worker) =>
          worker.networkStatus !==
          "DISCONNECTED",
      ).length;

    const networkHealth =
      workers.length
        ? Math.round(
            (connectedNodes /
              workers.length) *
              1000,
          ) / 10
        : 0;

    const systemStatus: SystemStatus =
      gatewaysOnline === 0
        ? "OFFLINE"
        : networkHealth < 85
          ? "DEGRADED"
          : "ONLINE";

    const siteStatus: SiteStatus =
      criticalAlerts > 0 ||
      workers.some(
        (worker) =>
          worker.status ===
          "CRITICAL",
      )
        ? "CRITICAL"
        : openAlerts.length > 0 ||
            workers.some(
              (worker) =>
                worker.status ===
                "WARNING",
            )
          ? "WARNING"
          : "NORMAL";

    return {
      totalWorkers:
        workers.length,

      activeWorkers:
        workers.length -
        offlineWorkers,

      offlineWorkers,

      activeAlerts:
        openAlerts.filter(
          (alert) =>
            alert.status ===
            "ACTIVE",
        ).length,

      criticalAlerts,

      resolvedAlerts:
        alerts.filter(
          (alert) =>
            alert.status ===
            "RESOLVED",
        ).length,

      gatewaysOnline,

      gatewaysTotal:
        gateways.length,

      connectedNodes,

      activeLinks:
        connectedNodes,

      networkHealth,

      systemStatus,

      siteStatus,
    };
  }, [
    workers,
    alerts,
    gateways,
  ]);

  /*
   * Context value.
   */
  const value =
    useMemo<PlatformContextValue>(
      () => ({
        ready,

        user,

        mode:
          user?.mode ?? null,

        signIn,

        signOut,

        snapshot,

        workers,

        zones,

        gateways,

        alerts,

        getWorker: (
          workerId,
        ) =>
          workers.find(
            (worker) =>
              worker.workerId ===
              workerId,
          ),

        getZone: (
          zoneId,
        ) =>
          zones.find(
            (zone) =>
              zone.zoneId ===
              zoneId,
          ),

        getGateway: (
          gatewayId,
        ) =>
          gateways.find(
            (gateway) =>
              gateway.gatewayId ===
              gatewayId,
          ),

        zoneLabel: (zoneId) => {
          const zone =
            zones.find(
              (item) =>
                item.zoneId ===
                zoneId,
            );

          return zone
            ? `${zone.code} · ${zone.name}`
            : zoneId;
        },

        selection,

        setSelection,

        focusRequest,

        focus,

        layers,

        toggleLayer,

        simulationEnabled,

        setSimulationEnabled,

        setAlertStatus,

        deviceBindings,

        getBinding: (
          gatewayId,
        ) =>
          deviceBindings[
            gatewayId
          ] ??
          defaultBinding(
            gatewayId,
          ),

        saveBinding,

        liveDeviceCount:
          liveBindings.length,

        lastDeviceSync,

        stats,
      }),
      [
        ready,
        user,
        signIn,
        signOut,
        snapshot,
        workers,
        zones,
        gateways,
        alerts,
        selection,
        focusRequest,
        focus,
        layers,
        toggleLayer,
        simulationEnabled,
        setAlertStatus,
        deviceBindings,
        saveBinding,
        liveBindings,
        lastDeviceSync,
        stats,
      ],
    );

  return (
    <PlatformContext.Provider
      value={value}
    >
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const context =
    useContext(
      PlatformContext,
    );

  if (!context) {
    throw new Error(
      "usePlatform must be used inside <PlatformProvider>",
    );
  }

  return context;
}
