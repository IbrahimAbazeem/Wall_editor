import { Viewer } from './Viewer';
import { AmbientLight, DirectionalLight, AxesHelper } from 'three';
import { Document2D } from './documents/Document2D';

window.addEventListener('DOMContentLoaded', () => {
  const container = document.querySelector('#app');
  if (!container) {
    console.error('Container #app not found');
    return;
  }

  const viewer = new Viewer(container as HTMLElement);
  viewer.animate();

  let is2D = true;
  const viewModeElement = document.getElementById('view-mode')!;
  const wallsCountElement = document.getElementById('walls-count')!;

  wallsCountElement.textContent = `Walls: ${viewer.walls.length}`;

  const documentationButton = document.querySelector('.ribbon-item i.fa-book')?.parentElement;
  if (documentationButton) {
    documentationButton.addEventListener('click', () => {
      window.open('https://threejs.org/docs/', '_blank');
    });
  }

  const aboutButton = document.querySelector('.ribbon-item i.fa-info-circle')?.parentElement;
  if (aboutButton) {
    aboutButton.addEventListener('click', () => {
      alert('Wall Editor 3D\nVersion 1.0\n\nDeveloped by Ibrahim Ahmed AbdElzim\n© 2025');
    });
  }

  document.querySelector('#toggleViewsBtn')?.addEventListener('click', () => {
    is2D = !is2D;
    viewer.setView(is2D ? '2d' : '3d');
    viewModeElement.textContent = is2D ? '2D View' : '3D View';
    console.log('Switching to', is2D ? '2D' : '3D');
  });

  document.querySelector('#zoomFitBtn')?.addEventListener('click', () => {
    viewer.zoomFit(1);
    console.log('Zoom Fit clicked');
  });

  window.addEventListener('wallsUpdated', () => {
    wallsCountElement.textContent = `Walls: ${viewer.walls.length}`;
  });

  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const document2D = new Document2D(canvas, viewer.walls, viewer.renderer);

  function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight - 50; 
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const newDrawingButton = document.getElementById('newDrawing');
  if (newDrawingButton) {
    newDrawingButton.addEventListener('click', () => {
      document2D.setWalls([]); 
    });
  }
});