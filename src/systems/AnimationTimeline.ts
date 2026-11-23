/**
 * AnimationTimeline: Pure, deterministic timeline engine for ANIMA 3D STUDIO.
 * Every visual property (camera pose, torso transparency, anatomical layer,
 * highlighted organ, particle progression, absorption intensity, character breathing/blink,
 * and text overlay opacity) is evaluated purely from `currentTime` in [0, duration].
 *
 * Zero timers or chained timeouts: scrubbing, pausing, reversing, and speed changes
 * always produce the exact synchronized state.
 */

import {
  AnatomyLayerMode,
  CameraPresetId,
  CharacterAnglePreset,
  DEMO_DURATION,
  DEMO_SCENES,
  OrganId,
  SceneSegment,
  StudioSettings,
  TextOverlayItem,
} from './SceneManager';

export type Vec3Tuple = [number, number, number];

export interface CameraPose {
  position: Vec3Tuple;
  target: Vec3Tuple;
  fov: number;
}

export interface EvaluatedTextOverlay {
  item: TextOverlayItem;
  displayText: string;
  opacity: number;
  translateY: number;
  visible: boolean;
}

export interface TimelineFrameState {
  time: number;
  normalizedTime: number;
  activeScene: SceneSegment;
  /** Effective anatomical layer (1-4) considering manual override or timeline choreography */
  effectiveLayer: AnatomyLayerMode;
  /** Torso outer clothing/skin opacity (0.06 to 1.0) */
  torsoOpacity: number;
  /** Organ group visibility factor (0 to 1) */
  organsVisibilityAlpha: number;
  /** Currently highlighted organ (either manual selection or timeline cue) */
  highlightedOrgan: OrganId | null;
  /** Target camera pose computed for this exact timestamp or active camera preset */
  cameraPose: CameraPose;
  /** Water bolus progress along digestive tract [0..1] (0 = mouth, 0.25 = esophagus end, 0.55 = stomach exit, 1 = small intestine) */
  waterFlowProgress: number;
  /** Visibility opacity of water stream particles [0..1] */
  waterFlowVisibility: number;
  /** Absorption micro-particle animation intensity [0..1] during Scene 4 */
  absorptionIntensity: number;
  /** Flow direction arrow intensity [0..1] for esophagus/stomach/absorption */
  esophagusArrowAlpha: number;
  stomachArrowAlpha: number;
  absorptionArrowAlpha: number;
  /** Subtle deterministic character idle animations */
  breathCycle: number;
  blinkWeight: number;
  postureSwayX: number;
  postureSwayZ: number;
  headNod: number;
  /** Evaluated text overlays synchronized to timeline */
  activeTexts: EvaluatedTextOverlay[];
}

/** Smooth cubic Hermite interpolation */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0;
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Smoother quintic interpolation for cinematic camera transitions */
export function smootherstep(edge0: number, edge1: number, x: number): number {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0;
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec3(a: Vec3Tuple, b: Vec3Tuple, t: number): Vec3Tuple {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

/** Named studio camera presets (A: Full Body, B: Torso, C: Anatomy) */
export const CAMERA_PRESETS: Record<Exclude<CameraPresetId, 'auto'>, CameraPose> = {
  cameraA: {
    position: [0.35, 1.02, 3.05],
    target: [0, 0.9, 0],
    fov: 38,
  },
  cameraB: {
    position: [0.22, 1.15, 1.48],
    target: [0, 1.07, 0.02],
    fov: 35,
  },
  cameraC: {
    position: [0.08, 1.02, 0.96],
    target: [0, 0.98, 0.03],
    fov: 33,
  },
};

/** View angle presets around the character */
export const CHARACTER_ANGLE_POSES: Record<CharacterAnglePreset, CameraPose> = {
  front: {
    position: [0, 1.02, 3.05],
    target: [0, 0.9, 0],
    fov: 38,
  },
  profile: {
    position: [2.85, 1.02, 0.42],
    target: [0, 0.9, 0],
    fov: 38,
  },
  threeQuarter: {
    position: [1.75, 1.06, 2.45],
    target: [0, 0.9, 0],
    fov: 38,
  },
};

export function getActiveScene(time: number): SceneSegment {
  const clamped = Math.max(0, Math.min(DEMO_DURATION, time));
  for (let i = DEMO_SCENES.length - 1; i >= 0; i--) {
    if (clamped >= DEMO_SCENES[i].startTime) {
      return DEMO_SCENES[i];
    }
  }
  return DEMO_SCENES[0];
}

/**
 * Evaluates the scripted cinematic camera trajectory for the 20-second
 * "¿Qué sucede cuando bebes agua?" animation.
 */
export function evaluateTimelineCamera(time: number): CameraPose {
  const t = Math.max(0, Math.min(DEMO_DURATION, time));

  // Scene 1 (0 - 4s): Full body profile presentation with slow zoom-in & gentle arc
  const p0: CameraPose = { position: [2.75, 1.0, 0.65], target: [0, 0.9, 0], fov: 39 };
  const p1: CameraPose = { position: [1.85, 1.06, 1.85], target: [0, 0.98, 0], fov: 37 };

  // Scene 2 (4 - 8s): Smooth move to front-3/4 torso close-up highlighting esophagus
  const p2: CameraPose = { position: [0.34, 1.18, 1.54], target: [0, 1.12, 0.02], fov: 35 };

  // Scene 3 (8 - 15s): Close-up on stomach & small intestine
  const p3a: CameraPose = { position: [0.16, 1.05, 1.06], target: [0.02, 1.01, 0.02], fov: 33 };
  const p3b: CameraPose = { position: [-0.08, 0.96, 0.94], target: [0, 0.94, 0.03], fov: 32 };

  // Scene 4 (15 - 20s): Focus on small intestine absorption, then smooth zoom out
  const p4a: CameraPose = { position: [0.05, 0.92, 0.84], target: [0, 0.91, 0.03], fov: 31 };
  const p4b: CameraPose = { position: [0.55, 1.02, 2.85], target: [0, 0.9, 0], fov: 38 };

  if (t <= 4) {
    const k = smootherstep(0, 4, t);
    return interpolateCamera(p0, p1, k);
  }
  if (t <= 8) {
    const k = smootherstep(4, 7.2, t);
    return interpolateCamera(p1, p2, k);
  }
  if (t <= 11.5) {
    const k = smootherstep(8, 11.2, t);
    return interpolateCamera(p2, p3a, k);
  }
  if (t <= 15) {
    const k = smootherstep(11.5, 14.8, t);
    return interpolateCamera(p3a, p3b, k);
  }
  if (t <= 17.6) {
    const k = smootherstep(15, 16.5, t);
    return interpolateCamera(p3b, p4a, k);
  }
  const k = smootherstep(17.6, 20, t);
  return interpolateCamera(p4a, p4b, k);
}

function interpolateCamera(a: CameraPose, b: CameraPose, k: number): CameraPose {
  return {
    position: lerpVec3(a.position, b.position, k),
    target: lerpVec3(a.target, b.target, k),
    fov: lerp(a.fov, b.fov, k),
  };
}

/**
 * Computes default torso opacity & anatomical visibility from a layer mode (1..4).
 */
export function getLayerDefaults(layer: AnatomyLayerMode): {
  torsoOpacity: number;
  organsAlpha: number;
} {
  switch (layer) {
    case 1:
      return { torsoOpacity: 1.0, organsAlpha: 0.0 };
    case 2:
      return { torsoOpacity: 0.28, organsAlpha: 1.0 };
    case 3:
      return { torsoOpacity: 0.1, organsAlpha: 1.0 };
    case 4:
      return { torsoOpacity: 0.14, organsAlpha: 1.0 };
  }
}

/**
 * Deterministic blink waveform (brief natural blink every ~4.3 seconds).
 */
export function evaluateBlinkWeight(time: number): number {
  const period = 4.3;
  const local = ((time + 1.1) % period + period) % period;
  const blinkStart = 3.95;
  const blinkDur = 0.18;
  if (local < blinkStart || local > blinkStart + blinkDur) return 0;
  const phase = (local - blinkStart) / blinkDur; // 0..1
  // Smooth triangle pulse
  return Math.sin(phase * Math.PI);
}

/**
 * Evaluates a text overlay's visibility, opacity, and subtle vertical entrance
 * strictly from `time`.
 */
export function evaluateTextOverlay(
  item: TextOverlayItem,
  time: number,
  demoTitle: string,
): EvaluatedTextOverlay {
  const fadeDur = 0.45;
  const displayText = item.id === 'text-title' ? demoTitle : item.text;

  if (time < item.startTime || time > item.endTime || !displayText.trim()) {
    return {
      item,
      displayText,
      opacity: 0,
      translateY: 8,
      visible: false,
    };
  }

  const fadeIn =
    item.startTime <= 0.01
      ? 1
      : smoothstep(item.startTime, item.startTime + fadeDur, time);
  const fadeOut = 1 - smoothstep(item.endTime - fadeDur, item.endTime, time);
  const opacity = Math.max(0, Math.min(1, Math.min(fadeIn, fadeOut)));
  const translateY = (1 - fadeIn) * 8;

  return {
    item,
    displayText,
    opacity,
    translateY,
    visible: opacity > 0.01,
  };
}

/**
 * Evaluates the complete 3D animation state at a given `time` and `StudioSettings`.
 */
export function evaluateTimelineFrame(
  rawTime: number,
  settings: StudioSettings,
): TimelineFrameState {
  const duration = settings.duration || DEMO_DURATION;
  const time = Math.max(0, Math.min(duration, rawTime));
  const activeScene = getActiveScene(time);

  // 1. Timeline-driven anatomical layer & torso opacity
  let autoLayer: AnatomyLayerMode = 1;
  let autoTorsoOpacity = 1.0;
  let autoOrgansAlpha = 0.0;
  let autoHighlight: OrganId | null = null;

  if (time < 3.6) {
    autoLayer = 1;
    autoTorsoOpacity = 1.0;
    autoOrgansAlpha = 0.0;
    autoHighlight = null;
  } else if (time < 8.0) {
    // Scene 2: Fade torso to semi-transparent and highlight esophagus
    const fadeIn = smootherstep(3.6, 5.2, time);
    autoLayer = fadeIn > 0.5 ? 2 : 1;
    autoTorsoOpacity = lerp(1.0, 0.24, fadeIn);
    autoOrgansAlpha = smoothstep(3.8, 4.9, time);
    autoHighlight = time >= 4.4 ? 'esophagus' : null;
  } else if (time < 15.0) {
    // Scene 3: Deeper transparency for stomach and small intestine
    const deepen = smootherstep(8.0, 9.2, time);
    autoLayer = 3;
    autoTorsoOpacity = lerp(0.24, 0.1, deepen);
    autoOrgansAlpha = 1.0;
    autoHighlight = time < 11.6 ? 'stomach' : 'smallIntestine';
  } else if (time < 18.0) {
    // Scene 4a: Highlight small intestine absorption
    autoLayer = 4;
    autoTorsoOpacity = 0.1;
    autoOrgansAlpha = 1.0;
    autoHighlight = 'smallIntestine';
  } else {
    // Scene 4b: Smooth exit zoom restoring torso
    const restore = smootherstep(18.0, 19.9, time);
    autoLayer = restore > 0.65 ? 1 : 2;
    autoTorsoOpacity = lerp(0.1, 0.92, restore);
    autoOrgansAlpha = 1 - smoothstep(18.5, 19.9, time);
    autoHighlight = restore < 0.35 ? 'smallIntestine' : null;
  }

  // Camera C preset also gently fades obstructing torso when selected manually
  let cameraOpacityCap = 1.0;
  if (settings.cameraMode === 'cameraB' && settings.manualLayerMode === null) {
    cameraOpacityCap = 0.28;
    autoOrgansAlpha = Math.max(autoOrgansAlpha, 1.0);
  } else if (settings.cameraMode === 'cameraC' && settings.manualLayerMode === null) {
    cameraOpacityCap = 0.09;
    autoOrgansAlpha = Math.max(autoOrgansAlpha, 1.0);
  }

  // Resolve manual overrides vs timeline
  let effectiveLayer: AnatomyLayerMode = autoLayer;
  let torsoOpacity = Math.min(autoTorsoOpacity, cameraOpacityCap);
  let organsVisibilityAlpha = autoOrgansAlpha;

  if (settings.manualLayerMode !== null) {
    effectiveLayer = settings.manualLayerMode;
    const layerDef = getLayerDefaults(effectiveLayer);
    torsoOpacity = layerDef.torsoOpacity;
    organsVisibilityAlpha = layerDef.organsAlpha;
  }

  if (settings.manualBodyOpacity !== null) {
    torsoOpacity = settings.manualBodyOpacity;
    if (torsoOpacity < 0.95) {
      organsVisibilityAlpha = Math.max(organsVisibilityAlpha, 1.0);
    }
  }

  // Highlighted organ: manual selection takes priority, otherwise timeline highlight
  const highlightedOrgan: OrganId | null =
    settings.selectedOrgan !== null
      ? settings.selectedOrgan
      : effectiveLayer === 1 && settings.manualLayerMode === 1
        ? null
        : autoHighlight;

  // 2. Camera pose
  const cameraPose: CameraPose =
    settings.cameraMode === 'auto'
      ? evaluateTimelineCamera(time)
      : CAMERA_PRESETS[settings.cameraMode];

  // 3. Water particles progress along digestive tract spline [0..1]
  // Starts at mouth around 4.8s, descends esophagus (4.8-8.2s), traverses stomach (8.2-11.5s), fills small intestine (11.5-15.5s)
  let waterFlowProgress = 0;
  if (time >= 4.8 && time < 8.2) {
    waterFlowProgress = lerp(0.0, 0.32, smoothstep(4.8, 8.2, time));
  } else if (time >= 8.2 && time < 11.6) {
    waterFlowProgress = lerp(0.32, 0.62, smoothstep(8.2, 11.6, time));
  } else if (time >= 11.6 && time <= 18.8) {
    waterFlowProgress = lerp(0.62, 1.0, smoothstep(11.6, 15.8, time));
  } else if (time > 18.8) {
    waterFlowProgress = 1.0;
  }

  const waterFadeIn = smoothstep(4.7, 5.3, time);
  const waterFadeOut = 1 - smoothstep(18.0, 19.4, time);
  const waterFlowVisibility = settings.showParticles
    ? Math.max(0, Math.min(waterFadeIn, waterFadeOut)) * organsVisibilityAlpha
    : 0;

  // 4. Small intestine absorption micro-particles (Scene 4: 14.8s - 19.2s)
  const absIn = smoothstep(14.8, 15.6, time);
  const absOut = 1 - smoothstep(18.0, 19.2, time);
  const absorptionIntensity = settings.showParticles
    ? Math.max(0, Math.min(absIn, absOut)) * organsVisibilityAlpha
    : 0;

  // 5. Animated educational flow arrows
  const ind = settings.showIndicators ? organsVisibilityAlpha : 0;
  const esophagusArrowAlpha =
    ind * Math.min(smoothstep(4.6, 5.3, time), 1 - smoothstep(7.5, 8.2, time));
  const stomachArrowAlpha =
    ind * Math.min(smoothstep(8.3, 9.0, time), 1 - smoothstep(11.3, 12.0, time));
  const absorptionArrowAlpha =
    ind * Math.min(smoothstep(15.0, 15.7, time), 1 - smoothstep(17.9, 18.6, time));

  // 6. Subtle, organic character idle animation (never exaggerated)
  const breathCycle = Math.sin(time * 1.45); // ~14 breaths/min calm rhythm
  const blinkWeight = evaluateBlinkWeight(time);
  const postureSwayX = Math.sin(time * 0.55) * 0.008;
  const postureSwayZ = Math.cos(time * 0.42) * 0.006;
  const headNod = Math.sin(time * 0.72 + 0.4) * 0.022;

  // 7. Synchronized text overlays
  const activeTexts = settings.texts.map((item) =>
    evaluateTextOverlay(item, time, settings.demoTitle),
  );

  return {
    time,
    normalizedTime: duration > 0 ? time / duration : 0,
    activeScene,
    effectiveLayer,
    torsoOpacity,
    organsVisibilityAlpha,
    highlightedOrgan,
    cameraPose,
    waterFlowProgress,
    waterFlowVisibility,
    absorptionIntensity,
    esophagusArrowAlpha,
    stomachArrowAlpha,
    absorptionArrowAlpha,
    breathCycle,
    blinkWeight,
    postureSwayX,
    postureSwayZ,
    headNod,
    activeTexts,
  };
}

export function formatTimecode(seconds: number): string {
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  const secStr = secs.toFixed(1).padStart(4, '0');
  return mins > 0 ? `${String(mins).padStart(2, '0')}:${secStr}` : `${secStr}s`;
}
