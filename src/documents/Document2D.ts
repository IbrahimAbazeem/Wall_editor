import { Scene, OrthographicCamera, WebGLRenderer, MeshBasicMaterial, Mesh, PlaneGeometry, Vector2, Raycaster, GridHelper, Color } from 'three';
import { Resizer } from '../resizer';
import * as THREE from 'three';
import { BaseDocument } from './BaseDocument';

export type Wall = {
  type: string;
  start: Vector2;
  end: Vector2;
  angle: number;
  length: number;
};

export class Document2D implements BaseDocument {
  scene: Scene;
  camera: OrthographicCamera;
  canvas: HTMLCanvasElement;
  walls: Wall[];
  drawing: boolean;
  startPoint: Vector2 | null;
  tempWall: Mesh | null;
  resizer: Resizer;
  raycaster: Raycaster;
  hoveredWall: Mesh | null;
  grid: GridHelper;
  gridSize: number;
  snapEnabled: boolean;
  wallMaterial: MeshBasicMaterial;
  hoverMaterial: MeshBasicMaterial;
  tempMaterial: MeshBasicMaterial;
  currentZoom: number;
  wallThickness: number = 0.2;
  renderer: WebGLRenderer;

  constructor(canvas: HTMLCanvasElement, walls: Wall[], renderer: WebGLRenderer) {
    this.canvas = canvas;
    this.walls = walls;
    this.renderer = renderer;
    this.scene = new Scene();
    this.scene.background = new Color(0xf5f5f5);

    this.camera = new OrthographicCamera(-10, 10, 10, -10, 0.1, 1000);
    this.camera.position.set(0, 10, 10);
    this.camera.lookAt(0, 0, 0);

    this.gridSize = .5;
    this.snapEnabled = true;
    this.currentZoom = 0.7;
    this.camera.zoom = this.currentZoom;
    this.camera.updateProjectionMatrix();

    this.grid = new GridHelper(40, 40, 0xaaaaaa, 0xdddddd);
    this.grid.position.set(0, 0, -5);
    this.scene.add(this.grid);

    this.wallMaterial = new MeshBasicMaterial({ color: 0x333333 });
    this.hoverMaterial = new MeshBasicMaterial({ color: 0xff6600 });
    this.tempMaterial = new MeshBasicMaterial({ color: 0x6666ff });

    this.drawing = false;
    this.startPoint = null;
    this.tempWall = null;

    this.resizer = new Resizer(canvas.parentElement!, this.camera, renderer);
    this.raycaster = new Raycaster();

    this.hoveredWall = null;

    this.initWalls();

    document.getElementById('zoom-level')!.textContent = '70%';

    document.getElementById('zoomInBtn')?.addEventListener('click', () => this.zoom(1.2));
    document.getElementById('zoomOutBtn')?.addEventListener('click', () => this.zoom(0.8));
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom(e.deltaY > 0 ? 0.9 : 1.1);
    });
    this.canvas.addEventListener('mousemove', (e) => this.onHover(e));
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('click', (e) => this.onClick(e));

    window.addEventListener('wallsUpdated', () => {
        this.initWalls();
    });
  }

  zoom(factor: number) {
    this.currentZoom *= factor;
    this.currentZoom = Math.min(Math.max(this.currentZoom, 0.1), 10);
    this.camera.zoom = this.currentZoom;
    this.camera.updateProjectionMatrix();
    document.getElementById('zoom-level')!.textContent = `${Math.round(this.currentZoom * 100)}%`;
  }

  snapToGrid(point: Vector2): Vector2 {
    if (!this.snapEnabled) return point.clone();
    return new Vector2(
      Math.round(point.x / this.gridSize) * this.gridSize,
      Math.round(point.y / this.gridSize) * this.gridSize
    );
  }

  initWalls() {
    this.scene.clear();
    this.scene.add(this.grid);
    
    this.walls.forEach((wall) => {
      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const geometry = new PlaneGeometry(length, this.wallThickness);
      const mesh = new Mesh(geometry, this.wallMaterial.clone()); 
      mesh.position.set((wall.start.x + wall.end.x) / 2, (wall.start.y + wall.end.y) / 2, 0);
      mesh.rotation.z = wall.angle;
      mesh.userData = { type: 'wall', wallData: wall, defaultColor: this.wallMaterial.color.clone() };
      this.scene.add(mesh);
    });

    this.render(this.renderer);
  }

  render(renderer: WebGLRenderer) {
    this.resizer.setSize(this.canvas.parentElement!, this.camera, renderer);
    renderer.render(this.scene, this.camera);
  }

  onMouseDown(e: MouseEvent) {
    const coords = this.getMouseCoords(e);
    const snappedCoords = this.snapToGrid(coords);
    this.drawing = true;
    this.startPoint = snappedCoords;
  }

  onMouseUp(e: MouseEvent) {
    if (this.drawing && this.startPoint) {
      const coords = this.getMouseCoords(e);
      const snappedCoords = this.snapToGrid(coords);
      const length = this.startPoint.distanceTo(snappedCoords);
      if (length > 0.5) {
        const angle = Math.atan2(snappedCoords.y - this.startPoint.y, snappedCoords.x - this.startPoint.x);
        const wall: Wall = {
          type: 'wall',
          start: this.startPoint.clone(),
          end: snappedCoords.clone(),
          angle,
          length,
        };
        this.walls.push(wall);
        this.initWalls();
        document.getElementById('wall-length')!.textContent = `${length.toFixed(2)}m`;
        document.getElementById('walls-count')!.textContent = `${this.walls.length}`;
        window.dispatchEvent(new CustomEvent('wallsUpdated'));
      }
      if (this.tempWall) {
        this.scene.remove(this.tempWall);
        this.tempWall = null;
      }
    }
    this.drawing = false;
    this.startPoint = null;
  }

  onMouseMove(e: MouseEvent) {
    const coords = this.getMouseCoords(e);
    const snappedCoords = this.snapToGrid(coords);
    if (this.drawing && this.startPoint) {
      if (this.tempWall) this.scene.remove(this.tempWall);
      const length = this.startPoint.distanceTo(snappedCoords);
      const angle = Math.atan2(snappedCoords.y - this.startPoint.y, snappedCoords.x - this.startPoint.x);
      const geometry = new PlaneGeometry(length, this.wallThickness);
      this.tempWall = new Mesh(geometry, this.tempMaterial);
      this.tempWall.position.set((this.startPoint.x + snappedCoords.x) / 2, (this.startPoint.y + snappedCoords.y) / 2, 0);
      this.tempWall.rotation.z = angle;
      this.scene.add(this.tempWall);
    }
  }

  getMouseCoords(e: MouseEvent): Vector2 {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    this.raycaster.setFromCamera(new Vector2(x, y), this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    const intersectionPoint = new THREE.Vector3();
    this.raycaster.ray.intersectPlane(plane, intersectionPoint);
    return new Vector2(intersectionPoint.x, intersectionPoint.y);
  }

  onHover(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    this.raycaster.setFromCamera(new Vector2(x, y), this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children);

    if (this.hoveredWall) {
      const material = this.hoveredWall.material as MeshBasicMaterial;
      const defaultColor = this.hoveredWall.userData.defaultColor as Color;
      material.color.copy(defaultColor);
      this.hoveredWall = null;
    }

    for (const intersect of intersects) {
      if (intersect.object.userData.type === 'wall') {
        this.hoveredWall = intersect.object as Mesh;
        const material = this.hoveredWall.material as MeshBasicMaterial;
        material.color.copy(this.hoverMaterial.color);
        break;
      }
    }
  }

  onClick(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    this.raycaster.setFromCamera(new Vector2(x, y), this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children);
    for (const intersect of intersects) {
      if (intersect.object.userData.type === 'wall') {
        const mesh = intersect.object as Mesh;
        this.scene.remove(mesh);
        
        const wall = mesh.userData.wallData;
        const index = this.walls.findIndex(w => 
          w.start.x === wall.start.x && 
          w.start.y === wall.start.y &&
          w.end.x === wall.end.x && 
          w.end.y === wall.end.y
        );
        
        if (index !== -1) {
          this.walls.splice(index, 1);
          document.getElementById('walls-count')!.textContent = `${this.walls.length}`;
          window.dispatchEvent(new CustomEvent('wallsUpdated'));
        }
        this.hoveredWall = null;
        break;
      }
    }
  }

  zoomFit() {
    this.currentZoom = 1.0;
    this.camera.zoom = this.currentZoom;
    this.camera.updateProjectionMatrix();
    document.getElementById('zoom-level')!.textContent = '100%';
  }
}