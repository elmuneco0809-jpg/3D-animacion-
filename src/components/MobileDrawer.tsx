/**
 * MobileDrawer: Collapsible bottom tab panel for smartphones (including iPhone 11).
 * Collapsed by default so the 3D viewport remains unobstructed and touch-interactive;
 * tapping any studio tab smoothly opens a bounded sheet without covering the entire stage.
 */

import React, { useState } from 'react';
import {
  Clapperboard,
  HeartPulse,
  Layers,
  Video,
  Type,
  Sliders,
  ChevronDown,
} from 'lucide-react';
import {
  AnatomyLayerMode,
  CameraPresetId,
  OrganId,
  StudioSettings,
} from '../systems/SceneManager';
import { LeftPanel, LeftTabId } from './LeftPanel';
import { RightPanel, RightTabId } from './RightPanel';

type MobileTabId =
  | 'scenes'
  | 'anatomy'
  | 'layers'
  | 'cameras'
  | 'texts'
  | 'properties';

interface MobileDrawerProps {
  settings: StudioSettings;
  activeSceneIndex: number;
  effectiveLayer: AnatomyLayerMode;
  effectiveTorsoOpacity: number;
  highlightedOrgan: OrganId | null;
  onJumpToScene: (startTime: number) => void;
  onToggleOrgan: (organId: OrganId) => void;
  onSelectOrgan: (organId: OrganId | null) => void;
  onChangeCharacterRotation: (deg: number) => void;
  onUpdateSettings: (updater: (prev: StudioSettings) => StudioSettings) => void;
  onSelectCameraMode: (mode: CameraPresetId) => void;
  onResetCamera: () => void;
  onResetAll: () => void;
}

const MOBILE_TABS: { id: MobileTabId; label: string; icon: React.ReactNode }[] = [
  { id: 'scenes', label: 'Escenas', icon: <Clapperboard className="w-4 h-4" /> },
  { id: 'anatomy', label: 'Órganos', icon: <HeartPulse className="w-4 h-4" /> },
  { id: 'layers', label: 'Capas', icon: <Layers className="w-4 h-4" /> },
  { id: 'cameras', label: 'Cámara', icon: <Video className="w-4 h-4" /> },
  { id: 'texts', label: 'Textos', icon: <Type className="w-4 h-4" /> },
  { id: 'properties', label: 'Ajustes', icon: <Sliders className="w-4 h-4" /> },
];

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  settings,
  activeSceneIndex,
  effectiveLayer,
  effectiveTorsoOpacity,
  highlightedOrgan,
  onJumpToScene,
  onToggleOrgan,
  onSelectOrgan,
  onChangeCharacterRotation,
  onUpdateSettings,
  onSelectCameraMode,
  onResetCamera,
  onResetAll,
}) => {
  const [openTab, setOpenTab] = useState<MobileTabId | null>(null);

  const toggleTab = (id: MobileTabId) => {
    setOpenTab((prev) => (prev === id ? null : id));
  };

  const isLeftTab = openTab === 'scenes' || openTab === 'anatomy';
  const isRightTab =
    openTab === 'layers' ||
    openTab === 'cameras' ||
    openTab === 'texts' ||
    openTab === 'properties';

  return (
    <div className="lg:hidden bg-[#12151e] border-t border-[#222736] shrink-0">
      {/* Expandable Panel Sheet */}
      {openTab !== null && (
        <div className="max-h-[44vh] flex flex-col border-b border-[#222736] bg-[#141721]">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#222736] bg-[#171b27]">
            <span className="font-display text-xs font-semibold text-slate-200">
              {MOBILE_TABS.find((t) => t.id === openTab)?.label}
            </span>
            <button
              type="button"
              onClick={() => setOpenTab(null)}
              aria-label="Contraer panel de herramientas"
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs text-slate-300 hover:text-white cursor-pointer"
            >
              <span>Ocultar</span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {isLeftTab && (
              <LeftPanel
                activeTab={openTab as LeftTabId}
                onTabChange={(t) => {
                  if (t === 'characters') {
                    setOpenTab('anatomy');
                  } else {
                    setOpenTab(t);
                  }
                }}
                settings={settings}
                activeSceneIndex={activeSceneIndex}
                highlightedOrgan={highlightedOrgan}
                onJumpToScene={onJumpToScene}
                onToggleOrgan={onToggleOrgan}
                onSelectOrgan={onSelectOrgan}
                onChangeCharacterRotation={onChangeCharacterRotation}
              />
            )}

            {isRightTab && (
              <RightPanel
                activeTab={openTab as RightTabId}
                onTabChange={(t) => setOpenTab(t)}
                settings={settings}
                effectiveLayer={effectiveLayer}
                effectiveTorsoOpacity={effectiveTorsoOpacity}
                onUpdateSettings={onUpdateSettings}
                onSelectCameraMode={onSelectCameraMode}
                onResetCamera={onResetCamera}
                onResetAll={onResetAll}
              />
            )}
          </div>
        </div>
      )}

      {/* Compact Horizontal Tab Strip (height ~52px, <= 10% of mobile viewport) */}
      <nav
        aria-label="Herramientas móviles"
        className="grid grid-cols-6 gap-0.5 px-1.5 py-1.5"
      >
        {MOBILE_TABS.map((tab) => {
          const active = openTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => toggleTab(tab.id)}
              aria-expanded={active}
              className={`flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer ${
                active
                  ? 'bg-sky-500/15 text-sky-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              <span className="truncate max-w-full">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
