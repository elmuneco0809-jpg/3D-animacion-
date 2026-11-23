/**
 * AnatomySystem: Simplified, anatomically coherent procedural 3D digestive system
 * (Boca, Esófago, Estómago, Intestino delgado, Intestino grueso) with 4-layer visibility,
 * organ highlighting, subtle organic motion, and animated directional arrows.
 *
 * Also exports the exact digestive tract spline curves so ParticleSystem travels
 * strictly inside the anatomical lumen without arbitrary clipping.
 */

import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { OrganId, ORGAN_DEFINITIONS } from './SceneManager';
import { TimelineFrameState } from './AnimationTimeline';

/**
 * Shared control points (in character local space, character grounded at y=0, facing +Z).
 * Character's anatomical left is +X when facing +Z.
 */
export const MOUTH_POINTS: [number, number, number][] = [
  [0, 1.434, 0.072],
  [0, 1.436, 0.045],
  [0, 1.432, 0.012],
  [0, 1.412, -0.008],
  [0, 1.375, -0.012],
];

export const ESOPHAGUS_POINTS: [number, number, number][] = [
  [0, 1.375, -0.012],
  [0, 1.32, -0.012],
  [0.002, 1.255, -0.008],
  [0.007, 1.19, -0.002],
  [0.016, 1.142, 0.006],
];

export const STOMACH_POINTS: [number, number, number][] = [
  [0.016, 1.142, 0.006], // Cardia
  [0.052, 1.132, 0.012], // Upper fundus curve
  [0.066, 1.095, 0.022], // Greater curvature
  [0.052, 1.055, 0.024], // Lower body
  [0.018, 1.044, 0.021], // Antrum
  [-0.015, 1.054, 0.015], // Pylorus
];

export const SMALL_INTESTINE_POINTS: [number, number, number][] = [
  [-0.015, 1.054, 0.015], // Duodenum start
  [-0.036, 1.036, 0.012],
  [-0.032, 1.008, 0.018],
  [0.034, 1.002, 0.024],
  [0.044, 0.982, 0.022],
  [-0.038, 0.976, 0.028],
  [-0.044, 0.954, 0.024],
  [0.042, 0.948, 0.03],
  [0.038, 0.926, 0.024],
  [-0.036, 0.922, 0.026],
  [-0.018, 0.902, 0.02],
  [0.024, 0.902, 0.022],
  [-0.048, 0.896, 0.014], // Ileocecal junction
];

export const LARGE_INTESTINE_POINTS: [number, number, number][] = [
  [-0.062, 0.89, 0.012], // Cecum
  [-0.068, 0.945, 0.014], // Ascending colon
  [-0.064, 1.008, 0.018], // Hepatic flexure
  [-0.028, 1.024, 0.032], // Transverse colon
  [0.025, 1.022, 0.034],
  [0.064, 1.014, 0.02], // Splenic flexure
  [0.068, 0.955, 0.014], // Descending colon
  [0.062, 0.9, 0.01],
  [0.032, 0.88, 0.008], // Sigmoid
  [0.004, 0.866, 0.0],
  [0.0, 0.838, -0.008], // Rectum
];

/**
 * Builds the continuous digestive water trajectory curve (Mouth -> Esophagus -> Stomach -> Small Intestine).
 */
export function createDigestiveWaterCurve(): THREE.CatmullRomCurve3 {
  const combined: THREE.Vector3[] = [
    ...MOUTH_POINTS.map((p) => new THREE.Vector3(...p)),
    ...ESOPHAGUS_POINTS.slice(1).map((p) => new THREE.Vector3(...p)),
    ...STOMACH_POINTS.slice(1).map((p) => new THREE.Vector3(...p)),
    ...SMALL_INTESTINE_POINTS.slice(1).map((p) => new THREE.Vector3(...p)),
  ];
  return new THREE.CatmullRomCurve3(combined, false, 'catmullrom', 0.45);
}

/**
 * Builds the small intestine curve specifically for absorption particle origins.
 */
export function createSmallIntestineCurve(): THREE.CatmullRomCurve3 {
  return new THREE.CatmullRomCurve3(
    SMALL_INTESTINE_POINTS.map((p) => new THREE.Vector3(...p)),
    false,
    'catmullrom',
    0.5,
  );
}

/**
 * Creates a smooth variable-radius organic tube geometry along a 3D curve
 * (used for the sculpted J-shaped stomach pouch and haustrated colon).
 */
function createVariableRadiusTube(
  curve: THREE.CatmullRomCurve3,
  tubularSegments: number,
  radialSegments: number,
  radiusFn: (u: number, angle: number) => number,
): THREE.BufferGeometry {
  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const P = new THREE.Vector3();
  const N = new THREE.Vector3();
  const B = new THREE.Vector3();
  const vertex = new THREE.Vector3();

  for (let i = 0; i <= tubularSegments; i++) {
    const u = i / tubularSegments;
    curve.getPointAt(u, P);
    N.copy(frames.normals[i]);
    B.copy(frames.binormals[i]);

    for (let j = 0; j <= radialSegments; j++) {
      const v = (j / radialSegments) * Math.PI * 2;
      const r = radiusFn(u, v);
      const sin = Math.sin(v);
      const cos = -Math.cos(v);

      vertex.x = P.x + r * (cos * N.x + sin * B.x);
      vertex.y = P.y + r * (cos * N.y + sin * B.y);
      vertex.z = P.z + r * (cos * N.z + sin * B.z);

      positions.push(vertex.x, vertex.y, vertex.z);
      uvs.push(u, j / radialSegments);
    }
  }

  for (let i = 0; i < tubularSegments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = (radialSegments + 1) * i + j;
      const b = (radialSegments + 1) * (i + 1) + j;
      const c = (radialSegments + 1) * (i + 1) + (j + 1);
      const d = (radialSegments + 1) * i + (j + 1);
      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

interface AnatomySystemProps {
  frameStateRef: React.MutableRefObject<TimelineFrameState>;
  organVisibility: Record<OrganId, boolean>;
  onSelectOrgan?: (organ: OrganId) => void;
}

const _baseColor = new THREE.Color();
const _highlightColor = new THREE.Color();
const _emissiveColor = new THREE.Color();

export const AnatomySystem: React.FC<AnatomySystemProps> = ({
  frameStateRef,
  organVisibility,
  onSelectOrgan,
}) => {
  const rootRef = useRef<THREE.Group>(null);
  const arrowEsophagusRef = useRef<THREE.Group>(null);
  const arrowStomachRef = useRef<THREE.Group>(null);
  const arrowAbsorptionRef = useRef<THREE.Group>(null);

  const organGeometries = useMemo(() => {
    const mouthCurve = new THREE.CatmullRomCurve3(
      MOUTH_POINTS.map((p) => new THREE.Vector3(...p)),
    );
    const mouthGeo = createVariableRadiusTube(mouthCurve, 20, 14, (u) => {
      // Slightly wider oral cavity at front, tapering to pharynx
      const cavity = Math.sin(u * Math.PI) * 0.007;
      return 0.0105 + cavity;
    });

    const esophagusCurve = new THREE.CatmullRomCurve3(
      ESOPHAGUS_POINTS.map((p) => new THREE.Vector3(...p)),
    );
    const esophagusGeo = new THREE.TubeGeometry(esophagusCurve, 26, 0.0115, 14, false);

    const stomachCurve = new THREE.CatmullRomCurve3(
      STOMACH_POINTS.map((p) => new THREE.Vector3(...p)),
    );
    const stomachGeo = createVariableRadiusTube(stomachCurve, 34, 20, (u, angle) => {
      // Classic J-shaped pouch profile: narrow cardia -> plump fundus/body -> narrow pylorus
      const pouch = Math.sin(Math.pow(u, 0.78) * Math.PI);
      const bulge = 1 + 0.14 * Math.sin(angle);
      return (0.011 + pouch * 0.032) * bulge;
    });

    const smallIntestineCurve = createSmallIntestineCurve();
    const smallIntestineGeo = new THREE.TubeGeometry(
      smallIntestineCurve,
      96,
      0.0112,
      12,
      false,
    );

    const largeIntestineCurve = new THREE.CatmullRomCurve3(
      LARGE_INTESTINE_POINTS.map((p) => new THREE.Vector3(...p)),
    );
    const largeIntestineGeo = createVariableRadiusTube(
      largeIntestineCurve,
      64,
      14,
      (u) => {
        // Subtle organic haustra segmentation along the colon
        const haustra = 0.0022 * Math.sin(u * Math.PI * 22);
        const endCap = u < 0.04 ? u / 0.04 : u > 0.96 ? (1 - u) / 0.04 : 1;
        return (0.0165 + haustra) * (0.55 + 0.45 * endCap);
      },
    );

    // Reusable arrow chevron geometry for educational flow cues
    const arrowCone = new THREE.ConeGeometry(0.013, 0.028, 12);
    const arrowStem = new THREE.CylinderGeometry(0.0045, 0.0045, 0.03, 10);

    return {
      mouth: mouthGeo,
      esophagus: esophagusGeo,
      stomach: stomachGeo,
      smallIntestine: smallIntestineGeo,
      largeIntestine: largeIntestineGeo,
      arrowCone,
      arrowStem,
    };
  }, []);

  // Create one persistent MeshPhysicalMaterial per organ (reused across frames, zero GC)
  const organMaterials = useMemo(() => {
    const mats = {} as Record<OrganId, THREE.MeshPhysicalMaterial>;
    for (const def of ORGAN_DEFINITIONS) {
      mats[def.id] = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(def.color),
        emissive: new THREE.Color('#000000'),
        emissiveIntensity: 0,
        roughness: 0.34,
        metalness: 0.02,
        clearcoat: 0.35,
        clearcoatRoughness: 0.35,
        transparent: true,
        opacity: 1,
        depthWrite: true,
      });
    }
    return mats;
  }, []);

  const arrowMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#0ea5e9'),
        emissive: new THREE.Color('#38bdf8'),
        emissiveIntensity: 0.65,
        roughness: 0.28,
        metalness: 0.05,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );

  const absorptionArrowMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#10b981'),
        emissive: new THREE.Color('#34d399'),
        emissiveIntensity: 0.75,
        roughness: 0.25,
        metalness: 0.05,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      Object.values(organGeometries).forEach((g) => g.dispose());
      Object.values(organMaterials).forEach((m) => m.dispose());
      arrowMaterial.dispose();
      absorptionArrowMaterial.dispose();
    };
  }, [organGeometries, organMaterials, arrowMaterial, absorptionArrowMaterial]);

  const organMeshRefs = useRef<Record<OrganId, THREE.Mesh | null>>({
    mouth: null,
    esophagus: null,
    stomach: null,
    smallIntestine: null,
    largeIntestine: null,
  });

  useFrame(() => {
    const state = frameStateRef.current;
    const root = rootRef.current;
    if (!root) return;

    const alpha = state.organsVisibilityAlpha;
    root.visible = alpha > 0.01;
    if (!root.visible) return;

    const t = state.time;
    const highlighted = state.highlightedOrgan;
    const dimOthers = state.effectiveLayer === 4 && highlighted !== null;

    // Gentle organic pulse for highlighted organ synchronized to timeline time
    const highlightPulse = 0.5 + 0.5 * Math.sin(t * 4.5);
    const waterActive = state.waterFlowVisibility > 0.05;

    for (const def of ORGAN_DEFINITIONS) {
      const mat = organMaterials[def.id];
      const mesh = organMeshRefs.current[def.id];
      const isVisible = organVisibility[def.id];

      if (mesh) {
        mesh.visible = isVisible;
      }
      if (!isVisible) continue;

      const isHighlighted = highlighted === def.id;
      const isWaterPathOrgan =
        def.id === 'mouth' ||
        def.id === 'esophagus' ||
        def.id === 'stomach' ||
        def.id === 'smallIntestine';

      _baseColor.set(def.color);
      _highlightColor.set(def.highlightColor);

      if (isHighlighted) {
        mat.color.copy(_baseColor).lerp(_highlightColor, 0.52 + highlightPulse * 0.18);
        _emissiveColor.set(def.highlightColor);
        mat.emissive.copy(_emissiveColor);
        mat.emissiveIntensity = 0.28 + highlightPulse * 0.22;
        // Slightly translucent anatomical gel when water passes through so droplets shine inside lumen
        const op = waterActive && isWaterPathOrgan ? alpha * 0.64 : alpha;
        mat.opacity = op;
        mat.depthWrite = op > 0.85;
      } else {
        mat.color.copy(_baseColor);
        mat.emissive.set('#000000');
        mat.emissiveIntensity = 0;
        const baseOp = dimOthers ? alpha * 0.4 : alpha;
        const targetOpacity =
          waterActive && isWaterPathOrgan ? Math.min(baseOp, alpha * 0.72) : baseOp;
        mat.opacity = targetOpacity;
        mat.depthWrite = targetOpacity > 0.85;
      }
    }

    // Animated directional arrows for esophagus & stomach
    const flowAlpha = Math.max(state.esophagusArrowAlpha, state.stomachArrowAlpha);
    arrowMaterial.opacity = flowAlpha * 0.92;

    if (arrowEsophagusRef.current) {
      arrowEsophagusRef.current.visible = state.esophagusArrowAlpha > 0.02;
      const slide = ((t * 0.9) % 1) * 0.075;
      arrowEsophagusRef.current.position.set(0.055, 1.31 - slide, 0.032);
    }

    if (arrowStomachRef.current) {
      arrowStomachRef.current.visible = state.stomachArrowAlpha > 0.02;
      const sway = Math.sin(t * 3.5) * 0.008;
      arrowStomachRef.current.position.set(0.095 + sway, 1.07, 0.045);
    }

    // Animated radial outward arrows for Scene 4 absorption
    absorptionArrowMaterial.opacity = state.absorptionArrowAlpha * 0.92;
    if (arrowAbsorptionRef.current) {
      arrowAbsorptionRef.current.visible = state.absorptionArrowAlpha > 0.02;
      const expand = 1 + ((t * 1.1) % 1) * 0.24;
      arrowAbsorptionRef.current.scale.setScalar(expand);
    }
  });

  const handleOrganClick = (id: OrganId) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    onSelectOrgan?.(id);
  };

  return (
    <group ref={rootRef} name="AnatomyDigestiveSystem">
      {ORGAN_DEFINITIONS.map((def) => (
        <mesh
          key={def.id}
          ref={(el) => {
            organMeshRefs.current[def.id] = el;
          }}
          name={`organ-${def.id}`}
          geometry={organGeometries[def.id]}
          material={organMaterials[def.id]}
          renderOrder={2}
          onClick={handleOrganClick(def.id)}
        />
      ))}

      {/* Animated downward flow indicator beside esophagus (Scene 2) */}
      <group ref={arrowEsophagusRef} visible={false} renderOrder={6}>
        <mesh
          geometry={organGeometries.arrowStem}
          material={arrowMaterial}
          position={[0, 0.015, 0]}
        />
        <mesh
          geometry={organGeometries.arrowCone}
          material={arrowMaterial}
          position={[0, -0.012, 0]}
          rotation={[Math.PI, 0, 0]}
        />
      </group>

      {/* Animated flow indicator beside stomach (Scene 3) */}
      <group
        ref={arrowStomachRef}
        visible={false}
        rotation={[0, 0, -0.75]}
        renderOrder={6}
      >
        <mesh
          geometry={organGeometries.arrowStem}
          material={arrowMaterial}
          position={[0, 0.015, 0]}
        />
        <mesh
          geometry={organGeometries.arrowCone}
          material={arrowMaterial}
          position={[0, -0.012, 0]}
          rotation={[Math.PI, 0, 0]}
        />
      </group>

      {/* Animated outward absorption indicators around small intestine (Scene 4) */}
      <group ref={arrowAbsorptionRef} position={[0, 0.955, 0.032]} visible={false} renderOrder={6}>
        {[
          { pos: [-0.072, 0.02, 0.01], rotZ: Math.PI / 2 },
          { pos: [0.072, 0.02, 0.01], rotZ: -Math.PI / 2 },
          { pos: [-0.064, -0.035, 0.01], rotZ: Math.PI * 0.65 },
          { pos: [0.064, -0.035, 0.01], rotZ: -Math.PI * 0.65 },
        ].map((cfg, idx) => (
          <group
            key={idx}
            position={cfg.pos as [number, number, number]}
            rotation={[0, 0, cfg.rotZ]}
          >
            <mesh
              geometry={organGeometries.arrowStem}
              material={absorptionArrowMaterial}
              position={[0, -0.01, 0]}
              scale={[0.7, 0.7, 0.7]}
            />
            <mesh
              geometry={organGeometries.arrowCone}
              material={absorptionArrowMaterial}
              position={[0, 0.012, 0]}
              scale={[0.7, 0.7, 0.7]}
            />
          </group>
        ))}
      </group>
    </group>
  );
};
