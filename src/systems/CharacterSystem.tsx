/**
 * CharacterSystem: Procedural stylized adult female character ("Elena")
 * built with sculpted organic LatheGeometry, TubeGeometry, and ExtrudeGeometry
 * silhouettes (zero crude boxes or floating parts).
 *
 * Features:
 * - Tied-up brown hair with sculpted bun, scrunchie, and soft side bangs
 * - Pastel pink t-shirt, lavender-purple trousers, light cream sneakers
 * - Expressive face with natural deterministic blinking
 * - Subtle breathing & posture micro-sway synced to timeline time
 * - Smooth torso opacity modulation for anatomical x-ray reveal
 * - GLB/GLTF-ready CharacterDescriptor prop architecture for future upgrades
 */

import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { CharacterDescriptor } from './SceneManager';
import { TimelineFrameState } from './AnimationTimeline';

interface CharacterSystemProps {
  descriptor: CharacterDescriptor;
  rotationDeg: number;
  frameStateRef: React.MutableRefObject<TimelineFrameState>;
  children?: React.ReactNode;
}

export const CharacterSystem: React.FC<CharacterSystemProps> = ({
  descriptor,
  rotationDeg,
  frameStateRef,
  children,
}) => {
  const rootGroupRef = useRef<THREE.Group>(null);
  const upperBodyRef = useRef<THREE.Group>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const leftEyelidRef = useRef<THREE.Mesh>(null);
  const rightEyelidRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const currentRotY = useRef(0);

  // Build sculpted organic procedural geometries once and reuse forever
  const geos = useMemo(() => {
    // 1. Sculpted Head (gentle feminine ovoid with subtle chin & cheek contour)
    const headProfile = [
      new THREE.Vector2(0.0, -0.105),
      new THREE.Vector2(0.034, -0.098),
      new THREE.Vector2(0.068, -0.072),
      new THREE.Vector2(0.088, -0.025),
      new THREE.Vector2(0.094, 0.028),
      new THREE.Vector2(0.086, 0.078),
      new THREE.Vector2(0.056, 0.112),
      new THREE.Vector2(0.0, 0.122),
    ];
    const head = new THREE.LatheGeometry(headProfile, 28);

    // 2. Smooth Neck anchored from collar up into skull base
    const neckProfile = [
      new THREE.Vector2(0.048, 0.0),
      new THREE.Vector2(0.041, 0.03),
      new THREE.Vector2(0.038, 0.075),
      new THREE.Vector2(0.04, 0.105),
    ];
    const neck = new THREE.LatheGeometry(neckProfile, 20);

    // 3. Sculpted Torso / Pastel Pink T-Shirt (waist taper -> subtle bust -> smooth shoulders)
    // Coordinates in local torso space (bottom at y=0.90, top at y=1.355)
    const torsoProfile = [
      new THREE.Vector2(0.118, 0.0), // Hem overlapping trouser waist cleanly
      new THREE.Vector2(0.105, 0.075), // Natural waist
      new THREE.Vector2(0.112, 0.16), // Lower ribcage
      new THREE.Vector2(0.132, 0.255), // Bust / chest contour
      new THREE.Vector2(0.145, 0.34), // Upper chest / shoulder base
      new THREE.Vector2(0.125, 0.405), // Shoulder slope
      new THREE.Vector2(0.056, 0.445), // Collar opening
      new THREE.Vector2(0.045, 0.45),
    ];
    const torso = new THREE.LatheGeometry(torsoProfile, 28);

    // Collar trim ring
    const collar = new THREE.TorusGeometry(0.056, 0.009, 12, 24);

    // Short T-shirt sleeve
    const sleeveProfile = [
      new THREE.Vector2(0.046, 0.0),
      new THREE.Vector2(0.05, 0.06),
      new THREE.Vector2(0.054, 0.13),
      new THREE.Vector2(0.035, 0.16),
      new THREE.Vector2(0.0, 0.165),
    ];
    const sleeve = new THREE.LatheGeometry(sleeveProfile, 18);

    // 4. Sculpted Hips & Pelvis (bridges torso hem seamlessly into both trouser legs)
    const pelvisProfile = [
      new THREE.Vector2(0.0, -0.055),
      new THREE.Vector2(0.118, -0.03),
      new THREE.Vector2(0.145, 0.035),
      new THREE.Vector2(0.138, 0.115),
      new THREE.Vector2(0.12, 0.17),
      new THREE.Vector2(0.0, 0.17),
    ];
    const pelvis = new THREE.LatheGeometry(pelvisProfile, 26);

    // 5. Sculpted Tapered Trouser Leg (grounded from ankle y=0.07 up to hip y=0.84)
    const legProfile = [
      new THREE.Vector2(0.041, 0.0), // Ankle cuff
      new THREE.Vector2(0.047, 0.12), // Lower calf
      new THREE.Vector2(0.056, 0.27), // Calf curve
      new THREE.Vector2(0.052, 0.39), // Knee
      new THREE.Vector2(0.066, 0.56), // Mid thigh
      new THREE.Vector2(0.078, 0.72), // Upper thigh anchored inside pelvis
      new THREE.Vector2(0.055, 0.78),
    ];
    const leg = new THREE.LatheGeometry(legProfile, 20);

    // Ankle skin bridge
    const ankle = new THREE.CylinderGeometry(0.032, 0.03, 0.055, 16);

    // 6. Sculpted Sneaker (sole + rounded upper, bottom strictly at y=0)
    const shoeShape = new THREE.Shape();
    shoeShape.moveTo(-0.042, -0.055);
    shoeShape.quadraticCurveTo(-0.048, 0.04, -0.036, 0.115);
    shoeShape.quadraticCurveTo(0.0, 0.145, 0.036, 0.115);
    shoeShape.quadraticCurveTo(0.048, 0.04, 0.042, -0.055);
    shoeShape.quadraticCurveTo(0.0, -0.075, -0.042, -0.055);

    const shoeSole = new THREE.ExtrudeGeometry(shoeShape, {
      depth: 0.022,
      bevelEnabled: true,
      bevelThickness: 0.005,
      bevelSize: 0.004,
      bevelSegments: 3,
      curveSegments: 14,
    });
    shoeSole.rotateX(Math.PI / 2);

    const shoeUpper = new THREE.ExtrudeGeometry(shoeShape, {
      depth: 0.036,
      bevelEnabled: true,
      bevelThickness: 0.012,
      bevelSize: 0.006,
      bevelSegments: 4,
      curveSegments: 14,
    });
    shoeUpper.rotateX(Math.PI / 2);

    // 7. Sculpted Arm (continuous smooth curve from inside sleeve down to wrist)
    const armCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.026, -0.21, -0.008),
      new THREE.Vector3(0.036, -0.45, 0.022),
    ]);
    const armTube = new THREE.TubeGeometry(armCurve, 18, 0.032, 14, false);

    // Hand palm + thumb + soft fingers
    const palm = new THREE.SphereGeometry(0.034, 16, 14);
    const thumb = new THREE.CapsuleGeometry(0.0095, 0.026, 6, 10);
    const fingerCluster = new THREE.CapsuleGeometry(0.021, 0.038, 6, 12);

    // 8. Hair Cap, Sculpted Hair Bun, Scrunchie, and Side-Swept Bangs
    // Cap stops above equator and tilts backward (-X) so forehead/eyes stay 100% clear while crown is fully covered
    const hairCap = new THREE.SphereGeometry(0.106, 28, 22, 0, Math.PI * 2, 0, Math.PI * 0.48);
    const hairBack = new THREE.SphereGeometry(0.088, 22, 18);
    const hairBunProfile = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.044, 0.01),
      new THREE.Vector2(0.06, 0.042),
      new THREE.Vector2(0.054, 0.075),
      new THREE.Vector2(0.024, 0.092),
      new THREE.Vector2(0.0, 0.096),
    ];
    const hairBun = new THREE.LatheGeometry(hairBunProfile, 22);
    const scrunchie = new THREE.TorusGeometry(0.037, 0.012, 12, 22);

    // Soft side-swept bangs parting at upper hairline and tucking behind ears
    const bangLeftCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.006, 0.114, 0.054),
      new THREE.Vector3(-0.054, 0.092, 0.072),
      new THREE.Vector3(-0.094, 0.044, 0.034),
      new THREE.Vector3(-0.094, -0.004, -0.016),
    ]);
    const bangLeft = new THREE.TubeGeometry(bangLeftCurve, 18, 0.022, 10, false);

    const bangRightCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.006, 0.114, 0.054),
      new THREE.Vector3(0.056, 0.09, 0.072),
      new THREE.Vector3(0.094, 0.042, 0.034),
      new THREE.Vector3(0.094, -0.004, -0.016),
    ]);
    const bangRight = new THREE.TubeGeometry(bangRightCurve, 18, 0.022, 10, false);

    // 9. Facial details
    const ear = new THREE.SphereGeometry(0.018, 12, 10);
    const eyeSclera = new THREE.SphereGeometry(0.0145, 14, 12);
    const eyeIris = new THREE.SphereGeometry(0.0092, 12, 10);
    const eyePupil = new THREE.SphereGeometry(0.005, 10, 8);
    const eyeHighlight = new THREE.SphereGeometry(0.0024, 8, 8);
    const eyelid = new THREE.SphereGeometry(0.016, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.54);
    const eyebrow = new THREE.CapsuleGeometry(0.0032, 0.022, 4, 8);
    const nose = new THREE.SphereGeometry(0.0105, 12, 10);
    const blush = new THREE.CircleGeometry(0.017, 16);

    const smileCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.019, 0.005, 0.0),
      new THREE.Vector3(-0.008, -0.003, 0.005),
      new THREE.Vector3(0.008, -0.003, 0.005),
      new THREE.Vector3(0.019, 0.005, 0.0),
    ]);
    const smile = new THREE.TubeGeometry(smileCurve, 14, 0.003, 8, false);

    return {
      head,
      neck,
      torso,
      collar,
      sleeve,
      pelvis,
      leg,
      ankle,
      shoeSole,
      shoeUpper,
      armTube,
      palm,
      thumb,
      fingerCluster,
      hairCap,
      hairBack,
      hairBun,
      scrunchie,
      bangLeft,
      bangRight,
      ear,
      eyeSclera,
      eyeIris,
      eyePupil,
      eyeHighlight,
      eyelid,
      eyebrow,
      nose,
      blush,
      smile,
    };
  }, []);

  // Satin pastel materials with subtle roughness variation (>= 0.25 contrast across parts)
  const mats = useMemo(() => {
    const p = descriptor.palette;
    return {
      skin: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(p.skin),
        roughness: 0.52,
        metalness: 0.0,
        clearcoat: 0.06,
        clearcoatRoughness: 0.65,
      }),
      // Translucent-capable torso shirt material (fades smoothly to reveal anatomy)
      shirt: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(p.shirt),
        roughness: 0.65,
        metalness: 0.0,
        sheen: 0.35,
        sheenRoughness: 0.65,
        sheenColor: new THREE.Color('#ffc4d4'),
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
      // Pelvis/waist area also fades slightly in deep anatomy view so small/large intestine are 100% clear
      pelvisPants: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(p.pants),
        roughness: 0.72,
        metalness: 0.0,
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
      pants: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(p.pants),
        roughness: 0.72,
        metalness: 0.0,
      }),
      shoeUpper: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(p.shoes),
        roughness: 0.36,
        metalness: 0.02,
        clearcoat: 0.22,
      }),
      shoeSole: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#cfd5df'),
        roughness: 0.8,
        metalness: 0.0,
      }),
      hair: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(p.hair),
        roughness: 0.44,
        metalness: 0.04,
        clearcoat: 0.2,
        clearcoatRoughness: 0.48,
      }),
      scrunchie: new THREE.MeshStandardMaterial({
        color: new THREE.Color(p.shirt),
        roughness: 0.65,
      }),
      sclera: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#ffffff'),
        roughness: 0.18,
      }),
      iris: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#5c4033'),
        roughness: 0.15,
      }),
      pupil: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#19171a'),
        roughness: 0.1,
      }),
      highlight: new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ffffff'),
      }),
      lips: new THREE.MeshStandardMaterial({
        color: new THREE.Color('#d97c84'),
        roughness: 0.35,
      }),
      blush: new THREE.MeshBasicMaterial({
        color: new THREE.Color('#f49aa8'),
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
      neckTrans: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(p.skin),
        roughness: 0.48,
        transparent: false,
        opacity: 1,
        depthWrite: true,
      }),
    };
  }, [descriptor]);

  useEffect(() => {
    return () => {
      Object.values(geos).forEach((g) => g.dispose());
      Object.values(mats).forEach((m) => m.dispose());
    };
  }, [geos, mats]);

  // Apply timeline-driven breathing, blinking, natural posture sway, torso opacity, and smooth rotation
  useFrame((_, delta) => {
    const state = frameStateRef.current;
    const dt = Math.min(delta, 0.1);

    // Smooth controllable Y rotation
    const targetRotY = THREE.MathUtils.degToRad(rotationDeg);
    currentRotY.current = THREE.MathUtils.damp(currentRotY.current, targetRotY, 7, dt);
    if (rootGroupRef.current) {
      rootGroupRef.current.rotation.y = currentRotY.current;
    }

    // Subtle breathing & posture sway
    if (upperBodyRef.current) {
      const b = state.breathCycle;
      upperBodyRef.current.scale.set(1 + b * 0.008, 1 + b * 0.004, 1 + b * 0.012);
      upperBodyRef.current.rotation.z = state.postureSwayX;
      upperBodyRef.current.rotation.x = state.postureSwayZ;
    }

    if (headGroupRef.current) {
      headGroupRef.current.rotation.x = state.headNod;
      headGroupRef.current.rotation.y = state.postureSwayX * 2.2;
    }

    // Subtle natural arm relaxation sway
    if (leftArmRef.current && rightArmRef.current) {
      const armBreath = state.breathCycle * 0.012;
      leftArmRef.current.rotation.z = 0.04 + armBreath;
      rightArmRef.current.rotation.z = -0.04 - armBreath;
    }

    // Deterministic natural blinking
    const blink = state.blinkWeight;
    if (leftEyelidRef.current && rightEyelidRef.current) {
      const lidScaleY = 0.18 + blink * 1.15;
      leftEyelidRef.current.scale.y = lidScaleY;
      rightEyelidRef.current.scale.y = lidScaleY;
    }

    // Torso, neck, and upper-pelvis smooth translucency for anatomical layers
    const op = state.torsoOpacity;
    const isTransparent = op < 0.985;

    if (mats.shirt.transparent !== isTransparent) {
      mats.shirt.transparent = isTransparent;
      mats.shirt.needsUpdate = true;
    }
    mats.shirt.opacity = op;
    mats.shirt.depthWrite = !isTransparent;

    // Fade upper pelvis smoothly when in deeper anatomy views so intestine is never occluded
    const pelvisOp = THREE.MathUtils.clamp(op + 0.12, 0.14, 1.0);
    const pelvisTrans = pelvisOp < 0.985;
    if (mats.pelvisPants.transparent !== pelvisTrans) {
      mats.pelvisPants.transparent = pelvisTrans;
      mats.pelvisPants.needsUpdate = true;
    }
    mats.pelvisPants.opacity = pelvisOp;
    mats.pelvisPants.depthWrite = !pelvisTrans;

    // Neck fades softly too so esophagus entry is visible in Scene 2 & Camera B/C
    const neckOp = THREE.MathUtils.clamp(op + 0.16, 0.22, 1.0);
    const neckTrans = neckOp < 0.985;
    if (mats.neckTrans.transparent !== neckTrans) {
      mats.neckTrans.transparent = neckTrans;
      mats.neckTrans.needsUpdate = true;
    }
    mats.neckTrans.opacity = neckOp;
    mats.neckTrans.depthWrite = !neckTrans;
  });

  return (
    <group ref={rootGroupRef} name="CharacterElena">
      {/* Grounded Lower Body: Shoes & Legs (feet sit flush at y = 0) */}
      <group name="LowerBody">
        {/* Left & Right Light Sneakers */}
        {[-0.094, 0.094].map((xPos, idx) => (
          <group key={idx} position={[xPos, 0, 0.015]} rotation={[0, idx === 0 ? 0.06 : -0.06, 0]}>
            {/* Outsole flush at y=0 */}
            <mesh
              geometry={geos.shoeSole}
              material={mats.shoeSole}
              position={[0, 0.026, 0]}
              castShadow
              receiveShadow
            />
            {/* Rounded sneaker upper */}
            <mesh
              geometry={geos.shoeUpper}
              material={mats.shoeUpper}
              position={[0, 0.064, -0.004]}
              scale={[0.92, 1, 0.92]}
              castShadow
              receiveShadow
            />
            {/* Ankle connector */}
            <mesh
              geometry={geos.ankle}
              material={mats.skin}
              position={[0, 0.088, -0.012]}
              castShadow
            />
          </group>
        ))}

        {/* Sculpted Purple Trousers (Left & Right Legs) */}
        <mesh
          geometry={geos.leg}
          material={mats.pants}
          position={[-0.092, 0.092, 0]}
          rotation={[0, 0, -0.025]}
          castShadow
          receiveShadow
        />
        <mesh
          geometry={geos.leg}
          material={mats.pants}
          position={[0.092, 0.092, 0]}
          rotation={[0, 0, 0.025]}
          castShadow
          receiveShadow
        />

        {/* Pelvis / Hips (translucent-capable so lower digestive tract stays clear) */}
        <mesh
          geometry={geos.pelvis}
          material={mats.pelvisPants}
          position={[0, 0.8, 0]}
          scale={[1.04, 1.0, 0.78]}
          renderOrder={9}
          castShadow
          receiveShadow
        />
      </group>

      {/* Internal Anatomy & Particles live in Character Space so they move/rotate seamlessly with Elena */}
      {children}

      {/* Upper Body Group (breathes & sways subtly) */}
      <group ref={upperBodyRef} position={[0, 0.905, 0]} name="UpperBody">
        {/* Pastel Pink T-Shirt Torso */}
        <mesh
          geometry={geos.torso}
          material={mats.shirt}
          scale={[1.05, 1.0, 0.74]}
          renderOrder={10}
          castShadow
          receiveShadow
        />

        {/* Soft rounded collar trim */}
        <mesh
          geometry={geos.collar}
          material={mats.shirt}
          position={[0, 0.442, 0.004]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[1.0, 0.88, 1.0]}
          renderOrder={10}
        />

        {/* Left Arm + Sleeve + Hand */}
        <group ref={leftArmRef} position={[-0.148, 0.39, 0]}>
          <mesh
            geometry={geos.sleeve}
            material={mats.shirt}
            position={[-0.012, -0.105, 0]}
            rotation={[0, 0, -0.26]}
            renderOrder={10}
            castShadow
          />
          <mesh
            geometry={geos.armTube}
            material={mats.skin}
            position={[-0.018, -0.04, 0]}
            rotation={[0, 0, -0.14]}
            scale={[-1, 1, 1]}
            castShadow
          />
          {/* Sculpted Left Hand */}
          <group position={[-0.115, -0.495, 0.022]} rotation={[0.08, 0.15, -0.12]}>
            <mesh geometry={geos.palm} material={mats.skin} scale={[0.78, 1.15, 0.58]} castShadow />
            <mesh
              geometry={geos.thumb}
              material={mats.skin}
              position={[0.022, -0.006, 0.016]}
              rotation={[0.25, 0, -0.45]}
            />
            <mesh
              geometry={geos.fingerCluster}
              material={mats.skin}
              position={[0, -0.036, 0.004]}
              scale={[0.85, 1, 0.6]}
            />
          </group>
        </group>

        {/* Right Arm + Sleeve + Hand */}
        <group ref={rightArmRef} position={[0.148, 0.39, 0]}>
          <mesh
            geometry={geos.sleeve}
            material={mats.shirt}
            position={[0.012, -0.105, 0]}
            rotation={[0, 0, 0.26]}
            renderOrder={10}
            castShadow
          />
          <mesh
            geometry={geos.armTube}
            material={mats.skin}
            position={[0.018, -0.04, 0]}
            rotation={[0, 0, 0.14]}
            castShadow
          />
          {/* Sculpted Right Hand */}
          <group position={[0.115, -0.495, 0.022]} rotation={[0.08, -0.15, 0.12]}>
            <mesh geometry={geos.palm} material={mats.skin} scale={[0.78, 1.15, 0.58]} castShadow />
            <mesh
              geometry={geos.thumb}
              material={mats.skin}
              position={[-0.022, -0.006, 0.016]}
              rotation={[0.25, 0, 0.45]}
            />
            <mesh
              geometry={geos.fingerCluster}
              material={mats.skin}
              position={[0, -0.036, 0.004]}
              scale={[0.85, 1, 0.6]}
            />
          </group>
        </group>

        {/* Neck (anchored inside collar) */}
        <mesh
          geometry={geos.neck}
          material={mats.neckTrans}
          position={[0, 0.425, 0]}
          renderOrder={10}
          castShadow
        />

        {/* Stylized Head, Expressive Face & Tied-Up Brown Hair */}
        <group ref={headGroupRef} position={[0, 0.6, 0.008]} name="HeadGroup">
          {/* Sculpted Head */}
          <mesh
            geometry={geos.head}
            material={mats.skin}
            scale={[1.0, 1.04, 0.96]}
            castShadow
            receiveShadow
          />

          {/* Ears */}
          <mesh
            geometry={geos.ear}
            material={mats.skin}
            position={[-0.094, -0.006, -0.006]}
            scale={[0.65, 1.15, 0.85]}
          />
          <mesh
            geometry={geos.ear}
            material={mats.skin}
            position={[0.094, -0.006, -0.006]}
            scale={[0.65, 1.15, 0.85]}
          />

          {/* Expressive Eyes with Natural Blinking Eyelids */}
          {[-0.034, 0.034].map((eyeX, idx) => (
            <group key={idx} position={[eyeX, 0.012, 0.082]}>
              <mesh geometry={geos.eyeSclera} material={mats.sclera} scale={[1.05, 1.0, 0.72]} />
              <mesh
                geometry={geos.eyeIris}
                material={mats.iris}
                position={[0, 0, 0.0068]}
                scale={[1.0, 1.0, 0.65]}
              />
              <mesh
                geometry={geos.eyePupil}
                material={mats.pupil}
                position={[0, 0, 0.0108]}
                scale={[1.0, 1.0, 0.5]}
              />
              <mesh
                geometry={geos.eyeHighlight}
                material={mats.highlight}
                position={[0.0038, 0.0042, 0.013]}
              />
              {/* Upper blinking eyelid */}
              <mesh
                ref={idx === 0 ? leftEyelidRef : rightEyelidRef}
                geometry={geos.eyelid}
                material={mats.skin}
                position={[0, 0.003, 0.001]}
                scale={[1.08, 0.18, 0.84]}
              />
            </group>
          ))}

          {/* Soft Arched Eyebrows */}
          <mesh
            geometry={geos.eyebrow}
            material={mats.hair}
            position={[-0.035, 0.038, 0.085]}
            rotation={[0, 0.15, 1.44]}
          />
          <mesh
            geometry={geos.eyebrow}
            material={mats.hair}
            position={[0.035, 0.038, 0.085]}
            rotation={[0, -0.15, -1.44]}
          />

          {/* Subtle Sculpted Nose */}
          <mesh
            geometry={geos.nose}
            material={mats.skin}
            position={[0, -0.014, 0.095]}
            scale={[0.82, 0.95, 0.88]}
          />

          {/* Gentle Friendly Smile */}
          <mesh
            geometry={geos.smile}
            material={mats.lips}
            position={[0, -0.048, 0.084]}
          />

          {/* Soft Cheek Blush */}
          <mesh
            geometry={geos.blush}
            material={mats.blush}
            position={[-0.056, -0.02, 0.078]}
            rotation={[0, -0.45, 0]}
          />
          <mesh
            geometry={geos.blush}
            material={mats.blush}
            position={[0.056, -0.02, 0.078]}
            rotation={[0, 0.45, 0]}
          />

          {/* Tied-up Brown Hair: Crown Cap, Back Volume, Parted Bangs, Scrunchie & Bun */}
          <group name="HairGroup">
            {/* Crown dome tilted backward (-X) so front hairline clears forehead & back covers nape */}
            <mesh
              geometry={geos.hairCap}
              material={mats.hair}
              position={[0, 0.032, -0.012]}
              rotation={[-0.36, 0, 0]}
              scale={[1.04, 1.07, 1.04]}
              castShadow
            />
            {/* Back hair volume positioned cleanly behind ears */}
            <mesh
              geometry={geos.hairBack}
              material={mats.hair}
              position={[0, 0.012, -0.038]}
              scale={[1.05, 0.96, 0.78]}
              castShadow
            />
            <mesh geometry={geos.bangLeft} material={mats.hair} castShadow />
            <mesh geometry={geos.bangRight} material={mats.hair} castShadow />
            {/* Scrunchie tie at back-upper crown */}
            <mesh
              geometry={geos.scrunchie}
              material={mats.scrunchie}
              position={[0, 0.056, -0.104]}
              rotation={[Math.PI * 0.42, 0, 0]}
            />
            {/* Sculpted Hair Bun */}
            <mesh
              geometry={geos.hairBun}
              material={mats.hair}
              position={[0, 0.064, -0.112]}
              rotation={[-Math.PI * 0.42, 0, 0]}
              castShadow
            />
          </group>
        </group>
      </group>
    </group>
  );
};
