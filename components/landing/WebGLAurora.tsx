"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Living aurora background rendered on a full-screen WebGL quad.
 * A GLSL fragment shader animates flowing aurora ribbons over a deep navy
 * gradient, plus a soft spotlight that eases toward the cursor.
 * Falls back gracefully: if WebGL is unavailable the canvas simply stays
 * transparent and the CSS `bg-navy-mesh` on the page shows through.
 */
const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2  uMouse;
  uniform vec2  uRes;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * noise(p);
      p *= 2.02;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uRes.x / max(uRes.y, 1.0);

    // Deep navy vertical base
    vec3 col = mix(vec3(0.012, 0.030, 0.086), vec3(0.028, 0.058, 0.150), uv.y);

    // Flowing aurora ribbons
    float t = uTime * 0.06;
    vec2 q = vec2(uv.x * 2.4, uv.y * 3.2);
    float f = fbm(q + vec2(t, -t * 0.6));
    float bands = fbm(vec2(uv.x * 1.6 - t * 0.5, uv.y * 2.2 + f * 1.4));
    float aurora = smoothstep(0.34, 0.92, bands) * (0.55 + 0.45 * sin(uTime * 0.18 + uv.x * 3.0));

    vec3 teal   = vec3(0.11, 0.86, 0.74);
    vec3 cyan   = vec3(0.28, 0.68, 1.00);
    vec3 indigo = vec3(0.46, 0.40, 0.96);
    vec3 aur = mix(teal, cyan, clamp(uv.x + f * 0.3, 0.0, 1.0));
    aur = mix(aur, indigo, smoothstep(0.45, 1.0, f));
    col += aur * aurora * 0.55 * (1.0 - uv.y * 0.25);

    // Cursor spotlight (aspect-corrected)
    vec2 m = uMouse; m.x *= aspect;
    vec2 pp = uv;   pp.x *= aspect;
    float d = distance(pp, m);
    col += vec3(0.20, 0.72, 0.92) * smoothstep(0.55, 0.0, d) * 0.28;

    // Vignette for depth
    float vig = smoothstep(1.25, 0.25, distance(uv, vec2(0.5)));
    col *= 0.62 + 0.38 * vig;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export default function WebGLAurora() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: false,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      return; // No WebGL — CSS fallback shows through
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0.5, 0.5) },
      uRes: { value: new THREE.Vector2(1, 1) },
    };

    const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const target = new THREE.Vector2(0.5, 0.5);

    const resize = () => {
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      renderer.setSize(w, h, false);
      uniforms.uRes.value.set(w, h);
    };
    resize();
    window.addEventListener("resize", resize);

    const onMove = (e: PointerEvent) => {
      target.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
    };
    window.addEventListener("pointermove", onMove);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      uniforms.uTime.value = reduce ? 6.0 : (now - start) / 1000;
      uniforms.uMouse.value.lerp(target, 0.045);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
