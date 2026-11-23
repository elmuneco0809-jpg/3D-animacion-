/**
 * ANIMA 3D STUDIO v0.1 — Root Workspace Application
 * Orchestrates SceneManager, AnimationTimeline, CharacterSystem, AnatomySystem,
 * CameraSystem, ParticleSystem, TextOverlaySystem, and ExportSystem.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CameraPresetId,
  CHARACTERS_CATALOG,
  CharacterAnglePreset,
  clearStudioSettings,
  createDefaultStudioSettings,
  loadStudioSettings,
  OrganId,
  saveStudioSettings,
  StudioSettings,
} from './systems/SceneManager';
import {
  CHARACTER_ANGLE_POSES,
  evaluateTimelineFrame,
} from './systems/AnimationTimeline';
import { CameraActionCommand } from './systems/CameraSystem';
import { TopBar } from './components/TopBar';
import { LeftPanel, LeftTabId } from './components/LeftPanel';
import { RightPanel, RightTabId } from './components/RightPanel';
import { Viewport3D } from './components/Viewport3D';
import { TimelinePanel } from './components/TimelinePanel';
import { MobileDrawer } from './components/MobileDrawer';
import { ExportModal } from './components/ExportModal';

export default function App() {
  const [settings, setSettings] = useState<StudioSettings>(() => loadStudioSettings());
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isManualOrbit, setIsManualOrbit] = useState<boolean>(false);
  const [leftTab, setLeftTab] = useState<LeftTabId>('scenes');
  const [rightTab, setRightTab] = useState<RightTabId>('layers');
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [cameraCommand, setCameraCommand] = useState<CameraActionCommand | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const commandSeqRef = useRef<number>(1);
  const playbackRafRef = useRef<number>(0);
  const lastTickMsRef = useRef<number>(0);
  const speedRef = useRef<number>(settings.playbackSpeed);
  const durationRef = useRef<number>(settings.duration);

  speedRef.current = settings.playbackSpeed;
  durationRef.current = settings.duration;

  // Persist user settings to localStorage whenever edited
  useEffect(() => {
    saveStudioSettings(settings);
  }, [settings]);

  // Deterministic timeline evaluation from currentTime + settings
  const frameState = useMemo(
    () => evaluateTimelineFrame(currentTime, settings),
    [currentTime, settings],
  );

  // Ref mirror read inside R3F useFrame loops so React never re-mounts WebGL
  const frameStateRef = useRef(frameState);
  frameStateRef.current = frameState;

  const activeCharacter = useMemo(
    () =>
      CHARACTERS_CATALOG.find((c) => c.id === settings.activeCharacterId) ??
      CHARACTERS_CATALOG[0],
    [settings.activeCharacterId],
  );

  // Single master timeline clock (no chained timeouts — supports pause, scrub, speed change cleanly)
  useEffect(() => {
    if (!isPlaying) return;

    lastTickMsRef.current = performance.now();
    const step = (now: number) => {
      const elapsedSec = Math.min((now - lastTickMsRef.current) / 1000, 0.1);
      lastTickMsRef.current = now;

      setCurrentTime((prev) => {
        const next = prev + elapsedSec * speedRef.current;
        if (next >= durationRef.current) {
          setIsPlaying(false);
          return durationRef.current;
        }
        return next;
      });

      playbackRafRef.current = requestAnimationFrame(step);
    };

    playbackRafRef.current = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(playbackRafRef.current);
    };
  }, [isPlaying]);

  // Spacebar play/pause shortcut (ignored when typing in inputs/textareas)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.code === 'Space') {
        e.preventDefault();
        setCurrentTime((t) => (t >= durationRef.current - 0.05 ? 0 : t));
        setIsPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const issueCameraCommand = useCallback(
    (cmd: Omit<CameraActionCommand, 'id'>) => {
      commandSeqRef.current += 1;
      setCameraCommand({ ...cmd, id: commandSeqRef.current });
    },
    [],
  );

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((prev) => {
      if (!prev && currentTime >= settings.duration - 0.05) {
        setCurrentTime(0);
      }
      return !prev;
    });
  }, [currentTime, settings.duration]);

  const handleResetTimeline = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setIsManualOrbit(false);
  }, []);

  const handleSeek = useCallback((time: number) => {
    const clamped = Math.max(0, Math.min(durationRef.current, time));
    setCurrentTime(clamped);
  }, []);

  const handleJumpToScene = useCallback((startTime: number) => {
    setCurrentTime(startTime);
    setIsManualOrbit(false);
  }, []);

  const handleToggleOrgan = useCallback((organId: OrganId) => {
    setSettings((prev) => ({
      ...prev,
      organVisibility: {
        ...prev.organVisibility,
        [organId]: !prev.organVisibility[organId],
      },
    }));
  }, []);

  const handleSelectOrgan = useCallback((organId: OrganId | null) => {
    setSettings((prev) => ({
      ...prev,
      selectedOrgan: organId,
      manualLayerMode: organId !== null ? 4 : prev.manualLayerMode === 4 ? null : prev.manualLayerMode,
    }));
  }, []);

  const handleSelectCameraMode = useCallback((mode: CameraPresetId) => {
    setIsManualOrbit(false);
    setSettings((prev) => ({ ...prev, cameraMode: mode }));
  }, []);

  const handleSelectAnglePreset = useCallback(
    (angle: CharacterAnglePreset) => {
      setIsManualOrbit(true);
      issueCameraCommand({ type: 'pose', pose: CHARACTER_ANGLE_POSES[angle] });
    },
    [issueCameraCommand],
  );

  const handleCameraZoom = useCallback(
    (dir: 'zoomIn' | 'zoomOut') => {
      setIsManualOrbit(true);
      issueCameraCommand({ type: dir });
    },
    [issueCameraCommand],
  );

  const handleCameraReset = useCallback(() => {
    setIsManualOrbit(false);
    issueCameraCommand({ type: 'reset' });
  }, [issueCameraCommand]);

  const handleResetAll = useCallback(() => {
    clearStudioSettings();
    setSettings(createDefaultStudioSettings());
    setIsPlaying(false);
    setCurrentTime(0);
    setIsManualOrbit(false);
    issueCameraCommand({ type: 'reset' });
  }, [issueCameraCommand]);

  const handleStartFullDemoPlayback = useCallback(() => {
    setIsManualOrbit(false);
    setSettings((prev) => ({
      ...prev,
      cameraMode: 'auto',
      manualLayerMode: null,
      manualBodyOpacity: null,
    }));
    setCurrentTime(0);
    setIsPlaying(true);
  }, []);

  return (
    <div
      data-testid="anima-studio-root"
      data-playing={isPlaying ? 'true' : 'false'}
      data-scene={frameState.activeScene.index}
      className="flex flex-col h-dvh w-screen overflow-hidden bg-[#0e1015] text-[#f1f3f7]"
    >
      {/* Clean Top Studio Header */}
      <TopBar
        demoTitle={settings.demoTitle}
        onOpenExport={() => setIsExportOpen(true)}
      />

      {/* Main Workspace: Left Panel | Center 3D Viewport | Right Panel */}
      <main className="flex flex-1 min-h-0 overflow-hidden">
        {/* Desktop Left Sidebar */}
        <aside
          aria-label="Panel izquierdo: Escenas, Anatomía y Personajes"
          className="hidden lg:flex lg:w-[272px] xl:w-[288px] flex-col border-r border-[#222736] shrink-0 min-h-0"
        >
          <LeftPanel
            activeTab={leftTab}
            onTabChange={setLeftTab}
            settings={settings}
            activeSceneIndex={frameState.activeScene.index}
            highlightedOrgan={frameState.highlightedOrgan}
            onJumpToScene={handleJumpToScene}
            onToggleOrgan={handleToggleOrgan}
            onSelectOrgan={handleSelectOrgan}
            onChangeCharacterRotation={(deg) =>
              setSettings((prev) => ({ ...prev, characterRotationDeg: deg }))
            }
          />
        </aside>

        {/* Center Stage: 3D Viewport */}
        <div className="flex flex-1 flex-col min-w-0 min-h-0">
          <Viewport3D
            settings={settings}
            character={activeCharacter}
            frameState={frameState}
            frameStateRef={frameStateRef}
            isPlaying={isPlaying}
            isManualOrbit={isManualOrbit}
            cameraCommand={cameraCommand}
            canvasRef={canvasRef}
            onUserOrbitStart={() => setIsManualOrbit(true)}
            onSelectAnglePreset={handleSelectAnglePreset}
            onCameraZoom={handleCameraZoom}
            onCameraReset={handleCameraReset}
            onToggleAspectMode={() =>
              setSettings((prev) => ({
                ...prev,
                aspectMode: prev.aspectMode === '9:16' ? 'free' : '9:16',
              }))
            }
            onSelectOrgan={(organ) => handleSelectOrgan(organ)}
            onResumeAutoCamera={() => setIsManualOrbit(false)}
          />
        </div>

        {/* Desktop Right Inspector Sidebar */}
        <aside
          aria-label="Panel derecho: Capas, Cámaras, Textos y Propiedades"
          className="hidden lg:flex lg:w-[292px] xl:w-[312px] flex-col border-l border-[#222736] shrink-0 min-h-0"
        >
          <RightPanel
            activeTab={rightTab}
            onTabChange={setRightTab}
            settings={settings}
            effectiveLayer={frameState.effectiveLayer}
            effectiveTorsoOpacity={frameState.torsoOpacity}
            onUpdateSettings={setSettings}
            onSelectCameraMode={handleSelectCameraMode}
            onResetCamera={handleCameraReset}
            onResetAll={handleResetAll}
          />
        </aside>
      </main>

      {/* Bottom Interactive Timeline */}
      <TimelinePanel
        currentTime={currentTime}
        duration={settings.duration}
        isPlaying={isPlaying}
        playbackSpeed={settings.playbackSpeed}
        activeSceneIndex={frameState.activeScene.index}
        onTogglePlay={handleTogglePlay}
        onReset={handleResetTimeline}
        onSeek={handleSeek}
        onChangeSpeed={(speed) =>
          setSettings((prev) => ({ ...prev, playbackSpeed: speed }))
        }
      />

      {/* Mobile Collapsible Tab Drawer (hidden on desktop) */}
      <MobileDrawer
        settings={settings}
        activeSceneIndex={frameState.activeScene.index}
        effectiveLayer={frameState.effectiveLayer}
        effectiveTorsoOpacity={frameState.torsoOpacity}
        highlightedOrgan={frameState.highlightedOrgan}
        onJumpToScene={handleJumpToScene}
        onToggleOrgan={handleToggleOrgan}
        onSelectOrgan={handleSelectOrgan}
        onChangeCharacterRotation={(deg) =>
          setSettings((prev) => ({ ...prev, characterRotationDeg: deg }))
        }
        onUpdateSettings={setSettings}
        onSelectCameraMode={handleSelectCameraMode}
        onResetCamera={handleCameraReset}
        onResetAll={handleResetAll}
      />

      {/* Export Modal (PNG + Real MediaRecorder Detection) */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        canvasRef={canvasRef}
        activeTexts={frameState.activeTexts}
        isVerticalPreview={settings.aspectMode === '9:16'}
        onStartFullDemoPlayback={handleStartFullDemoPlayback}
      />
    </div>
  );
}
