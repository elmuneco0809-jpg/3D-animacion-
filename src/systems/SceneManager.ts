/**
 * SceneManager: Studio data structures, default educational demo configuration,
 * extensible character/anatomy asset descriptors (ready for future GLB/GLTF loaders),
 * and localStorage persistence.
 */

export type OrganId =
  | 'mouth'
  | 'esophagus'
  | 'stomach'
  | 'smallIntestine'
  | 'largeIntestine';

export type AnatomyLayerMode = 1 | 2 | 3 | 4;

export type CameraPresetId = 'auto' | 'cameraA' | 'cameraB' | 'cameraC';

export type CharacterAnglePreset = 'front' | 'profile' | 'threeQuarter';

export type ViewportAspectMode = 'free' | '9:16';

export interface OrganDefinition {
  id: OrganId;
  name: string;
  shortLabel: string;
  description: string;
  color: string;
  highlightColor: string;
}

export interface TextOverlayItem {
  id: string;
  role: 'title' | 'caption';
  label: string;
  text: string;
  startTime: number;
  endTime: number;
  position: 'top' | 'bottom' | 'center-top';
}

export interface SceneSegment {
  id: string;
  index: number;
  title: string;
  subtitle: string;
  startTime: number;
  endTime: number;
  accentColor: string;
}

/**
 * Extensible asset descriptor designed so procedural geometry can be swapped
 * cleanly for external GLB/GLTF files in future releases without rewriting UI or Timeline.
 */
export interface CharacterDescriptor {
  id: string;
  name: string;
  role: string;
  sourceType: 'procedural' | 'gltf';
  gltfUrl?: string;
  heightMeters: number;
  palette: {
    skin: string;
    hair: string;
    shirt: string;
    pants: string;
    shoes: string;
  };
}

export interface StudioSettings {
  version: string;
  demoTitle: string;
  duration: number;
  playbackSpeed: number;
  backgroundColor: string;
  aspectMode: ViewportAspectMode;
  activeCharacterId: string;
  characterRotationDeg: number;
  cameraMode: CameraPresetId;
  /** Manual override layer; null means driven automatically by timeline */
  manualLayerMode: AnatomyLayerMode | null;
  /** Manual torso opacity override (0..1); null means driven by layer/timeline */
  manualBodyOpacity: number | null;
  selectedOrgan: OrganId | null;
  organVisibility: Record<OrganId, boolean>;
  showIndicators: boolean;
  showParticles: boolean;
  texts: TextOverlayItem[];
}

export const STUDIO_STORAGE_KEY = 'anima3d_studio_settings_v0_1';

export const DEMO_DURATION = 20;

export const CHARACTERS_CATALOG: CharacterDescriptor[] = [
  {
    id: 'elena-adult-f',
    name: 'Elena',
    role: 'Personaje femenino adulto · Estilizado',
    sourceType: 'procedural',
    heightMeters: 1.68,
    palette: {
      skin: '#efc2a6',
      hair: '#5c3a28',
      shirt: '#ee8da8',
      pants: '#876ebd',
      shoes: '#eceae4',
    },
  },
];

export const ORGAN_DEFINITIONS: OrganDefinition[] = [
  {
    id: 'mouth',
    name: 'Boca y faringe',
    shortLabel: 'Boca',
    description: 'Punto de entrada inicial del agua hacia la vía digestiva.',
    color: '#e5949b',
    highlightColor: '#ff6b81',
  },
  {
    id: 'esophagus',
    name: 'Esófago',
    shortLabel: 'Esófago',
    description: 'Conducto muscular que transporta el agua desde la garganta hasta el estómago.',
    color: '#e28f8b',
    highlightColor: '#ff7066',
  },
  {
    id: 'stomach',
    name: 'Estómago',
    shortLabel: 'Estómago',
    description: 'Recibe el agua rápidamente y la dirige hacia el intestino delgado.',
    color: '#e0897b',
    highlightColor: '#ff7c57',
  },
  {
    id: 'smallIntestine',
    name: 'Intestino delgado',
    shortLabel: 'Int. delgado',
    description: 'Zona principal donde ocurre la mayor parte de la absorción del agua.',
    color: '#e5a495',
    highlightColor: '#38bdf8',
  },
  {
    id: 'largeIntestine',
    name: 'Intestino grueso',
    shortLabel: 'Int. grueso',
    description: 'Rodea al intestino delgado y completa la absorción restante.',
    color: '#c9888c',
    highlightColor: '#ec7c92',
  },
];

export const DEMO_SCENES: SceneSegment[] = [
  {
    id: 'scene-1',
    index: 1,
    title: 'Escena 1 · Presentación',
    subtitle: 'Personaje de perfil, acercamiento lento y título animado',
    startTime: 0,
    endTime: 4,
    accentColor: '#f472b6',
  },
  {
    id: 'scene-2',
    index: 2,
    title: 'Escena 2 · Esófago',
    subtitle: 'Acercamiento al torso semitransparente y resalte del esófago',
    startTime: 4,
    endTime: 8,
    accentColor: '#fb923c',
  },
  {
    id: 'scene-3',
    index: 3,
    title: 'Escena 3 · Tránsito digestivo',
    subtitle: 'Avance del agua por el estómago hacia el intestino delgado',
    startTime: 8,
    endTime: 15,
    accentColor: '#38bdf8',
  },
  {
    id: 'scene-4',
    index: 4,
    title: 'Escena 4 · Absorción',
    subtitle: 'Absorción de agua en el intestino delgado y alejamiento final',
    startTime: 15,
    endTime: 20,
    accentColor: '#34d399',
  },
];

export const BACKGROUND_PRESETS = [
  { id: 'studio-white', label: 'Estudio claro', hex: '#f4f6f9' },
  { id: 'warm-paper', label: 'Marfil suave', hex: '#f7f4ef' },
  { id: 'clinical-mist', label: 'Niebla clínica', hex: '#edf2f7' },
  { id: 'pastel-sky', label: 'Cielo pastel', hex: '#eef6fb' },
  { id: 'soft-sage', label: 'Salvia claro', hex: '#eff6f3' },
];

export const PLAYBACK_SPEEDS = [0.25, 0.5, 1, 1.5, 2];

export function createDefaultStudioSettings(): StudioSettings {
  return {
    version: '0.1',
    demoTitle: '¿Qué sucede cuando bebes agua?',
    duration: DEMO_DURATION,
    playbackSpeed: 1,
    backgroundColor: '#f4f6f9',
    aspectMode: '9:16',
    activeCharacterId: 'elena-adult-f',
    characterRotationDeg: 0,
    cameraMode: 'auto',
    manualLayerMode: null,
    manualBodyOpacity: null,
    selectedOrgan: null,
    organVisibility: {
      mouth: true,
      esophagus: true,
      stomach: true,
      smallIntestine: true,
      largeIntestine: true,
    },
    showIndicators: true,
    showParticles: true,
    texts: [
      {
        id: 'text-title',
        role: 'title',
        label: 'Título de apertura',
        text: '¿Qué sucede cuando bebes agua?',
        startTime: 0.0,
        endTime: 3.9,
        position: 'top',
      },
      {
        id: 'text-esophagus',
        role: 'caption',
        label: 'Paso por el esófago',
        text: 'El agua desciende por el esófago hacia el estómago.',
        startTime: 4.5,
        endTime: 7.9,
        position: 'bottom',
      },
      {
        id: 'text-stomach',
        role: 'caption',
        label: 'Estómago e intestino',
        text: 'Atraviesa el estómago en pocos minutos y llega al intestino delgado.',
        startTime: 8.6,
        endTime: 14.5,
        position: 'bottom',
      },
      {
        id: 'text-absorption',
        role: 'caption',
        label: 'Explicación de absorción',
        text: 'Gran parte del agua se absorbe en el intestino delgado.',
        startTime: 15.2,
        endTime: 19.6,
        position: 'bottom',
      },
    ],
  };
}

export function loadStudioSettings(storage?: Pick<Storage, 'getItem'>): StudioSettings {
  const defaults = createDefaultStudioSettings();
  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return defaults;

  try {
    const raw = store.getItem(STUDIO_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<StudioSettings>;

    const organVisibility: Record<OrganId, boolean> = {
      mouth: parsed.organVisibility?.mouth ?? defaults.organVisibility.mouth,
      esophagus: parsed.organVisibility?.esophagus ?? defaults.organVisibility.esophagus,
      stomach: parsed.organVisibility?.stomach ?? defaults.organVisibility.stomach,
      smallIntestine:
        parsed.organVisibility?.smallIntestine ?? defaults.organVisibility.smallIntestine,
      largeIntestine:
        parsed.organVisibility?.largeIntestine ?? defaults.organVisibility.largeIntestine,
    };

    const texts: TextOverlayItem[] =
      Array.isArray(parsed.texts) && parsed.texts.length > 0
        ? parsed.texts.map((item, idx) => {
            const fallback = defaults.texts[idx] ?? defaults.texts[0];
            const startTime = clampNumber(Number(item.startTime ?? fallback.startTime), 0, DEMO_DURATION);
            const endTime = clampNumber(
              Number(item.endTime ?? fallback.endTime),
              startTime + 0.2,
              DEMO_DURATION,
            );
            return {
              id: typeof item.id === 'string' ? item.id : fallback.id,
              role: item.role === 'title' ? 'title' : 'caption',
              label: typeof item.label === 'string' ? item.label : fallback.label,
              text: typeof item.text === 'string' ? item.text : fallback.text,
              startTime,
              endTime,
              position:
                item.position === 'top' ||
                item.position === 'bottom' ||
                item.position === 'center-top'
                  ? item.position
                  : fallback.position,
            };
          })
        : defaults.texts;

    return {
      ...defaults,
      demoTitle:
        typeof parsed.demoTitle === 'string' && parsed.demoTitle.trim().length > 0
          ? parsed.demoTitle
          : defaults.demoTitle,
      playbackSpeed: PLAYBACK_SPEEDS.includes(Number(parsed.playbackSpeed))
        ? Number(parsed.playbackSpeed)
        : defaults.playbackSpeed,
      backgroundColor:
        typeof parsed.backgroundColor === 'string' && /^#[0-9a-fA-F]{6}$/.test(parsed.backgroundColor)
          ? parsed.backgroundColor
          : defaults.backgroundColor,
      aspectMode: parsed.aspectMode === 'free' ? 'free' : '9:16',
      characterRotationDeg: clampNumber(Number(parsed.characterRotationDeg ?? 0), -180, 180),
      cameraMode:
        parsed.cameraMode === 'auto' ||
        parsed.cameraMode === 'cameraA' ||
        parsed.cameraMode === 'cameraB' ||
        parsed.cameraMode === 'cameraC'
          ? parsed.cameraMode
          : 'auto',
      manualLayerMode:
        parsed.manualLayerMode === 1 ||
        parsed.manualLayerMode === 2 ||
        parsed.manualLayerMode === 3 ||
        parsed.manualLayerMode === 4
          ? parsed.manualLayerMode
          : null,
      manualBodyOpacity:
        typeof parsed.manualBodyOpacity === 'number'
          ? clampNumber(parsed.manualBodyOpacity, 0, 1)
          : null,
      selectedOrgan:
        parsed.selectedOrgan && parsed.selectedOrgan in defaults.organVisibility
          ? parsed.selectedOrgan
          : null,
      organVisibility,
      showIndicators:
        typeof parsed.showIndicators === 'boolean' ? parsed.showIndicators : true,
      showParticles:
        typeof parsed.showParticles === 'boolean' ? parsed.showParticles : true,
      texts,
    };
  } catch {
    return defaults;
  }
}

export function saveStudioSettings(
  settings: StudioSettings,
  storage?: Pick<Storage, 'setItem'>,
): void {
  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return;
  try {
    store.setItem(STUDIO_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota or private-mode errors gracefully
  }
}

export function clearStudioSettings(storage?: Pick<Storage, 'removeItem'>): void {
  const store = storage ?? (typeof window !== 'undefined' ? window.localStorage : undefined);
  if (!store) return;
  try {
    store.removeItem(STUDIO_STORAGE_KEY);
  } catch {
    // Ignore errors
  }
}

export function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}
