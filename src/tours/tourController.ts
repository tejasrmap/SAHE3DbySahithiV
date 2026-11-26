import * as THREE from 'three';

export interface TourStop {
  id: string;
  name: string;
  subtitle: string;
  target: THREE.Vector3;
  cameraPos: THREE.Vector3;
  durationSeconds: number;
}

export class TourController {
  private camera: THREE.PerspectiveCamera;
  private controls: any;

  public isTourActive = false;
  public isPaused = false;
  public currentStopIndex = 0;
  private stopStartTime = 0;

  public onStopChange?: (stop: TourStop, index: number, total: number) => void;
  public onTourEnd?: () => void;

  public stops: TourStop[] = [
    {
      id: 'main-gate',
      name: 'SAHE Main Entrance Gate',
      subtitle: 'Maroon gateway on NH65 Bandar Road welcoming students & visitors.',
      target: new THREE.Vector3(-31.4, 2, 48.5),
      cameraPos: new THREE.Vector3(-18, 12, 70),
      durationSeconds: 7
    },
    {
      id: 'cricket-oval',
      name: 'SAHE Cricket Ground & Track',
      subtitle: '400m athletic oval and turf cricket pitch with pavilion seating.',
      target: new THREE.Vector3(-38.1, 1, 18.2),
      cameraPos: new THREE.Vector3(-12, 30, 48),
      durationSeconds: 7
    },
    {
      id: 'central-library',
      name: 'VRSEC Central Library',
      subtitle: 'Knowledge hub holding 100k+ volumes and digital academic databases.',
      target: new THREE.Vector3(16.2, 2, 5.4),
      cameraPos: new THREE.Vector3(36, 22, 28),
      durationSeconds: 7
    },
    {
      id: 'cse-complex',
      name: 'CSE & Artificial Intelligence Complex',
      subtitle: '5-storey computing center with advanced NVIDIA DGX AI clusters.',
      target: new THREE.Vector3(-32.2, 4, -18.5),
      cameraPos: new THREE.Vector3(-8, 26, 10),
      durationSeconds: 8
    },
    {
      id: 'saraswathi-circle',
      name: 'Saraswathi & KachhaPi Rotunda',
      subtitle: 'Iconic landscaped monument rotunda and musical water fountain.',
      target: new THREE.Vector3(4.4, 2, -14.6),
      cameraPos: new THREE.Vector3(18, 14, 0),
      durationSeconds: 6
    },
    {
      id: 'civil-sh-blocks',
      name: 'Civil Engineering & S&H Blocks',
      subtitle: 'Structural mechanics laboratories and foundational sciences wing.',
      target: new THREE.Vector3(18, 3, -14),
      cameraPos: new THREE.Vector3(42, 28, 12),
      durationSeconds: 7
    },
    {
      id: 'boys-hostel',
      name: 'Boys Hostel Residential Complex',
      subtitle: '6-floor student housing facility with dining mess and fitness center.',
      target: new THREE.Vector3(69.4, 4, -17.5),
      cameraPos: new THREE.Vector3(90, 26, 12),
      durationSeconds: 7
    },
    {
      id: 'aerial-overview',
      name: 'SAHE Campus Panoramic View',
      subtitle: 'Comprehensive 3D digital twin of the premier educational institution.',
      target: new THREE.Vector3(0, 0, 0),
      cameraPos: new THREE.Vector3(25, 90, 115),
      durationSeconds: 8
    }
  ];

  constructor(camera: THREE.PerspectiveCamera, controls: any) {
    this.camera = camera;
    this.controls = controls;
  }

  public start(): void {
    this.isTourActive = true;
    this.isPaused = false;
    this.currentStopIndex = 0;
    this.goToStop(0);
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
    this.stopStartTime = performance.now();
  }

  public stop(): void {
    this.isTourActive = false;
    this.isPaused = false;
    this.onTourEnd?.();
  }

  public next(): void {
    if (this.currentStopIndex < this.stops.length - 1) {
      this.goToStop(this.currentStopIndex + 1);
    } else {
      this.stop();
    }
  }

  public prev(): void {
    if (this.currentStopIndex > 0) {
      this.goToStop(this.currentStopIndex - 1);
    }
  }

  private goToStop(index: number): void {
    this.currentStopIndex = index;
    const stop = this.stops[index];
    this.stopStartTime = performance.now();

    this.onStopChange?.(stop, index + 1, this.stops.length);
  }

  public update(now: number): void {
    if (!this.isTourActive || this.isPaused) return;

    const stop = this.stops[this.currentStopIndex];
    const elapsedSeconds = (now - this.stopStartTime) / 1000;

    // Smoothly orbit camera around current stop
    const orbitSpeed = 0.08;
    const angle = elapsedSeconds * orbitSpeed;
    const basePos = stop.cameraPos;

    const cx = stop.target.x + (basePos.x - stop.target.x) * Math.cos(angle) - (basePos.z - stop.target.z) * Math.sin(angle);
    const cz = stop.target.z + (basePos.x - stop.target.x) * Math.sin(angle) + (basePos.z - stop.target.z) * Math.cos(angle);

    this.camera.position.set(cx, basePos.y, cz);
    this.controls.target.copy(stop.target);
    this.controls.update();

    if (elapsedSeconds >= stop.durationSeconds) {
      this.next();
    }
  }
}
