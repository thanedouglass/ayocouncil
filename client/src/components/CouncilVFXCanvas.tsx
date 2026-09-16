import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { STONES, StoneKey } from '../lib/stones';

export type VFXMode = 'idle' | 'typing' | 'deliberating' | 'consensus';

interface Props {
  mode: VFXMode;
  selectedStone?: StoneKey | null;
  onStoneSelect?: (stone: StoneKey) => void;
  className?: string;
}

const ORBIT_RADIUS = 2.3;
const VOID = 0x08090e;

/** Radial-gradient sprite texture (white core → transparent) for glow halos. */
function makeGlowTexture(size = 128): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.4)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/** Cyan→violet nebula bloom texture for the far background plane. */
function makeNebulaTexture(size = 512): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g1 = ctx.createRadialGradient(size * 0.38, size * 0.42, 0, size * 0.38, size * 0.42, size * 0.55);
  g1.addColorStop(0, 'rgba(0,240,255,0.16)');
  g1.addColorStop(1, 'rgba(0,240,255,0)');
  const g2 = ctx.createRadialGradient(size * 0.66, size * 0.6, 0, size * 0.66, size * 0.6, size * 0.6);
  g2.addColorStop(0, 'rgba(124,58,237,0.18)');
  g2.addColorStop(1, 'rgba(124,58,237,0)');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
}

/**
 * The Living 3D Council Orbit: obsidian void, 120 drifting stars, six faceted
 * stones on a glowing orbital ring, chord lines pulsing into a white-hot
 * singularity core. Mode drives the choreography:
 *  - idle: hypnotic gyroscopic rotation + mouse spring parallax
 *  - typing: the Cyan (Intake) stone sparks at high frequency
 *  - deliberating: the orbit accelerates; light beams strike between stones
 *  - consensus: the core detonates a hot-magenta flare
 */
export const CouncilVFXCanvas: React.FC<Props> = ({
  mode,
  selectedStone = null,
  onStoneSelect,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  // Live refs so the render loop reads fresh props without re-mounting the scene.
  const modeRef = useRef<VFXMode>(mode);
  const selectedRef = useRef<StoneKey | null>(selectedStone);
  const onSelectRef = useRef(onStoneSelect);
  modeRef.current = mode;
  selectedRef.current = selectedStone;
  onSelectRef.current = onStoneSelect;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---------- Renderer / scene / camera ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(VOID, 1);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100);
    camera.position.set(0, 0.6, 7);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.25));
    const coreLight = new THREE.PointLight(0xffffff, 2.2, 30);
    scene.add(coreLight);

    const glowTex = makeGlowTexture();
    const nebulaTex = makeNebulaTexture();
    const disposables: Array<{ dispose: () => void }> = [glowTex, nebulaTex];

    // ---------- Nebula bloom (far background) ----------
    const nebulaMat = new THREE.MeshBasicMaterial({
      map: nebulaTex,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const nebulaGeo = new THREE.PlaneGeometry(60, 60);
    const nebula = new THREE.Mesh(nebulaGeo, nebulaMat);
    nebula.position.z = -20;
    scene.add(nebula);
    disposables.push(nebulaGeo, nebulaMat);

    // ---------- 120 drifting stars ----------
    const starCount = 120;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 40;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 24;
      starPos[i * 3 + 2] = -4 - Math.random() * 14;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.05,
      transparent: true,
      opacity: 0.45,
      depthWrite: false
    });
    const stars = new THREE.Points(starGeo, starMat);
    scene.add(stars);
    disposables.push(starGeo, starMat);

    // ---------- The Sacred Orbit ----------
    const orbit = new THREE.Group();
    orbit.rotation.x = 0.42;
    scene.add(orbit);

    const ringGeo = new THREE.TorusGeometry(ORBIT_RADIUS, 0.012, 12, 128);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x8fd7ff,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    orbit.add(ring);
    disposables.push(ringGeo, ringMat);

    // Faceted stones + halos + chords
    const stoneGeo = new THREE.IcosahedronGeometry(0.22, 0);
    disposables.push(stoneGeo);
    const stoneMeshes: THREE.Mesh[] = [];
    const stoneMats: THREE.MeshStandardMaterial[] = [];
    const haloSprites: THREE.Sprite[] = [];
    const chordMats: THREE.LineBasicMaterial[] = [];

    STONES.forEach((stone, i) => {
      const angle = (i / STONES.length) * Math.PI * 2;
      const pos = new THREE.Vector3(Math.cos(angle) * ORBIT_RADIUS, 0, Math.sin(angle) * ORBIT_RADIUS);
      const color = new THREE.Color(stone.color);

      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.8,
        flatShading: true,
        roughness: 0.25,
        metalness: 0.1
      });
      const mesh = new THREE.Mesh(stoneGeo, mat);
      mesh.position.copy(pos);
      mesh.userData.stoneKey = stone.key;
      orbit.add(mesh);
      stoneMeshes.push(mesh);
      stoneMats.push(mat);
      disposables.push(mat);

      const haloMat = new THREE.SpriteMaterial({
        map: glowTex,
        color,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const halo = new THREE.Sprite(haloMat);
      halo.scale.setScalar(1.1);
      halo.position.copy(pos);
      orbit.add(halo);
      haloSprites.push(halo);
      disposables.push(haloMat);

      // Chord: core → stone (static in orbit space; only opacity pulses)
      const chordGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), pos]);
      const chordMat = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.2,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      orbit.add(new THREE.Line(chordGeo, chordMat));
      chordMats.push(chordMat);
      disposables.push(chordGeo, chordMat);
    });

    // ---------- Singularity core ----------
    const coreGeo = new THREE.SphereGeometry(0.16, 24, 24);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.userData.stoneKey = 'core';
    orbit.add(core);
    disposables.push(coreGeo, coreMat);

    const coreGlowMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const coreGlow = new THREE.Sprite(coreGlowMat);
    coreGlow.scale.setScalar(2.2);
    orbit.add(coreGlow);
    disposables.push(coreGlowMat);

    // ---------- Intake sparks (visible while typing) ----------
    const sparkCount = 42;
    const sparkPos = new Float32Array(sparkCount * 3);
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const cyanIndex = STONES.findIndex((s) => s.key === 'cyan');
    const sparkMat = new THREE.PointsMaterial({
      color: new THREE.Color(STONES[cyanIndex].color),
      size: 0.045,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    orbit.add(sparks);
    disposables.push(sparkGeo, sparkMat);

    // ---------- Deliberation storm beams ----------
    const BEAMS = 4;
    const beams: { line: THREE.Line; mat: THREE.LineBasicMaterial; geo: THREE.BufferGeometry }[] = [];
    for (let i = 0; i < BEAMS; i++) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const mat = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const line = new THREE.Line(geo, mat);
      orbit.add(line);
      beams.push({ line, mat, geo });
      disposables.push(geo, mat);
    }
    let lastStrike = 0;

    // ---------- Interaction: parallax + raycast picking ----------
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2(-10, -10);
    let targetTiltX = 0;
    let targetTiltY = 0;

    const onPointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      targetTiltY = pointer.x * 0.35;
      targetTiltX = 0.42 + pointer.y * -0.22;
    };

    const pickables = [...stoneMeshes, core];
    const onClick = () => {
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(pickables, false)[0];
      if (hit) onSelectRef.current?.(hit.object.userData.stoneKey as StoneKey);
    };

    container.addEventListener('pointermove', onPointerMove);
    container.addEventListener('click', onClick);

    // ---------- Resize ----------
    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // ---------- Render loop ----------
    let raf = 0;
    let speed = 1;
    let consensusT = 1; // 0→1 flare timer; starts spent
    let prevMode: VFXMode = modeRef.current;
    const clock = new THREE.Clock();
    const white = new THREE.Color(0xffffff);
    const magenta = new THREE.Color(0xff1493);
    const cyanStonePos = stoneMeshes[cyanIndex].position;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      if (document.hidden) return;

      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      const m = modeRef.current;

      if (m === 'consensus' && prevMode !== 'consensus') consensusT = 0;
      prevMode = m;

      // Gyroscopic rotation + spring parallax
      const targetSpeed = m === 'deliberating' ? 4.2 : m === 'consensus' ? 1.8 : 1;
      speed += (targetSpeed - speed) * Math.min(1, dt * 2.5);
      const motionScale = reducedMotion ? 0.15 : 1;
      orbit.rotation.y += dt * 0.18 * speed * motionScale;
      orbit.rotation.z = Math.sin(t * 0.21) * 0.08 * motionScale;
      orbit.rotation.x += (targetTiltX - orbit.rotation.x) * Math.min(1, dt * 4);
      const yDrift = orbit.rotation.y;
      camera.position.x += (targetTiltY * 0.6 - camera.position.x) * Math.min(1, dt * 3);
      camera.lookAt(0, 0, 0);
      void yDrift;

      // Stars drift
      stars.rotation.y += dt * 0.008 * motionScale;
      stars.rotation.x = Math.sin(t * 0.05) * 0.02;

      // Chord pulse
      chordMats.forEach((cm, i) => {
        cm.opacity = 0.14 + 0.12 * (0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.1));
      });

      // Stone breathing + selection highlight + typing pulse on cyan
      stoneMeshes.forEach((mesh, i) => {
        const isSelected = selectedRef.current === STONES[i].key;
        const base = 0.8 + 0.25 * Math.sin(t * 1.6 + i);
        let intensity = base;
        if (m === 'typing' && i === cyanIndex) intensity = 1.6 + Math.sin(t * 18) * 0.9;
        if (isSelected) intensity += 0.9;
        stoneMats[i].emissiveIntensity = intensity;
        const s = isSelected ? 1.35 : 1;
        mesh.scale.setScalar(s + 0.04 * Math.sin(t * 2 + i));
        mesh.rotation.y += dt * (0.6 + i * 0.07);
        haloSprites[i].material.opacity = 0.35 + intensity * 0.18;
        haloSprites[i].scale.setScalar((1.05 + 0.1 * Math.sin(t * 1.8 + i)) * s);
      });

      // Intake sparks
      const sparkTarget = m === 'typing' ? 0.9 : 0;
      sparkMat.opacity += (sparkTarget - sparkMat.opacity) * Math.min(1, dt * 6);
      if (sparkMat.opacity > 0.02) {
        const arr = sparkGeo.attributes.position.array as Float32Array;
        for (let i = 0; i < sparkCount; i++) {
          arr[i * 3] = cyanStonePos.x + (Math.random() - 0.5) * 0.9;
          arr[i * 3 + 1] = cyanStonePos.y + (Math.random() - 0.5) * 0.9;
          arr[i * 3 + 2] = cyanStonePos.z + (Math.random() - 0.5) * 0.9;
        }
        sparkGeo.attributes.position.needsUpdate = true;
      }

      // Deliberation storm: beams strike between random stones
      if (m === 'deliberating' && t - lastStrike > 0.14) {
        lastStrike = t;
        const beam = beams[Math.floor(Math.random() * BEAMS)];
        const a = stoneMeshes[Math.floor(Math.random() * stoneMeshes.length)].position;
        let b = stoneMeshes[Math.floor(Math.random() * stoneMeshes.length)].position;
        if (b === a) b = core.position;
        beam.geo.setFromPoints([a.clone(), b.clone()]);
        beam.mat.color.set(STONES[Math.floor(Math.random() * STONES.length)].color);
        beam.mat.opacity = 1;
      }
      beams.forEach((beam) => {
        beam.mat.opacity *= Math.pow(0.02, dt); // fast electrical decay
      });

      // Consensus flare: white-hot core → hot magenta detonation
      consensusT = Math.min(1, consensusT + dt * 0.55);
      const flare = m === 'consensus' ? Math.sin(Math.min(consensusT, 1) * Math.PI) : 0;
      coreGlowMat.color.copy(white).lerp(magenta, flare);
      coreGlow.scale.setScalar(2.2 + flare * 9 + 0.15 * Math.sin(t * 3));
      coreGlowMat.opacity = 0.85 + flare * 0.15;
      coreLight.intensity = 2.2 + flare * 6;
      core.scale.setScalar(1 + flare * 0.6 + 0.05 * Math.sin(t * 4));

      renderer.render(scene, camera);
    };
    tick();

    // ---------- Teardown: zero WebGL leaks ----------
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('click', onClick);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full cursor-pointer ${className}`}
      role="img"
      aria-label="The Council Orbit: six stones circling the singularity core"
    />
  );
};
