import * as THREE from 'three';
import { BoundingBox2D } from '../buildings/buildingGenerator';

export class FirstPersonController {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  public isActive = false;

  // Eye-level camera height: 1.75m
  public eyeHeight = 1.75;
  public position = new THREE.Vector3(-31.4, 1.75, 45.0); // Start near Main Gate

  // Orientation
  public yaw = 0;
  public pitch = 0;

  // Movement physics
  private keys: Record<string, boolean> = {};
  public isSprinting = false;
  public walkSpeed = 4.2; // m/s
  public sprintSpeed = 8.5; // m/s

  private obstacles: BoundingBox2D[] = [];
  public onCollision?: (obstacleName: string) => void;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement, obstacles: BoundingBox2D[]) {
    this.camera = camera;
    this.domElement = domElement;
    this.obstacles = obstacles;

    this.initEventListeners();
  }

  private initEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      if (!this.isActive) return;
      if (['input', 'textarea'].includes((document.activeElement?.tagName || '').toLowerCase())) return;

      this.keys[e.code] = true;
      if (e.key === 'Shift') this.isSprinting = true;
      if (e.key === 'Escape') this.exit();
    });

    window.addEventListener('keyup', (e) => {
      if (!this.isActive) return;
      this.keys[e.code] = false;
      if (e.key === 'Shift') this.isSprinting = false;
    });

    let isMouseDown = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    this.domElement.addEventListener('mousedown', (e) => {
      if (!this.isActive) return;
      isMouseDown = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      isMouseDown = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isActive || !isMouseDown) return;

      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      const sensitivity = 0.003;
      this.yaw -= deltaX * sensitivity;
      this.pitch -= deltaY * sensitivity;

      // Limit pitch to prevent flipping
      this.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.pitch));
    });

    // Touch look support for mobile
    let prevTouchX = 0;
    let prevTouchY = 0;
    this.domElement.addEventListener('touchstart', (e) => {
      if (!this.isActive || e.touches.length === 0) return;
      prevTouchX = e.touches[0].clientX;
      prevTouchY = e.touches[0].clientY;
    });

    this.domElement.addEventListener('touchmove', (e) => {
      if (!this.isActive || e.touches.length === 0) return;
      const deltaX = e.touches[0].clientX - prevTouchX;
      const deltaY = e.touches[0].clientY - prevTouchY;
      prevTouchX = e.touches[0].clientX;
      prevTouchY = e.touches[0].clientY;

      const sensitivity = 0.004;
      this.yaw -= deltaX * sensitivity;
      this.pitch -= deltaY * sensitivity;
      this.pitch = Math.max(-Math.PI / 2.5, Math.min(Math.PI / 2.5, this.pitch));
    });
  }

  public enter(startX?: number, startZ?: number): void {
    this.isActive = true;
    if (startX !== undefined && startZ !== undefined) {
      this.position.set(startX, this.eyeHeight, startZ);
    }
    this.camera.position.copy(this.position);
    this.keys = {};
  }

  public exit(): void {
    this.isActive = false;
    this.keys = {};
  }

  public update(dt: number): void {
    if (!this.isActive) return;

    const speed = (this.isSprinting ? this.sprintSpeed : this.walkSpeed) * dt;

    let moveX = 0;
    let moveZ = 0;

    if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;

    if (moveX !== 0 || moveZ !== 0) {
      const len = Math.hypot(moveX, moveZ);
      moveX /= len;
      moveZ /= len;

      // Rotate movement vector by yaw
      const forwardX = -Math.sin(this.yaw);
      const forwardZ = -Math.cos(this.yaw);
      const rightX = Math.cos(this.yaw);
      const rightZ = -Math.sin(this.yaw);

      const dx = (rightX * moveX + forwardX * (-moveZ)) * speed;
      const dz = (rightZ * moveX + forwardZ * (-moveZ)) * speed;

      // Collision detection check against obstacles
      const nextX = this.position.x + dx;
      const nextZ = this.position.z + dz;

      let collideX = false;
      let collideZ = false;

      for (const obs of this.obstacles) {
        if (nextX >= obs.minX && nextX <= obs.maxX && this.position.z >= obs.minZ && this.position.z <= obs.maxZ) {
          collideX = true;
          this.onCollision?.(obs.name);
        }
        if (this.position.x >= obs.minX && this.position.x <= obs.maxX && nextZ >= obs.minZ && nextZ <= obs.maxZ) {
          collideZ = true;
          this.onCollision?.(obs.name);
        }
      }

      // Campus boundary limits
      if (Math.abs(nextX) > 130) collideX = true;
      if (Math.abs(nextZ) > 110) collideZ = true;

      if (!collideX) this.position.x = nextX;
      if (!collideZ) this.position.z = nextZ;
    }

    this.position.y = this.eyeHeight;
    this.camera.position.copy(this.position);

    // Apply Euler angles to camera
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.x = this.pitch;
    euler.y = this.yaw;
    this.camera.quaternion.setFromEuler(euler);
  }
}
