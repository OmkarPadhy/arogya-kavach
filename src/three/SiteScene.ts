import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

import type { Gateway, SafetyAlert, SafetyStatus, Worker, Zone } from "@/data/types";
import type { EnvironmentLayer } from "@/state/platform";

/**
 * Three.js virtual industrial / mining site.
 *
 * Framework-agnostic on purpose: React only feeds it plain data objects and
 * receives hover/select callbacks, so the scene can be reused or replaced
 * without touching UI code.
 */

export interface SceneData {
  workers: Worker[];
  zones: Zone[];
  gateways: Gateway[];
  alerts: SafetyAlert[];
  layers: Record<EnvironmentLayer, boolean>;
  selectedId: string | null;
}

export interface HoverInfo {
  kind: "worker" | "gateway" | "zone";
  id: string;
  x: number;
  y: number;
}

interface Handlers {
  onHover: (info: HoverInfo | null) => void;
  onSelect: (kind: "worker" | "gateway" | "zone", id: string) => void;
}

const STATUS_COLOR: Record<SafetyStatus, number> = {
  NORMAL: 0x35b47c,
  WARNING: 0xd9a441,
  CRITICAL: 0xd8483f,
  OFFLINE: 0x7d8794,
};

const ZONE_BASE = 0x2a3441;
const ACCENT = 0x4a86d8;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function makeLabel(text: string, sub?: string, accent = "#cfd8e3") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(14,19,26,0.72)";
    ctx.strokeStyle = "rgba(160,180,205,0.35)";
    ctx.lineWidth = 3;
    const r = 18;
    ctx.beginPath();
    ctx.roundRect(6, 24, 500, sub ? 112 : 76, r);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = accent;
    ctx.font = "600 46px 'IBM Plex Sans', system-ui, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(text, 28, 40);
    if (sub) {
      ctx.fillStyle = "rgba(205,216,230,0.75)";
      ctx.font = "400 32px 'IBM Plex Sans', system-ui, sans-serif";
      ctx.fillText(sub, 28, 92);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 4;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }),
  );
  sprite.scale.set(16, 5, 1);
  sprite.renderOrder = 10;
  return sprite;
}

export class SiteScene {
  private container: HTMLElement;
  private handlers: Handlers;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-10, -10);
  private pointerScreen = { x: 0, y: 0 };
  private clock = new THREE.Clock();
  private frame = 0;

  private zoneGroup = new THREE.Group();
  private equipmentGroup = new THREE.Group();
  private workerGroup = new THREE.Group();
  private gatewayGroup = new THREE.Group();
  private linkGroup = new THREE.Group();
  private alertGroup = new THREE.Group();

  private workerNodes = new Map<
    string,
    {
      group: THREE.Group;
      body: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
      helmet: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
      ring: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
      beacon: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
      status: SafetyStatus;
      selected: boolean;
    }
  >();
  private zoneMeshes = new Map<string, THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>>();
  private gatewayNodes = new Map<string, THREE.Group>();
  private pickables: THREE.Object3D[] = [];
  private flowPoints: { points: THREE.Points; from: THREE.Vector3; to: THREE.Vector3 }[] = [];

  private data: SceneData | null = null;
  private hovered: string | null = null;

  private tween: {
    fromPos: THREE.Vector3;
    toPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
    start: number;
    duration: number;
  } | null = null;

  private homePosition = new THREE.Vector3(-56, 62, 86);
  private homeTarget = new THREE.Vector3(0, 0, 0);

  constructor(container: HTMLElement, handlers: Handlers) {
    this.container = container;
    this.handlers = handlers;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = false;
    container.appendChild(this.renderer.domElement);

    this.scene.background = new THREE.Color(0x0f151d);
    this.scene.fog = new THREE.Fog(0x0f151d, 150, 320);

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / Math.max(container.clientHeight, 1),
      0.5,
      800,
    );
    this.camera.position.copy(this.homePosition);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 12;
    this.controls.maxDistance = 240;
    this.controls.maxPolarAngle = Math.PI / 2.05;
    this.controls.target.copy(this.homeTarget);

    this.buildStaticScene();
    this.scene.add(
      this.zoneGroup,
      this.equipmentGroup,
      this.workerGroup,
      this.gatewayGroup,
      this.linkGroup,
      this.alertGroup,
    );

    this.renderer.domElement.addEventListener("pointermove", this.onPointerMove);
    this.renderer.domElement.addEventListener("pointerdown", this.onPointerDown);
    this.renderer.domElement.addEventListener("pointerleave", this.onPointerLeave);
    window.addEventListener("resize", this.resize);

    this.frame = requestAnimationFrame(this.animate);
  }

  private buildStaticScene() {
    const hemi = new THREE.HemisphereLight(0xbcd2ee, 0x1a222c, 0.85);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(-60, 90, 60);
    this.scene.add(key);

    const fill = new THREE.DirectionalLight(0x6f9bd1, 0.4);
    fill.position.set(70, 40, -50);
    this.scene.add(fill);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: 0x161d26, roughness: 1, metalness: 0 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.6;
    this.scene.add(ground);

    const grid = new THREE.GridHelper(400, 80, 0x2c3a4b, 0x1d2733);
    (grid.material as THREE.Material).opacity = 0.5;
    (grid.material as THREE.Material).transparent = true;
    grid.position.y = -0.55;
    this.scene.add(grid);
  }

  /* ------------------------------------------------------------------ */
  /* Data binding                                                        */
  /* ------------------------------------------------------------------ */

  update(data: SceneData) {
    const structureChanged =
      !this.data ||
      this.data.zones.length !== data.zones.length ||
      this.data.workers.length !== data.workers.length ||
      this.data.gateways.length !== data.gateways.length;

    this.data = data;

    if (structureChanged) {
      this.buildZones(data.zones);
      this.buildEquipment(data.zones);
      this.buildGateways(data.gateways);
      this.buildWorkers(data.workers);
    }

    this.syncWorkers(data);
    this.syncZones(data);
    this.buildLinks(data);
    this.buildAlertMarkers(data);

    this.zoneGroup.visible = data.layers.zones;
    this.equipmentGroup.visible = data.layers.equipment;
    this.workerGroup.visible = data.layers.workers;
    this.gatewayGroup.visible = data.layers.gateways;
    this.linkGroup.visible = data.layers.network;
    this.alertGroup.visible = data.layers.alerts;

    this.refreshPickables();
  }

  private refreshPickables() {
    const list: THREE.Object3D[] = [];
    if (this.data?.layers.workers) list.push(...this.workerGroup.children);
    if (this.data?.layers.gateways) list.push(...this.gatewayGroup.children);
    if (this.data?.layers.zones) list.push(...this.zoneMeshes.values());
    this.pickables = list;
  }

  private buildZones(zones: Zone[]) {
    this.zoneGroup.clear();
    this.zoneMeshes.clear();

    zones.forEach((zone) => {
      const floor = new THREE.Mesh(
        new THREE.BoxGeometry(zone.width, 0.6, zone.depth),
        new THREE.MeshStandardMaterial({
          color: ZONE_BASE,
          roughness: 0.9,
          metalness: 0.05,
        }),
      );
      floor.position.set(zone.x, -0.3, zone.z);
      floor.userData = { kind: "zone", id: zone.zoneId };
      this.zoneMeshes.set(zone.zoneId, floor);
      this.zoneGroup.add(floor);

      const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(zone.width, 0.62, zone.depth)),
        new THREE.LineBasicMaterial({ color: 0x5c7086, transparent: true, opacity: 0.7 }),
      );
      outline.position.copy(floor.position);
      this.zoneGroup.add(outline);

      const label = makeLabel(zone.code, zone.name, zone.underground ? "#8fb6e8" : "#dbe4ef");
      label.position.set(zone.x, 9, zone.z - zone.depth / 2 + 1);
      this.zoneGroup.add(label);

      if (zone.underground) {
        const wallMaterial = new THREE.MeshStandardMaterial({
          color: 0x232c37,
          roughness: 1,
          metalness: 0,
        });
        const wallHeight = 6;
        [-1, 1].forEach((side) => {
          const wall = new THREE.Mesh(
            new THREE.BoxGeometry(zone.width, wallHeight, 0.8),
            wallMaterial,
          );
          wall.position.set(zone.x, wallHeight / 2, zone.z + (side * zone.depth) / 2);
          this.zoneGroup.add(wall);
        });

        const archMaterial = new THREE.MeshStandardMaterial({
          color: 0x38434f,
          roughness: 0.8,
          metalness: 0.2,
        });
        const archCount = Math.max(3, Math.round(zone.width / 10));
        for (let i = 0; i < archCount; i++) {
          const arch = new THREE.Mesh(
            new THREE.TorusGeometry(zone.depth / 2 - 0.4, 0.32, 8, 24, Math.PI),
            archMaterial,
          );
          arch.rotation.y = Math.PI / 2;
          arch.position.set(
            zone.x - zone.width / 2 + (i + 0.5) * (zone.width / archCount),
            0.2,
            zone.z,
          );
          this.zoneGroup.add(arch);
        }
      } else {
        const pillar = new THREE.MeshStandardMaterial({ color: 0x39424e, roughness: 0.85 });
        [-1, 1].forEach((sx) =>
          [-1, 1].forEach((sz) => {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.7, 7, 0.7), pillar);
            post.position.set(
              zone.x + (sx * (zone.width / 2 - 1.2)),
              3.5,
              zone.z + (sz * (zone.depth / 2 - 1.2)),
            );
            this.zoneGroup.add(post);
          }),
        );
      }
    });

    // Connecting paths between zone centres.
    const pathMaterial = new THREE.MeshStandardMaterial({ color: 0x222b35, roughness: 1 });
    for (let i = 0; i < zones.length - 1; i++) {
      const a = zones[i];
      const b = zones[i + 1];
      if (!a || !b) continue;
      const from = new THREE.Vector3(a.x, -0.45, a.z);
      const to = new THREE.Vector3(b.x, -0.45, b.z);
      const length = from.distanceTo(to);
      const path = new THREE.Mesh(new THREE.BoxGeometry(length, 0.2, 3.2), pathMaterial);
      path.position.copy(from.clone().add(to).multiplyScalar(0.5));
      path.rotation.y = -Math.atan2(to.z - from.z, to.x - from.x);
      this.zoneGroup.add(path);
    }
  }

  private buildEquipment(zones: Zone[]) {
    this.equipmentGroup.clear();
    const material = new THREE.MeshStandardMaterial({
      color: 0x4a5563,
      roughness: 0.65,
      metalness: 0.35,
    });

    zones.forEach((zone, index) => {
      const cx = zone.x + zone.width / 2 - 5;
      const cz = zone.z - zone.depth / 2 + 4;

      const container = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 3.4), material);
      container.position.set(cx, 1.5, cz);
      this.equipmentGroup.add(container);

      const silo = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 6, 16), material);
      silo.position.set(cx - 7 - index, 3, cz + 3);
      this.equipmentGroup.add(silo);

      const conveyor = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 1.4), material);
      conveyor.position.set(zone.x, 1.6, zone.z + zone.depth / 2 - 3);
      this.equipmentGroup.add(conveyor);
    });
  }

  private buildGateways(gateways: Gateway[]) {
    this.gatewayGroup.clear();
    this.gatewayNodes.clear();

    gateways.forEach((gateway) => {
      const group = new THREE.Group();
      group.position.set(gateway.x, 0, gateway.z);
      group.userData = { kind: "gateway", id: gateway.gatewayId };

      const base = new THREE.Mesh(
        new THREE.CylinderGeometry(1.6, 2, 0.8, 16),
        new THREE.MeshStandardMaterial({ color: 0x3d4956, roughness: 0.7, metalness: 0.3 }),
      );
      base.position.y = 0.4;
      group.add(base);

      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.3, 9, 10),
        new THREE.MeshStandardMaterial({ color: 0x6c7a89, roughness: 0.5, metalness: 0.5 }),
      );
      mast.position.y = 5;
      group.add(mast);

      const cabinet = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 2, 1.2),
        new THREE.MeshStandardMaterial({ color: 0x38424f, roughness: 0.7 }),
      );
      cabinet.position.set(1.7, 1.2, 0);
      group.add(cabinet);

      const beaconColor = gateway.status === "ONLINE" ? ACCENT : STATUS_COLOR.OFFLINE;
      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 16, 16),
        new THREE.MeshBasicMaterial({ color: beaconColor }),
      );
      beacon.position.y = 9.8;
      beacon.name = "beacon";
      group.add(beacon);

      const halo = new THREE.Mesh(
        new THREE.RingGeometry(2.6, 3.1, 40),
        new THREE.MeshBasicMaterial({
          color: beaconColor,
          transparent: true,
          opacity: 0.35,
          side: THREE.DoubleSide,
        }),
      );
      halo.rotation.x = -Math.PI / 2;
      halo.position.y = 0.05;
      group.add(halo);

      const label = makeLabel(gateway.gatewayId, gateway.network, "#9dc2f2");
      label.position.set(0, 12.5, 0);
      label.scale.set(13, 4.1, 1);
      group.add(label);

      this.gatewayNodes.set(gateway.gatewayId, group);
      this.gatewayGroup.add(group);
    });
  }

  private buildWorkers(workers: Worker[]) {
    this.workerGroup.clear();
    this.workerNodes.clear();

    workers.forEach((worker) => {
      const group = new THREE.Group();
      group.position.set(worker.x, 0, worker.z);
      group.userData = { kind: "worker", id: worker.workerId };

      const color = STATUS_COLOR[worker.status];

      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.62, 1.5, 6, 12),
        new THREE.MeshStandardMaterial({ color: 0xc8d3e0, roughness: 0.6, metalness: 0.05 }),
      );
      body.position.y = 1.6;
      group.add(body);

      const helmet = new THREE.Mesh(
        new THREE.SphereGeometry(0.62, 18, 14, 0, Math.PI * 2, 0, Math.PI / 1.7),
        new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.1 }),
      );
      helmet.position.y = 2.75;
      group.add(helmet);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(1.15, 1.5, 32),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.75,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.08;
      group.add(ring);

      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 12, 12),
        new THREE.MeshBasicMaterial({ color }),
      );
      beacon.position.y = 4.2;
      group.add(beacon);

      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5 }),
      );
      stem.position.y = 3.6;
      group.add(stem);

      const label = makeLabel(worker.workerId);
      label.position.set(0, 6, 0);
      label.scale.set(9, 2.8, 1);
      label.name = "label";
      group.add(label);

      this.workerNodes.set(worker.workerId, {
        group,
        body: body as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>,
        helmet: helmet as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>,
        ring: ring as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>,
        beacon: beacon as THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>,
        status: worker.status,
        selected: false,
      });
      this.workerGroup.add(group);
    });
  }

  private syncWorkers(data: SceneData) {
    data.workers.forEach((worker) => {
      const node = this.workerNodes.get(worker.workerId);
      if (!node) return;
      node.group.position.set(worker.x, 0, worker.z);
      node.status = worker.status;
      node.selected = data.selectedId === worker.workerId;

      const color = new THREE.Color(STATUS_COLOR[worker.status]);
      node.helmet.material.color.copy(color);
      node.ring.material.color.copy(color);
      node.beacon.material.color.copy(color);
      node.body.material.opacity = worker.status === "OFFLINE" ? 0.55 : 1;
      node.body.material.transparent = worker.status === "OFFLINE";
    });
  }

  private syncZones(data: SceneData) {
    const zoneStatus = new Map<string, SafetyStatus>();
    data.workers.forEach((worker) => {
      const current = zoneStatus.get(worker.zoneId);
      const rank: Record<SafetyStatus, number> = {
        NORMAL: 0,
        OFFLINE: 1,
        WARNING: 2,
        CRITICAL: 3,
      };
      if (!current || rank[worker.status] > rank[current]) {
        zoneStatus.set(worker.zoneId, worker.status);
      }
    });

    this.zoneMeshes.forEach((mesh, zoneId) => {
      const status = zoneStatus.get(zoneId) ?? "NORMAL";
      const selected = data.selectedId === zoneId;
      const base = new THREE.Color(ZONE_BASE);
      if (status === "CRITICAL") base.lerp(new THREE.Color(STATUS_COLOR.CRITICAL), 0.22);
      else if (status === "WARNING") base.lerp(new THREE.Color(STATUS_COLOR.WARNING), 0.16);
      if (selected) base.lerp(new THREE.Color(ACCENT), 0.3);
      mesh.material.color.copy(base);
      mesh.material.emissive = new THREE.Color(selected ? 0x16324f : 0x000000);
    });
  }

  private buildLinks(data: SceneData) {
    this.linkGroup.clear();
    this.flowPoints = [];

    data.workers.forEach((worker) => {
      const gateway = data.gateways.find((g) => g.gatewayId === worker.gatewayId);
      if (!gateway) return;
      const online = worker.networkStatus !== "DISCONNECTED";
      const from = new THREE.Vector3(worker.x, 3.6, worker.z);
      const to = new THREE.Vector3(gateway.x, 9.4, gateway.z);

      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([from, to]),
        new THREE.LineBasicMaterial({
          color: online ? (worker.networkStatus === "WEAK" ? 0xd9a441 : ACCENT) : 0x55606d,
          transparent: true,
          opacity: online ? 0.5 : 0.22,
        }),
      );
      this.linkGroup.add(line);

      if (online) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute([from.x, from.y, from.z], 3),
        );
        const points = new THREE.Points(
          geometry,
          new THREE.PointsMaterial({ color: 0x9ec6f5, size: 0.9, transparent: true, opacity: 0.9 }),
        );
        this.linkGroup.add(points);
        this.flowPoints.push({ points, from, to });
      }
    });

    // Gateway → platform uplink.
    data.gateways.forEach((gateway) => {
      const uplink = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(gateway.x, 9.8, gateway.z),
          new THREE.Vector3(gateway.x, 34, gateway.z),
        ]),
        new THREE.LineDashedMaterial({
          color: ACCENT,
          dashSize: 1.4,
          gapSize: 1.1,
          transparent: true,
          opacity: 0.45,
        }),
      );
      uplink.computeLineDistances();
      this.linkGroup.add(uplink);
    });
  }

  private buildAlertMarkers(data: SceneData) {
    this.alertGroup.clear();
    const open = data.alerts.filter((alert) => alert.status !== "RESOLVED");

    open.forEach((alert) => {
      const worker = data.workers.find((w) => w.workerId === alert.workerId);
      if (!worker) return;
      const color = alert.severity === "CRITICAL" ? STATUS_COLOR.CRITICAL : STATUS_COLOR.WARNING;

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(2, 2.35, 48),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(worker.x, 0.12, worker.z);
      ring.userData["pulse"] = alert.severity === "CRITICAL" ? 1 : 0.4;
      this.alertGroup.add(ring);

      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9, 0.9, 14, 14, 1, true),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: alert.severity === "CRITICAL" ? 0.18 : 0.1,
          side: THREE.DoubleSide,
        }),
      );
      column.position.set(worker.x, 7, worker.z);
      this.alertGroup.add(column);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Interaction                                                         */
  /* ------------------------------------------------------------------ */

  private onPointerMove = (event: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.pointerScreen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  private onPointerLeave = () => {
    this.pointer.set(-10, -10);
    this.hovered = null;
    this.handlers.onHover(null);
  };

  private onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const hit = this.pick();
    if (hit) this.handlers.onSelect(hit.kind, hit.id);
  };

  private pick(): { kind: "worker" | "gateway" | "zone"; id: string } | null {
    if (!this.pickables.length) return null;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.pickables, true);
    for (const intersect of intersects) {
      let object: THREE.Object3D | null = intersect.object;
      while (object) {
        const kind = object.userData["kind"] as "worker" | "gateway" | "zone" | undefined;
        const id = object.userData["id"] as string | undefined;
        if (kind && id) return { kind, id };
        object = object.parent;
      }
    }
    return null;
  }

  /* ------------------------------------------------------------------ */
  /* Camera control                                                      */
  /* ------------------------------------------------------------------ */

  private moveCamera(position: THREE.Vector3, target: THREE.Vector3, duration = 900) {
    this.tween = {
      fromPos: this.camera.position.clone(),
      toPos: position,
      fromTarget: this.controls.target.clone(),
      toTarget: target,
      start: performance.now(),
      duration,
    };
  }

  resetView() {
    this.moveCamera(this.homePosition.clone(), this.homeTarget.clone());
  }

  topView() {
    const target = this.controls.target.clone();
    this.moveCamera(new THREE.Vector3(target.x, 150, target.z + 0.01), target);
  }

  perspectiveView() {
    const target = this.controls.target.clone();
    this.moveCamera(
      new THREE.Vector3(target.x - 46, 52, target.z + 62),
      target,
    );
  }

  fitAll() {
    if (!this.data) return this.resetView();
    const box = new THREE.Box3();
    this.data.zones.forEach((zone) => {
      box.expandByPoint(new THREE.Vector3(zone.x - zone.width / 2, 0, zone.z - zone.depth / 2));
      box.expandByPoint(new THREE.Vector3(zone.x + zone.width / 2, 8, zone.z + zone.depth / 2));
    });
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const distance = Math.max(size.x, size.z) * 0.95;
    this.moveCamera(
      new THREE.Vector3(center.x - distance * 0.55, distance * 0.62, center.z + distance * 0.78),
      center,
    );
  }

  zoomBy(factor: number) {
    const direction = this.camera.position.clone().sub(this.controls.target);
    const length = THREE.MathUtils.clamp(direction.length() * factor, 12, 240);
    this.moveCamera(
      this.controls.target.clone().add(direction.setLength(length)),
      this.controls.target.clone(),
      420,
    );
  }

  focus(kind: "worker" | "gateway" | "zone", id: string) {
    if (!this.data) return;
    if (kind === "worker") {
      const worker = this.data.workers.find((item) => item.workerId === id);
      if (!worker) return;
      const target = new THREE.Vector3(worker.x, 2.4, worker.z);
      this.moveCamera(target.clone().add(new THREE.Vector3(-13, 15, 18)), target);
    } else if (kind === "gateway") {
      const gateway = this.data.gateways.find((item) => item.gatewayId === id);
      if (!gateway) return;
      const target = new THREE.Vector3(gateway.x, 5, gateway.z);
      this.moveCamera(target.clone().add(new THREE.Vector3(-18, 22, 26)), target);
    } else {
      const zone = this.data.zones.find((item) => item.zoneId === id);
      if (!zone) return;
      const target = new THREE.Vector3(zone.x, 1, zone.z);
      const distance = Math.max(zone.width, zone.depth) * 1.15;
      this.moveCamera(
        target.clone().add(new THREE.Vector3(-distance * 0.6, distance * 0.7, distance * 0.85)),
        target,
      );
    }
  }

  /* ------------------------------------------------------------------ */
  /* Loop                                                                */
  /* ------------------------------------------------------------------ */

  private animate = () => {
    this.frame = requestAnimationFrame(this.animate);
    const elapsed = this.clock.getElapsedTime();

    if (this.tween) {
      const progress = Math.min(1, (performance.now() - this.tween.start) / this.tween.duration);
      const eased = easeInOutCubic(progress);
      this.camera.position.lerpVectors(this.tween.fromPos, this.tween.toPos, eased);
      this.controls.target.lerpVectors(this.tween.fromTarget, this.tween.toTarget, eased);
      if (progress >= 1) this.tween = null;
    }

    // Alert rings breathe gently.
    this.alertGroup.children.forEach((child) => {
      const pulse = (child.userData["pulse"] as number | undefined) ?? 0;
      if (!pulse) return;
      const scale = 1 + Math.sin(elapsed * 2.2) * 0.12 * pulse;
      child.scale.setScalar(scale);
      const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      if (material?.opacity !== undefined) {
        material.opacity = 0.45 + Math.sin(elapsed * 2.2) * 0.2 * pulse;
      }
    });

    // Worker beacons and selection emphasis.
    this.workerNodes.forEach((node) => {
      const critical = node.status === "CRITICAL";
      const scale = critical ? 1 + Math.sin(elapsed * 3.4) * 0.18 : 1;
      node.beacon.scale.setScalar(scale);
      node.ring.material.opacity = node.selected
        ? 0.95
        : critical
          ? 0.6 + Math.sin(elapsed * 3.4) * 0.25
          : 0.65;
      node.ring.scale.setScalar(node.selected ? 1.25 : 1);
    });

    // Data-flow particles along active links.
    this.flowPoints.forEach((flow, index) => {
      const t = ((elapsed * 0.35 + index * 0.17) % 1 + 1) % 1;
      const position = flow.from.clone().lerp(flow.to, t);
      const attribute = flow.points.geometry.getAttribute("position") as THREE.BufferAttribute;
      attribute.setXYZ(0, position.x, position.y, position.z);
      attribute.needsUpdate = true;
    });

    // Hover detection.
    const hit = this.pick();
    const hitKey = hit ? `${hit.kind}:${hit.id}` : null;
    if (hitKey !== this.hovered) {
      this.hovered = hitKey;
      this.renderer.domElement.style.cursor = hit ? "pointer" : "grab";
      this.handlers.onHover(
        hit ? { kind: hit.kind, id: hit.id, x: this.pointerScreen.x, y: this.pointerScreen.y } : null,
      );
    } else if (hit) {
      this.handlers.onHover({
        kind: hit.kind,
        id: hit.id,
        x: this.pointerScreen.x,
        y: this.pointerScreen.y,
      });
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  resize = () => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  dispose() {
    cancelAnimationFrame(this.frame);
    window.removeEventListener("resize", this.resize);
    this.renderer.domElement.removeEventListener("pointermove", this.onPointerMove);
    this.renderer.domElement.removeEventListener("pointerdown", this.onPointerDown);
    this.renderer.domElement.removeEventListener("pointerleave", this.onPointerLeave);
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
