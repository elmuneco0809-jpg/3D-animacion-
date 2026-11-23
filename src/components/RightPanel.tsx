/**
 * RightPanel: Inspector sidebar for Properties, Anatomical Layers,
 * Cameras (A/B/C/Auto), and Text Overlays with appearance timings.
 */

import React from 'react';
import {
  Sliders,
  Layers,
  Video,
  Type,
  RotateCcw,
} from 'lucide-react';
import {
  AnatomyLayerMode,
  BACKGROUND_PRESETS,
  CameraPresetId,
  DEMO_DURATION,
  ORGAN_DEFINITIONS,
  OrganId,
  PLAYBACK_SPEEDS,
  StudioSettings,
  TextOverlayItem,
} from '../systems/SceneManager';

export type RightTabId = 'properties' | 'layers' | 'cameras' | 'texts';

interface RightPanelProps {
  activeTab: RightTabId;
  onTabChange: (tab: RightTabId) => void;
  settings: StudioSettings;
  effectiveLayer: AnatomyLayerMode;
  effectiveTorsoOpacity: number;
  onUpdateSettings: (updater: (prev: StudioSettings) => StudioSettings) => void;
  onSelectCameraMode: (mode: CameraPresetId) => void;
  onResetCamera: () => void;
  onResetAll: () => void;
}

const LAYER_INFO: { mode: AnatomyLayerMode; title: string; desc: string }[] = [
  { mode: 1, title: 'Capa 1 · Personaje completo', desc: 'Cuerpo exterior opaco sin órganos visibles' },
  { mode: 2, title: 'Capa 2 · Torso semitransparente', desc: 'Silueta traslúcida que revela el interior' },
  { mode: 3, title: 'Capa 3 · Órganos visibles', desc: 'Máxima claridad del sistema digestivo' },
  { mode: 4, title: 'Capa 4 · Órgano resaltado', desc: 'Destaca el órgano seleccionado y atenúa el resto' },
];

const CAMERA_INFO: { id: CameraPresetId; title: string; desc: string }[] = [
  {
    id: 'auto',
    title: 'Automática (Línea de tiempo)',
    desc: 'Sigue los encuadres cinematográficos de las 4 escenas',
  },
  {
    id: 'cameraA',
    title: 'Cámara A — Cuerpo completo',
    desc: 'Muestra a Elena completa desde la cabeza hasta los pies',
  },
  {
    id: 'cameraB',
    title: 'Cámara B — Torso',
    desc: 'Acercamiento suave al torso con transparencia anatómica',
  },
  {
    id: 'cameraC',
    title: 'Cámara C — Anatomía',
    desc: 'Primer plano del sistema digestivo ocultando capas exteriores',
  },
];

export const RightPanel: React.FC<RightPanelProps> = ({
  activeTab,
  onTabChange,
  settings,
  effectiveLayer,
  effectiveTorsoOpacity,
  onUpdateSettings,
  onSelectCameraMode,
  onResetCamera,
  onResetAll,
}) => {
  const tabs: { id: RightTabId; label: string; icon: React.ReactNode }[] = [
    { id: 'layers', label: 'Capas', icon: <Layers className="w-3.5 h-3.5" /> },
    { id: 'cameras', label: 'Cámaras', icon: <Video className="w-3.5 h-3.5" /> },
    { id: 'texts', label: 'Textos', icon: <Type className="w-3.5 h-3.5" /> },
    { id: 'properties', label: 'Ajustes', icon: <Sliders className="w-3.5 h-3.5" /> },
  ];

  const handleTextChange = (
    id: string,
    patch: Partial<Pick<TextOverlayItem, 'text' | 'startTime' | 'endTime'>>,
  ) => {
    onUpdateSettings((prev) => {
      const nextTexts = prev.texts.map((item) => {
        if (item.id !== id) return item;
        const startTime =
          patch.startTime !== undefined
            ? Math.max(0, Math.min(DEMO_DURATION - 0.3, patch.startTime))
            : item.startTime;
        const endTime =
          patch.endTime !== undefined
            ? Math.max(startTime + 0.3, Math.min(DEMO_DURATION, patch.endTime))
            : Math.max(startTime + 0.3, item.endTime);
        return {
          ...item,
          text: patch.text !== undefined ? patch.text : item.text,
          startTime,
          endTime,
        };
      });
      const nextTitle =
        id === 'text-title' && patch.text !== undefined ? patch.text : prev.demoTitle;
      return {
        ...prev,
        demoTitle: nextTitle,
        texts: nextTexts,
      };
    });
  };

  const displayedOpacityPct = Math.round(
    (settings.manualBodyOpacity ?? effectiveTorsoOpacity) * 100,
  );

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#141721]">
      {/* Segmented Inspector Tabs */}
      <div className="grid grid-cols-4 gap-1 p-2 border-b border-[#222736] shrink-0" role="tablist">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col sm:flex-row items-center justify-center gap-1 py-1.5 px-1.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                active
                  ? 'bg-[#222839] text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1b202e]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Inspector Content */}
      <div className="flex-1 overflow-y-auto studio-scroll p-3.5 space-y-4">
        {activeTab === 'layers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xs font-semibold text-slate-300">
                Capas anatómicas
              </h3>
              {(settings.manualLayerMode !== null || settings.manualBodyOpacity !== null) && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      manualLayerMode: null,
                      manualBodyOpacity: null,
                    }))
                  }
                  className="text-[11px] text-sky-400 hover:text-sky-300 cursor-pointer"
                >
                  Volver a auto
                </button>
              )}
            </div>

            <div className="space-y-1.5">
              {LAYER_INFO.map((layer) => {
                const isSelected = settings.manualLayerMode === layer.mode;
                const isActive = effectiveLayer === layer.mode;
                return (
                  <button
                    key={layer.mode}
                    type="button"
                    onClick={() =>
                      onUpdateSettings((prev) => ({
                        ...prev,
                        manualLayerMode: layer.mode,
                        manualBodyOpacity: null,
                        selectedOrgan:
                          layer.mode === 4 && !prev.selectedOrgan
                            ? 'smallIntestine'
                            : prev.selectedOrgan,
                      }))
                    }
                    className={`w-full text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#1d2538] border-sky-500/60'
                        : isActive
                          ? 'bg-[#1a2130] border-sky-500/30'
                          : 'bg-[#181c28] border-[#252b3b] hover:bg-[#1c2130]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-100">
                        {layer.title}
                      </span>
                      {isActive && (
                        <span className="text-[10px] font-medium text-sky-300 shrink-0">
                          {isSelected ? 'Fija' : 'Auto'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{layer.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Body Opacity Slider */}
            <div className="pt-3 border-t border-[#222736] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="body-opacity-slider" className="text-slate-300 font-medium">
                  Opacidad del torso
                </label>
                <span className="font-mono-tabular text-slate-300">
                  {displayedOpacityPct}%
                </span>
              </div>
              <input
                id="body-opacity-slider"
                type="range"
                min={0}
                max={100}
                step={2}
                value={displayedOpacityPct}
                onChange={(e) =>
                  onUpdateSettings((prev) => ({
                    ...prev,
                    manualBodyOpacity: Number(e.target.value) / 100,
                  }))
                }
                className="w-full studio-slider"
              />
            </div>

            {/* Highlight Organ Selector */}
            <div className="pt-3 border-t border-[#222736] space-y-2">
              <label htmlFor="highlight-organ-select" className="block text-xs font-medium text-slate-300">
                Resaltar órgano específico
              </label>
              <select
                id="highlight-organ-select"
                value={settings.selectedOrgan ?? ''}
                onChange={(e) => {
                  const val = e.target.value as OrganId | '';
                  onUpdateSettings((prev) => ({
                    ...prev,
                    selectedOrgan: val === '' ? null : val,
                    manualLayerMode: val !== '' ? 4 : prev.manualLayerMode,
                  }));
                }}
                className="w-full rounded-lg bg-[#181c28] border border-[#2a3042] px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
              >
                <option value="">Automático según escena</option>
                {ORGAN_DEFINITIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {activeTab === 'cameras' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xs font-semibold text-slate-300">
                Cámaras del estudio
              </h3>
              <button
                type="button"
                onClick={onResetCamera}
                className="inline-flex items-center gap-1 text-[11px] text-sky-400 hover:text-sky-300 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Restaurar</span>
              </button>
            </div>

            <div className="space-y-2">
              {CAMERA_INFO.map((cam) => {
                const active = settings.cameraMode === cam.id;
                return (
                  <button
                    key={cam.id}
                    type="button"
                    onClick={() => onSelectCameraMode(cam.id)}
                    className={`w-full text-left p-2.5 rounded-lg border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#1d2538] border-sky-500/60'
                        : 'bg-[#181c28] border-[#252b3b] hover:bg-[#1c2130]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-100">
                        {cam.title}
                      </span>
                      {active && (
                        <span className="text-[10px] font-medium text-sky-300 shrink-0">
                          Activa
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">
                      {cam.desc}
                    </p>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-400 pt-2 border-t border-[#222736] leading-relaxed">
              Arrastra sobre el visor 3D para girar alrededor del personaje, pellizca o usa la rueda para acercar, y arrastra con clic derecho o dos dedos para desplazar lateralmente.
            </p>
          </div>
        )}

        {activeTab === 'texts' && (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="demo-title-input"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Título de la demostración
              </label>
              <input
                id="demo-title-input"
                type="text"
                value={settings.demoTitle}
                onChange={(e) => handleTextChange('text-title', { text: e.target.value })}
                className="w-full rounded-lg bg-[#181c28] border border-[#2a3042] px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="space-y-3 pt-2 border-t border-[#222736]">
              <h3 className="font-display text-xs font-semibold text-slate-300">
                Textos explicativos y tiempos
              </h3>

              {settings.texts.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-lg bg-[#181c28] border border-[#252b3b] space-y-2"
                >
                  <label
                    htmlFor={`text-edit-${item.id}`}
                    className="block text-[11px] font-semibold text-slate-300"
                  >
                    {item.label}
                  </label>
                  <textarea
                    id={`text-edit-${item.id}`}
                    rows={2}
                    value={item.id === 'text-title' ? settings.demoTitle : item.text}
                    onChange={(e) => handleTextChange(item.id, { text: e.target.value })}
                    className="w-full rounded-md bg-[#11141d] border border-[#2a3042] px-2.5 py-1.5 text-xs text-slate-100 resize-none focus:outline-none focus:border-sky-500"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label
                        htmlFor={`start-${item.id}`}
                        className="block text-[10px] text-slate-400 mb-1"
                      >
                        Inicio (s)
                      </label>
                      <input
                        id={`start-${item.id}`}
                        type="number"
                        min={0}
                        max={19.5}
                        step={0.1}
                        value={item.startTime}
                        onChange={(e) =>
                          handleTextChange(item.id, {
                            startTime: Number(e.target.value),
                          })
                        }
                        className="w-full font-mono-tabular rounded-md bg-[#11141d] border border-[#2a3042] px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor={`end-${item.id}`}
                        className="block text-[10px] text-slate-400 mb-1"
                      >
                        Fin (s)
                      </label>
                      <input
                        id={`end-${item.id}`}
                        type="number"
                        min={0.3}
                        max={20}
                        step={0.1}
                        value={item.endTime}
                        onChange={(e) =>
                          handleTextChange(item.id, {
                            endTime: Number(e.target.value),
                          })
                        }
                        className="w-full font-mono-tabular rounded-md bg-[#11141d] border border-[#2a3042] px-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'properties' && (
          <div className="space-y-4">
            {/* Background Color Picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="bg-color-input" className="text-xs font-semibold text-slate-300">
                  Color del fondo
                </label>
                <span className="font-mono-tabular text-[11px] text-slate-400 uppercase">
                  {settings.backgroundColor}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {BACKGROUND_PRESETS.map((preset) => {
                  const selected =
                    settings.backgroundColor.toLowerCase() === preset.hex.toLowerCase();
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          backgroundColor: preset.hex,
                        }))
                      }
                      aria-label={`Fondo ${preset.label}`}
                      title={preset.label}
                      className={`w-7 h-7 rounded-md border-2 transition-transform cursor-pointer ${
                        selected
                          ? 'border-sky-400 scale-105'
                          : 'border-[#333b52] hover:border-slate-400'
                      }`}
                      style={{ backgroundColor: preset.hex }}
                    />
                  );
                })}
                <input
                  id="bg-color-input"
                  type="color"
                  value={settings.backgroundColor}
                  onChange={(e) =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      backgroundColor: e.target.value,
                    }))
                  }
                  aria-label="Selector de color de fondo personalizado"
                  className="w-7 h-7 rounded-md bg-transparent border border-[#333b52] cursor-pointer"
                />
              </div>
            </div>

            {/* Playback Speed */}
            <div className="pt-3 border-t border-[#222736] space-y-2">
              <span className="block text-xs font-semibold text-slate-300">
                Velocidad de reproducción
              </span>
              <div className="grid grid-cols-5 gap-1">
                {PLAYBACK_SPEEDS.map((spd) => {
                  const active = settings.playbackSpeed === spd;
                  return (
                    <button
                      key={spd}
                      type="button"
                      onClick={() =>
                        onUpdateSettings((prev) => ({
                          ...prev,
                          playbackSpeed: spd,
                        }))
                      }
                      className={`py-1.5 rounded-md font-mono-tabular text-xs font-medium transition-colors cursor-pointer ${
                        active
                          ? 'bg-sky-500 text-[#081018] font-semibold'
                          : 'bg-[#181c28] text-slate-300 border border-[#282e3f] hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visual Effects Toggles */}
            <div className="pt-3 border-t border-[#222736] space-y-2.5">
              <span className="block text-xs font-semibold text-slate-300">
                Efectos visuales
              </span>
              <label className="flex items-center justify-between gap-2 text-xs text-slate-300 cursor-pointer">
                <span>Partículas de agua y absorción</span>
                <input
                  type="checkbox"
                  checked={settings.showParticles}
                  onChange={(e) =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      showParticles: e.target.checked,
                    }))
                  }
                  className="accent-sky-400 w-4 h-4 rounded cursor-pointer"
                />
              </label>
              <label className="flex items-center justify-between gap-2 text-xs text-slate-300 cursor-pointer">
                <span>Flechas e indicadores educativos</span>
                <input
                  type="checkbox"
                  checked={settings.showIndicators}
                  onChange={(e) =>
                    onUpdateSettings((prev) => ({
                      ...prev,
                      showIndicators: e.target.checked,
                    }))
                  }
                  className="accent-sky-400 w-4 h-4 rounded cursor-pointer"
                />
              </label>
            </div>

            {/* Reset Demo Defaults */}
            <div className="pt-4 border-t border-[#222736]">
              <button
                type="button"
                onClick={onResetAll}
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#1d2230] hover:bg-[#272e40] border border-[#30384e] text-xs font-medium text-slate-200 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer ajustes de la demo</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
