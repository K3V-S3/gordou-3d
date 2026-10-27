import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  GordouState,
  MinigameId,
  calculateMorphFactors,
  calculateSweatParticleMetrics,
  WARDROBE_ITEMS,
} from '../game/rules';
import { sound } from '../utils/sound';

export interface GordouCanvasProps {
  gameState: 'title' | 'playing' | 'paused' | 'gameover';
  gordouState: GordouState;
  activeMinigame: MinigameId;
  mouthOpenness: number; // 0..1 from Pou mic lip-sync or chewing
  activeBathTool: 'none' | 'soap' | 'shower';
  feedingFoodColor: string | null;
  workoutAnim: 'none' | 'dumbbells' | 'squats';
  onBellyTap: () => void;
  onSoapScrub: () => void;
  onMinigameScoreChange: (score: number, combo: number, timeRemaining: number) => void;
  onMinigameFinish: (finalScore: number, reason: string) => void;
}

// Pre-allocated math helpers outside render loop (zero GC in tick)
const _vec3 = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetLookAt = new THREE.Vector3();
const _currentLookAt = new THREE.Vector3(0, 1.3, 0);

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function createTileBumpTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#505050';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 128; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 128);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(128, i);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 8);
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

export const GordouCanvas3D: React.FC<GordouCanvasProps> = (props) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const propsRef = useRef<GordouCanvasProps>(props);
  propsRef.current = props;

  // Expose imperative minigame actions to keyboard/touch controls via window events
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const isSoftwareGl = detectSoftwareGl();
    const width = mount.clientWidth || window.innerWidth;
    const height = mount.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const bgColor = new THREE.Color('#1B2436');
    scene.background = bgColor;
    scene.fog = new THREE.FogExp2('#1B2436', 0.032);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2.1, 5.8);
    camera.lookAt(0, 1.3, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    mount.innerHTML = '';
    mount.appendChild(renderer.domElement);

    // Studio PBR Environment Reflection
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3-Point Warm/Cool Lighting Rig
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x3b2f2f, 0.85);
    hemiLight.position.set(0, 12, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 1.95);
    keyLight.position.set(4.5, 8.5, 5.5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 25;
    const d = 5.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x60a5fa, 0.85);
    rimLight.position.set(-4.5, 4.5, -4.5);
    scene.add(rimLight);

    // Floor & Room Platform (offset by >= 0.02 to avoid Z-fighting)
    const bumpTex = createTileBumpTexture(renderer);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x2a3449,
      roughness: 0.65,
      metalness: 0.1,
      bumpMap: bumpTex,
      bumpScale: 0.02,
    });
    const floorMesh = new THREE.Mesh(new THREE.CylinderGeometry(14, 14, 0.3, 48), floorMat);
    floorMesh.position.y = -0.15;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    // Decorative Platform Rug under Gordou
    const rugMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.85,
      metalness: 0.05,
    });
    const rugMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.85, 0.04, 36), rugMat);
    rugMesh.position.y = 0.02;
    rugMesh.receiveShadow = true;
    scene.add(rugMesh);

    // Soft radial contact shadow directly beneath Gordou
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x050811,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(new THREE.CircleGeometry(1.15, 32), shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.045;
    scene.add(contactShadow);

    // =========================================================
    // COMPOSITE 12-PART PROCEDURAL 3D GORDOU CHARACTER GROUP
    // Pivoted at bottom-center flush with ground (y = 0.04)
    // =========================================================
    const gordouGroup = new THREE.Group();
    gordouGroup.position.set(0, 0.04, 0);
    scene.add(gordouGroup);

    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x8d5524, // Warm brown skin (#8D5524)
      roughness: 0.58,
      metalness: 0.06,
    });

    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x181311,
      roughness: 0.82,
      metalness: 0.05,
    });

    const shirtMat = new THREE.MeshPhysicalMaterial({
      color: 0xff6b35,
      roughness: 0.45,
      metalness: 0.12,
      clearcoat: 0.15,
    });

    const shortsMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.72,
      metalness: 0.08,
    });

    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.35,
      metalness: 0.15,
    });

    // 1. Legs & Sneakers (Left + Right)
    const legGroupL = new THREE.Group();
    legGroupL.position.set(-0.36, 0, 0);
    const legGroupR = new THREE.Group();
    legGroupR.position.set(0.36, 0, 0);
    gordouGroup.add(legGroupL, legGroupR);

    const shinGeo = new THREE.CapsuleGeometry(0.18, 0.36, 8, 16);
    const legMeshL = new THREE.Mesh(shinGeo, skinMat);
    legMeshL.position.y = 0.36;
    legMeshL.castShadow = true;
    const legMeshR = new THREE.Mesh(shinGeo, skinMat);
    legMeshR.position.y = 0.36;
    legMeshR.castShadow = true;

    const shoeGeo = new THREE.BoxGeometry(0.32, 0.18, 0.48);
    const shoeL = new THREE.Mesh(shoeGeo, shoeMat);
    shoeL.position.set(0, 0.09, 0.08);
    shoeL.castShadow = true;
    const shoeR = new THREE.Mesh(shoeGeo, shoeMat);
    shoeR.position.set(0, 0.09, 0.08);
    shoeR.castShadow = true;

    legGroupL.add(legMeshL, shoeL);
    legGroupR.add(legMeshR, shoeR);

    // 2. Shorts / Pelvis
    const pelvisMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.56, 0.42, 24),
      shortsMat
    );
    pelvisMesh.position.y = 0.68;
    pelvisMesh.castShadow = true;
    gordouGroup.add(pelvisMesh);

    // 3. Torso (scales dynamically with weight on X and Z)
    const torsoGroup = new THREE.Group();
    torsoGroup.position.y = 1.16;
    gordouGroup.add(torsoGroup);

    const torsoMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.62, 28, 24),
      shirtMat
    );
    torsoMesh.scale.set(1.05, 1.08, 0.95);
    torsoMesh.castShadow = true;
    torsoGroup.add(torsoMesh);

    // 4. Dynamic 3D Belly (scales with weight & jiggles when tapped, positioned below chest)
    const bellyMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.48, 28, 24),
      shirtMat
    );
    bellyMesh.position.set(0, -0.16, 0.24);
    bellyMesh.castShadow = true;
    torsoGroup.add(bellyMesh);

    // 5. Arms & Hands (Left & Right articulated groups + 3D Dumbbells)
    const armGroupL = new THREE.Group();
    armGroupL.position.set(-0.62, 1.48, 0.04);
    const armGroupR = new THREE.Group();
    armGroupR.position.set(0.62, 1.48, 0.04);
    gordouGroup.add(armGroupL, armGroupR);

    const upperArmGeo = new THREE.CapsuleGeometry(0.145, 0.42, 8, 16);
    const armMeshL = new THREE.Mesh(upperArmGeo, skinMat);
    armMeshL.position.set(-0.12, -0.2, 0);
    armMeshL.rotation.z = -0.28;
    armMeshL.castShadow = true;

    const armMeshR = new THREE.Mesh(upperArmGeo, skinMat);
    armMeshR.position.set(0.12, -0.2, 0);
    armMeshR.rotation.z = 0.28;
    armMeshR.castShadow = true;

    const handGeo = new THREE.SphereGeometry(0.15, 14, 14);
    const handL = new THREE.Mesh(handGeo, skinMat);
    handL.position.set(-0.2, -0.45, 0.05);
    const handR = new THREE.Mesh(handGeo, skinMat);
    handR.position.set(0.2, -0.45, 0.05);

    // 3D Dumbbells in hands (visible during dumbbell workout)
    const dumbbellMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.25,
      metalness: 0.85,
    });
    const createDumbbell = () => {
      const dg = new THREE.Group();
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.46, 12), dumbbellMat);
      bar.rotation.z = Math.PI / 2;
      const w1 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.09, 16), dumbbellMat);
      w1.rotation.z = Math.PI / 2;
      w1.position.x = -0.18;
      const w2 = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.09, 16), dumbbellMat);
      w2.rotation.z = Math.PI / 2;
      w2.position.x = 0.18;
      dg.add(bar, w1, w2);
      dg.position.set(0, -0.48, 0.18);
      dg.visible = false;
      return dg;
    };
    const dumbbellL = createDumbbell();
    const dumbbellR = createDumbbell();

    armGroupL.add(armMeshL, handL, dumbbellL);
    armGroupR.add(armMeshR, handR, dumbbellR);

    // 6. Head & Expressive Face Group (elevated with clear neck separation)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 2.14, 0.06);
    gordouGroup.add(headGroup);

    const craniumMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.54, 28, 24),
      skinMat
    );
    craniumMesh.castShadow = true;
    headGroup.add(craniumMesh);

    // Cute 3D Nose & Ears
    const noseMesh = new THREE.Mesh(new THREE.SphereGeometry(0.078, 14, 14), skinMat);
    noseMesh.position.set(0, -0.02, 0.53);
    const earGeo = new THREE.SphereGeometry(0.12, 12, 12);
    const earL = new THREE.Mesh(earGeo, skinMat);
    earL.position.set(-0.52, 0.02, 0);
    const earR = new THREE.Mesh(earGeo, skinMat);
    earR.position.set(0.52, 0.02, 0);
    headGroup.add(noseMesh, earL, earR);

    // 7. Dynamic Chubby Cheeks (frame the smile without blocking eyes or mouth)
    const cheekGeo = new THREE.SphereGeometry(0.155, 18, 16);
    const cheekL = new THREE.Mesh(cheekGeo, skinMat);
    cheekL.position.set(-0.33, -0.12, 0.35);
    const cheekR = new THREE.Mesh(cheekGeo, skinMat);
    cheekR.position.set(0.33, -0.12, 0.35);
    headGroup.add(cheekL, cheekR);

    // 8. Curly Styled Dark Hair Cluster
    const hairGroup = new THREE.Group();
    const hairPositions: [number, number, number, number][] = [
      [0, 0.46, 0.05, 0.24],
      [-0.24, 0.42, 0.08, 0.21],
      [0.24, 0.42, 0.08, 0.21],
      [0, 0.44, -0.18, 0.25],
      [-0.36, 0.3, -0.05, 0.19],
      [0.36, 0.3, -0.05, 0.19],
      [0, 0.5, 0.22, 0.18],
    ];
    hairPositions.forEach(([hx, hy, hz, hr]) => {
      const curl = new THREE.Mesh(new THREE.SphereGeometry(hr, 14, 12), hairMat);
      curl.position.set(hx, hy, hz);
      hairGroup.add(curl);
    });
    headGroup.add(hairGroup);

    // 9. Expressive Eyes with Pupils, Eyebrows & Blinking Eyelids
    const scleraMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.15,
      metalness: 0.05,
    });
    const pupilMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.1,
      metalness: 0.2,
    });

    const eyeL = new THREE.Group();
    eyeL.position.set(-0.19, 0.11, 0.47);
    const eyeR = new THREE.Group();
    eyeR.position.set(0.19, 0.11, 0.47);

    const scleraGeo = new THREE.SphereGeometry(0.115, 16, 16);
    const scleraL = new THREE.Mesh(scleraGeo, scleraMat);
    const scleraR = new THREE.Mesh(scleraGeo, scleraMat);

    const pupilGeo = new THREE.SphereGeometry(0.06, 14, 14);
    const pupilL = new THREE.Mesh(pupilGeo, pupilMat);
    pupilL.position.z = 0.088;
    const pupilR = new THREE.Mesh(pupilGeo, pupilMat);
    pupilR.position.z = 0.088;

    const highlightGeo = new THREE.SphereGeometry(0.022, 8, 8);
    const highlightL = new THREE.Mesh(highlightGeo, scleraMat);
    highlightL.position.set(0.025, 0.025, 0.135);
    const highlightR = new THREE.Mesh(highlightGeo, scleraMat);
    highlightR.position.set(0.025, 0.025, 0.135);

    // Eyelids for blinking / sleeping / low-energy droop
    const eyelidGeo = new THREE.SphereGeometry(0.122, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const eyelidL = new THREE.Mesh(eyelidGeo, skinMat);
    eyelidL.rotation.x = -0.9;
    const eyelidR = new THREE.Mesh(eyelidGeo, skinMat);
    eyelidR.rotation.x = -0.9;

    eyeL.add(scleraL, pupilL, highlightL, eyelidL);
    eyeR.add(scleraR, pupilR, highlightR, eyelidR);
    headGroup.add(eyeL, eyeR);

    // 10. Articulated 3D Mouth (clearly visible in front of face for Lip-Sync & Chewing)
    const mouthGroup = new THREE.Group();
    mouthGroup.position.set(0, -0.19, 0.51);
    headGroup.add(mouthGroup);

    const mouthCavityMat = new THREE.MeshBasicMaterial({ color: 0x3b0712 });
    const tongueMat = new THREE.MeshStandardMaterial({ color: 0xfb7185, roughness: 0.4 });
    const teethMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 });

    const mouthCavity = new THREE.Mesh(new THREE.SphereGeometry(0.135, 18, 16), mouthCavityMat);
    mouthCavity.scale.set(1.35, 0.42, 0.35);
    const teethMesh = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.032, 0.04), teethMat);
    teethMesh.position.set(0, 0.038, 0.02);
    const tongueMesh = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 10), tongueMat);
    tongueMesh.scale.set(1.1, 0.35, 0.5);
    tongueMesh.position.set(0, -0.025, 0.02);
    mouthGroup.add(mouthCavity, teethMesh, tongueMesh);

    // 11. 3D Equipped Cosmetics (Headband, Cap, Sunglasses, Gold Chain)
    const headbandMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      roughness: 0.5,
      metalness: 0.1,
    });
    const headbandMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.565, 0.565, 0.12, 28, 1, true),
      headbandMat
    );
    headbandMesh.position.y = 0.24;
    headGroup.add(headbandMesh);

    const capGroup = new THREE.Group();
    capGroup.position.set(0, 0.36, 0);
    const capMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.4, metalness: 0.2 });
    const capDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.57, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.5),
      capMat
    );
    const capVisor = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.05, 0.45), capMat);
    capVisor.position.set(0, 0.02, 0.48);
    capGroup.add(capDome, capVisor);
    capGroup.visible = false;
    headGroup.add(capGroup);

    const glassesGroup = new THREE.Group();
    glassesGroup.position.set(0, 0.09, 0.56);
    const glassesMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.15,
      metalness: 0.85,
      clearcoat: 1.0,
    });
    const lensL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.05), glassesMat);
    lensL.position.x = -0.2;
    const lensR = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.16, 0.05), glassesMat);
    lensR.position.x = 0.2;
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.04, 0.04), glassesMat);
    glassesGroup.add(lensL, lensR, bridge);
    glassesGroup.visible = false;
    headGroup.add(glassesGroup);

    const chainMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.2,
      metalness: 0.92,
    });
    const chainMesh = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.045, 12, 28), chainMat);
    chainMesh.rotation.x = Math.PI / 2 + 0.25;
    chainMesh.position.set(0, 1.56, 0.12);
    chainMesh.visible = false;
    gordouGroup.add(chainMesh);

    // 12. 3D Soap Bubbles, Sweat Drops, Orbiting Flies, and Floating Food Projectile
    const soapBubbleGroup = new THREE.Group();
    const bubbleMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.82,
      clearcoat: 1.0,
    });
    const bubbleMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < 24; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.11 + (i % 3) * 0.04, 12, 12), bubbleMat);
      const angle = (i / 24) * Math.PI * 2;
      const h = 0.65 + (i % 5) * 0.28;
      const r = 0.62 + (i % 2) * 0.16;
      b.position.set(Math.cos(angle) * r, h, Math.sin(angle) * r + 0.15);
      b.visible = false;
      soapBubbleGroup.add(b);
      bubbleMeshes.push(b);
    }
    gordouGroup.add(soapBubbleGroup);

    // 3D Glossy Sweat Droplet Particle System (activates when sweatLevel > 50%, vanishes on shower)
    const sweatGroup = new THREE.Group();
    const sweatMat = new THREE.MeshPhysicalMaterial({
      color: 0x7dd3fc,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.55,
      roughness: 0.04,
      metalness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      transparent: true,
      opacity: 0.94,
    });
    const sweatGlintMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const dropBodyGeo = new THREE.SphereGeometry(0.036, 12, 10);
    const dropTipGeo = new THREE.ConeGeometry(0.026, 0.046, 10);
    const dropGlintGeo = new THREE.SphereGeometry(0.012, 8, 8);

    const createGlossySweatDrop = (scale = 1): THREE.Group => {
      const dg = new THREE.Group();
      const body = new THREE.Mesh(dropBodyGeo, sweatMat);
      body.scale.set(0.88, 1.25, 0.88);
      const tip = new THREE.Mesh(dropTipGeo, sweatMat);
      tip.position.y = 0.038;
      const glint = new THREE.Mesh(dropGlintGeo, sweatGlintMat);
      glint.position.set(0.012, 0.015, 0.028);
      dg.add(body, tip, glint);
      dg.scale.setScalar(scale);
      dg.visible = false;
      return dg;
    };

    // 18 Surface Glossy Sweat Beads attached directly to Gordou's 3D head, cheeks, shoulders & torso/belly
    interface SurfaceSweatDrop {
      group: THREE.Group;
      zone: 'head' | 'torso' | 'belly';
      basePos: [number, number, number];
      phase: number;
      baseScale: number;
    }
    const surfaceSweatDrops: SurfaceSweatDrop[] = [];
    const headDropAnchors: [number, number, number, number][] = [
      [-0.24, 0.31, 0.44, 1.05], // Left brow
      [0.24, 0.31, 0.44, 1.05], // Right brow
      [0.0, 0.34, 0.46, 0.95], // Center forehead
      [-0.44, 0.14, 0.34, 1.0], // Left temple
      [0.44, 0.14, 0.34, 1.0], // Right temple
      [-0.38, -0.05, 0.43, 0.92], // Left upper cheek
      [0.38, -0.05, 0.43, 0.92], // Right upper cheek
      [0.14, -0.24, 0.49, 0.88], // Chin / jaw
    ];
    headDropAnchors.forEach(([x, y, z, sc], idx) => {
      const dg = createGlossySweatDrop(sc);
      dg.position.set(x, y, z);
      headGroup.add(dg);
      surfaceSweatDrops.push({
        group: dg,
        zone: 'head',
        basePos: [x, y, z],
        phase: idx * 0.7,
        baseScale: sc,
      });
    });

    const torsoDropAnchors: [number, number, number, number, 'torso' | 'belly'][] = [
      [-0.38, 0.28, 0.46, 1.1, 'torso'], // Left upper chest
      [0.38, 0.28, 0.46, 1.1, 'torso'], // Right upper chest
      [-0.54, 0.12, 0.24, 1.0, 'torso'], // Left shoulder/rib
      [0.54, 0.12, 0.24, 1.0, 'torso'], // Right shoulder/rib
      [0.0, 0.22, 0.54, 1.05, 'torso'], // Center sternum
      [-0.28, -0.06, 0.56, 1.08, 'belly'], // Left upper belly
      [0.28, -0.06, 0.56, 1.08, 'belly'], // Right upper belly
      [0.0, -0.14, 0.62, 1.12, 'belly'], // Center belly
      [-0.42, -0.22, 0.46, 0.96, 'belly'], // Left lower belly
      [0.42, -0.22, 0.46, 0.96, 'belly'], // Right lower belly
    ];
    torsoDropAnchors.forEach(([x, y, z, sc, zone], idx) => {
      const dg = createGlossySweatDrop(sc);
      dg.position.set(x, y, z);
      torsoGroup.add(dg);
      surfaceSweatDrops.push({
        group: dg,
        zone,
        basePos: [x, y, z],
        phase: (idx + 8) * 0.65,
        baseScale: sc,
      });
    });

    // 14 Animated Falling 3D Sweat Droplets cascading off Gordou's body
    const fallingSweatDrops: THREE.Group[] = [];
    for (let i = 0; i < 14; i++) {
      const drop = createGlossySweatDrop(1.05);
      sweatGroup.add(drop);
      fallingSweatDrops.push(drop);
    }

    const flyMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const flies: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const fly = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 8), flyMat);
      sweatGroup.add(fly);
      flies.push(fly);
    }
    gordouGroup.add(sweatGroup);

    // Shower water particles
    const showerGroup = new THREE.Group();
    const waterDrops: THREE.Mesh[] = [];
    for (let i = 0; i < 28; i++) {
      const wd = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), sweatMat);
      wd.scale.set(0.6, 1.8, 0.6);
      wd.position.set((Math.random() - 0.5) * 1.4, 1.0 + Math.random() * 2.2, (Math.random() - 0.5) * 1.2);
      showerGroup.add(wd);
      waterDrops.push(wd);
    }
    showerGroup.visible = false;
    scene.add(showerGroup);

    // Flying Food Projectile into Gordou's Mouth
    const foodProjMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.35 });
    const foodProjMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 16), foodProjMat);
    foodProjMesh.visible = false;
    scene.add(foodProjMesh);

    // 3D Champion Golden Trophy (shown when weight <= 65.0 kg)
    const trophyGroup = new THREE.Group();
    trophyGroup.position.set(1.45, 0.04, 0.35);
    const trophyBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.32, 0.22, 20),
      dumbbellMat
    );
    trophyBase.position.y = 0.11;
    const trophyStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.12, 0.32, 16),
      chainMat
    );
    trophyStem.position.y = 0.36;
    const trophyCup = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.14, 0.38, 24),
      chainMat
    );
    trophyCup.position.y = 0.68;
    trophyGroup.add(trophyBase, trophyStem, trophyCup);
    trophyGroup.visible = false;
    scene.add(trophyGroup);

    // =========================================================
    // 3D MINIGAME PROPS (Jump Rope, Runner Track, Falling Foods, Treadmill)
    // =========================================================
    // 1. Jump Rope 3D Tube
    const ropeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.05, 1.2, 0),
      new THREE.Vector3(-0.75, 2.35, 0),
      new THREE.Vector3(0, 2.75, 0),
      new THREE.Vector3(0.75, 2.35, 0),
      new THREE.Vector3(1.05, 1.2, 0),
    ]);
    const ropeGeo = new THREE.TubeGeometry(ropeCurve, 32, 0.035, 8, false);
    const ropeMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.3,
      metalness: 0.2,
    });
    const jumpRopePivot = new THREE.Group();
    jumpRopePivot.position.set(0, 1.22, 0);
    const jumpRopeMesh = new THREE.Mesh(ropeGeo, ropeMat);
    jumpRopeMesh.position.y = -1.22;
    jumpRopePivot.add(jumpRopeMesh);
    jumpRopePivot.visible = false;
    scene.add(jumpRopePivot);

    // 2. 3D Treadmill (for Gimnasio & Sprint Minigame)
    const treadmillGroup = new THREE.Group();
    treadmillGroup.position.set(0, 0.04, 0);
    const beltBase = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.12, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.3 })
    );
    beltBase.position.y = 0.06;
    const consolePostL = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.45, 12), dumbbellMat);
    consolePostL.position.set(-0.65, 0.75, -1.05);
    const consolePostR = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.45, 12), dumbbellMat);
    consolePostR.position.set(0.65, 0.75, -1.05);
    const consoleHead = new THREE.Mesh(
      new THREE.BoxGeometry(1.42, 0.32, 0.28),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.5 })
    );
    consoleHead.position.set(0, 1.48, -1.05);
    consoleHead.rotation.x = 0.35;
    treadmillGroup.add(beltBase, consolePostL, consolePostR, consoleHead);
    treadmillGroup.visible = false;
    scene.add(treadmillGroup);

    // 3. Minigame Dynamic Obstacles & Collectibles Pool (Runner & Food Drop)
    interface GameItem3D {
      mesh: THREE.Mesh;
      active: boolean;
      type: 'healthy' | 'junk' | 'coin';
      x: number;
      y: number;
      z: number;
      speed: number;
    }
    const itemPool: GameItem3D[] = [];
    const poolGroup = new THREE.Group();
    scene.add(poolGroup);

    const healthyMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.35 });
    const junkMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.45 });
    const coinPoolMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, metalness: 0.85 });

    for (let i = 0; i < 18; i++) {
      const type: 'healthy' | 'junk' | 'coin' = i % 3 === 0 ? 'junk' : i % 3 === 1 ? 'healthy' : 'coin';
      const geo =
        type === 'coin'
          ? new THREE.CylinderGeometry(0.24, 0.24, 0.07, 18)
          : type === 'junk'
            ? new THREE.BoxGeometry(0.52, 0.52, 0.52)
            : new THREE.SphereGeometry(0.28, 16, 14);
      const mat = type === 'coin' ? coinPoolMat : type === 'junk' ? junkMat : healthyMat;
      const mesh = new THREE.Mesh(geo, mat);
      if (type === 'coin') mesh.rotation.x = Math.PI / 2;
      mesh.visible = false;
      mesh.castShadow = true;
      poolGroup.add(mesh);
      itemPool.push({ mesh, active: false, type, x: 0, y: 0, z: 0, speed: 4 });
    }

    // =========================================================
    // INTERACTION & ANIMATION STATE
    // =========================================================
    let targetRotationY = 0;
    let isDragging = false;
    let dragStartX = 0;
    let pointerNDC = { x: 0, y: 0 };
    let jumpVelY = 0;
    let jumpOffsetY = 0;
    let bellyJiggle = 0;
    let chewTimer = 0;
    let foodFlightProgress = 1; // 0..1

    // Minigame runtime variables
    let currentMinigame: MinigameId = 'none';
    let mgScore = 0;
    let mgCombo = 0;
    let mgTimeLeft = 25;
    let runnerLane = 0; // -1, 0, +1
    let foodDropX = 0; // -1.8 .. +1.8
    let ropeAngle = 0;
    let ropeSpeed = 2.8;
    let ropeScoredThisTurn = false;
    let spawnCooldown = 0;
    let treadmillSpeed = 0;

    const resetMinigame = (mode: MinigameId) => {
      currentMinigame = mode;
      mgScore = 0;
      mgCombo = 0;
      mgTimeLeft = mode === 'treadmill' ? 15 : 25;
      runnerLane = 0;
      foodDropX = 0;
      ropeAngle = 0;
      ropeSpeed = 3.0;
      ropeScoredThisTurn = false;
      treadmillSpeed = 0;
      itemPool.forEach((it) => {
        it.active = false;
        it.mesh.visible = false;
      });
    };

    // Trigger jump or minigame action
    const triggerJumpOrAction = () => {
      if (jumpOffsetY <= 0.05) {
        jumpVelY = 6.6;
        sound.playJump();
      }
    };

    const handleCustomAction = (e: Event) => {
      const detail = (e as CustomEvent).detail || {};
      if (detail.type === 'jump') {
        triggerJumpOrAction();
      } else if (detail.type === 'lane') {
        runnerLane = Math.max(-1, Math.min(1, runnerLane + detail.dir));
        foodDropX = Math.max(-1.6, Math.min(1.6, foodDropX + detail.dir * 0.65));
        sound.playTap();
      } else if (detail.type === 'treadmillStep') {
        treadmillSpeed = Math.min(14, treadmillSpeed + 2.4);
        mgScore += 1;
        mgCombo += 1;
        bellyJiggle = 0.5;
        sound.playTap();
        propsRef.current.onMinigameScoreChange(mgScore, mgCombo, Math.ceil(mgTimeLeft));
      } else if (detail.type === 'feed') {
        foodFlightProgress = 0;
        foodProjMat.color.set(detail.color || '#22C55E');
        foodProjMesh.visible = true;
        chewTimer = 1.4;
      }
    };
    window.addEventListener('gordou-action', handleCustomAction);

    // Keyboard controls for Minigames & Belly Bounce
    const onKeyDown = (e: KeyboardEvent) => {
      if (propsRef.current.gameState !== 'playing') return;
      const mg = propsRef.current.activeMinigame;
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        triggerJumpOrAction();
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        if (mg === 'runner') runnerLane = Math.max(-1, runnerLane - 1);
        else if (mg === 'fooddrop') foodDropX = Math.max(-1.6, foodDropX - 0.55);
        else if (mg === 'treadmill') {
          window.dispatchEvent(new CustomEvent('gordou-action', { detail: { type: 'treadmillStep' } }));
        }
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        if (mg === 'runner') runnerLane = Math.min(1, runnerLane + 1);
        else if (mg === 'fooddrop') foodDropX = Math.min(1.6, foodDropX + 0.55);
        else if (mg === 'treadmill') {
          window.dispatchEvent(new CustomEvent('gordou-action', { detail: { type: 'treadmillStep' } }));
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);

    // Pointer / Touch events on the 3D canvas
    const domEl = renderer.domElement;
    const onPointerDown = (e: PointerEvent) => {
      const rect = domEl.getBoundingClientRect();
      pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      isDragging = true;
      dragStartX = e.clientX;

      const mg = propsRef.current.activeMinigame;
      if (mg === 'jumprope') {
        triggerJumpOrAction();
        return;
      }
      if (mg === 'runner') {
        if (pointerNDC.y > 0.1) triggerJumpOrAction();
        else if (pointerNDC.x < -0.15) runnerLane = Math.max(-1, runnerLane - 1);
        else if (pointerNDC.x > 0.15) runnerLane = Math.min(1, runnerLane + 1);
        return;
      }

      // Check if tapping near center (Gordou's belly/body)
      if (Math.abs(pointerNDC.x) < 0.45 && Math.abs(pointerNDC.y) < 0.55) {
        if (propsRef.current.activeBathTool === 'soap') {
          propsRef.current.onSoapScrub();
          bellyJiggle = 0.6;
        } else {
          bellyJiggle = 1.0;
          triggerJumpOrAction();
          propsRef.current.onBellyTap();
        }
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = domEl.getBoundingClientRect();
      pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      if (!isDragging) return;
      const dx = e.clientX - dragStartX;
      dragStartX = e.clientX;

      const mg = propsRef.current.activeMinigame;
      if (mg === 'fooddrop') {
        foodDropX = Math.max(-1.65, Math.min(1.65, pointerNDC.x * 1.9));
        return;
      }

      if (propsRef.current.activeBathTool === 'soap' && Math.abs(pointerNDC.x) < 0.55) {
        if (Math.abs(dx) > 3) {
          propsRef.current.onSoapScrub();
        }
      } else {
        targetRotationY = Math.max(-0.85, Math.min(0.85, targetRotationY + dx * 0.01));
      }
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    // Resize handling
    const onResize = () => {
      if (!mount) return;
      const w = mount.clientWidth || window.innerWidth;
      const h = mount.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Pre-warm shaders on GPU
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // =========================================================
    // PACED RENDER & SIMULATION LOOP (60fps GPU / afterDraw on Software GL)
    // =========================================================
    let frameId = 0;
    let isUnmounted = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (isUnmounted) return;
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    }

    function tick() {
      if (isUnmounted) return;
      const rawDt = clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const elapsed = clock.getElapsedTime();

      const p = propsRef.current;
      const gs = p.gordouState;

      // Sync minigame switch
      if (p.activeMinigame !== currentMinigame) {
        resetMinigame(p.activeMinigame);
      }

      // 1. Dynamic Real-Time 3D Weight Morphology (120/110kg -> 65kg)
      const morph = calculateMorphFactors(gs.weight);
      torsoMesh.scale.x = THREE.MathUtils.damp(torsoMesh.scale.x, morph.torsoScaleX, 6, dt);
      torsoMesh.scale.z = THREE.MathUtils.damp(torsoMesh.scale.z, morph.torsoScaleZ, 6, dt);

      const jiggleWave = bellyJiggle > 0.01 ? Math.sin(elapsed * 28) * 0.14 * bellyJiggle : 0;
      bellyJiggle = Math.max(0, bellyJiggle - dt * 2.2);

      bellyMesh.scale.set(
        THREE.MathUtils.damp(bellyMesh.scale.x, morph.bellyScale + jiggleWave, 8, dt),
        THREE.MathUtils.damp(bellyMesh.scale.y, morph.bellyScale * 0.88 - jiggleWave * 0.5, 8, dt),
        THREE.MathUtils.damp(bellyMesh.scale.z, morph.bellyScale + jiggleWave, 8, dt)
      );

      cheekL.scale.setScalar(morph.cheekScale);
      cheekR.scale.setScalar(morph.cheekScale);
      armGroupL.position.x = -0.52 - morph.fatRatio * 0.18;
      armGroupR.position.x = 0.52 + morph.fatRatio * 0.18;
      legMeshL.scale.set(morph.limbScale, 1, morph.limbScale);
      legMeshR.scale.set(morph.limbScale, 1, morph.limbScale);

      // 2. Cosmetics & Outfits
      const shirtItem = WARDROBE_ITEMS.find((w) => w.id === gs.equipped.shirt);
      if (shirtItem) {
        shirtMat.color.set(shirtItem.color);
        shirtMat.metalness = shirtItem.id === 'shirt_gold_champion' ? 0.85 : 0.12;
        shirtMat.roughness = shirtItem.id === 'shirt_gold_champion' ? 0.2 : 0.45;
      }

      const hbItem = WARDROBE_ITEMS.find((w) => w.id === gs.equipped.headband);
      headbandMesh.visible = Boolean(hbItem);
      if (hbItem) headbandMat.color.set(hbItem.color);

      const capItem = WARDROBE_ITEMS.find((w) => w.id === gs.equipped.cap);
      capGroup.visible = Boolean(capItem);
      if (capItem) capMat.color.set(capItem.color);

      const glItem = WARDROBE_ITEMS.find((w) => w.id === gs.equipped.glasses);
      glassesGroup.visible = Boolean(glItem);
      if (glItem) glassesMat.color.set(glItem.color);

      chainMesh.visible = Boolean(gs.equipped.chain);
      trophyGroup.visible = gs.goalReached && p.activeMinigame === 'none';
      if (trophyGroup.visible) {
        trophyGroup.rotation.y = elapsed * 1.2;
      }

      // 3. Room Lighting & Atmosphere
      const roomColors: Record<string, { bg: string; rug: string; light: number }> = {
        cocina: { bg: '#1E293B', rug: '#FF6B35', light: 1.95 },
        bano: { bg: '#0F2942', rug: '#38BDF8', light: 2.05 },
        gimnasio: { bg: '#1F1B2E', rug: '#10B981', light: 2.0 },
        dormitorio: { bg: gs.isSleeping ? '#090D16' : '#1E1B4B', rug: '#8B5CF6', light: gs.isSleeping ? 0.35 : 1.75 },
        juegos: { bg: '#172554', rug: '#FACC15', light: 2.1 },
      };
      const rc = roomColors[gs.room] || roomColors.cocina;
      bgColor.lerp(_vec3.set(0, 0, 0) && new THREE.Color(rc.bg), dt * 4);
      scene.background = bgColor;
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.copy(bgColor);
      }
      rugMat.color.lerp(new THREE.Color(rc.rug), dt * 5);
      keyLight.intensity = THREE.MathUtils.damp(keyLight.intensity, rc.light, 4, dt);

      // 4. Jump & Squash-and-Stretch Physics
      if (jumpOffsetY > 0 || jumpVelY > 0) {
        jumpOffsetY += jumpVelY * dt;
        jumpVelY -= 18.5 * dt;
        if (jumpOffsetY <= 0) {
          jumpOffsetY = 0;
          jumpVelY = 0;
          bellyJiggle = 0.55;
        }
      }

      // Breathing & Posture
      const breath = Math.sin(elapsed * (gs.isSleeping ? 1.6 : 3.2)) * 0.025;
      gordouGroup.position.y = 0.04 + jumpOffsetY;
      gordouGroup.scale.y = 1 + breath + (jumpOffsetY > 0 ? 0.06 : 0);

      // Squat / Dumbbell Exercise Animations
      dumbbellL.visible = p.workoutAnim === 'dumbbells';
      dumbbellR.visible = p.workoutAnim === 'dumbbells';
      if (p.workoutAnim === 'dumbbells') {
        const curl = Math.abs(Math.sin(elapsed * 7)) * 1.1;
        armGroupL.rotation.x = -curl;
        armGroupR.rotation.x = -curl;
      } else if (p.workoutAnim === 'squats') {
        const squat = Math.abs(Math.sin(elapsed * 6.5)) * 0.38;
        gordouGroup.position.y = 0.04 - squat;
        armGroupL.rotation.x = -0.9;
        armGroupR.rotation.x = -0.9;
      } else {
        armGroupL.rotation.x = THREE.MathUtils.damp(armGroupL.rotation.x, 0, 6, dt);
        armGroupR.rotation.x = THREE.MathUtils.damp(armGroupR.rotation.x, 0, 6, dt);
      }

      // 5. Eyes Gaze Tracking, Blinking, and Sleep State
      const isBlinking = Math.sin(elapsed * 1.7) > 0.96;
      const targetEyelidRot = gs.isSleeping || isBlinking ? 0.15 : gs.energy < 30 ? -0.35 : -0.95;
      eyelidL.rotation.x = THREE.MathUtils.damp(eyelidL.rotation.x, targetEyelidRot, 14, dt);
      eyelidR.rotation.x = THREE.MathUtils.damp(eyelidR.rotation.x, targetEyelidRot, 14, dt);

      pupilL.position.x = THREE.MathUtils.damp(pupilL.position.x, pointerNDC.x * 0.035, 10, dt);
      pupilL.position.y = THREE.MathUtils.damp(pupilL.position.y, pointerNDC.y * 0.035, 10, dt);
      pupilR.position.x = pupilL.position.x;
      pupilR.position.y = pupilL.position.y;

      // 6. Mouth Articulation: Lip-Sync 3D + Chewing + Expressions
      if (chewTimer > 0) {
        chewTimer = Math.max(0, chewTimer - dt);
      }
      const chewOpen = chewTimer > 0 ? Math.abs(Math.sin(elapsed * 18)) * 0.85 : 0;
      const effectiveOpen = Math.max(p.mouthOpenness, chewOpen, bellyJiggle * 0.7);
      mouthCavity.scale.y = THREE.MathUtils.damp(
        mouthCavity.scale.y,
        0.22 + effectiveOpen * 0.95,
        18,
        dt
      );
      mouthCavity.scale.x = THREE.MathUtils.damp(
        mouthCavity.scale.x,
        1.15 + (gs.happiness > 60 ? 0.25 : -0.15),
        10,
        dt
      );

      // Flying food arc into mouth
      if (foodFlightProgress < 1) {
        foodFlightProgress = Math.min(1, foodFlightProgress + dt * 2.8);
        const t = foodFlightProgress;
        foodProjMesh.position.set(
          (1 - t) * 0.8,
          0.9 + Math.sin(t * Math.PI) * 1.15 + t * 0.9,
          (1 - t) * 2.4 + 0.55
        );
        if (foodFlightProgress >= 1) {
          foodProjMesh.visible = false;
          bellyJiggle = 0.8;
        }
      }

      // 7. Soap Bubbles, 3D Sweat Particle System (>50% sweatLevel), and Shower Rinse
      bubbleMeshes.forEach((b, idx) => {
        b.visible = idx < gs.soapBubbles;
        if (b.visible) {
          const s = 1 + Math.sin(elapsed * 4 + idx) * 0.12;
          b.scale.setScalar(s);
        }
      });

      const isShoweringNow = p.activeBathTool === 'shower';
      const sweatMetrics = calculateSweatParticleMetrics(gs.sweatLevel, isShoweringNow);
      if (document.body.dataset.sweatActive !== String(sweatMetrics.active)) {
        document.body.dataset.sweatActive = String(sweatMetrics.active);
      }

      // Surface glossy beads clinging to Gordou's 3D model when sweatLevel > 50%
      surfaceSweatDrops.forEach((sd, idx) => {
        sd.group.visible = sweatMetrics.active && idx < sweatMetrics.visibleSurfaceDrops;
        if (sd.group.visible) {
          const [bx, by, bz] = sd.basePos;
          const slideY = ((elapsed * 0.55 + sd.phase) % 1) * 0.08;
          const shimmer = 1 + Math.sin(elapsed * 7 + sd.phase) * 0.16;
          sd.group.scale.setScalar(sd.baseScale * shimmer);

          if (sd.zone === 'head') {
            sd.group.position.set(bx, by - slideY, bz);
          } else if (sd.zone === 'torso') {
            sd.group.position.set(
              bx * morph.torsoScaleX,
              by - slideY,
              bz * morph.torsoScaleZ
            );
          } else {
            const bFactor = 0.85 + morph.fatRatio * 0.35;
            sd.group.position.set(bx * bFactor, by - slideY, bz * bFactor);
          }
        }
      });

      // Falling 3D glossy sweat particles dripping from Gordou's forehead & body
      fallingSweatDrops.forEach((fd, idx) => {
        fd.visible = sweatMetrics.active && idx < sweatMetrics.visibleFallingDrops;
        if (fd.visible) {
          const cycle = (elapsed * (1.15 + (idx % 3) * 0.2) + idx * 0.27) % 1;
          const ang = (idx / fallingSweatDrops.length) * Math.PI * 1.5 - Math.PI * 0.75;
          const radius = (0.58 + morph.fatRatio * 0.2 + cycle * 0.18) * (idx % 2 === 0 ? 1 : 0.9);
          const startY = idx < 6 ? 2.25 : 1.55;
          fd.position.set(
            Math.sin(ang) * radius,
            startY - cycle * 0.95,
            Math.cos(ang) * radius * 0.85 + 0.18
          );
          fd.scale.setScalar((1 - cycle * 0.35) * 1.1);
        }
      });

      flies.forEach((f, idx) => {
        f.visible = gs.hygiene < 45 && !isShoweringNow;
        if (f.visible) {
          const a = elapsed * 3.5 + idx * 2.1;
          f.position.set(Math.cos(a) * 0.95, 2.15 + Math.sin(a * 2) * 0.18, Math.sin(a) * 0.85);
        }
      });

      showerGroup.visible = isShoweringNow;
      if (showerGroup.visible) {
        waterDrops.forEach((wd) => {
          wd.position.y -= dt * 4.8;
          if (wd.position.y < 0.2) {
            wd.position.y = 2.9;
          }
        });
      }

      // =========================================================
      // 8. 3D MINIGAMES ACTIVE SIMULATION
      // =========================================================
      const mg = p.activeMinigame;
      jumpRopePivot.visible = mg === 'jumprope';
      treadmillGroup.visible = mg === 'treadmill' || (gs.room === 'gimnasio' && mg === 'none');
      if (gs.room === 'gimnasio' && mg === 'none') {
        treadmillGroup.position.set(-1.55, 0.04, -0.8);
      } else if (mg === 'treadmill') {
        treadmillGroup.position.set(0, 0.04, 0);
      }

      if (mg === 'none') {
        gordouGroup.position.x = THREE.MathUtils.damp(gordouGroup.position.x, 0, 8, dt);
        if (!isDragging && p.gameState === 'title') {
          targetRotationY = Math.sin(elapsed * 0.7) * 0.28;
        } else if (!isDragging) {
          targetRotationY = THREE.MathUtils.damp(targetRotationY, 0, 3, dt);
        }
        gordouGroup.rotation.y = THREE.MathUtils.damp(gordouGroup.rotation.y, targetRotationY, 8, dt);
        _targetCamPos.set(0, 2.05, 5.5);
        _targetLookAt.set(0, 1.32, 0);
      } else if (p.gameState === 'playing') {
        // Tick minigame timer
        mgTimeLeft = Math.max(0, mgTimeLeft - dt);
        if (mgTimeLeft <= 0) {
          p.onMinigameFinish(mgScore, '¡Tiempo completado!');
        }

        if (mg === 'jumprope') {
          _targetCamPos.set(0, 2.25, 6.2);
          _targetLookAt.set(0, 1.3, 0);
          gordouGroup.position.x = THREE.MathUtils.damp(gordouGroup.position.x, 0, 8, dt);
          gordouGroup.rotation.y = THREE.MathUtils.damp(gordouGroup.rotation.y, 0, 8, dt);

          const prevAngle = ropeAngle;
          ropeAngle = (ropeAngle + ropeSpeed * dt) % (Math.PI * 2);
          jumpRopePivot.rotation.x = ropeAngle;

          // Rope sweeps under feet near Math.PI (bottom of arc)
          if (prevAngle < Math.PI && ropeAngle >= Math.PI && !ropeScoredThisTurn) {
            ropeScoredThisTurn = true;
            if (jumpOffsetY > 0.16) {
              mgScore += 1;
              mgCombo += 1;
              ropeSpeed = Math.min(6.4, ropeSpeed + 0.15);
              sound.playCoin();
              p.onMinigameScoreChange(mgScore, mgCombo, Math.ceil(mgTimeLeft));
            } else {
              mgCombo = 0;
              sound.playHitHazard();
              p.onMinigameScoreChange(mgScore, 0, Math.ceil(mgTimeLeft));
            }
          }
          if (ropeAngle < Math.PI * 0.5) {
            ropeScoredThisTurn = false;
          }
        } else if (mg === 'runner') {
          _targetCamPos.set(0, 2.9, 6.8);
          _targetLookAt.set(0, 1.2, -1.5);
          const targetX = runnerLane * 1.15;
          gordouGroup.position.x = THREE.MathUtils.damp(gordouGroup.position.x, targetX, 12, dt);
          gordouGroup.rotation.y = THREE.MathUtils.damp(gordouGroup.rotation.y, 0, 10, dt);

          // Running leg cycle
          legGroupL.rotation.x = Math.sin(elapsed * 16) * 0.65;
          legGroupR.rotation.x = -Math.sin(elapsed * 16) * 0.65;

          spawnCooldown -= dt;
          if (spawnCooldown <= 0) {
            spawnCooldown = 0.65;
            const inactive = itemPool.find((it) => !it.active);
            if (inactive) {
              inactive.active = true;
              const lane = [-1, 0, 1][Math.floor(Math.random() * 3)];
              inactive.x = lane * 1.15;
              inactive.y = 0.45;
              inactive.z = -11;
              inactive.speed = 6.8 + Math.min(4, mgScore * 0.12);
              inactive.mesh.position.set(inactive.x, inactive.y, inactive.z);
              inactive.mesh.visible = true;
            }
          }

          itemPool.forEach((it) => {
            if (!it.active) return;
            it.z += it.speed * dt;
            it.mesh.position.z = it.z;
            it.mesh.rotation.y += dt * 2.5;

            // Check collision with Gordou at z ≈ 0
            if (Math.abs(it.z) < 0.48 && Math.abs(it.x - gordouGroup.position.x) < 0.55) {
              if (it.type === 'junk') {
                if (jumpOffsetY < 0.35) {
                  it.active = false;
                  it.mesh.visible = false;
                  mgCombo = 0;
                  sound.playHitHazard();
                  p.onMinigameScoreChange(mgScore, mgCombo, Math.ceil(mgTimeLeft));
                }
              } else {
                it.active = false;
                it.mesh.visible = false;
                mgScore += it.type === 'healthy' ? 3 : 2;
                mgCombo += 1;
                sound.playCoin();
                p.onMinigameScoreChange(mgScore, mgCombo, Math.ceil(mgTimeLeft));
              }
            } else if (it.z > 3.5) {
              it.active = false;
              it.mesh.visible = false;
            }
          });
        } else if (mg === 'fooddrop') {
          _targetCamPos.set(0, 2.3, 6.4);
          _targetLookAt.set(0, 1.6, 0);
          gordouGroup.position.x = THREE.MathUtils.damp(gordouGroup.position.x, foodDropX, 14, dt);
          gordouGroup.rotation.y = THREE.MathUtils.damp(gordouGroup.rotation.y, 0, 10, dt);

          spawnCooldown -= dt;
          if (spawnCooldown <= 0) {
            spawnCooldown = 0.55;
            const inactive = itemPool.find((it) => !it.active);
            if (inactive) {
              inactive.active = true;
              inactive.x = (Math.random() - 0.5) * 3.1;
              inactive.y = 4.6;
              inactive.z = 0;
              inactive.speed = 2.8 + Math.random() * 1.4;
              inactive.mesh.position.set(inactive.x, inactive.y, 0);
              inactive.mesh.visible = true;
            }
          }

          itemPool.forEach((it) => {
            if (!it.active) return;
            it.y -= it.speed * dt;
            it.mesh.position.y = it.y;
            it.mesh.rotation.y += dt * 2.5;

            if (it.y < 1.85 && it.y > 0.6 && Math.abs(it.x - gordouGroup.position.x) < 0.62) {
              it.active = false;
              it.mesh.visible = false;
              if (it.type === 'junk') {
                mgCombo = 0;
                mgScore = Math.max(0, mgScore - 1);
                sound.playHitHazard();
              } else {
                mgScore += 2;
                mgCombo += 1;
                chewTimer = 0.4;
                sound.playCoin();
              }
              p.onMinigameScoreChange(mgScore, mgCombo, Math.ceil(mgTimeLeft));
            } else if (it.y < 0.1) {
              it.active = false;
              it.mesh.visible = false;
            }
          });
        } else if (mg === 'treadmill') {
          _targetCamPos.set(1.5, 2.2, 5.2);
          _targetLookAt.set(0, 1.3, 0);
          gordouGroup.position.set(0, 0.16, 0.1);
          treadmillSpeed = Math.max(0, treadmillSpeed - dt * 4.5);
          legGroupL.rotation.x = Math.sin(elapsed * (4 + treadmillSpeed * 2)) * 0.7;
          legGroupR.rotation.x = -Math.sin(elapsed * (4 + treadmillSpeed * 2)) * 0.7;
          p.onMinigameScoreChange(mgScore, mgCombo, Math.ceil(mgTimeLeft));
        }
      }

      if (mg !== 'runner' && mg !== 'treadmill') {
        legGroupL.rotation.x = THREE.MathUtils.damp(legGroupL.rotation.x, 0, 8, dt);
        legGroupR.rotation.x = THREE.MathUtils.damp(legGroupR.rotation.x, 0, 8, dt);
      }

      // Smooth Exponential Camera Damping
      const dampFactor = 1 - Math.exp(-5 * dt);
      camera.position.lerp(_targetCamPos, dampFactor);
      _currentLookAt.lerp(_targetLookAt, dampFactor);
      camera.lookAt(_currentLookAt);

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);

    return () => {
      isUnmounted = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('gordou-action', handleCustomAction);
      window.removeEventListener('keydown', onKeyDown);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      data-testid="gordou-3d-canvas"
      className="fixed inset-0 w-full h-full overflow-hidden"
    />
  );
};
