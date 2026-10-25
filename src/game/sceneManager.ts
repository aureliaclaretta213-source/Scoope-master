import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { LuckyScoopPhysics, PhysicsItem, ChuteHitEvent } from './physics';
import { LevelConfig, UpgradeState } from '../types/game';

// Preallocated math helpers for zero GC in loop
const _vec2A = new THREE.Vector2();
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();
const _quatA = new THREE.Quaternion();
const _eulerA = new THREE.Euler();
const _mat4A = new THREE.Matrix4();
const _colorA = new THREE.Color();

export class LuckyScoopSceneManager {
  public renderer!: THREE.WebGLRenderer;
  public scene!: THREE.Scene;
  public camera!: THREE.PerspectiveCamera;
  public isSoftwareGl: boolean = false;

  private container: HTMLElement;
  private physics: LuckyScoopPhysics;
  private animFrameId: number = 0;
  private timeoutId: number = 0;
  private lastTime: number = 0;

  // 3D Visual objects
  private scoopGroup!: THREE.Group;
  private shovelHeadGroup!: THREE.Group;
  private tubGroup!: THREE.Group;
  private chuteMesh!: THREE.Group;
  private aimReticle!: THREE.Mesh;
  private chuteArrow!: THREE.Mesh;
  private itemMeshes: Map<number, THREE.Object3D> = new Map();
  private particleGroup!: THREE.Group;
  private particles: Array<{ mesh: THREE.Mesh; vx: number; vy: number; vz: number; life: number; maxLife: number }> = [];

  // Shared Geometries and Materials for high performance
  private sphereGeom = new THREE.SphereGeometry(1, 16, 14);
  private gemGeom = new THREE.OctahedronGeometry(1, 0);
  private eggGeom = new THREE.SphereGeometry(1, 16, 14);
  private rockGeom = new THREE.DodecahedronGeometry(1, 1);

  // Reusable materials cache
  private materialsCache: Map<string, THREE.Material> = new Map();

  // Floating text / score popup callback
  public onScorePopup?: (text: string, value: number, screenX: number, screenY: number, color: string) => void;

  constructor(container: HTMLElement, physics: LuckyScoopPhysics) {
    this.container = container;
    this.physics = physics;
    this.initScene();
  }

  private initScene() {
    // Software WebGL Guard as per skill instructions
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // Initialize WebGLRenderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0c0f1d');
    this.scene.fog = new THREE.FogExp2('#0c0f1d', 0.025);

    // Studio Environment (RoomEnvironment + PMREMGenerator)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Camera: Isometric perspective giving a clear view of tub, scoop, and chute
    this.camera = new THREE.PerspectiveCamera(
      42,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 11.5, 12.8);
    this.camera.lookAt(0.5, 1.2, 0);

    // Lighting: Key Light, Cool Fill HemisphereLight, Neon Rim Lights
    const hemiLight = new THREE.HemisphereLight('#90caf9', '#1a237e', 0.85);
    this.scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight('#fff8e1', 1.6);
    keyLight.position.set(6, 14, 8);
    keyLight.castShadow = !this.isSoftwareGl;
    if (keyLight.shadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
      const d = 8;
      keyLight.shadow.camera.left = -d;
      keyLight.shadow.camera.right = d;
      keyLight.shadow.camera.top = d;
      keyLight.shadow.camera.bottom = -d;
    }
    this.scene.add(keyLight);

    const rimLight = new THREE.PointLight('#ff007f', 1.2, 20);
    rimLight.position.set(-8, 5, -4);
    this.scene.add(rimLight);

    const chuteLight = new THREE.PointLight('#00e5ff', 1.5, 15);
    chuteLight.position.set(6, 3, 0);
    this.scene.add(chuteLight);

    // Ground contact floor
    const floorGeom = new THREE.PlaneGeometry(40, 40);
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#070a14',
      roughness: 0.8,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    floor.receiveShadow = !this.isSoftwareGl;
    this.scene.add(floor);

    // Build Composite 3D objects
    this.buildTubAndChute();
    this.buildScoopMachine();

    // 7. Aim Reticle on Ground / Pile
    const reticleGeom = new THREE.RingGeometry(1.0, 1.25, 32);
    const reticleMat = new THREE.MeshBasicMaterial({
      color: '#ffd600',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    this.aimReticle = new THREE.Mesh(reticleGeom, reticleMat);
    this.aimReticle.rotation.x = -Math.PI / 2;
    this.aimReticle.position.set(0, 0.63, 0);
    this.scene.add(this.aimReticle);

    // 8. Chute Guide Beacon (Pulsing arrow pointing to chute)
    const arrowGeom = new THREE.ConeGeometry(0.35, 0.8, 16);
    const arrowMat = new THREE.MeshBasicMaterial({ color: '#00e5ff' });
    this.chuteArrow = new THREE.Mesh(arrowGeom, arrowMat);
    this.chuteArrow.rotation.z = Math.PI; // point downward into chute
    this.chuteArrow.position.set(5.5, 4.4, 0);
    this.scene.add(this.chuteArrow);

    // Particle system group
    this.particleGroup = new THREE.Group();
    this.scene.add(this.particleGroup);

    // Wire chute hit events to particle effects and popups
    this.physics.onChuteHit = (evt) => this.handleChuteHit(evt);

    // Resize listener & adaptive mobile framing
    window.addEventListener('resize', this.onWindowResize);
    this.adjustCameraFraming();

    // Start 60fps loop
    this.lastTime = performance.now();
    this.tick();
  }

  // Composite 3D Prize Tub & Neon Arcade Arena
  private buildTubAndChute() {
    this.tubGroup = new THREE.Group();

    // 1. Tub Base Platform (Heavy arcade cabinet base)
    const baseGeom = new THREE.BoxGeometry(9.4, 0.6, 7.8);
    const baseMat = new THREE.MeshStandardMaterial({
      color: '#1a1f38',
      roughness: 0.3,
      metalness: 0.7,
    });
    const base = new THREE.Mesh(baseGeom, baseMat);
    base.position.set(0, 0.3, 0);
    base.receiveShadow = !this.isSoftwareGl;
    this.tubGroup.add(base);

    // 2. Interior Mirror Floor (Makes items look infinite & vibrant)
    const tubFloorGeom = new THREE.PlaneGeometry(8.4, 6.8);
    const tubFloorMat = new THREE.MeshStandardMaterial({
      color: '#283593',
      metalness: 0.6,
      roughness: 0.15,
    });
    const tubFloor = new THREE.Mesh(tubFloorGeom, tubFloorMat);
    tubFloor.rotation.x = -Math.PI / 2;
    tubFloor.position.set(0, 0.61, 0);
    this.tubGroup.add(tubFloor);

    // 3. Neon Trim around base
    const neonTrimGeom = new THREE.BoxGeometry(8.8, 0.1, 7.2);
    const neonTrimMat = new THREE.MeshBasicMaterial({ color: '#00e5ff' });
    const neonTrim = new THREE.Mesh(neonTrimGeom, neonTrimMat);
    neonTrim.position.set(0, 0.62, 0);
    this.tubGroup.add(neonTrim);

    // 4. Transparent Acrylic Glass Walls
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      transmission: this.isSoftwareGl ? 0 : 0.85,
      transparent: true,
      opacity: this.isSoftwareGl ? 0.3 : 0.45,
      roughness: 0.08,
      ior: 1.5,
      depthWrite: false,
    });

    // Back wall
    const backWallGeom = new THREE.BoxGeometry(8.6, 3.2, 0.15);
    const backWall = new THREE.Mesh(backWallGeom, glassMat);
    backWall.position.set(0, 2.2, -3.5);
    this.tubGroup.add(backWall);

    // Front wall
    const frontWallGeom = new THREE.BoxGeometry(8.6, 3.2, 0.15);
    const frontWall = new THREE.Mesh(frontWallGeom, glassMat);
    frontWall.position.set(0, 2.2, 3.5);
    this.tubGroup.add(frontWall);

    // Left wall
    const leftWallGeom = new THREE.BoxGeometry(0.15, 3.2, 7.0);
    const leftWall = new THREE.Mesh(leftWallGeom, glassMat);
    leftWall.position.set(-4.3, 2.2, 0);
    this.tubGroup.add(leftWall);

    // Right wall (Has gap for chute entrance)
    const rightWallGeomTop = new THREE.BoxGeometry(0.15, 1.2, 7.0);
    const rightWallTop = new THREE.Mesh(rightWallGeomTop, glassMat);
    rightWallTop.position.set(4.3, 3.2, 0);
    this.tubGroup.add(rightWallTop);

    // 5. Chrome Corner Pillars
    const pillarGeom = new THREE.CylinderGeometry(0.18, 0.18, 3.4, 16);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: '#cfd8dc',
      metalness: 0.95,
      roughness: 0.15,
    });
    const corners = [
      [-4.3, -3.5],
      [4.3, -3.5],
      [-4.3, 3.5],
      [4.3, 3.5],
    ];
    corners.forEach(([cx, cz]) => {
      const p = new THREE.Mesh(pillarGeom, pillarMat);
      p.position.set(cx, 2.3, cz);
      this.tubGroup.add(p);
    });

    // 6. Chute & Prize Collection Tray (At X = 5.6)
    this.chuteMesh = new THREE.Group();

    // Funnel Hooper
    const funnelGeom = new THREE.CylinderGeometry(1.6, 0.9, 1.4, 16, 1, true);
    const chuteMat = new THREE.MeshStandardMaterial({
      color: '#ffd600',
      metalness: 0.85,
      roughness: 0.2,
      side: THREE.DoubleSide,
    });
    const funnel = new THREE.Mesh(funnelGeom, chuteMat);
    funnel.position.set(5.5, 2.3, 0);
    this.chuteMesh.add(funnel);

    // Chute neon ring
    const ringGeom = new THREE.TorusGeometry(1.65, 0.08, 12, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: '#ffea00' });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(5.5, 3.0, 0);
    this.chuteMesh.add(ring);

    // Collection Tray Box (Where scooped items end up)
    const trayGeom = new THREE.BoxGeometry(2.4, 0.6, 2.6);
    const trayMat = new THREE.MeshStandardMaterial({
      color: '#263238',
      metalness: 0.8,
      roughness: 0.3,
    });
    const tray = new THREE.Mesh(trayGeom, trayMat);
    tray.position.set(5.5, 0.3, 0);
    this.chuteMesh.add(tray);

    // "WIN / CLAIM" Neon sign above chute
    const signGeom = new THREE.BoxGeometry(1.8, 0.5, 0.2);
    const signMat = new THREE.MeshStandardMaterial({
      color: '#00e676',
      emissive: '#00e676',
      emissiveIntensity: 0.6,
      roughness: 0.2,
    });
    const sign = new THREE.Mesh(signGeom, signMat);
    sign.position.set(5.5, 3.8, 0);
    this.chuteMesh.add(sign);

    this.scene.add(this.tubGroup);
    this.scene.add(this.chuteMesh);
  }

  // Composite 3D Mechanical Scoop Shovel with hydraulics, joints, and glowing accents
  private buildScoopMachine() {
    this.scoopGroup = new THREE.Group();

    // 1. Overhead Gantry Rail (Top slider rail)
    const railGeom = new THREE.CylinderGeometry(0.12, 0.12, 12, 16);
    const railMat = new THREE.MeshStandardMaterial({
      color: '#455a64',
      metalness: 0.9,
      roughness: 0.2,
    });
    const rail = new THREE.Mesh(railGeom, railMat);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(0, 6.2, 0);
    this.scene.add(rail);

    // 2. Telescopic Vertical Hydraulic Cylinder
    const cylinderGeom = new THREE.CylinderGeometry(0.16, 0.16, 2.2, 16);
    const cylinderMat = new THREE.MeshStandardMaterial({
      color: '#ffd600',
      metalness: 0.8,
      roughness: 0.25,
    });
    const hydraulicArm = new THREE.Mesh(cylinderGeom, cylinderMat);
    hydraulicArm.position.set(0, 1.3, 0);
    this.scoopGroup.add(hydraulicArm);

    // Chrome inner piston
    const pistonGeom = new THREE.CylinderGeometry(0.1, 0.1, 1.8, 16);
    const pistonMat = new THREE.MeshStandardMaterial({
      color: '#eceff1',
      metalness: 0.98,
      roughness: 0.1,
    });
    const piston = new THREE.Mesh(pistonGeom, pistonMat);
    piston.position.set(0, 0.2, 0);
    this.scoopGroup.add(piston);

    // Joint hinge bracket
    const hingeGeom = new THREE.SphereGeometry(0.28, 16, 16);
    const hingeMat = new THREE.MeshStandardMaterial({
      color: '#263238',
      metalness: 0.7,
      roughness: 0.4,
    });
    const hinge = new THREE.Mesh(hingeGeom, hingeMat);
    hinge.position.set(0, -0.6, 0);
    this.scoopGroup.add(hinge);

    // Shovel Head Group (Tilts for plunging and dumping)
    this.shovelHeadGroup = new THREE.Group();
    this.shovelHeadGroup.position.set(0, -0.6, 0);

    // Shovel Bucket (Open transparent acrylic scoop with golden frame)
    const acrylicMat = new THREE.MeshPhysicalMaterial({
      color: '#fff9c4',
      transmission: this.isSoftwareGl ? 0 : 0.8,
      transparent: true,
      opacity: this.isSoftwareGl ? 0.45 : 0.65,
      roughness: 0.1,
      metalness: 0.15,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const frameGoldMat = new THREE.MeshStandardMaterial({
      color: '#ffd600',
      metalness: 0.9,
      roughness: 0.2,
    });

    // 1. Shovel Bottom Bed (Transparent Acrylic)
    const bedGeom = new THREE.BoxGeometry(2.4, 0.06, 2.2);
    const bed = new THREE.Mesh(bedGeom, acrylicMat);
    bed.position.set(0, -0.15, 0);
    this.shovelHeadGroup.add(bed);

    // 2. Shovel Back Wall (Transparent Acrylic)
    const backGeom = new THREE.BoxGeometry(2.4, 0.8, 0.06);
    const backWall = new THREE.Mesh(backGeom, acrylicMat);
    backWall.position.set(0, 0.25, 1.08);
    this.shovelHeadGroup.add(backWall);

    // 3. Shovel Left Wall (Transparent Acrylic)
    const sideGeom = new THREE.BoxGeometry(0.06, 0.8, 2.2);
    const leftWall = new THREE.Mesh(sideGeom, acrylicMat);
    leftWall.position.set(-1.2, 0.25, 0);
    this.shovelHeadGroup.add(leftWall);

    // 4. Shovel Right Wall (Transparent Acrylic)
    const rightWall = new THREE.Mesh(sideGeom, acrylicMat);
    rightWall.position.set(1.2, 0.25, 0);
    this.shovelHeadGroup.add(rightWall);

    // 5. Golden Structural Brackets & Rims
    const rimTopGeom = new THREE.BoxGeometry(2.45, 0.06, 0.06);
    const rimTop = new THREE.Mesh(rimTopGeom, frameGoldMat);
    rimTop.position.set(0, 0.65, 1.08);
    this.shovelHeadGroup.add(rimTop);

    const rimLeftGeom = new THREE.BoxGeometry(0.06, 0.06, 2.25);
    const rimLeft = new THREE.Mesh(rimLeftGeom, frameGoldMat);
    rimLeft.position.set(-1.2, 0.65, 0);
    this.shovelHeadGroup.add(rimLeft);

    const rimRight = new THREE.Mesh(rimLeftGeom, frameGoldMat);
    rimRight.position.set(1.2, 0.65, 0);
    this.shovelHeadGroup.add(rimRight);

    // 6. Front Digging Lip / Teeth (Chrome Serrated Edge at front Z = -1.1)
    const teethGeom = new THREE.BoxGeometry(2.4, 0.08, 0.35);
    const teethMat = new THREE.MeshStandardMaterial({
      color: '#eceff1',
      metalness: 0.95,
      roughness: 0.1,
    });
    const teeth = new THREE.Mesh(teethGeom, teethMat);
    teeth.position.set(0, -0.15, -1.15);
    this.shovelHeadGroup.add(teeth);

    // 7. Neon Accent Bar along top back
    const neonBarGeom = new THREE.CylinderGeometry(0.04, 0.04, 2.4, 12);
    const neonBarMat = new THREE.MeshBasicMaterial({ color: '#00e5ff' });
    const neonBar = new THREE.Mesh(neonBarGeom, neonBarMat);
    neonBar.rotation.z = Math.PI / 2;
    neonBar.position.set(0, 0.68, 1.08);
    this.shovelHeadGroup.add(neonBar);

    this.scoopGroup.add(this.shovelHeadGroup);
    this.scene.add(this.scoopGroup);
  }

  // Create or retrieve 3D Mesh for an Item
  private getOrCreateItemMesh(item: PhysicsItem): THREE.Object3D {
    let mesh = this.itemMeshes.get(item.id);
    if (mesh) return mesh;

    const def = item.def;
    const type = def.type;

    if (type === 'lucky_duck') {
      // Composite Rubber Duck Model (Body, head, beak, eyes)
      const duckGroup = new THREE.Group();

      const yellowMat = new THREE.MeshStandardMaterial({
        color: '#ffd600',
        roughness: 0.3,
        metalness: 0.1,
      });

      // Body
      const bodyGeom = new THREE.SphereGeometry(def.radius, 14, 12);
      const body = new THREE.Mesh(bodyGeom, yellowMat);
      body.scale.set(1.0, 0.85, 1.25);
      duckGroup.add(body);

      // Head
      const headGeom = new THREE.SphereGeometry(def.radius * 0.65, 12, 10);
      const head = new THREE.Mesh(headGeom, yellowMat);
      head.position.set(0, def.radius * 0.7, -def.radius * 0.45);
      duckGroup.add(head);

      // Beak (Orange Cone)
      const beakGeom = new THREE.ConeGeometry(def.radius * 0.28, def.radius * 0.4, 10);
      const orangeMat = new THREE.MeshStandardMaterial({ color: '#ff6d00', roughness: 0.4 });
      const beak = new THREE.Mesh(beakGeom, orangeMat);
      beak.rotation.x = -Math.PI / 2;
      beak.position.set(0, def.radius * 0.65, -def.radius * 0.95);
      duckGroup.add(beak);

      // Eyes
      const eyeGeom = new THREE.SphereGeometry(def.radius * 0.1, 8, 8);
      const eyeMat = new THREE.MeshBasicMaterial({ color: '#000000' });
      const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
      leftEye.position.set(-def.radius * 0.28, def.radius * 0.8, -def.radius * 0.65);
      const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
      rightEye.position.set(def.radius * 0.28, def.radius * 0.8, -def.radius * 0.65);
      duckGroup.add(leftEye);
      duckGroup.add(rightEye);

      mesh = duckGroup;
    } else if (type === 'gem_amethyst' || type === 'gem_sapphire' || type === 'diamond_star') {
      // Sparkling faceted Crystal
      const mat = new THREE.MeshPhysicalMaterial({
        color: def.color,
        metalness: def.metalness,
        roughness: def.roughness,
        transmission: this.isSoftwareGl ? 0 : def.transmission || 0.6,
        transparent: true,
        opacity: 0.9,
        ior: 1.6,
      });
      mesh = new THREE.Mesh(this.gemGeom, mat);
      mesh.scale.setScalar(def.radius * 1.3);
    } else if (type === 'mystery_egg') {
      // Golden Egg / Gacha Capsule with metallic gold rim
      const eggGroup = new THREE.Group();
      const eggMat = new THREE.MeshStandardMaterial({
        color: '#ff9800',
        metalness: 0.7,
        roughness: 0.2,
      });
      const eggBody = new THREE.Mesh(this.eggGeom, eggMat);
      eggBody.scale.set(def.radius * 0.9, def.radius * 1.25, def.radius * 0.9);
      eggGroup.add(eggBody);

      const bandGeom = new THREE.TorusGeometry(def.radius * 0.92, 0.06, 8, 16);
      const bandMat = new THREE.MeshStandardMaterial({ color: '#ffd600', metalness: 0.9, roughness: 0.1 });
      const band = new THREE.Mesh(bandGeom, bandMat);
      band.rotation.x = Math.PI / 2;
      eggGroup.add(band);

      mesh = eggGroup;
    } else if (type === 'rainbow_orb') {
      // Radiant Glowing Orb
      const orbMat = new THREE.MeshPhysicalMaterial({
        color: '#ff1744',
        metalness: 0.4,
        roughness: 0.1,
        emissive: '#ff4081',
        emissiveIntensity: 0.4,
        clearcoat: 1.0,
      });
      mesh = new THREE.Mesh(this.sphereGeom, orbMat);
      mesh.scale.setScalar(def.radius);
    } else if (type === 'hazard_boulder') {
      // Jagged dark rock
      const rockMat = new THREE.MeshStandardMaterial({
        color: '#37474f',
        roughness: 0.95,
        metalness: 0.1,
      });
      mesh = new THREE.Mesh(this.rockGeom, rockMat);
      mesh.scale.setScalar(def.radius * 1.1);
    } else {
      // Candy Ball / Coin
      let mat = this.materialsCache.get(type);
      if (!mat) {
        mat = new THREE.MeshStandardMaterial({
          color: def.color,
          metalness: def.metalness,
          roughness: def.roughness,
        });
        this.materialsCache.set(type, mat);
      }
      mesh = new THREE.Mesh(this.sphereGeom, mat);
      mesh.scale.setScalar(def.radius);
    }

    mesh.castShadow = !this.isSoftwareGl;
    mesh.receiveShadow = !this.isSoftwareGl;
    this.scene.add(mesh);
    this.itemMeshes.set(item.id, mesh);
    return mesh;
  }

  // Handle chute scoring trigger (confetti, sparks, and popup)
  private handleChuteHit(evt: ChuteHitEvent) {
    const isPositive = evt.value > 0;
    const count = evt.isSpecial ? 18 : 8;
    const color = evt.isHazard ? '#ff1744' : evt.isSpecial ? '#ffd600' : '#00e5ff';

    // Spawn 3D burst particles
    for (let i = 0; i < count; i++) {
      const pGeom = new THREE.BoxGeometry(0.12, 0.12, 0.12);
      const pMat = new THREE.MeshBasicMaterial({ color });
      const pMesh = new THREE.Mesh(pGeom, pMat);
      pMesh.position.set(evt.x, evt.y + 0.5, evt.z);

      const angle = Math.random() * Math.PI * 2;
      const speed = 2.0 + Math.random() * 4.0;
      this.particles.push({
        mesh: pMesh,
        vx: Math.cos(angle) * speed,
        vy: 2.5 + Math.random() * 4.0,
        vz: Math.sin(angle) * speed,
        life: 0,
        maxLife: 0.8 + Math.random() * 0.4,
      });
      this.particleGroup.add(pMesh);
    }

    // Convert 3D world position to 2D screen coordinate for UI popup
    _vec3A.set(evt.x, evt.y + 0.8, evt.z);
    _vec3A.project(this.camera);

    const screenX = ((_vec3A.x + 1) * 0.5) * this.container.clientWidth;
    const screenY = ((-_vec3A.y + 1) * 0.5) * this.container.clientHeight;

    const label = evt.isHazard ? `${evt.value} Poin` : `+${evt.value} Poin`;
    if (this.onScorePopup) {
      this.onScorePopup(label, evt.value, screenX, screenY, color);
    }
  }

  // Update theme colors per level
  public applyLevelTheme(level: LevelConfig) {
    // Tub color accents
    const neonMat = new THREE.MeshBasicMaterial({ color: level.neonColor });
    // Adjust lights
    const color = new THREE.Color(level.tubColor);
    this.scene.fog = new THREE.FogExp2(color.clone().multiplyScalar(0.12), 0.025);
    this.scene.background = color.clone().multiplyScalar(0.08);
  }

  // Update scoop scale visually when upgraded
  public updateScoopVisualScale(upgrades: UpgradeState) {
    const sizeMultiplier = [1.0, 1.3, 1.65, 2.0][Math.min(3, upgrades.scoopSize - 1)];
    this.shovelHeadGroup.scale.set(sizeMultiplier, 1.0, Math.sqrt(sizeMultiplier));
  }

  // Clean and reset items
  public clearItems() {
    this.itemMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
    });
    this.itemMeshes.clear();
  }

  // Animation Loop
  private tick = () => {
    const now = performance.now();
    const rawDt = (now - this.lastTime) * 0.001;
    this.lastTime = now;
    const dt = Math.min(rawDt, 0.05);

    // Update 3D scoop position and tilt from physics
    const scoop = this.physics.scoop;
    this.scoopGroup.position.set(scoop.x, scoop.y, scoop.z);
    this.shovelHeadGroup.rotation.x = scoop.pitch;

    // Update Aim Reticle on pile
    if (this.aimReticle) {
      this.aimReticle.position.set(scoop.x, 0.64, scoop.z);
      const pulse = 1.0 + Math.sin(now * 0.006) * 0.04;
      const baseScale = scoop.width * 0.45;
      this.aimReticle.scale.set(baseScale * pulse, baseScale * pulse, 1);
      (this.aimReticle.material as THREE.MeshBasicMaterial).color.set(
        scoop.x > 3.6 ? '#00e5ff' : '#ffd600'
      );
    }

    // Update Chute Guide Beacon Arrow
    if (this.chuteArrow) {
      const hasScoopLoot = this.physics.getScoopedCount() > 0;
      this.chuteArrow.visible = true;
      const bob = Math.sin(now * 0.007) * 0.25;
      this.chuteArrow.position.y = 4.3 + bob;
      this.chuteArrow.rotation.y += dt * 2.5;
      (this.chuteArrow.material as THREE.MeshBasicMaterial).color.set(
        hasScoopLoot ? '#00e5ff' : '#546e7a'
      );
      this.chuteArrow.scale.setScalar(hasScoopLoot ? 1.25 : 0.85);
    }

    // Update item 3D meshes
    const currentItemIds = new Set<number>();
    for (let i = 0; i < this.physics.items.length; i++) {
      const it = this.physics.items[i];
      currentItemIds.add(it.id);

      // If collected and animation finished, hide
      if (it.isCollected && it.collectAnim > 1.2) {
        const mesh = this.itemMeshes.get(it.id);
        if (mesh) mesh.visible = false;
        continue;
      }

      const mesh = this.getOrCreateItemMesh(it);
      mesh.visible = true;
      mesh.position.set(it.x, it.y, it.z);
      mesh.rotation.set(it.rotX, it.rotY, it.rotZ);

      // If collected, scale down smoothly into chute tray
      if (it.isCollected) {
        const scaleFactor = Math.max(0.01, 1.0 - it.collectAnim * 0.7);
        mesh.scale.setScalar(it.def.radius * scaleFactor);
      }
    }

    // Update and prune burst particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) {
        this.particleGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        this.particles.splice(i, 1);
        continue;
      }
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt;
      p.vy -= 9.8 * dt; // gravity
      const scale = 1.0 - p.life / p.maxLife;
      p.mesh.scale.setScalar(scale);
    }

    // Render scene
    this.renderer.render(this.scene, this.camera);

    // Paced loop for Software WebGL vs standard rAF
    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.animFrameId = requestAnimationFrame(this.tick);
    }
  };

  // Software WebGL pacing helper
  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.timeoutId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.timeoutId = window.setTimeout(cb, 60);
      }
    };
    this.timeoutId = window.setTimeout(poll, 5);
  }

  private onWindowResize = () => {
    this.adjustCameraFraming();
  };

  public adjustCameraFraming() {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const aspect = width / height;
    this.camera.aspect = aspect;

    if (aspect < 0.8) {
      // Narrow Android smartphone portrait (9:16 - 9:20)
      this.camera.position.set(0.8, 17.0, 18.2);
      this.camera.lookAt(1.0, 1.0, 0);
      this.camera.fov = 54;
    } else if (aspect < 1.25) {
      // Tablet portrait / square
      this.camera.position.set(0.6, 14.0, 15.2);
      this.camera.lookAt(0.7, 1.1, 0);
      this.camera.fov = 48;
    } else {
      // Landscape phone, tablet or desktop
      this.camera.position.set(0, 11.5, 12.8);
      this.camera.lookAt(0.5, 1.2, 0);
      this.camera.fov = 42;
    }

    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // Screen raycaster for mouse/touch scoop steering
  public getGroundIntersection(clientX: number, clientY: number, outTarget: THREE.Vector3): boolean {
    const rect = this.container.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    _vec2A.set(x, y);
    raycaster.setFromCamera(_vec2A, this.camera);

    // Intersect plane at Y = 1.2 (Exact camera lookAt elevation and top of prize pile)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.2);
    const target = raycaster.ray.intersectPlane(plane, outTarget);
    if (target) {
      // Natural dampening and arena bounding
      outTarget.x = Math.max(-3.5, Math.min(5.1, outTarget.x));
      outTarget.z = Math.max(-2.8, Math.min(2.8, outTarget.z));
      return true;
    }
    return false;
  }

  public dispose() {
    window.removeEventListener('resize', this.onWindowResize);
    cancelAnimationFrame(this.animFrameId);
    clearTimeout(this.timeoutId);
    this.clearItems();
    this.renderer.dispose();
  }
}
