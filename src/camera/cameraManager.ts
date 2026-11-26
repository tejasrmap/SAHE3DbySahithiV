import * as THREE from 'three';

export interface CameraPreset {
  name: string;
  target: THREE.Vector3;
  position: THREE.Vector3;
}

export class CameraManager {
  private camera: THREE.PerspectiveCamera;
  private controls: any; // OrbitControls

  private isTweening = false;
  private tweenStartTime = 0;
  private tweenDuration = 1200; // ms
  private startTarget = new THREE.Vector3();
  private endTarget = new THREE.Vector3();
  private startPos = new THREE.Vector3();
  private endPos = new THREE.Vector3();

  public presets: Record<string, CameraPreset> = {
    overview: {
      name: 'Campus Overview',
      target: new THREE.Vector3(0, 0, 0),
      position: new THREE.Vector3(30, 95, 110)
    },
    aerial: {
      name: '2D Aerial Map',
      target: new THREE.Vector3(0, 0, 0),
      position: new THREE.Vector3(0, 160, 0.01)
    },
    mainGate: {
      name: 'Main Gate Arch',
      target: new THREE.Vector3(-31.4, 0, 48.5),
      position: new THREE.Vector3(-20, 14, 75)
    },
    cseComplex: {
      name: 'CSE & Tech Complex',
      target: new THREE.Vector3(-32.2, 0, -18.5),
      position: new THREE.Vector3(-8, 28, 12)
    },
    library: {
      name: 'Central Library',
      target: new THREE.Vector3(16.2, 0, 5.4),
      position: new THREE.Vector3(38, 24, 30)
    },
    civilMech: {
      name: 'Civil & Mech Blocks',
      target: new THREE.Vector3(14, 0, -24),
      position: new THREE.Vector3(42, 32, 5)
    },
    sports: {
      name: 'Athletic Cricket Oval',
      target: new THREE.Vector3(-38.1, 0, 18.2),
      position: new THREE.Vector3(-10, 35, 45)
    },
    saraswathi: {
      name: 'Saraswathi Garden Circle',
      target: new THREE.Vector3(4.4, 0, -14.6),
      position: new THREE.Vector3(18, 16, 2)
    }
  };

  constructor(camera: THREE.PerspectiveCamera, controls: any) {
    this.camera = camera;
    this.controls = controls;
    this.applyPreset('overview', false);
  }

  public applyPreset(key: string, smooth = true): void {
    const preset = this.presets[key];
    if (!preset) return;

    if (!smooth) {
      this.controls.target.copy(preset.target);
      this.camera.position.copy(preset.position);
      this.controls.update();
      return;
    }

    this.flyTo(preset.target, preset.position);
  }

  public flyTo(target: THREE.Vector3, position: THREE.Vector3, duration = 1200): void {
    this.startTarget.copy(this.controls.target);
    this.endTarget.copy(target);

    this.startPos.copy(this.camera.position);
    this.endPos.copy(position);

    this.tweenDuration = duration;
    this.tweenStartTime = performance.now();
    this.isTweening = true;
  }

  public update(): void {
    if (!this.isTweening) return;

    const elapsed = performance.now() - this.tweenStartTime;
    const progress = Math.min(1, elapsed / this.tweenDuration);

    // Ease in-out cubic easing
    const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

    this.controls.target.lerpVectors(this.startTarget, this.endTarget, ease);
    this.camera.position.lerpVectors(this.startPos, this.endPos, ease);
    this.controls.update();

    if (progress >= 1) {
      this.isTweening = false;
    }
  }
}
