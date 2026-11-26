import * as THREE from 'three';
import { MaterialManager } from './materials';
import roadsData from '../data/campus-roads.json';
import { latLonToScene } from '../gis/coordinateConverter';

export type WeatherType = 'clear' | 'cloudy' | 'fog' | 'rain';
export type SeasonType = 'summer' | 'monsoon' | 'autumn' | 'winter';

export class EnvironmentEngine {
  private scene: THREE.Scene;
  private matMgr: MaterialManager;

  // Visual Groups
  public groundMesh: THREE.Mesh;
  public boundaryLine: THREE.Line;
  public roadsGroup = new THREE.Group();
  public foliageGroup = new THREE.Group();
  public lampGroup = new THREE.Group();
  public trafficGroup = new THREE.Group();
  public birdsGroup = new THREE.Group();
  public weatherGroup = new THREE.Group();

  // Instanced Meshes
  private treeTrunks!: THREE.InstancedMesh;
  private treeFoliage!: THREE.InstancedMesh;
  private treeCount = 280;
  private treeScales: number[] = [];

  // Weather components
  private rainMesh?: THREE.LineSegments;
  private rainPositions?: Float32Array;
  private cloudsGroup = new THREE.Group();

  // Animated elements
  private cars: { mesh: THREE.Group; progress: number; speed: number; direction: number; roadLength: number }[] = [];
  private pedestrians: { mesh: THREE.Group; progress: number; speed: number; direction: number; roadLength: number }[] = [];
  private birds: { group: THREE.Group; angle: number; radius: number; speed: number; center: THREE.Vector3 }[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.matMgr = MaterialManager.getInstance();

    // 1. Campus Ground Plane
    const groundGeom = new THREE.PlaneGeometry(600, 600);
    groundGeom.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x4d7c0f }); // base campus grass
    this.groundMesh = new THREE.Mesh(groundGeom, groundMat);
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    // 2. Campus Boundary Perimeter Line (Neon glowing boundary)
    this.boundaryLine = this.createBoundaryLine();
    this.scene.add(this.boundaryLine);

    // Add component groups
    this.scene.add(this.roadsGroup);
    this.scene.add(this.foliageGroup);
    this.scene.add(this.lampGroup);
    this.scene.add(this.trafficGroup);
    this.scene.add(this.birdsGroup);
    this.scene.add(this.weatherGroup);

    this.initRoads();
    this.initFoliage();
    this.initStreetLamps();
    this.initTraffic();
    this.initBirds();
    this.initWeatherSystems();
  }

  private createBoundaryLine(): THREE.Line {
    const boundaryGeo = [
      [16.4828, 80.6908],
      [16.4831, 80.6942],
      [16.4838, 80.6958],
      [16.4862, 80.6965],
      [16.4878, 80.6952],
      [16.4876, 80.6925],
      [16.4855, 80.6905],
      [16.4839, 80.6902],
      [16.4828, 80.6908]
    ];

    const points: THREE.Vector3[] = boundaryGeo.map(([lat, lon]) => {
      const [x, z] = latLonToScene(lat, lon);
      return new THREE.Vector3(x, 0.25, z);
    });

    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 2 });
    return new THREE.Line(geom, mat);
  }

  private initRoads(): void {
    const roadMat = this.matMgr.getSolidMaterial(0x334155);

    for (const r of roadsData) {
      const pts = r.coordinates.map(([lon, lat]) => latLonToScene(lat, lon));

      for (let i = 1; i < pts.length; i++) {
        const p1 = pts[i - 1];
        const p2 = pts[i];
        const dx = p2[0] - p1[0];
        const dz = p2[1] - p1[1];
        const len = Math.hypot(dx, dz);

        const roadMesh = new THREE.Mesh(new THREE.BoxGeometry(len, 0.1, r.width), roadMat);
        roadMesh.position.set((p1[0] + p2[0]) / 2, 0.05, (p1[1] + p2[1]) / 2);
        roadMesh.rotation.y = -Math.atan2(dz, dx);
        roadMesh.receiveShadow = true;
        this.roadsGroup.add(roadMesh);

        // Cylinder at junction nodes to smoothly cap angles
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(r.width / 2, r.width / 2, 0.1, 16), roadMat);
        cap.position.set(p1[0], 0.05, p1[1]);
        this.roadsGroup.add(cap);
      }
    }
  }

  private initFoliage(): void {
    this.treeTrunks = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.2, 0.3, 1.8, 6),
      this.matMgr.getSolidMaterial(0x5c3d2e),
      this.treeCount
    );
    this.treeFoliage = new THREE.InstancedMesh(
      new THREE.ConeGeometry(1.6, 3.8, 7),
      new THREE.MeshLambertMaterial({ color: 0x2e7d32 }),
      this.treeCount
    );

    this.treeTrunks.castShadow = true;
    this.treeFoliage.castShadow = true;

    const dummy = new THREE.Object3D();
    let seed = 123;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    let placed = 0;
    while (placed < this.treeCount) {
      const x = (rnd() - 0.5) * 240;
      const z = (rnd() - 0.5) * 200;

      // Avoid placing trees directly in the middle of cricket pitch or buildings
      if (Math.hypot(x - (-38.1), z - 18.2) < 26) continue;
      if (Math.hypot(x, z) < 15) continue;

      const scale = 0.8 + rnd() * 0.6;
      this.treeScales.push(scale);

      dummy.position.set(x, 0.9 * scale, z);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      this.treeTrunks.setMatrixAt(placed, dummy.matrix);

      dummy.position.set(x, (1.8 + 1.9) * scale, z);
      dummy.updateMatrix();
      this.treeFoliage.setMatrixAt(placed, dummy.matrix);

      placed++;
    }

    this.treeTrunks.instanceMatrix.needsUpdate = true;
    this.treeFoliage.instanceMatrix.needsUpdate = true;

    this.foliageGroup.add(this.treeTrunks, this.treeFoliage);
  }

  private initStreetLamps(): void {
    const lampPositions: [number, number][] = [
      [-31.4, 48.5], [-25, 38], [-20, 28], [-15, 15], [-10.1, 2.5],
      [-5, -10], [4.4, -14.6], [10, -5], [16.2, 5.4], [22.4, -16.8],
      [35, -16.8], [50, -17.5], [69.4, -17.5]
    ];

    const poleMat = this.matMgr.getSolidMaterial(0x475569);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    lampPositions.forEach(([lx, lz]) => {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.2, 6), poleMat);
      pole.position.set(lx, 2.1, lz);
      pole.castShadow = true;
      this.lampGroup.add(pole);

      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), bulbMat);
      bulb.position.set(lx, 4.2, lz);
      this.lampGroup.add(bulb);

      // Night light halo projection
      const haloMat = new THREE.MeshBasicMaterial({
        map: this.matMgr.lampHaloTexture,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), haloMat);
      halo.rotation.x = -Math.PI / 2;
      halo.position.set(lx, 0.1, lz);
      this.lampGroup.add(halo);
    });
  }

  private initTraffic(): void {
    const carColors = [0xd32f2f, 0x1976d2, 0xffffff, 0x212121, 0xfbc02d, 0x388e3c];

    // Vehicles on highway and main boulevard
    for (let i = 0; i < 18; i++) {
      const group = new THREE.Group();
      const carMat = this.matMgr.getSolidMaterial(carColors[i % carColors.length]);
      const body = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 1.8), carMat);
      body.position.y = 0.6;
      body.castShadow = true;
      group.add(body);

      const roof = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.8, 1.5), this.matMgr.getSolidMaterial(0x94a3b8));
      roof.position.set(-0.2, 1.4, 0);
      group.add(roof);

      this.trafficGroup.add(group);
      this.cars.push({
        mesh: group,
        progress: (i / 18) * 120,
        speed: 12 + (i % 5) * 2,
        direction: i % 2 === 0 ? 1 : -1,
        roadLength: 140
      });
    }

    // Pedestrians walking along internal promenades
    for (let i = 0; i < 24; i++) {
      const pGroup = new THREE.Group();
      const pMat = this.matMgr.getSolidMaterial(carColors[(i * 2) % carColors.length]);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.4, 6), pMat);
      body.position.y = 0.7;
      pGroup.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 6), this.matMgr.getSolidMaterial(0xfbcfe8));
      head.position.y = 1.55;
      pGroup.add(head);

      this.trafficGroup.add(pGroup);
      this.pedestrians.push({
        mesh: pGroup,
        progress: (i / 24) * 80,
        speed: 1.8 + (i % 3) * 0.4,
        direction: i % 2 === 0 ? 1 : -1,
        roadLength: 90
      });
    }
  }

  private initBirds(): void {
    const birdMat = this.matMgr.getSolidMaterial(0x1e293b);

    for (let i = 0; i < 8; i++) {
      const bGroup = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.15, 0.2), birdMat);
      bGroup.add(body);

      [-0.4, 0.4].forEach(wingX => {
        const wing = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.8), birdMat);
        wing.position.set(wingX, 0, 0.3);
        bGroup.add(wing);
      });

      this.birdsGroup.add(bGroup);
      this.birds.push({
        group: bGroup,
        angle: (i / 8) * Math.PI * 2,
        radius: 25 + (i * 6),
        speed: 0.35 + (i * 0.05),
        center: new THREE.Vector3(-10, 28 + (i * 2), 5)
      });
    }
  }

  private initWeatherSystems(): void {
    // 1. Procedural Clouds
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.85
    });

    for (let i = 0; i < 12; i++) {
      const cloud = new THREE.Group();
      for (let j = 0; j < 4; j++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(4 + Math.random() * 3, 7, 5), cloudMat);
        puff.scale.set(2, 0.8, 1.5);
        puff.position.set(j * 5 - 8, Math.random() * 2, Math.random() * 4);
        cloud.add(puff);
      }
      cloud.position.set((Math.random() - 0.5) * 350, 60 + Math.random() * 20, (Math.random() - 0.5) * 300);
      this.cloudsGroup.add(cloud);
    }
    this.cloudsGroup.visible = false;
    this.weatherGroup.add(this.cloudsGroup);

    // 2. Particle Rain System (1,200 particles)
    const rainCount = 1200;
    this.rainPositions = new Float32Array(rainCount * 6);
    for (let i = 0; i < rainCount; i++) {
      const rx = (Math.random() - 0.5) * 200;
      const ry = Math.random() * 80;
      const rz = (Math.random() - 0.5) * 200;
      this.rainPositions.set([rx, ry, rz, rx + 0.1, ry - 2.5, rz], i * 6);
    }

    const rainGeom = new THREE.BufferGeometry();
    rainGeom.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    const rainMat = new THREE.LineBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.6
    });
    this.rainMesh = new THREE.LineSegments(rainGeom, rainMat);
    this.rainMesh.visible = false;
    this.weatherGroup.add(this.rainMesh);
  }

  public applySeason(season: SeasonType): void {
    const seasonPalette: Record<SeasonType, { ground: number; leaf: number }> = {
      summer: { ground: 0x65a30d, leaf: 0x15803d },
      monsoon: { ground: 0x16a34a, leaf: 0x166534 },
      autumn: { ground: 0xa16207, leaf: 0xd97706 },
      winter: { ground: 0x475569, leaf: 0x1e3a8a }
    };

    const colors = seasonPalette[season];
    (this.groundMesh.material as THREE.MeshLambertMaterial).color.setHex(colors.ground);
    (this.treeFoliage.material as THREE.MeshLambertMaterial).color.setHex(colors.leaf);
  }

  public applyWeather(weather: WeatherType): void {
    if (this.cloudsGroup) this.cloudsGroup.visible = weather === 'cloudy' || weather === 'rain';
    if (this.rainMesh) this.rainMesh.visible = weather === 'rain';
  }

  public update(dt: number, timeMs: number): void {
    // Animate Rain
    if (this.rainMesh && this.rainMesh.visible && this.rainPositions) {
      for (let i = 0; i < 1200; i++) {
        let y = this.rainPositions[i * 6 + 1] - 70 * dt;
        if (y < 0) y = 80;
        this.rainPositions[i * 6 + 1] = y;
        this.rainPositions[i * 6 + 4] = y - 2.5;
      }
      this.rainMesh.geometry.attributes.position.needsUpdate = true;
    }

    // Animate Clouds
    if (this.cloudsGroup && this.cloudsGroup.visible) {
      this.cloudsGroup.children.forEach(c => {
        c.position.x += 4 * dt;
        if (c.position.x > 200) c.position.x = -200;
      });
    }

    // Animate Cars
    this.cars.forEach(car => {
      car.progress += car.direction * car.speed * dt;
      if (car.progress > car.roadLength) {
        car.progress = car.roadLength;
        car.direction = -1;
      } else if (car.progress < 0) {
        car.progress = 0;
        car.direction = 1;
      }
      // Linear highway path along NH65
      const carX = -70 + car.progress;
      const carZ = 50 + (carX * 0.08);
      car.mesh.position.set(carX, 0.05, carZ);
      car.mesh.rotation.y = car.direction > 0 ? 0.08 : Math.PI + 0.08;
    });

    // Animate Pedestrians
    this.pedestrians.forEach(p => {
      p.progress += p.direction * p.speed * dt;
      if (p.progress > p.roadLength) {
        p.progress = p.roadLength;
        p.direction = -1;
      } else if (p.progress < 0) {
        p.progress = 0;
        p.direction = 1;
      }
      const pX = -25 + (p.progress * 0.6);
      const pZ = 35 - (p.progress * 0.5);
      p.mesh.position.set(pX, 0.05, pZ);
      p.mesh.rotation.y = p.direction > 0 ? -0.7 : Math.PI - 0.7;
    });

    // Animate Birds
    this.birds.forEach((b, idx) => {
      b.angle += b.speed * dt;
      b.group.position.set(
        b.center.x + Math.cos(b.angle) * b.radius,
        b.center.y + Math.sin(b.angle * 2) * 1.5,
        b.center.z + Math.sin(b.angle) * b.radius
      );
      b.group.rotation.y = -(b.angle + Math.PI / 2);

      // Wing flapping animation
      const flap = Math.sin(timeMs * 0.015 + idx) * 0.5;
      b.group.children[1].rotation.z = flap;
      b.group.children[2].rotation.z = -flap;
    });
  }
}
