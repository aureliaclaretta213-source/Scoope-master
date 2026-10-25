import { ITEM_CATALOG } from '../data/gameData';
import { ScoopItemDef, UpgradeState } from '../types/game';
import { sound } from '../audio/soundEngine';

export interface PhysicsItem {
  id: number;
  type: string;
  def: ScoopItemDef;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rotX: number;
  rotY: number;
  rotZ: number;
  vRotX: number;
  vRotY: number;
  vRotZ: number;
  radius: number;
  mass: number;
  isScooped: boolean;
  scoopOffsetX: number;
  scoopOffsetY: number;
  scoopOffsetZ: number;
  isCollected: boolean;
  collectAnim: number; // 0 to 1 when sliding down chute
}

export interface ChuteHitEvent {
  item: PhysicsItem;
  value: number;
  isHazard: boolean;
  isSpecial: boolean;
  x: number;
  y: number;
  z: number;
}

export class LuckyScoopPhysics {
  public items: PhysicsItem[] = [];
  public tubBounds = {
    minX: -4.0,
    maxX: 4.0,
    minZ: -3.3,
    maxZ: 3.3,
    floorY: 0.72, // Perfectly flush on top of mirrored arcade tub floor
    wallHeight: 3.5,
  };

  public chuteBounds = {
    minX: 4.4,
    maxX: 7.2,
    minZ: -2.0,
    maxZ: 2.0,
    funnelY: 2.3,
    targetY: 0.4,
  };

  // Scoop shovel state
  public scoop = {
    x: 0,
    y: 3.8, // Resting hover height
    z: 0,
    targetX: 0,
    targetY: 3.8,
    targetZ: 0,
    pitch: 0, // 0 = flat, negative = digging down, positive = tilt up, high positive = dump
    targetPitch: 0,
    roll: 0,
    width: 2.6,
    length: 2.4,
    depth: 1.1,
    isPlunging: false,
    isDumping: false,
    plungeProgress: 0, // 0 to 1
  };

  private nextItemId = 1;
  public onChuteHit?: (event: ChuteHitEvent) => void;
  public onScoopHit?: (count: number) => void;

  constructor() {}

  public initItems(itemPoolRatios: Record<string, number>, totalCount: number, luckBonusMultiplier: number = 1.0) {
    this.items = [];
    this.nextItemId = 1;

    // Build weighted list
    const entries = Object.entries(itemPoolRatios);
    const sumWeights = entries.reduce((acc, [, w]) => acc + w, 0);

    for (let i = 0; i < totalCount; i++) {
      let r = Math.random() * sumWeights;
      let chosenType = entries[0][0];

      for (const [type, weight] of entries) {
        if (r <= weight) {
          chosenType = type;
          break;
        }
        r -= weight;
      }

      // If luck is high, chance to convert common items to rare/special
      if (luckBonusMultiplier > 1.2 && Math.random() < 0.15 && chosenType.startsWith('candy')) {
        chosenType = Math.random() < 0.5 ? 'gem_amethyst' : 'lucky_duck';
      }

      const def = ITEM_CATALOG[chosenType] || ITEM_CATALOG.candy_pink;

      // Arrange in scattered pyramid / pile strictly within tub bounds
      const spreadX = (Math.random() - 0.5) * 6.4;
      const spreadZ = (Math.random() - 0.5) * 5.2;
      // Stagger initial Y heights above floorY (0.72)
      const layer = Math.floor(i / 22);
      const startY = this.tubBounds.floorY + def.radius + layer * 0.45 + Math.random() * 0.25;

      const item: PhysicsItem = {
        id: this.nextItemId++,
        type: chosenType,
        def,
        x: spreadX,
        y: startY,
        z: spreadZ,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.2,
        vz: (Math.random() - 0.5) * 0.3,
        rotX: Math.random() * Math.PI * 2,
        rotY: Math.random() * Math.PI * 2,
        rotZ: Math.random() * Math.PI * 2,
        vRotX: (Math.random() - 0.5) * 1.5,
        vRotY: (Math.random() - 0.5) * 1.5,
        vRotZ: (Math.random() - 0.5) * 1.5,
        radius: def.radius,
        mass: def.isHazard ? 2.5 : def.isSpecial ? 1.4 : 1.0,
        isScooped: false,
        scoopOffsetX: 0,
        scoopOffsetY: 0,
        scoopOffsetZ: 0,
        isCollected: false,
        collectAnim: 0,
      };

      this.items.push(item);
    }
  }

  public setScoopUpgrades(upgrades: UpgradeState) {
    const sizeMultiplier = [1.0, 1.3, 1.65, 2.0][Math.min(3, upgrades.scoopSize - 1)];
    this.scoop.width = 2.4 * sizeMultiplier;
    this.scoop.length = 2.2 * Math.sqrt(sizeMultiplier);
    this.scoop.depth = 1.0 + (upgrades.lipGuard > 0 ? 0.35 * upgrades.lipGuard : 0);
  }

  public step(dt: number, upgrades: UpgradeState) {
    const gravity = -14.0;
    const subSteps = 3;
    const subDt = dt / subSteps;

    // Smooth scoop motion toward target
    const speedMult = [1.0, 1.25, 1.5, 2.0][Math.min(3, upgrades.liftSpeed - 1)];
    const lerpRate = Math.min(1.0, 12.0 * speedMult * dt);

    this.scoop.x += (this.scoop.targetX - this.scoop.x) * lerpRate;
    this.scoop.y += (this.scoop.targetY - this.scoop.y) * lerpRate;
    this.scoop.z += (this.scoop.targetZ - this.scoop.z) * lerpRate;
    this.scoop.pitch += (this.scoop.targetPitch - this.scoop.pitch) * lerpRate;

    for (let step = 0; step < subSteps; step++) {
      this.physicsSubStep(subDt, upgrades, gravity);
    }
  }

  private physicsSubStep(dt: number, upgrades: UpgradeState, gravity: number) {
    const scoop = this.scoop;
    const halfWidth = scoop.width * 0.5;
    const halfLength = scoop.length * 0.5;

    const cosP = Math.cos(scoop.pitch);
    const sinP = Math.sin(scoop.pitch);

    // Magnetism pull for valuable items
    const magnetPower = upgrades.magnetism > 0 ? upgrades.magnetism * 4.5 : 0;

    let newlyScoopedCount = 0;

    for (let i = 0; i < this.items.length; i++) {
      const it = this.items[i];

      // 1. If already collected down the chute:
      if (it.isCollected) {
        it.collectAnim += dt * 2.2;
        it.x += (5.5 - it.x) * dt * 5;
        it.y -= dt * 3.2;
        it.z += (0 - it.z) * dt * 5;
        continue;
      }

      // 2. If held inside scoop:
      if (it.isScooped) {
        // While scoop is not dumping (pitch < 0.8), keep firmly nestled in shovel bed
        if (scoop.pitch < 0.8) {
          it.x = scoop.x + it.scoopOffsetX;
          // Apply shovel pitch rotation to local offset
          it.y = scoop.y + it.scoopOffsetY * cosP - it.scoopOffsetZ * sinP;
          it.z = scoop.z + it.scoopOffsetY * sinP + it.scoopOffsetZ * cosP;
          it.vx = 0;
          it.vy = 0;
          it.vz = 0;
          continue;
        } else {
          // Scoop is tilting forward to dump!
          it.isScooped = false;
          // Eject items forward toward chute
          it.vx = 3.8 + Math.random() * 1.5;
          it.vy = -1.2 + Math.random() * 0.5;
          it.vz = (Math.random() - 0.5) * 1.2;

          // If over chute or near chute edge, collect directly
          if (scoop.x > 3.4) {
            it.isCollected = true;
            sound.playChuteScore(Math.abs(it.def.value));
            if (it.def.isHazard) sound.playHazard();

            if (this.onChuteHit) {
              this.onChuteHit({
                item: it,
                value: it.def.value,
                isHazard: !!it.def.isHazard,
                isSpecial: !!it.def.isSpecial,
                x: it.x,
                y: it.y,
                z: it.z,
              });
            }
          }
          continue;
        }
      }

      // 3. Free item: Magnetism pull towards scoop when plunging
      if (magnetPower > 0 && !it.def.isHazard && (it.def.rarity === 'rare' || it.def.rarity === 'epic' || it.def.rarity === 'legendary')) {
        const dx = scoop.x - it.x;
        const dy = (scoop.y - 0.2) - it.y;
        const dz = scoop.z - it.z;
        const distSq = dx * dx + dy * dy + dz * dz;
        if (distSq < 16.0 && distSq > 0.04) {
          const dist = Math.sqrt(distSq);
          const force = (magnetPower / (distSq + 1.0)) * 0.8;
          it.vx += (dx / dist) * force * dt;
          it.vy += (dy / dist) * force * dt;
          it.vz += (dz / dist) * force * dt;
        }
      }

      // Check if item enters scoop during plunge
      const dx = it.x - scoop.x;
      const dz = it.z - scoop.z;
      const dy = it.y - scoop.y;

      const insideX = Math.abs(dx) < halfWidth * 0.9;
      const insideZ = Math.abs(dz) < halfLength * 0.9;
      const insideY = dy > -0.6 && dy < 1.2;

      // When plunging or shovel is deep in pile, capture items into shovel bed
      if (scoop.isPlunging && insideX && insideZ && insideY && !it.isScooped) {
        it.isScooped = true;
        // Assign random offset inside scoop
        it.scoopOffsetX = (Math.random() - 0.5) * (halfWidth * 1.2);
        it.scoopOffsetY = 0.15 + Math.random() * 0.35;
        it.scoopOffsetZ = (Math.random() - 0.5) * (halfLength * 1.1);

        newlyScoopedCount++;
        if (it.def.type === 'lucky_duck') {
          sound.playDuckSqueak();
        } else {
          sound.playItemClink(it.def.rarity);
        }
        continue;
      }

      // Free item gravity
      it.vy += gravity * dt;

      // Push items outward if shovel dives into them
      if (scoop.isPlunging) {
        const horizDist = Math.sqrt(dx * dx + dz * dz);
        if (horizDist < halfWidth + 0.5 && Math.abs(dy) < 1.0) {
          const pushAngle = Math.atan2(dz, dx);
          it.vx += Math.cos(pushAngle) * 3.5 * dt;
          it.vz += Math.sin(pushAngle) * 3.5 * dt;
          it.vy += 1.5 * dt;
        }
      }

      // Integration
      it.x += it.vx * dt;
      it.y += it.vy * dt;
      it.z += it.vz * dt;

      it.rotX += it.vRotX * dt;
      it.rotY += it.vRotY * dt;
      it.rotZ += it.vRotZ * dt;

      // Tub Floor collision (Always stays on top of mirror floor at 0.72)
      if (it.y < this.tubBounds.floorY + it.radius) {
        it.y = this.tubBounds.floorY + it.radius;
        it.vy = -it.vy * 0.25;
        it.vx *= 0.88;
        it.vz *= 0.88;
      }

      // Tub Wall collisions
      if (it.x < this.tubBounds.minX + it.radius) {
        it.x = this.tubBounds.minX + it.radius;
        it.vx = -it.vx * 0.4;
      }
      if (it.x > this.tubBounds.maxX - it.radius) {
        it.x = this.tubBounds.maxX - it.radius;
        it.vx = -it.vx * 0.4;
      }
      if (it.z < this.tubBounds.minZ + it.radius) {
        it.z = this.tubBounds.minZ + it.radius;
        it.vz = -it.vz * 0.4;
      }
      if (it.z > this.tubBounds.maxZ - it.radius) {
        it.z = this.tubBounds.maxZ - it.radius;
        it.vz = -it.vz * 0.4;
      }

      it.vx *= 0.99;
      it.vz *= 0.99;
    }

    if (newlyScoopedCount > 0 && this.onScoopHit) {
      this.onScoopHit(newlyScoopedCount);
    }

    this.solveItemCollisions();
  }

  // Pile stacking relaxation
  private solveItemCollisions() {
    const len = this.items.length;
    for (let i = 0; i < len; i++) {
      const a = this.items[i];
      if (a.isCollected || a.isScooped) continue;

      for (let j = i + 1; j < len; j++) {
        const b = this.items[j];
        if (b.isCollected || b.isScooped) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const minDist = a.radius + b.radius;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq < minDist * minDist && distSq > 0.00001) {
          const dist = Math.sqrt(distSq);
          const overlap = (minDist - dist) * 0.5;

          const nx = dx / dist;
          const ny = dy / dist;
          const nz = dz / dist;

          a.x -= nx * overlap;
          a.y -= ny * overlap;
          a.z -= nz * overlap;

          b.x += nx * overlap;
          b.y += ny * overlap;
          b.z += nz * overlap;

          const rvx = b.vx - a.vx;
          const rvy = b.vy - a.vy;
          const rvz = b.vz - a.vz;
          const velAlongNormal = rvx * nx + rvy * ny + rvz * nz;

          if (velAlongNormal < 0) {
            const restitution = 0.2;
            const impulse = (-(1 + restitution) * velAlongNormal) / (a.mass + b.mass);
            a.vx -= impulse * b.mass * nx;
            a.vy -= impulse * b.mass * ny;
            a.vz -= impulse * b.mass * nz;

            b.vx += impulse * a.mass * nx;
            b.vy += impulse * a.mass * ny;
            b.vz += impulse * a.mass * nz;
          }
        }
      }
    }
  }

  // Plunge & Scoop into pile
  public startScoopPlunge(onComplete?: () => void) {
    if (this.scoop.isPlunging || this.scoop.isDumping) return;
    this.scoop.isPlunging = true;
    sound.playPlunge();

    // 1. Plunge deep into the heart of the prize pile
    this.scoop.targetY = 0.85;
    this.scoop.targetPitch = -0.35; // Blade digs forward

    setTimeout(() => {
      // 2. Curl scoop upward to nestle and secure items
      this.scoop.targetPitch = 0.28;
      this.scoop.targetY = 3.6; // Lift high in the air
      sound.playLift();

      setTimeout(() => {
        this.scoop.isPlunging = false;
        if (onComplete) onComplete();
      }, 550);
    }, 420);
  }

  // Dump Shovel into Chute
  public triggerDump(onComplete?: () => void) {
    if (this.scoop.isDumping) return;
    this.scoop.isDumping = true;
    sound.playDump();

    // 1. Rapidly glide shovel right over the chute opening (X = 5.2, Z = 0)
    this.scoop.targetX = 5.2;
    this.scoop.targetZ = 0.0;
    this.scoop.targetY = 3.5;

    setTimeout(() => {
      // 2. Tilt shovel forward to dump all items
      this.scoop.targetPitch = 1.35; // 77 degrees forward dump

      // Systematically collect any scooped items
      const scoopedItems = this.items.filter((it) => it.isScooped && !it.isCollected);
      scoopedItems.forEach((it, idx) => {
        setTimeout(() => {
          it.isScooped = false;
          it.isCollected = true;
          it.x = 5.2 + (Math.random() - 0.5) * 0.3;
          it.y = 3.1;
          it.z = (Math.random() - 0.5) * 0.3;
          it.vx = 0.8;
          it.vy = -3.2;

          sound.playChuteScore(Math.abs(it.def.value));
          if (it.def.isHazard) sound.playHazard();

          if (this.onChuteHit) {
            this.onChuteHit({
              item: it,
              value: it.def.value,
              isHazard: !!it.def.isHazard,
              isSpecial: !!it.def.isSpecial,
              x: it.x,
              y: it.y,
              z: it.z,
            });
          }
        }, idx * 50);
      });

      const delay = Math.max(650, scoopedItems.length * 50 + 250);
      setTimeout(() => {
        // 3. Return shovel to horizontal and glide back to center of tub
        this.scoop.targetPitch = 0.0;
        this.scoop.targetX = 0.0;
        this.scoop.targetZ = 0.0;
        this.scoop.targetY = 3.6;
        this.scoop.isDumping = false;
        if (onComplete) onComplete();
      }, delay);
    }, 380);
  }

  public setScoopTarget(x: number, z: number) {
    if (this.scoop.isDumping) return;
    this.scoop.targetX = Math.max(-3.5, Math.min(5.2, x));
    this.scoop.targetZ = Math.max(-2.8, Math.min(2.8, z));
  }

  public getScoopedCount(): number {
    return this.items.filter((it) => it.isScooped && !it.isCollected).length;
  }
}
