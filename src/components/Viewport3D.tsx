/**
 * Viewport3D: Main 3D studio stage hosting React Three Fiber Canvas,
 * procedural RoomEnvironment studio lighting, soft floor contact shadow,
 * CharacterSystem, AnatomySystem, ParticleSystem, CameraSystem, and TextOverlaySystem.
 *
 * Implements software-WebGL safe pacing (fenceSync + demand frameloop) so headless
 * verification never stalls, while running fluidly on desktop GPUs and iPhone 11 Safari.
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Maximize2,
  Smartphone,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Camera,
} from 'lucide-react';
import { detectRenderProfile } from '../utils/webglDetect';
import {
  CharacterAnglePreset,
  CharacterDescriptor,
  OrganId,
  StudioSettings,
} from '../systems/SceneManager';
import { TimelineFrameState } from '../systems/AnimationTimeline';
import { CharacterSystem } from '../systems/CharacterSystem';
import { AnatomySystem } from '../systems/AnatomySystem';
import { ParticleSystem } from '../systems/ParticleSystem';
import { CameraActionCommand, CameraSystem } from '../systems/CameraSystem';
import { TextOverlaySystem } from '../systems/TextOverlaySystem';

interface Viewport3DProps {
  settings: StudioSettings;
  character: CharacterDescriptor;
  frameState: TimelineFrameState;
  frameStateRef: React.MutableRefObject<TimelineFrameState>;
  isPlaying: boolean;
  isManualOrbit: boolean;
  cameraCommand: CameraActionCommand | null;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  onUserOrbitStart: () => void;
  onSelectAnglePreset: (angle: CharacterAnglePreset) => void;
  onCameraZoom: (dir: 'zoomIn' | 'zoomOut') => void;
  onCameraReset: () => void;
  onToggleAspectMode: () => void;
  onSelectOrgan: (organ: OrganId) => void;
  onResumeAutoCamera: () => void;
}

/**
 * Configures procedural studio RoomEnvironment IBL, background color, and horizon fog.
 * Zero external files or network fetches.
 */
const StudioEnvironmentRig: React.FC<{ backgroundColor: string }> = ({
  backgroundColor,
}) => {
  const { gl, scene, invalidate } = useThree();

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmrem.dispose();
    invalidate();

    return () => {
      scene.environment = null;
      envTarget.dispose();
    };
  }, [gl, scene, invalidate]);

  useEffect(() => {
    const bg = new THREE.Color(backgroundColor);
    scene.background = bg;
    scene.fog = new THREE.Fog(bg, 5.5, 13.5);
    invalidate();
  }, [backgroundColor, scene, invalidate]);

  return null;
};

/**
 * Soft radial floor contact shadow + subtle ground plane so Elena sits grounded at y = 0.
 */
const StudioFloor: React.FC<{ enableShadows: boolean }> = ({ enableShadows }) => {
  const contactTexture = useMemo(() => {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(
        size / 2,
        size / 2,
        size * 0.04,
        size / 2,
        size / 2,
        size * 0.48,
      );
      grad.addColorStop(0, 'rgba(30, 41, 59, 0.34)');
      grad.addColorStop(0.55, 'rgba(30, 41, 59, 0.12)');
      grad.addColorStop(1, 'rgba(30, 41, 59, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);

  useEffect(() => {
    return () => {
      contactTexture.dispose();
    };
  }, [contactTexture]);

  return (
    <group name="StudioFloor">
      {/* Subtle studio pedestal shadow catcher */}
      {enableShadows && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow>
          <planeGeometry args={[8, 8]} />
          <shadowMaterial transparent opacity={0.14} color="#334155" />
        </mesh>
      )}
      {/* Procedural soft radial contact shadow directly beneath Elena's shoes */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0.01]}>
        <circleGeometry args={[0.42, 32]} />
        <meshBasicMaterial
          map={contactTexture}
          transparent
          depthWrite={false}
          opacity={0.95}
        />
      </mesh>
      {/* Clean subtle studio stage ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <ringGeometry args={[0.52, 0.535, 48]} />
        <meshBasicMaterial color="#cbd5e1" transparent opacity={0.42} depthWrite={false} />
      </mesh>
    </group>
  );
};

/**
 * Software-WebGL friendly invalidation pacer: waits for fenceSync + 80ms pause
 * while playing so headless Chromium never starves UI clicks or screenshots.
 */
const SoftwareGlPacer: React.FC<{
  isSoftwareGl: boolean;
  isPlaying: boolean;
  syncKey: string;
}> = ({ isSoftwareGl, isPlaying, syncKey }) => {
  const { gl, invalidate } = useThree();

  // Trigger render whenever timeline state / props change on demand mode
  useEffect(() => {
    if (isSoftwareGl) {
      invalidate();
    }
  }, [isSoftwareGl, syncKey, invalidate]);

  // Pace continuous playback safely on software WebGL via fenceSync + 80ms gap
  useEffect(() => {
    if (!isSoftwareGl || !isPlaying) return;
    let cancelled = false;
    let timerId = 0;

    const scheduleNext = () => {
      if (cancelled) return;
      const ctx = gl.getContext() as WebGL2RenderingContext | null;
      if (ctx && typeof ctx.fenceSync === 'function') {
        const sync = ctx.fenceSync(ctx.SYNC_GPU_COMMANDS_COMPLETE, 0);
        ctx.flush();
        const poll = () => {
          if (cancelled) {
            if (sync) ctx.deleteSync(sync);
            return;
          }
          const status = sync ? ctx.getSyncParameter(sync, ctx.SYNC_STATUS) : ctx.SIGNALED;
          if (status === ctx.UNSIGNALED) {
            timerId = window.setTimeout(poll, 8);
          } else {
            if (sync) ctx.deleteSync(sync);
            timerId = window.setTimeout(() => {
              if (!cancelled) {
                invalidate();
                scheduleNext();
              }
            }, 80);
          }
        };
        timerId = window.setTimeout(poll, 8);
      } else {
        timerId = window.setTimeout(() => {
          if (!cancelled) {
            invalidate();
            scheduleNext();
          }
        }, 90);
      }
    };

    invalidate();
    scheduleNext();

    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [isSoftwareGl, isPlaying, gl, invalidate]);

  return null;
};

export const Viewport3D: React.FC<Viewport3DProps> = ({
  settings,
  character,
  frameState,
  frameStateRef,
  isPlaying,
  isManualOrbit,
  cameraCommand,
  canvasRef,
  onUserOrbitStart,
  onSelectAnglePreset,
  onCameraZoom,
  onCameraReset,
  onToggleAspectMode,
  onSelectOrgan,
  onResumeAutoCamera,
}) => {
  const profile = useMemo(() => detectRenderProfile(), []);
  const [contextLost, setContextLost] = useState(false);

  const isVertical = settings.aspectMode === '9:16';

  // Compact signature string so on-demand software WebGL repaints cleanly on every meaningful change
  const syncKey = `${frameState.time.toFixed(2)}|${settings.backgroundColor}|${settings.characterRotationDeg}|${settings.cameraMode}|${settings.manualLayerMode}|${settings.manualBodyOpacity}|${settings.selectedOrgan}|${JSON.stringify(settings.organVisibility)}|${settings.showIndicators}|${settings.showParticles}`;

  return (
    <div className="relative flex flex-1 flex-col min-h-0 bg-[#11131a] select-none overflow-hidden">
      {/* Compact Viewport Framing Toolbar (above canvas, never occluding character) */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#222736] bg-[#141720] shrink-0 overflow-x-auto">
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={onToggleAspectMode}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isVertical
                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/35'
                : 'bg-[#1d212e] text-slate-300 border border-[#2c3245] hover:text-white'
            }`}
            aria-label={isVertical ? 'Cambiar a visor libre' : 'Cambiar a vista vertical 9:16'}
          >
            {isVertical ? <Smartphone className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isVertical ? '9:16 · 1080×1920' : 'Visor libre'}</span>
          </button>

          {isManualOrbit && settings.cameraMode === 'auto' && (
            <button
              type="button"
              onClick={onResumeAutoCamera}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-amber-500/15 text-amber-200 border border-amber-500/35 hover:bg-amber-500/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Seguir cámara auto</span>
            </button>
          )}
        </div>

        {/* Angle Presets & Quick Camera Manipulation */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center bg-[#1b1f2c] p-0.5 rounded-md border border-[#2a3042]">
            {(
              [
                { id: 'front', label: 'Frente' },
                { id: 'profile', label: 'Perfil' },
                { id: 'threeQuarter', label: '3/4' },
              ] as { id: CharacterAnglePreset; label: string }[]
            ).map((angle) => (
              <button
                key={angle.id}
                type="button"
                onClick={() => onSelectAnglePreset(angle.id)}
                className="px-2 py-1 text-[11px] font-medium text-slate-300 hover:text-white hover:bg-[#272d3f] rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {angle.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onCameraZoom('zoomIn')}
            className="p-1.5 rounded-md bg-[#1b1f2c] border border-[#2a3042] text-slate-300 hover:text-white hover:bg-[#252b3b] transition-colors cursor-pointer"
            aria-label="Acercar cámara"
            title="Acercar"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onCameraZoom('zoomOut')}
            className="p-1.5 rounded-md bg-[#1b1f2c] border border-[#2a3042] text-slate-300 hover:text-white hover:bg-[#252b3b] transition-colors cursor-pointer"
            aria-label="Alejar cámara"
            title="Alejar"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onCameraReset}
            className="p-1.5 rounded-md bg-[#1b1f2c] border border-[#2a3042] text-slate-300 hover:text-white hover:bg-[#252b3b] transition-colors cursor-pointer"
            aria-label="Restaurar encuadre"
            title="Restaurar encuadre"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stage Backdrop hosting the 3D Canvas (either 9:16 portrait frame or full free viewport) */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center p-2 sm:p-4 overflow-hidden bg-[#0c0e13]">
        <div
          data-testid="viewport-stage-frame"
          data-aspect={settings.aspectMode}
          data-scene={frameState.activeScene.index}
          data-layer={frameState.effectiveLayer}
          className={`relative overflow-hidden transition-all duration-200 ${
            isVertical
              ? 'h-full aspect-[9/16] max-w-full rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.55)] border border-[#2a3042]'
              : 'w-full h-full rounded-lg border border-[#222736]'
          }`}
          style={{ backgroundColor: settings.backgroundColor }}
        >
          {!profile.webglSupported || contextLost ? (
            <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center bg-slate-100 text-slate-800">
              <p className="font-display font-semibold text-base mb-1">
                Visor WebGL no disponible
              </p>
              <p className="text-xs text-slate-600 max-w-xs">
                Activa la aceleración gráfica en tu navegador o recarga la página para
                restaurar el escenario 3D.
              </p>
            </div>
          ) : (
            <div
              data-testid="webgl-canvas-mount"
              className="h-full w-full touch-none"
              style={{ touchAction: 'none' }}
            >
              <Canvas
                frameloop={profile.isSoftwareGl ? 'demand' : 'always'}
                dpr={profile.isSoftwareGl ? 1 : [1, profile.maxDpr]}
                shadows={profile.enableShadows ? 'percentage' : false}
                camera={{ position: [2.75, 1.0, 0.65], fov: 39, near: 0.08, far: 40 }}
                gl={{
                  antialias: profile.enableAntialias,
                  powerPreference: 'high-performance',
                  preserveDrawingBuffer: true,
                  toneMapping: THREE.ACESFilmicToneMapping,
                  toneMappingExposure: 0.96,
                }}
                onCreated={({ gl }) => {
                  gl.outputColorSpace = THREE.SRGBColorSpace;
                  canvasRef.current = gl.domElement;
                  const onLost = (e: Event) => {
                    e.preventDefault();
                    setContextLost(true);
                  };
                  const onRestored = () => {
                    setContextLost(false);
                  };
                  gl.domElement.addEventListener('webglcontextlost', onLost, false);
                  gl.domElement.addEventListener('webglcontextrestored', onRestored, false);
                }}
              >
                <StudioEnvironmentRig backgroundColor={settings.backgroundColor} />

                {/* 3-Point Warm/Cool Studio Lighting Rig */}
                <hemisphereLight args={['#e8f4fc', '#e2dcd5', 0.68]} />
                <directionalLight
                  position={[2.4, 3.8, 2.8]}
                  intensity={1.15}
                  color="#fff6ea"
                  castShadow={profile.enableShadows}
                  shadow-mapSize-width={1024}
                  shadow-mapSize-height={1024}
                  shadow-camera-near={0.5}
                  shadow-camera-far={10}
                  shadow-camera-left={-1.5}
                  shadow-camera-right={1.5}
                  shadow-camera-top={2.2}
                  shadow-camera-bottom={-0.5}
                  shadow-bias={-0.0005}
                  shadow-normalBias={0.02}
                />
                {/* Soft cool fill / rim light for pastel edge separation */}
                <directionalLight
                  position={[-2.2, 2.4, -1.8]}
                  intensity={0.48}
                  color="#dbeafe"
                />

                <StudioFloor enableShadows={profile.enableShadows} />

                {/* Procedural Character + Internal Digestive System + Water/Absorption Particles */}
                <CharacterSystem
                  descriptor={character}
                  rotationDeg={settings.characterRotationDeg}
                  frameStateRef={frameStateRef}
                >
                  <AnatomySystem
                    frameStateRef={frameStateRef}
                    organVisibility={settings.organVisibility}
                    onSelectOrgan={onSelectOrgan}
                  />
                  <ParticleSystem frameStateRef={frameStateRef} />
                </CharacterSystem>

                <CameraSystem
                  frameStateRef={frameStateRef}
                  isSoftwareGl={profile.isSoftwareGl}
                  followTarget={!isManualOrbit}
                  cameraCommand={cameraCommand}
                  onUserOrbitStart={onUserOrbitStart}
                />

                <SoftwareGlPacer
                  isSoftwareGl={profile.isSoftwareGl}
                  isPlaying={isPlaying}
                  syncKey={syncKey}
                />
              </Canvas>
            </div>
          )}

          {/* Synchronized Educational Titles & Captions */}
          <TextOverlaySystem
            activeTexts={frameState.activeTexts}
            activeScene={frameState.activeScene}
            isVerticalPreview={isVertical}
          />
        </div>
      </div>
    </div>
  );
};
