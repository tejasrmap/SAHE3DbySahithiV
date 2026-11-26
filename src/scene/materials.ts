import * as THREE from 'three';

/**
 * Texture & Material Management Engine
 * Procedural architectural facades, emissive night windows, road markings, and roof textures
 */

export class MaterialManager {
  private static instance: MaterialManager;
  private textureCache = new Map<string, THREE.Texture>();
  private materialCache = new Map<string, THREE.Material>();

  public windowTexture: THREE.CanvasTexture;
  public emissiveTexture: THREE.CanvasTexture;
  public solarTexture: THREE.CanvasTexture;
  public roadTexture: THREE.CanvasTexture;
  public lampHaloTexture: THREE.CanvasTexture;

  private constructor() {
    this.windowTexture = this.generateWindowTexture();
    this.emissiveTexture = this.generateEmissiveTexture();
    this.solarTexture = this.generateSolarTexture();
    this.roadTexture = this.generateRoadTexture();
    this.lampHaloTexture = this.generateLampHaloTexture();
  }

  public static getInstance(): MaterialManager {
    if (!MaterialManager.instance) {
      MaterialManager.instance = new MaterialManager();
    }
    return MaterialManager.instance;
  }

  private generateWindowTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#f0ede6';
    ctx.fillRect(0, 0, 256, 256);

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const x = col * 64 + 12;
        const y = row * 64 + 10;

        // Window frame
        ctx.fillStyle = '#4a5568';
        ctx.fillRect(x - 2, y - 2, 44, 46);

        // Glass pane
        ctx.fillStyle = '#8fa3b8';
        ctx.fillRect(x, y, 40, 42);

        // Glass highlight reflection
        ctx.fillStyle = '#dbeafe';
        ctx.fillRect(x + 2, y + 2, 16, 38);

        // Mullion divider
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(x + 19, y, 2, 42);
        ctx.fillRect(x, y + 20, 40, 2);

        // Sunshade / Chajja ledge
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(x - 4, y - 5, 48, 4);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
  }

  private generateEmissiveTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#05070a';
    ctx.fillRect(0, 0, 256, 256);

    let seed = 42;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        const x = col * 64 + 12;
        const y = row * 64 + 10;

        // Randomly illuminated office and classroom windows
        if (random() > 0.35) {
          ctx.fillStyle = random() > 0.6 ? '#fef08a' : '#fed7aa'; // warm halogen or fluorescent glow
          ctx.fillRect(x, y, 40, 42);
        }
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 4;
    return tex;
  }

  private generateSolarTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 128, 128);

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 128; i += 16) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 128);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(128, i);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  private generateRoadTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Asphalt surface
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 0, 128, 256);

    // Dashed center line
    ctx.fillStyle = '#f8fafc';
    for (let y = 16; y < 256; y += 64) {
      ctx.fillRect(60, y, 8, 36);
    }

    // Yellow edge lines
    ctx.fillStyle = '#eab308';
    ctx.fillRect(6, 0, 4, 256);
    ctx.fillRect(118, 0, 4, 256);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  private generateLampHaloTexture(): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;

    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(254, 240, 138, 0.95)');
    grad.addColorStop(0.3, 'rgba(253, 224, 71, 0.5)');
    grad.addColorStop(1, 'rgba(250, 204, 21, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    return new THREE.CanvasTexture(canvas);
  }

  public getFacadeMaterial(colorHex: number, repeatX: number, repeatY: number): THREE.MeshLambertMaterial {
    const key = `facade_${colorHex}_${repeatX}_${repeatY}`;
    if (this.materialCache.has(key)) {
      return this.materialCache.get(key) as THREE.MeshLambertMaterial;
    }

    const map = this.windowTexture.clone();
    map.repeat.set(repeatX, repeatY);
    map.needsUpdate = true;

    const emissiveMap = this.emissiveTexture.clone();
    emissiveMap.repeat.set(repeatX, repeatY);
    emissiveMap.needsUpdate = true;

    const mat = new THREE.MeshLambertMaterial({
      color: colorHex,
      map: map,
      emissive: 0xffffff,
      emissiveMap: emissiveMap,
      emissiveIntensity: 0
    });

    this.materialCache.set(key, mat);
    return mat;
  }

  public getSolidMaterial(colorHex: number): THREE.MeshLambertMaterial {
    const key = `solid_${colorHex}`;
    if (this.materialCache.has(key)) {
      return this.materialCache.get(key) as THREE.MeshLambertMaterial;
    }
    const mat = new THREE.MeshLambertMaterial({ color: colorHex });
    this.materialCache.set(key, mat);
    return mat;
  }
}
