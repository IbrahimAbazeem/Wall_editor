import { WebGLRenderer } from 'three';

export interface BaseDocument {
  render(renderer: WebGLRenderer): void;
  onMouseDown(e: MouseEvent): void;
  onMouseUp(e: MouseEvent): void;
  onMouseMove(e: MouseEvent): void;
  zoomFit(factor: number): void;
}

