/**
 * LeftPanel: Studio library & scene navigation sidebar (Desktop left panel,
 * also reused inside MobileDrawer).
 * Tabs: Personajes | Anatomía | Escenas
 */

import React from 'react';
import { User, HeartPulse, Clapperboard, Eye, EyeOff } from 'lucide-react';
import {
  CHARACTERS_CATALOG,
  DEMO_SCENES,
  ORGAN_DEFINITIONS,
  OrganId,
  StudioSettings,
} from '../systems/SceneManager';

export type LeftTabId = 'characters' | 'anatomy' | 'scenes';

interface LeftPanelProps {
  activeTab: LeftTabId;
  onTabChange: (tab: LeftTabId) => void;
  settings: StudioSettings;
  activeSceneIndex: number;
  highlightedOrgan: OrganId | null;
  onJumpToScene: (startTime: number) => void;
  onToggleOrgan: (organId: OrganId) => void;
  onSelectOrgan: (organId: OrganId | null) => void;
  onChangeCharacterRotation: (deg: number) => void;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({
  activeTab,
  onTabChange,
  settings,
  activeSceneIndex,
  highlightedOrgan,
  onJumpToScene,
  onToggleOrgan,
  onSelectOrgan,
  onChangeCharacterRotation,
}) => {
  const tabs: { id: LeftTabId; label: string; icon: React.ReactNode }[] = [
    { id: 'scenes', label: 'Escenas', icon: <Clapperboard className="w-3.5 h-3.5" /> },
    { id: 'anatomy', label: 'Anatomía', icon: <HeartPulse className="w-3.5 h-3.5" /> },
    { id: 'characters', label: 'Personajes', icon: <User className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#141721]">
      {/* Segmented Panel Tabs */}
      <div className="grid grid-cols-3 gap-1 p-2 border-b border-[#222736] shrink-0" role="tablist">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
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

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto studio-scroll p-3.5 space-y-4">
        {activeTab === 'scenes' && (
          <div className="space-y-3">
            <div>
              <h3 className="font-display text-xs font-semibold text-slate-300">
                Demostración activa
              </h3>
              <p className="text-sm font-semibold text-white mt-0.5 leading-snug">
                {settings.demoTitle}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                4 escenas sincronizadas · 20.0 segundos
              </p>
            </div>

            <div className="space-y-2">
              {DEMO_SCENES.map((scene) => {
                const isCurrent = activeSceneIndex === scene.index;
                return (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => onJumpToScene(scene.startTime)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors cursor-pointer ${
                      isCurrent
                        ? 'bg-[#1d2436] border-sky-500/50 text-white'
                        : 'bg-[#181c28] border-[#252b3b] text-slate-300 hover:border-[#353d54] hover:bg-[#1c2130]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white">
                        {scene.title}
                      </span>
                      <span className="font-mono-tabular text-[11px] text-slate-400 shrink-0">
                        {scene.startTime}s–{scene.endTime}s
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {scene.subtitle}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'anatomy' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xs font-semibold text-slate-300">
                Sistema digestivo
              </h3>
              {settings.selectedOrgan && (
                <button
                  type="button"
                  onClick={() => onSelectOrgan(null)}
                  className="text-[11px] text-sky-400 hover:text-sky-300 cursor-pointer"
                >
                  Quitar resalte
                </button>
              )}
            </div>

            <div className="space-y-2">
              {ORGAN_DEFINITIONS.map((organ) => {
                const visible = settings.organVisibility[organ.id];
                const isSelected = settings.selectedOrgan === organ.id;
                const isHighlighted = highlightedOrgan === organ.id;

                return (
                  <div
                    key={organ.id}
                    className={`p-2.5 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-[#1d2538] border-sky-500/55'
                        : isHighlighted
                          ? 'bg-[#1b2232] border-sky-500/30'
                          : 'bg-[#181c28] border-[#252b3b]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onSelectOrgan(isSelected ? null : organ.id)
                        }
                        className="flex items-center gap-2 min-w-0 text-left flex-1 cursor-pointer"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: organ.color }}
                          aria-hidden="true"
                        />
                        <span className="text-xs font-semibold text-slate-100 truncate">
                          {organ.name}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleOrgan(organ.id)}
                        aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${organ.name}`}
                        aria-pressed={visible}
                        className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                          visible
                            ? 'text-slate-200 hover:bg-[#262c3f]'
                            : 'text-slate-500 hover:text-slate-300 hover:bg-[#262c3f]'
                        }`}
                      >
                        {visible ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                      {organ.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'characters' && (
          <div className="space-y-4">
            <h3 className="font-display text-xs font-semibold text-slate-300">
              Biblioteca de personajes
            </h3>

            {CHARACTERS_CATALOG.map((char) => {
              const active = settings.activeCharacterId === char.id;
              return (
                <div
                  key={char.id}
                  className={`p-3 rounded-lg border ${
                    active
                      ? 'bg-[#1c2335] border-sky-500/50'
                      : 'bg-[#181c28] border-[#252b3b]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">
                      {char.name}
                    </span>
                    <span className="text-[11px] text-sky-300 font-medium">
                      Activo
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{char.role}</p>

                  {/* Palette preview swatches */}
                  <div className="flex items-center gap-2 mt-3">
                    {Object.entries(char.palette).map(([key, hex]) => (
                      <span
                        key={key}
                        title={key}
                        className="w-4 h-4 rounded-full border border-white/15"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Character Y Rotation Control */}
            <div className="pt-2 border-t border-[#222736] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="char-rotation-slider" className="text-slate-300 font-medium">
                  Rotación del personaje
                </label>
                <span className="font-mono-tabular text-slate-400">
                  {settings.characterRotationDeg}°
                </span>
              </div>
              <input
                id="char-rotation-slider"
                type="range"
                min={-180}
                max={180}
                step={5}
                value={settings.characterRotationDeg}
                onChange={(e) => onChangeCharacterRotation(Number(e.target.value))}
                className="w-full studio-slider"
              />
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {[
                  { label: 'Frente', deg: 0 },
                  { label: 'Perfil', deg: -75 },
                  { label: '3/4', deg: -35 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => onChangeCharacterRotation(preset.deg)}
                    className="py-1.5 px-2 text-[11px] font-medium rounded-md bg-[#1c202e] hover:bg-[#252b3d] text-slate-300 hover:text-white border border-[#2a3042] transition-colors cursor-pointer"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
