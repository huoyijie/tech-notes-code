import { useRef, useEffect } from 'react';
import { PerspectiveCamera, Scene, Color, BoxGeometry, MeshBasicMaterial, Mesh, Raycaster, Vector2, PlaneGeometry, AmbientLight, DirectionalLight, WebGLRenderer, EdgesGeometry, LineSegments, LineBasicMaterial } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export default function Home() {
  const containerRef = useRef(null);
  let camera, scene, renderer;
  let cameraControls;
  let plane;
  let pointer, raycaster, isShiftDown = false;

  let rollOverMesh, rollOverMaterial;
  let cubeGeo, cubeMaterial;

  const objects = [];

  function init() {
    camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.set(600, 800, 1300);
    camera.lookAt(0, 0, 0);

    scene = new Scene();
    scene.background = new Color(0xf0f0f0);

    // roll-over helpers
    const rollOverGeo = new BoxGeometry(50, 50, 50);
    rollOverMaterial = new MeshBasicMaterial({ color: 0xff0000, opacity: 0.5, transparent: true });
    rollOverMesh = new Mesh(rollOverGeo, rollOverMaterial);
    scene.add(rollOverMesh);

    // cubes
    cubeGeo = new BoxGeometry(50, 50, 50);
    cubeMaterial = new MeshBasicMaterial({ color: 0xd1d5db });

    raycaster = new Raycaster();
    pointer = new Vector2();

    // plane
    const geometry = new PlaneGeometry(1000, 1000);
    geometry.rotateX(- Math.PI / 2);
    plane = new Mesh(geometry, new MeshBasicMaterial({ visible: false }));
    scene.add(plane);
    objects.push(plane);

    // lights
    const ambientLight = new AmbientLight(0x606060, 3);
    scene.add(ambientLight);

    const directionalLight = new DirectionalLight(0xffffff, 3);
    directionalLight.position.set(1, 0.75, 0.5).normalize();
    scene.add(directionalLight);

    renderer = new WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    containerRef.current.appendChild(renderer.domElement);

    // CONTROLS
    cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.addEventListener('change', render);
  }

  function render() {
    renderer.render(scene, camera);
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

    render();
  }

  function onPointerMove(event) {
    pointer.set((event.clientX / window.innerWidth) * 2 - 1, - (event.clientY / window.innerHeight) * 2 + 1);

    raycaster.setFromCamera(pointer, camera);

    const intersects = raycaster.intersectObjects(objects, false);

    if (intersects.length > 0) {
      const intersect = intersects[0];

      rollOverMesh.position.copy(intersect.point).add(intersect.face.normal);
      rollOverMesh.position.divideScalar(50).floor().multiplyScalar(50).addScalar(25);

      render();
    }
  }

  function onPointerDown(event) {
    if (isShiftDown) {
      pointer.set((event.clientX / window.innerWidth) * 2 - 1, - (event.clientY / window.innerHeight) * 2 + 1);

      raycaster.setFromCamera(pointer, camera);

      const intersects = raycaster.intersectObjects(objects, false);

      if (intersects.length > 0) {
        const intersect = intersects[0];

        const isLeftDown = event.button === 0;
        if (isLeftDown) {// create cube
          const voxel = new Mesh(cubeGeo, cubeMaterial);
          voxel.position.copy(intersect.point).add(intersect.face.normal);
          voxel.position.divideScalar(50).floor().multiplyScalar(50).addScalar(25);
          scene.add(voxel);

          voxel.add(new LineSegments(
            new EdgesGeometry(voxel.geometry),
            new LineBasicMaterial({ color: 0x4b5563 }),
          ));

          objects.push(voxel);
        } else {// delete cube
          if (intersect.object !== plane) {
            scene.remove(intersect.object);

            objects.splice(objects.indexOf(intersect.object), 1);
          }
        }
        render();
      }
    }
  }

  function onDocumentKeyDown(event) {
    switch (event.keyCode) {
      case 16: isShiftDown = true; break;
    }
  }

  function onDocumentKeyUp(event) {
    switch (event.keyCode) {
      case 16: isShiftDown = false; break;
    }
  }

  const addEventListener = () => {
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onDocumentKeyDown);
    document.addEventListener('keyup', onDocumentKeyUp);
    window.addEventListener('resize', onWindowResize);
  };

  const removeEventListener = () => {
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerdown', onPointerDown);
    document.removeEventListener('keydown', onDocumentKeyDown);
    document.removeEventListener('keyup', onDocumentKeyUp);
    window.removeEventListener('resize', onWindowResize);
  };

  useEffect(() => {
    init();
    render();
    addEventListener();
    return () => {
      containerRef.current.removeChild(renderer.domElement)
      removeEventListener();
    };
  }, []);

  return <div ref={containerRef} />;
}
