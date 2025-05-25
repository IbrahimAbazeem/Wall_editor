import { WebGLRenderer, Vector2, AmbientLight, DirectionalLight, AxesHelper } from 'three';
import { Document2D } from './documents/Document2D';
import { Document3D } from './documents/Document3D';
import type { IDocument } from './documents/IDocument';

interface Wall {
  type: 'wall';
  start: Vector2;
  end: Vector2;
  angle: number;
  length: number;
}

class Viewer {
  container: HTMLElement;
  renderer: WebGLRenderer;
  document2D: Document2D;
  document3D: Document3D;
  activeDocument: IDocument;
  walls: Wall[];

  constructor(container: HTMLElement) {
    if (!container) {
      throw new Error('Container element is null');
    }
    this.container = container;
    this.renderer = this.createRenderer();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    container.append(this.renderer.domElement);

    this.walls = [];
    this.document2D = new Document2D(this.renderer.domElement, this.walls, this.renderer);
    this.document3D = new Document3D(this.renderer.domElement, this.walls, this.renderer);
    this.activeDocument = this.document2D;

    window.addEventListener('wallsUpdated', () => {
      this.document2D.initWalls();
      this.document3D.initWalls();
    });

    document.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));


    document.getElementById('deleteAllBtn')?.addEventListener('click', () => {
      this.deleteAllWalls();
    });
  }

  deleteAllWalls() {
  
    this.walls = [];
    
    
    const grid2D = this.document2D.grid;
    this.document2D.scene.clear();
    this.document2D.scene.add(grid2D);
    
  
    const grid3D = this.document3D.grid;
    const lights = this.document3D.scene.children.filter(obj => 
      obj instanceof AmbientLight || 
      obj instanceof DirectionalLight || 
      obj instanceof AxesHelper
    );
    this.document3D.scene.clear();
    this.document3D.scene.add(grid3D, ...lights);
    
    
    this.render();
    
  
    window.dispatchEvent(new CustomEvent('wallsUpdated'));
  }

  createRenderer() {
    return new WebGLRenderer({ antialias: true });
  }

  render() {
    this.activeDocument.render(this.renderer);
  }

  setView(type: string) {
    if (type === '2d') {
      this.activeDocument = this.document2D;
      this.document2D.initWalls();
    } else {
      this.activeDocument = this.document3D;
      this.document3D.initWalls();
    }
  }

  animate() {
    this.render();
    requestAnimationFrame(this.animate.bind(this));
  }

  onMouseDown(e: MouseEvent) {
    this.activeDocument.onMouseDown(e);
  }

  onMouseUp(e: MouseEvent) {
    this.activeDocument.onMouseUp(e);
  }

  onMouseMove(e: MouseEvent) {
    this.activeDocument.onMouseMove(e);
  }

  zoomFit(factor: number) {
    this.activeDocument.zoomFit(factor);
  }
}

export { Viewer };
export type { Wall };