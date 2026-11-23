/**
 * CameraSystem: Smoothly interpolated studio camera rig supporting:
 * - Orbit around character, zoom in/out, lateral pan (OrbitControls)
 * - Camera A (Cuerpo Completo), Camera B (Torso), Camera C (Anatomía)
 * - View angle presets (Frente, Perfil, Tres Cuartos) & Reset framing
 * - Automated timeline camera choreography synced with AnimationTimeline
 * - Seamless handoff to manual user control on pointer drag (never fights user!)
 */

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { CameraPose, TimelineFrameState } from './AnimationTimeline';

export interface CameraActionCommand {
  id: number;
  type: 'pose' | 'zoomIn' | 'zoomOut' | 'reset';
  pose?: CameraPose;
}

interface CameraSystemProps {
  frameStateRef: React.MutableRefObject<TimelineFrameState>;
  isSoftwareGl: boolean;
  /** When true, camera smoothly tracks timeline / active camera preset */
  followTarget: boolean;
  /** Explicit one-shot camera command (angle preset, zoom button, reset) */
  cameraCommand: CameraActionCommand | null;
  /** Called when the user grabs OrbitControls so UI knows manual orbit took over */
  onUserOrbitStart: () => void;
}

const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _offset = new THREE.Vector3();

export const CameraSystem: React.FC<CameraSystemProps> = ({
  frameStateRef,
  isSoftwareGl,
  followTarget,
  cameraCommand,
  onUserOrbitStart,
}) => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera, invalidate } = useThree();

  // Active one-shot transition target (used for angle presets or reset button)
  const oneShotPoseRef = useRef<CameraPose | null>(null);
  const lastCommandIdRef = useRef<number>(-1);
  const initializedRef = useRef(false);

  // Snap to initial Scene 1 camera pose on first mount so there's no jarring jump on load
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const initial = frameStateRef.current.cameraPose;
    camera.position.set(...initial.position);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = initial.fov;
      camera.updateProjectionMatrix();
    }
    if (controlsRef.current) {
      controlsRef.current.target.set(...initial.target);
      controlsRef.current.update();
    } else {
      camera.lookAt(...initial.target);
    }
    invalidate();
  }, [camera, frameStateRef, invalidate]);

  // Process explicit camera button commands (angle presets, zoom +/-, reset)
  useEffect(() => {
    if (!cameraCommand || cameraCommand.id === lastCommandIdRef.current) return;
    lastCommandIdRef.current = cameraCommand.id;

    if (cameraCommand.type === 'pose' && cameraCommand.pose) {
      oneShotPoseRef.current = cameraCommand.pose;
      invalidate();
    } else if (cameraCommand.type === 'reset') {
      oneShotPoseRef.current = frameStateRef.current.cameraPose;
      invalidate();
    } else if (
      (cameraCommand.type === 'zoomIn' || cameraCommand.type === 'zoomOut') &&
      controlsRef.current
    ) {
      const target = controlsRef.current.target;
      _offset.copy(camera.position).sub(target);
      const factor = cameraCommand.type === 'zoomIn' ? 0.78 : 1.28;
      const newDist = THREE.MathUtils.clamp(_offset.length() * factor, 0.55, 5.2);
      _offset.setLength(newDist);
      const nextPos: [number, number, number] = [
        target.x + _offset.x,
        target.y + _offset.y,
        target.z + _offset.z,
      ];
      oneShotPoseRef.current = {
        position: nextPos,
        target: [target.x, target.y, target.z],
        fov: camera instanceof THREE.PerspectiveCamera ? camera.fov : 38,
      };
      invalidate();
    }
  }, [cameraCommand, camera, frameStateRef, invalidate]);

  // Clear one-shot pose when followTarget resumes (e.g., selecting Camera A/B/C or Auto)
  useEffect(() => {
    if (followTarget) {
      oneShotPoseRef.current = null;
      invalidate();
    }
  }, [followTarget, invalidate]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;
    if (!controls) return;

    const dt = Math.min(delta, 0.1);
    const activePose = oneShotPoseRef.current ?? (followTarget ? frameStateRef.current.cameraPose : null);

    if (activePose) {
      _targetPos.set(...activePose.position);
      _targetLook.set(...activePose.target);

      // On software WebGL (low frame rate / on-demand), snap faster so scrubbing/presets are immediate
      const smoothLambda = isSoftwareGl ? 24 : 6.5;
      const alpha = 1 - Math.exp(-smoothLambda * dt);

      camera.position.lerp(_targetPos, alpha);
      controls.target.lerp(_targetLook, alpha);

      if (camera instanceof THREE.PerspectiveCamera) {
        const nextFov = THREE.MathUtils.lerp(camera.fov, activePose.fov, alpha);
        if (Math.abs(nextFov - camera.fov) > 0.01) {
          camera.fov = nextFov;
          camera.updateProjectionMatrix();
        }
      }

      controls.update();

      const posDist = camera.position.distanceTo(_targetPos);
      const targetDist = controls.target.distanceTo(_targetLook);

      // Clear one-shot pose once arrived
      if (oneShotPoseRef.current && posDist < 0.008 && targetDist < 0.008) {
        camera.position.copy(_targetPos);
        controls.target.copy(_targetLook);
        controls.update();
        oneShotPoseRef.current = null;
      } else if (isSoftwareGl && (posDist > 0.012 || targetDist > 0.012)) {
        invalidate();
      }
    } else {
      controls.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping={!isSoftwareGl}
      dampingFactor={0.07}
      enablePan
      enableZoom
      enableRotate
      minDistance={0.55}
      maxDistance={5.2}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI * 0.52}
      target={[0, 0.9, 0]}
      onStart={() => {
        oneShotPoseRef.current = null;
        onUserOrbitStart();
      }}
      onChange={() => {
        if (isSoftwareGl) invalidate();
      }}
    />
  );
};
