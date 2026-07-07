"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Rotating "neural core": a dense point-cloud icosahedron wrapped in two
 * counter-rotating wireframe shells. Tilts toward the cursor.
 * Section-scoped canvas (absolute inset-0 within its square container).
 */
export default function ParticleCore() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.z = 4.4;

    const group = new THREE.Group();
    scene.add(group);

    const ptsGeo = new THREE.IcosahedronGeometry(1.7, 5);
    const ptsMat = new THREE.PointsMaterial({
      color: 0x5eead4,
      size: 0.028,
      transparent: true,
      opacity: 0.9,
    });
    const points = new THREE.Points(ptsGeo, ptsMat);

    const shellGeo = new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.62, 1));
    const shellMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35 });
    const shell = new THREE.LineSegments(shellGeo, shellMat);

    const innerGeo = new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1.0, 0));
    const innerMat = new THREE.LineBasicMaterial({ color: 0x818cf8, transparent: true, opacity: 0.45 });
    const inner = new THREE.LineSegments(innerGeo, innerMat);

    group.add(points, shell);
    scene.add(inner);

    const targetTilt = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      targetTilt.x = (e.clientY / window.innerHeight - 0.5) * 0.8;
      targetTilt.y = (e.clientX / window.innerWidth - 0.5) * 0.8;
    };
    window.addEventListener("pointermove", onMove);

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let spin = 0;
    let raf = 0;
    const loop = () => {
      if (!reduce) spin += 0.0025;
      group.rotation.y = spin + targetTilt.y;
      group.rotation.x += (targetTilt.x - group.rotation.x) * 0.05;
      inner.rotation.y = -spin * 1.6;
      inner.rotation.x += 0.003;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", resize);
      ptsGeo.dispose();
      ptsMat.dispose();
      shellGeo.dispose();
      shellMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />;
}
