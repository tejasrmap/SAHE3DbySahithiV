import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MaterialManager } from './scene/materials';
import { BuildingGenerator } from './buildings/buildingGenerator';
import { EnvironmentEngine } from './scene/environment';
import { LightingSystem } from './scene/lightingSystem';
import { CameraManager } from './camera/cameraManager';
import { FirstPersonController } from './camera/firstPersonController';
import { PedestrianRouter } from './navigation/pedestrianRouter';
import { TourController } from './tours/tourController';
import { UIManager } from './ui/uiManager';

export class App {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;

  private buildingGen: BuildingGenerator;
  private envEngine: EnvironmentEngine;
  private lightingSys: LightingSystem;
  private cameraMgr: CameraManager;
  private fpCtrl: FirstPersonController;
  private router: PedestrianRouter;
  private tourCtrl: TourController;
  private uiMgr: UIManager;

  private lastTime = performance.now();

  constructor() {
    this.canvas = document.getElementById('c') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element #c not found');
    }

    // 1. WebGL Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Handle WebGL context loss gracefully
    this.canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      console.warn('WebGL context lost. Pausing rendering.');
    });

    this.canvas.addEventListener('webglcontextrestored', () => {
      console.info('WebGL context restored. Rebuilding scene.');
      window.location.reload();
    });

    // 2. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);

    // 3. OrbitControls
    this.controls = new OrbitControls(this.camera, this.canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = 1.45;
    this.controls.minDistance = 6;
    this.controls.maxDistance = 350;

    // 4. Core Systems
    this.lightingSys = new LightingSystem(this.scene);
    this.lightingSys.setTime(12.0); // start at noon

    this.envEngine = new EnvironmentEngine(this.scene);
    this.buildingGen = new BuildingGenerator(this.scene);
    this.buildingGen.generateAll();

    this.cameraMgr = new CameraManager(this.camera, this.controls);
    this.fpCtrl = new FirstPersonController(this.camera, this.canvas, this.buildingGen.obstacles);
    this.router = new PedestrianRouter(this.scene);
    this.tourCtrl = new TourController(this.camera, this.controls);

    this.uiMgr = new UIManager(
      this.cameraMgr,
      this.router,
      this.tourCtrl,
      this.fpCtrl,
      this.lightingSys,
      this.envEngine
    );

    // 5. Window Resize Handler
    window.addEventListener('resize', () => this.onResize());

    // 6. Raycasting for Building Click Selection
    this.initRaycasting();

    // 7. Start Render Loop
    this.renderLoop = this.renderLoop.bind(this);
    requestAnimationFrame(this.renderLoop);
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private initRaycasting(): void {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    this.canvas.addEventListener('click', (e) => {
      if (this.fpCtrl.isActive || this.tourCtrl.isTourActive) return;

      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

      raycaster.setFromCamera(mouse, this.camera);
      const intersects = raycaster.intersectObjects(this.buildingGen.buildingMeshes);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        if (hit.userData?.data) {
          this.uiMgr.selectPlace(hit.userData.data);
        }
      }
    });
  }

  private renderLoop(now: number): void {
    requestAnimationFrame(this.renderLoop);

    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    if (this.fpCtrl.isActive) {
      this.fpCtrl.update(dt);
    } else if (this.tourCtrl.isTourActive) {
      this.tourCtrl.update(now);
    } else {
      this.cameraMgr.update();
      this.controls.update();
    }

    this.envEngine.update(dt, now);
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
