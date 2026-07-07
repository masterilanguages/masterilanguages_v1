"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Synthwave neon grid floor scrolling toward a glowing horizon.
 * Section-scoped canvas (absolute inset-0) — sits above the page aurora
 * but behind the hero content.
 */
export default function NeonGrid() {
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
    scene.fog = new THREE.Fog(0x05010f, 4, 18);

    const camera = new THREE.PerspectiveCamera(72, 1, 0.1, 100);
    camera.position.set(0, 1.15, 6);
    camera.lookAt(0, 0, -6);

    // Grid cell size = 80 / 80 = 1 → scrolling by z % 1 loops seamlessly.
    const grid = new THREE.GridHelper(80, 80, 0xff2d95, 0x22d3ee);
    const gmat = grid.material as THREE.Material;
    gmat.transparent = true;
    gmat.opacity = 0.55;
    scene.add(grid);

    const resize = () => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener("resize", resize);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const t = (now - start) / 1000;
      grid.position.z = reduce ? 0 : (t * 1.6) % 1;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      grid.geometry.dispose();
      gmat.dispose();
      renderer.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />;
}
