import * as THREE from 'three';
import { MaterialManager } from '../scene/materials';
import buildingsData from '../data/buildings.json';
import poisData from '../data/pois.json';

export interface BoundingBox2D {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
  id: string;
  name: string;
}

export class BuildingGenerator {
  private scene: THREE.Scene;
  private matMgr: MaterialManager;
  public buildingMeshes: THREE.Mesh[] = [];
  public obstacles: BoundingBox2D[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.matMgr = MaterialManager.getInstance();
  }

  public generateAll(): void {
    this.generateCampusBuildings();
    this.generateMainEntranceArch();
    this.generateSportsComplex();
    this.generateLandmarkMonuments();
    this.generateSurroundingResidentialBlocks();
  }

  private generateCampusBuildings(): void {
    for (const bld of buildingsData) {
      const [w, h, d] = bld.dimensions;
      const [x, , z] = bld.scenePosition;

      const repeatX = Math.max(1, Math.round(w / 6));
      const repeatY = Math.max(1, Math.round(h / 3.5));
      const repeatZ = Math.max(1, Math.round(d / 6));

      // Choose building facade color palette
      let facadeColor = 0xe5e1d8;
      let roofColor = 0x475569;

      if (bld.id.includes('cse')) {
        facadeColor = 0xe2d6be;
        roofColor = 0x334155;
      } else if (bld.id.includes('sh')) {
        facadeColor = 0xe4d8bd;
        roofColor = 0x1e293b;
      } else if (bld.id.includes('civil')) {
        facadeColor = 0xd5cebe;
        roofColor = 0x475569;
      } else if (bld.id.includes('hostel')) {
        facadeColor = 0xb45309;
        roofColor = 0x334155;
      } else if (bld.id.includes('canteen')) {
        facadeColor = 0xd97706;
        roofColor = 0x64748b;
      }

      const matX = this.matMgr.getFacadeMaterial(facadeColor, repeatZ, repeatY);
      const matZ = this.matMgr.getFacadeMaterial(facadeColor, repeatX, repeatY);
      const matRoof = this.matMgr.getSolidMaterial(roofColor);
      const matBottom = this.matMgr.getSolidMaterial(0x334155);

      const materials = [matX, matX, matRoof, matBottom, matZ, matZ];

      const geom = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geom, materials);
      mesh.position.set(x, h / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { id: bld.id, name: bld.name, category: bld.category, data: bld };

      this.scene.add(mesh);
      this.buildingMeshes.push(mesh);

      // Add architectural details: parapet rim, entrance portico, water tanks, AC units
      this.addArchitecturalDetails(mesh, w, h, d, bld);

      // Register collision bounding box (with safety margin)
      this.obstacles.push({
        minX: x - w / 2 - 1.2,
        maxX: x + w / 2 + 1.2,
        minZ: z - d / 2 - 1.2,
        maxZ: z + d / 2 + 1.2,
        id: bld.id,
        name: bld.name
      });
    }
  }

  private addArchitecturalDetails(mesh: THREE.Mesh, w: number, h: number, d: number, bld: any): void {
    const x = mesh.position.x;
    const z = mesh.position.z;

    // 1. Parapet wall along roof border
    const parapetGeom = new THREE.BoxGeometry(w + 0.4, 0.6, d + 0.4);
    const parapet = new THREE.Mesh(parapetGeom, this.matMgr.getSolidMaterial(0x64748b));
    parapet.position.set(x, h + 0.3, z);
    parapet.castShadow = true;
    this.scene.add(parapet);

    // 2. Rooftop structures (water tank & elevator machine room)
    const machineRoomW = Math.min(6, w * 0.3);
    const machineRoomD = Math.min(6, d * 0.3);
    const machineRoomH = 2.4;

    const mr = new THREE.Mesh(
      new THREE.BoxGeometry(machineRoomW, machineRoomH, machineRoomD),
      this.matMgr.getSolidMaterial(0x94a3b8)
    );
    mr.position.set(x + (w * 0.15), h + machineRoomH / 2 + 0.6, z - (d * 0.15));
    mr.castShadow = true;
    this.scene.add(mr);

    // Water tank cylinder on top of machine room
    const tank = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 1.8, 12),
      this.matMgr.getSolidMaterial(0x0284c7)
    );
    tank.position.set(x + (w * 0.15), h + machineRoomH + 1.5, z - (d * 0.15));
    tank.castShadow = true;
    this.scene.add(tank);

    // 3. Solar panels on roof (for S&H and Mech blocks)
    if (bld.id.includes('sh') || bld.id.includes('mech')) {
      const solarGeom = new THREE.PlaneGeometry(w * 0.5, d * 0.4);
      const solarMat = new THREE.MeshLambertMaterial({
        color: 0x0f172a,
        map: this.matMgr.solarTexture
      });
      const solar = new THREE.Mesh(solarGeom, solarMat);
      solar.rotation.x = -Math.PI / 2 + 0.2; // tilted south towards sun
      solar.position.set(x - w * 0.15, h + 1.0, z + d * 0.1);
      this.scene.add(solar);
    }

    // 4. Grand entrance portico at ground level
    const porticoW = Math.min(10, w * 0.4);
    const porticoD = 4.0;
    const porticoH = 4.2;

    const porticoSlab = new THREE.Mesh(
      new THREE.BoxGeometry(porticoW, 0.4, porticoD),
      this.matMgr.getSolidMaterial(0xd97706)
    );
    porticoSlab.position.set(x, porticoH, z + d / 2 + porticoD / 2);
    porticoSlab.castShadow = true;
    this.scene.add(porticoSlab);

    // Portico supporting columns
    [-porticoW / 2 + 0.6, porticoW / 2 - 0.6].forEach(colX => {
      const col = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, porticoH, 10),
        this.matMgr.getSolidMaterial(0xf1f5f9)
      );
      col.position.set(x + colX, porticoH / 2, z + d / 2 + porticoD - 0.6);
      col.castShadow = true;
      this.scene.add(col);
    });
  }

  /**
   * Generates the iconic Siddhartha Academy Maroon Entrance Gate on NH65
   */
  private generateMainEntranceArch(): void {
    const gateGroup = new THREE.Group();
    const maroonColor = 0x6d2a2a;
    const concreteColor = 0x94a3b8;

    // Create signage canvas with high resolution and proper margins
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#6d2a2a';
    ctx.fillRect(0, 0, 2048, 256);

    ctx.fillStyle = '#ffffff';
    const text = 'SIDDHARTHA ACADEMY OF HIGHER EDUCATION';
    let fontSize = 58;
    ctx.font = `bold ${fontSize}px "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif`;
    while (ctx.measureText(text).width > 1650 && fontSize > 20) {
      fontSize -= 2;
      ctx.font = `bold ${fontSize}px "Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif`;
    }
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 1024, 128);

    const signTex = new THREE.CanvasTexture(canvas);
    signTex.anisotropy = 4;
    const signMat = new THREE.MeshLambertMaterial({ map: signTex });
    const maroonMat = this.matMgr.getSolidMaterial(maroonColor);
    const concreteMat = this.matMgr.getSolidMaterial(concreteColor);

    // Overhead beam with university title
    const beam = new THREE.Mesh(
      new THREE.BoxGeometry(16, 2.2, 1.4),
      [maroonMat, maroonMat, maroonMat, maroonMat, signMat, signMat]
    );
    beam.position.y = 7.5;
    beam.castShadow = true;
    gateGroup.add(beam);

    // Supporting massive gateway pylons
    [-6.5, 6.5].forEach(posX => {
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(1.6, 7.5, 1.6), concreteMat);
      pylon.position.set(posX, 3.75, 0);
      pylon.castShadow = true;
      gateGroup.add(pylon);

      // Pylon decorative base
      const base = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 2.4), maroonMat);
      base.position.set(posX, 0.6, 0);
      gateGroup.add(base);
    });

    // Security guard house
    const guardHouse = new THREE.Mesh(new THREE.BoxGeometry(3.6, 3.2, 4.0), concreteMat);
    guardHouse.position.set(11.0, 1.6, 0);
    guardHouse.castShadow = true;
    gateGroup.add(guardHouse);

    // Main Gate Scene Coordinates: [-31.4, 0, 48.5]
    gateGroup.position.set(-31.4, 0, 48.5);
    gateGroup.rotation.y = -0.32; // Align with NH65 curve

    this.scene.add(gateGroup);

    this.obstacles.push({
      minX: -40,
      maxX: -20,
      minZ: 44,
      maxZ: 52,
      id: 'main-gate',
      name: 'SAHE Main Entrance Gate'
    });
  }

  /**
   * Generates athletic facilities: Cricket Oval, Pavilion & Acrylic Basketball Court
   */
  private generateSportsComplex(): void {
    // 1. Cricket Ground Oval
    const cricketPos = [-38.1, 0.05, 18.2];
    const ovalGeom = new THREE.CircleGeometry(1, 48);
    ovalGeom.rotateX(-Math.PI / 2);

    const turfMat = new THREE.MeshLambertMaterial({ color: 0x4d7c0f }); // vibrant green outfield
    const turfMesh = new THREE.Mesh(ovalGeom, turfMat);
    turfMesh.scale.set(34, 1, 42); // 68m x 84m athletic oval
    turfMesh.position.set(cricketPos[0], 0.05, cricketPos[2]);
    turfMesh.receiveShadow = true;
    this.scene.add(turfMesh);

    // Running track outer ring
    const trackGeom = new THREE.RingGeometry(1.0, 1.14, 48);
    trackGeom.rotateX(-Math.PI / 2);
    const trackMat = new THREE.MeshLambertMaterial({ color: 0xc2410c }); // brick-red clay track
    const trackMesh = new THREE.Mesh(trackGeom, trackMat);
    trackMesh.scale.set(34, 1, 42);
    trackMesh.position.set(cricketPos[0], 0.06, cricketPos[2]);
    this.scene.add(trackMesh);

    // Pitch in center
    const pitch = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 22), this.matMgr.getSolidMaterial(0xd4b996));
    pitch.rotation.x = -Math.PI / 2;
    pitch.position.set(cricketPos[0], 0.07, cricketPos[2]);
    this.scene.add(pitch);

    // 2. Synthetic Basketball Court: [59.0, 0.05, -7.5]
    const bbPos = [59.0, 0.05, -7.5];
    const court = new THREE.Mesh(new THREE.PlaneGeometry(28, 15), this.matMgr.getSolidMaterial(0x0284c7));
    court.rotation.x = -Math.PI / 2;
    court.position.set(bbPos[0], 0.06, bbPos[2]);
    this.scene.add(court);

    // Court border apron
    const courtApron = new THREE.Mesh(new THREE.PlaneGeometry(32, 19), this.matMgr.getSolidMaterial(0xd97706));
    courtApron.rotation.x = -Math.PI / 2;
    courtApron.position.set(bbPos[0], 0.05, bbPos[2]);
    this.scene.add(courtApron);
  }

  /**
   * Generates historical and cultural monuments: Saraswathi Statue & Swami Vivekananda
   */
  private generateLandmarkMonuments(): void {
    // 1. Saraswathi Statue & KachhaPi Musical Fountain Garden Circle: [4.4, 0, -14.6]
    const saraswathiPos = [4.4, 0, -14.6];
    const rotunda = new THREE.Mesh(new THREE.CylinderGeometry(5.5, 5.5, 0.4, 32), this.matMgr.getSolidMaterial(0x15803d));
    rotunda.position.set(saraswathiPos[0], 0.2, saraswathiPos[2]);
    this.scene.add(rotunda);

    const fountainRim = new THREE.Mesh(new THREE.TorusGeometry(3.6, 0.35, 12, 32), this.matMgr.getSolidMaterial(0x94a3b8));
    fountainRim.rotation.x = Math.PI / 2;
    fountainRim.position.set(saraswathiPos[0], 0.4, saraswathiPos[2]);
    this.scene.add(fountainRim);

    // Marble statue pedestal & statue sculpture
    const pedestal = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.8, 1.6), this.matMgr.getSolidMaterial(0xf8fafc));
    pedestal.position.set(saraswathiPos[0], 1.2, saraswathiPos[2]);
    pedestal.castShadow = true;
    this.scene.add(pedestal);

    const statue = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2.4, 8), this.matMgr.getSolidMaterial(0xe2e8f0));
    statue.position.set(saraswathiPos[0], 3.2, saraswathiPos[2]);
    statue.castShadow = true;
    this.scene.add(statue);

    // 2. Swami Vivekananda Promenade Statue: [-10.1, 0, 2.5]
    const vikPos = [-10.1, 0, 2.5];
    const vikPed = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 2.2, 12), this.matMgr.getSolidMaterial(0x475569));
    vikPed.position.set(vikPos[0], 1.1, vikPos[2]);
    vikPed.castShadow = true;
    this.scene.add(vikPed);

    const vikStatue = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 0.7), this.matMgr.getSolidMaterial(0xb45309));
    vikStatue.position.set(vikPos[0], 3.2, vikPos[2]);
    vikStatue.castShadow = true;
    this.scene.add(vikStatue);
  }

  /**
   * Generates low-poly residential context houses along the campus periphery
   */
  private generateSurroundingResidentialBlocks(): void {
    const pal = [0xfef3c7, 0xf1f5f9, 0xe2e8f0, 0xfce7f3, 0xdcfce7];

    // Surrounding houses south of NH65 and east of campus
    const houseCoords: [number, number, number, number][] = [
      [-60, 60, 8, 7], [-45, 62, 9, 8], [-10, 65, 8, 8], [15, 68, 10, 8], [35, 70, 9, 7],
      [85, 0, 10, 10], [90, 18, 9, 8], [88, -25, 11, 8], [75, 40, 8, 8]
    ];

    houseCoords.forEach(([hx, hz, hw, hd], idx) => {
      const hh = 4.5 + (idx % 3);
      const c = pal[idx % pal.length];
      const hMesh = new THREE.Mesh(
        new THREE.BoxGeometry(hw, hh, hd),
        this.matMgr.getSolidMaterial(c)
      );
      hMesh.position.set(hx, hh / 2, hz);
      hMesh.castShadow = true;
      hMesh.receiveShadow = true;
      this.scene.add(hMesh);

      // Sloped tile roof
      const roofGeom = new THREE.ConeGeometry(Math.max(hw, hd) * 0.75, 2.2, 4);
      roofGeom.rotateY(Math.PI / 4);
      const roof = new THREE.Mesh(roofGeom, this.matMgr.getSolidMaterial(0xb91c1c));
      roof.position.set(hx, hh + 1.1, hz);
      this.scene.add(roof);
    });
  }
}
