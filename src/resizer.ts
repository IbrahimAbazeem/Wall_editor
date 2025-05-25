import { Camera, OrthographicCamera, PerspectiveCamera, WebGLRenderer } from 'three';

class Resizer {
  constructor(container: HTMLElement, camera: Camera, renderer: WebGLRenderer | null) {
    if (renderer) {
      this.setSize(container, camera, renderer);
    }
    window.addEventListener('resize', () => {
      if (renderer) {
        this.setSize(container, camera, renderer);
      }
    });
  }

  setSize(container: HTMLElement, camera: Camera, renderer: WebGLRenderer) {
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    if (camera instanceof PerspectiveCamera) {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
    }
    if (camera instanceof OrthographicCamera) {
      const aspect = container.clientWidth / container.clientHeight;
      const frustumSize = 10;
      camera.left = (-frustumSize * aspect) / 2;
      camera.right = (frustumSize * aspect) / 2;
      camera.top = frustumSize / 2;
      camera.bottom = -frustumSize / 2;
      camera.updateProjectionMatrix();
    }
  }
}

export { Resizer };