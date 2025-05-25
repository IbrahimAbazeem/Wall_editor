import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  BoxGeometry,
  MeshBasicMaterial,
  Mesh,
  Vector2,
  TextureLoader,
  GridHelper,
  Color,
  AmbientLight,
  DirectionalLight,
  AxesHelper,
  Raycaster
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Resizer } from '../resizer';
import { BaseDocument } from './BaseDocument';
import { Wall } from './Document2D';

export class Document3D implements BaseDocument {
  scene: Scene;
  camera: PerspectiveCamera;
  canvas: HTMLCanvasElement;
  walls: Wall[];
  controls: OrbitControls;
  resizer: Resizer;
  grid: GridHelper;
  raycaster: Raycaster;
  renderer: WebGLRenderer;
  currentZoom: number;

  constructor(canvas: HTMLCanvasElement, walls: Wall[], renderer: WebGLRenderer) {
    this.canvas = canvas;
    this.walls = walls;
    this.scene = new Scene();
    this.scene.background = new Color(0xf0f0f0);
    
    this.currentZoom = 1.0;
    
    this.camera = new PerspectiveCamera(
      75,
      canvas.parentElement!.clientWidth / canvas.parentElement!.clientHeight, 
      0.1, 
      1000
    );
    
    const containerWidth = canvas.parentElement!.clientWidth;
    const containerHeight = canvas.parentElement!.clientHeight;
    const aspectRatio = containerWidth / containerHeight;
    const distance = Math.max(containerWidth, containerHeight) / 1.5;
    
    this.camera.position.set(distance, distance, distance);
    this.camera.lookAt(0, 0, 0);
    
    this.raycaster = new Raycaster();
    
    const ambientLight = new AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    
    const directionalLight = new DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(distance, distance, distance);
    this.scene.add(directionalLight);
    
    const gridSize = Math.max(containerWidth, containerHeight) / 50;
    this.grid = new GridHelper(gridSize * 2, gridSize * 2, 0xaaaaaa, 0xdddddd);
    this.grid.position.set(0, 0, 0);
    this.scene.add(this.grid);
    
    const axesHelper = new AxesHelper(gridSize / 2);
    this.scene.add(axesHelper);
    
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.screenSpacePanning = false;
    this.controls.minDistance = gridSize / 2;
    this.controls.maxDistance = gridSize * 2;
    this.controls.maxPolarAngle = Math.PI / 2;
    this.controls.update();
    
    this.canvas.addEventListener('click', (e) => this.onClick(e));
    this.canvas.addEventListener('wheel', (e) => this.onMouseWheel(e));
    
    this.resizer = new Resizer(canvas.parentElement!, this.camera, renderer);
    this.renderer = renderer;
    
    window.addEventListener('wallsUpdated', () => {
        this.initWalls();
    });

    document.getElementById('zoomInBtn')?.addEventListener('click', () => this.zoom(1.2));
    document.getElementById('zoomOutBtn')?.addEventListener('click', () => this.zoom(0.8));

    document.getElementById('zoom-level')!.textContent = '100%';
  }

  zoom(factor: number) {
    this.currentZoom *= factor;
    this.currentZoom = Math.min(Math.max(this.currentZoom, 0.5), 5.0);
    
    const distance = this.camera.position.length();
    const newDistance = distance / factor;
    const direction = this.camera.position.clone().normalize();
    this.camera.position.copy(direction.multiplyScalar(newDistance));
    
    document.getElementById('zoom-level')!.textContent = `${Math.round(this.currentZoom * 100)}%`;
  }

  onMouseWheel(e: WheelEvent) {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    this.zoom(factor);
  }

  initWalls() {
    const grid = this.grid;
    const lights = this.scene.children.filter(obj => 
      obj instanceof AmbientLight || 
      obj instanceof DirectionalLight || 
      obj instanceof AxesHelper
    );

    this.scene.clear();
    this.scene.add(grid, ...lights);

    const textureLoader = new TextureLoader();
    const texture = textureLoader.load('/wall-texture.jpg', undefined, undefined, (err) => {
      console.error('Error loading texture:', err);
    });
    
    const material = new MeshBasicMaterial({ 
      map: texture,
      transparent: true,
      opacity: 0.9
    });
    
    this.walls.forEach((wall) => {
      const length = wall.length;
      const height = 2.5;
      const thickness = 0.2;
      const geometry = new BoxGeometry(length, height, thickness);
      const mesh = new Mesh(geometry, material);

      const midX = (wall.start.x + wall.end.x) / 2;
      const midY = (wall.start.y + wall.end.y) / 2;
      mesh.position.set(midX, height / 2, midY);
      mesh.rotation.y = -wall.angle;
      
      mesh.userData = { type: 'wall', wallData: wall };

      this.scene.add(mesh);
    });
    
    this.render(this.renderer);
  }

  render(renderer: WebGLRenderer) {
    this.controls.update();
    this.resizer.setSize(this.canvas.parentElement!, this.camera, renderer);
    renderer.render(this.scene, this.camera);
  }

  onMouseDown(_e: MouseEvent) {}
  
  onMouseUp(_e: MouseEvent) {}
  
  onMouseMove(_e: MouseEvent) {}

  zoomFit(_factor: number) {
    this.currentZoom = 1.0;
    
    const distance = Math.max(
      this.canvas.parentElement!.clientWidth,
      this.canvas.parentElement!.clientHeight
    ) / 2;
    
    this.camera.position.set(distance, distance, distance);
    this.camera.lookAt(0, 0, 0);
    
    document.getElementById('zoom-level')!.textContent = '100%';
    
    this.controls.update();
  }

  onClick(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    
    this.raycaster.setFromCamera(new Vector2(x, y), this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children);
    
    for (const intersect of intersects) {
      if (intersect.object.userData && intersect.object.userData.type === 'wall') {
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
        break;
      }
    }
  }
}
