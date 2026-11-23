/**
 * ParticleSystem: Timeline-synchronized water flow particles and small-intestine
 * absorption micro-particles built with InstancedMesh (zero per-frame GC).
 *
 * Particles strictly follow the anatomical digestive tract spline curves
 * exported from AnatomySystem so water never clips outside the organs.
 */

import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TimelineFrameState } from './AnimationTimeline';
import {
  createDigestiveWaterCurve,
  createSmallIntestineCurve,
} from './AnatomySystem';

interface ParticleSystemProps {
  frameStateRef: React.MutableRefObject<TimelineFrameState>;
}

const STREAM_COUNT = 34;
const ABSORPTION_COUNT = 44;

// Pre-allocated scratch helpers (zero GC inside useFrame)
const _pos = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _mat = new THREE.Matrix4();

export const ParticleSystem: React.FC<ParticleSystemProps> = ({ frameStateRef }) => {
  const streamMeshRef = useRef<THREE.InstancedMesh>(null);
  const absorbMeshRef = useRef<THREE.InstancedMesh>(null);

  const {
    waterCurve,
    dropletGeo,
    streamMat,
    absorbGeo,
    absorbMat,
    streamSeeds,
    absorbOrigins,
  } = useMemo(() => {
    const wCurve = createDigestiveWaterCurve();
    const siCurve = createSmallIntestineCurve();

    const dGeo = new THREE.SphereGeometry(0.0115, 10, 8);
    const sMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#0ea5e9'),
      emissive: new THREE.Color('#0284c7'),
      emissiveIntensity: 0.85,
      roughness: 0.12,
      metalness: 0.05,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
    });

    const aGeo = new THREE.SphereGeometry(0.0062, 8, 8);
    const aMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#38bdf8'),
      emissive: new THREE.Color('#10b981'),
      emissiveIntensity: 1.15,
      roughness: 0.15,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
    });

    // Deterministic radial jitter seeds for water stream droplets
    const sSeeds = Array.from({ length: STREAM_COUNT }, (_, i) => {
      const frac = i / STREAM_COUNT;
      const angle = i * 2.39996; // Golden angle distribution
      const radial = 0.002 + ((i * 7) % 11) * 0.00035;
      return {
        offsetBack: frac * 0.28, // Bolus length along tract
        angle,
        radial,
        size: 0.68 + ((i * 13) % 10) * 0.065,
      };
    });

    // Deterministic absorption particle origins spaced evenly along the small intestine wall
    const aOrigins = Array.from({ length: ABSORPTION_COUNT }, (_, i) => {
      const u = 0.08 + (i / (ABSORPTION_COUNT - 1)) * 0.84;
      const origin = siCurve.getPointAt(u);
      const angle = i * 2.39996;
      const outDir = new THREE.Vector3(
        Math.cos(angle) * 0.9,
        Math.sin(angle) * 0.55,
        0.35 + Math.abs(Math.sin(angle * 1.7)) * 0.5,
      ).normalize();
      return {
        origin,
        outDir,
        phaseOffset: (i * 0.173) % 1,
        travelDist: 0.028 + ((i * 5) % 7) * 0.0045,
        size: 0.72 + ((i * 11) % 8) * 0.08,
      };
    });

    return {
      waterCurve: wCurve,
      dropletGeo: dGeo,
      streamMat: sMat,
      absorbGeo: aGeo,
      absorbMat: aMat,
      streamSeeds: sSeeds,
      absorbOrigins: aOrigins,
    };
  }, []);

  useEffect(() => {
    return () => {
      dropletGeo.dispose();
      streamMat.dispose();
      absorbGeo.dispose();
      absorbMat.dispose();
    };
  }, [dropletGeo, streamMat, absorbGeo, absorbMat]);

  useFrame(() => {
    const state = frameStateRef.current;
    const t = state.time;

    // 1. Update water bolus droplets strictly along digestive spline
    const streamMesh = streamMeshRef.current;
    if (streamMesh) {
      const vis = state.waterFlowVisibility;
      streamMesh.visible = vis > 0.01;
      streamMat.opacity = vis * 0.92;

      if (streamMesh.visible) {
        const headU = state.waterFlowProgress;
        for (let i = 0; i < STREAM_COUNT; i++) {
          const seed = streamSeeds[i];
          const u = headU - seed.offsetBack;
          if (u < 0 || u > 1) {
            _scale.set(0, 0, 0);
            _pos.set(0, -10, 0);
          } else {
            waterCurve.getPointAt(u, _pos);
            // Slight organic swirl inside stomach region (u in [0.32, 0.60])
            const inStomach = u > 0.32 && u < 0.6 ? 2.4 : 1.0;
            const swirlAngle = seed.angle + t * 2.1;
            const r = seed.radial * inStomach;
            _pos.x += Math.cos(swirlAngle) * r;
            _pos.y += Math.sin(swirlAngle) * r * 0.65;
            _pos.z += Math.sin(swirlAngle + 1.2) * r * 0.7;

            // Taper droplets gracefully at leading/trailing edges
            const edgeFade = Math.min(1, u * 18) * Math.min(1, (1 - u) * 18);
            const s = seed.size * (0.75 + 0.25 * Math.sin(t * 5 + i)) * edgeFade;
            _scale.set(s, s, s);
          }
          _mat.compose(_pos, _quat, _scale);
          streamMesh.setMatrixAt(i, _mat);
        }
        streamMesh.instanceMatrix.needsUpdate = true;
      }
    }

    // 2. Update small intestine absorption micro-particles radiating outward (Scene 4)
    const absorbMesh = absorbMeshRef.current;
    if (absorbMesh) {
      const absVis = state.absorptionIntensity;
      absorbMesh.visible = absVis > 0.01;
      absorbMat.opacity = absVis * 0.95;

      if (absorbMesh.visible) {
        for (let i = 0; i < ABSORPTION_COUNT; i++) {
          const item = absorbOrigins[i];
          // Deterministic cyclic radial absorption expansion from intestine wall
          const cycle = (t * 0.72 + item.phaseOffset) % 1;
          const easeOut = 1 - Math.pow(1 - cycle, 2);

          _dir.copy(item.outDir).multiplyScalar(easeOut * item.travelDist);
          _pos.copy(item.origin).add(_dir);

          // Scale swells gently then fades out as water is absorbed into bloodstream
          const envelope = Math.sin(cycle * Math.PI);
          const s = item.size * envelope * absVis;
          _scale.set(s, s, s);
          _mat.compose(_pos, _quat, _scale);
          absorbMesh.setMatrixAt(i, _mat);
        }
        absorbMesh.instanceMatrix.needsUpdate = true;
      }
    }
  });

  return (
    <group name="ParticleSystem">
      <instancedMesh
        ref={streamMeshRef}
        args={[dropletGeo, streamMat, STREAM_COUNT]}
        frustumCulled={false}
        renderOrder={4}
      />
      <instancedMesh
        ref={absorbMeshRef}
        args={[absorbGeo, absorbMat, ABSORPTION_COUNT]}
        frustumCulled={false}
        renderOrder={5}
      />
    </group>
  );
};
