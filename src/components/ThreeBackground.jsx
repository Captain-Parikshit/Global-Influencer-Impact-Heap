import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * ThreeBackground
 * Renders a full-screen WebGL canvas behind the app.
 * Light theme: very subtle light-gray floating dots.
 */
export default function ThreeBackground({ nodeCount = 60 }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    /* ── Renderer ───────────────────────────────────── */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.clientWidth, el.clientHeight);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    /* ── Scene / Camera ─────────────────────────────── */
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, el.clientWidth / el.clientHeight, 0.1, 1000);
    camera.position.set(0, 0, 55);

    /* ── Node positions ─────────────────────────────── */
    const positions = Array.from({ length: nodeCount }, () => new THREE.Vector3(
      (Math.random() - 0.5) * 80,
      (Math.random() - 0.5) * 60,
      (Math.random() - 0.5) * 40,
    ));

    /* ── Particle dust cloud — light gray ───────────── */
    const dustCount = 900;
    const dustGeo = new THREE.BufferGeometry();
    const dustPos = new Float32Array(dustCount * 3);
    for (let i = 0; i < dustCount * 3; i++) {
      dustPos[i] = (Math.random() - 0.5) * 160;
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({
      color: 0xc4b5fd,
      size: 0.2,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    });
    scene.add(new THREE.Points(dustGeo, dustMat));

    /* ── Node spheres — soft violet ─────────────────── */
    const nodeGeo = new THREE.SphereGeometry(0.3, 10, 10);
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0x7c3aed, transparent: true, opacity: 0.15 });
    const nodes = positions.map(pos => {
      const mesh = new THREE.Mesh(nodeGeo, nodeMat.clone());
      mesh.position.copy(pos);
      mesh.material.opacity = 0.08 + Math.random() * 0.12;
      scene.add(mesh);
      return mesh;
    });

    /* ── Edges (closest neighbours) — faint lines ──── */
    const edgeGroup = new THREE.Group();
    scene.add(edgeGroup);

    const buildEdges = () => {
      edgeGroup.clear();
      for (let i = 0; i < positions.length; i++) {
        const distances = [];
        for (let j = 0; j < positions.length; j++) {
          if (i === j) continue;
          distances.push({ j, d: positions[i].distanceTo(positions[j]) });
        }
        distances.sort((a, b) => a.d - b.d);
        const neighbours = distances.slice(0, 2);
        for (const { j } of neighbours) {
          if (j > i) {
            const pts = [positions[i].clone(), positions[j].clone()];
            const geo = new THREE.BufferGeometry().setFromPoints(pts);
            const mat = new THREE.LineBasicMaterial({
              color: 0xc4b5fd,
              transparent: true,
              opacity: 0.08,
            });
            edgeGroup.add(new THREE.Line(geo, mat));
          }
        }
      }
    };
    buildEdges();

    /* ── Node float velocities ──────────────────────── */
    const velocities = positions.map(() => new THREE.Vector3(
      (Math.random() - 0.5) * 0.006,
      (Math.random() - 0.5) * 0.006,
      (Math.random() - 0.5) * 0.004,
    ));

    /* ── Mouse parallax ─────────────────────────────── */
    let mouseX = 0, mouseY = 0;
    const onMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener('mousemove', onMouseMove);

    /* ── Resize ─────────────────────────────────────── */
    const onResize = () => {
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.clientWidth, el.clientHeight);
    };
    window.addEventListener('resize', onResize);

    /* ── Animate ─────────────────────────────────────── */
    let frameId;
    let edgeRebuildCounter = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      // Float nodes
      positions.forEach((pos, i) => {
        pos.addScaledVector(velocities[i], 1);
        if (Math.abs(pos.x) > 40) velocities[i].x *= -1;
        if (Math.abs(pos.y) > 30) velocities[i].y *= -1;
        if (Math.abs(pos.z) > 20) velocities[i].z *= -1;
        nodes[i].position.copy(pos);
        nodes[i].material.opacity = 0.06 + Math.sin(t * 1.2 + i * 0.7) * 0.04;
      });

      // Rebuild edges every 90 frames
      edgeRebuildCounter++;
      if (edgeRebuildCounter >= 90) {
        buildEdges();
        edgeRebuildCounter = 0;
      }

      // Scene rotation + mouse parallax
      scene.rotation.y = t * 0.012 + mouseX * 0.03;
      scene.rotation.x = Math.sin(t * 0.01) * 0.05 + mouseY * 0.02;

      renderer.render(scene, camera);
    };
    animate();

    /* ── Cleanup ─────────────────────────────────────── */
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [nodeCount]);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 z-0 pointer-events-none w-full h-full"
    />
  );
}
