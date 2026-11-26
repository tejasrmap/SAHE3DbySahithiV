import * as THREE from 'three';

export type TimePreset = 'sunrise' | 'morning' | 'noon' | 'goldenHour' | 'sunset' | 'night';

export interface LightingState {
  timeHours: number;
  preset: TimePreset;
  isLive: boolean;
}

export class LightingSystem {
  private scene: THREE.Scene;
  public sunLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x475569, 0.85);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 1.1);
    this.sunLight.position.set(70, 140, 50);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    Object.assign(this.sunLight.shadow.camera, {
      left: -150,
      right: 150,
      top: 150,
      bottom: -150,
      near: 10,
      far: 450
    });
    this.scene.add(this.sunLight);

    this.scene.fog = new THREE.Fog(0x93c5fd, 140, 380);
  }

  public setTime(hour: number): void {
    const h = ((hour % 24) + 24) % 24;

    // Astronomical sunrise/sunset for Vijayawada (16.48° N): ~05:45 to ~18:15
    const sr = 5.75;
    const ss = 18.25;

    const isDay = h >= sr && h <= ss;
    const dayProgress = (h - sr) / (ss - sr); // 0 to 1

    let skyColor: THREE.Color;
    let sunIntensity: number;
    let hemiIntensity: number;
    let sunPos: THREE.Vector3;

    if (isDay) {
      // Sun trajectory arc
      const angle = dayProgress * Math.PI;
      const sunY = 15 + Math.sin(angle) * 130;
      const sunX = Math.cos(angle) * 110;
      const sunZ = 40;
      sunPos = new THREE.Vector3(sunX, sunY, sunZ);

      if (h < 7.0) {
        // Sunrise golden rose glow
        skyColor = new THREE.Color(0xfb923c).lerp(new THREE.Color(0x93c5fd), (h - sr) / 1.25);
        this.sunLight.color.setHex(0xf97316);
        sunIntensity = 0.7;
        hemiIntensity = 0.55;
      } else if (h > 16.5) {
        // Golden hour and sunset
        skyColor = new THREE.Color(0x93c5fd).lerp(new THREE.Color(0xf97316), (h - 16.5) / 1.75);
        this.sunLight.color.setHex(0xfbbf24);
        sunIntensity = 0.85;
        hemiIntensity = 0.65;
      } else {
        // Broad daylight noon
        skyColor = new THREE.Color(0x38bdf8);
        this.sunLight.color.setHex(0xfffbeb);
        sunIntensity = 1.15;
        hemiIntensity = 0.9;
      }
    } else {
      // Night / Twilight
      skyColor = new THREE.Color(0x090d16);
      this.sunLight.color.setHex(0x38bdf8); // Moonlight
      sunIntensity = 0.15;
      hemiIntensity = 0.22;
      sunPos = new THREE.Vector3(-60, 45, -30);
    }

    this.scene.background = skyColor;
    if (this.scene.fog) {
      this.scene.fog.color.copy(skyColor);
    }

    this.sunLight.position.copy(sunPos);
    this.sunLight.intensity = sunIntensity;
    this.hemiLight.intensity = hemiIntensity;
  }
}
