import * as THREE from 'three';
import graphData from '../data/pedestrian-graph.json';

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  nodeName: string;
}

export interface NavigationResult {
  pathNodeIds: string[];
  totalDistanceMeters: number;
  estimatedTimeMinutes: number;
  steps: RouteStep[];
  points: THREE.Vector3[];
}

export class PedestrianRouter {
  private nodes = new Map<string, any>();
  private adjacency = new Map<string, { to: string; distance: number }[]>();
  private routeLineMesh?: THREE.Line;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initGraph();
  }

  private initGraph(): void {
    graphData.nodes.forEach(n => {
      this.nodes.set(n.id, n);
      this.adjacency.set(n.id, []);
    });

    graphData.edges.forEach(e => {
      this.adjacency.get(e.from)?.push({ to: e.to, distance: e.distance });
      this.adjacency.get(e.to)?.push({ to: e.from, distance: e.distance }); // bidirectional walkways
    });
  }

  public findRoute(startId: string, destId: string): NavigationResult | null {
    if (!this.nodes.has(startId) || !this.nodes.has(destId)) return null;

    // Dijkstra's Shortest Path Algorithm
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const unvisited = new Set<string>();

    this.nodes.forEach((_, id) => {
      distances.set(id, Infinity);
      previous.set(id, null);
      unvisited.add(id);
    });

    distances.set(startId, 0);

    while (unvisited.size > 0) {
      // Find unvisited node with lowest distance
      let currentId: string | null = null;
      let minDistance = Infinity;

      unvisited.forEach(id => {
        const dist = distances.get(id)!;
        if (dist < minDistance) {
          minDistance = dist;
          currentId = id;
        }
      });

      if (currentId === null || minDistance === Infinity) break;
      if (currentId === destId) break;

      unvisited.delete(currentId);

      const neighbors = this.adjacency.get(currentId) || [];
      for (const edge of neighbors) {
        if (!unvisited.has(edge.to)) continue;
        const alt = minDistance + edge.distance;
        if (alt < distances.get(edge.to)!) {
          distances.set(edge.to, alt);
          previous.set(edge.to, currentId);
        }
      }
    }

    // Reconstruct path
    const pathIds: string[] = [];
    let curr: string | null = destId;

    while (curr) {
      pathIds.unshift(curr);
      curr = previous.get(curr) || null;
      if (curr === startId) {
        pathIds.unshift(startId);
        break;
      }
    }

    if (pathIds.length < 2 || pathIds[0] !== startId) return null;

    // Generate 3D vectors & steps
    const points: THREE.Vector3[] = [];
    const steps: RouteStep[] = [];
    let totalDist = 0;

    for (let i = 0; i < pathIds.length; i++) {
      const node = this.nodes.get(pathIds[i])!;
      points.push(new THREE.Vector3(node.scenePos[0], 0.35, node.scenePos[1]));

      if (i > 0) {
        const prev = this.nodes.get(pathIds[i - 1])!;
        const edgeDist = Math.hypot(node.scenePos[0] - prev.scenePos[0], node.scenePos[1] - prev.scenePos[1]) * 2.12;
        totalDist += edgeDist;

        steps.push({
          instruction: i === pathIds.length - 1 ? `Arrive at ${node.name}` : `Walk towards ${node.name}`,
          distanceMeters: Math.round(edgeDist),
          nodeName: node.name
        });
      }
    }

    // Walking speed: ~4.5 km/h = 75 m/min
    const estimatedMinutes = Math.max(1, Math.round(totalDist / 75));

    return {
      pathNodeIds: pathIds,
      totalDistanceMeters: Math.round(totalDist),
      estimatedTimeMinutes: estimatedMinutes,
      steps,
      points
    };
  }

  public renderRoute(points: THREE.Vector3[]): void {
    this.clearRoute();

    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineDashedMaterial({
      color: 0x06b6d4, // Cyan neon route line
      linewidth: 3,
      scale: 1,
      dashSize: 3,
      gapSize: 1.5
    });

    this.routeLineMesh = new THREE.Line(geom, mat);
    this.routeLineMesh.computeLineDistances();
    this.scene.add(this.routeLineMesh);
  }

  public clearRoute(): void {
    if (this.routeLineMesh) {
      this.scene.remove(this.routeLineMesh);
      this.routeLineMesh.geometry.dispose();
      (this.routeLineMesh.material as THREE.Material).dispose();
      this.routeLineMesh = undefined;
    }
  }
}
