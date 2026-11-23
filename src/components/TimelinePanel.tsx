/**
 * TimelinePanel: Interactive animation timeline pinned below the 3D viewport.
 * Features Play/Pause, Reset, tabular current/total timecode, speed selector,
 * pointer-draggable scrubber bar (mouse & touch), and clickable Scene 1-4 markers.
 */

import React, { useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { DEMO_SCENES, PLAYBACK_SPEEDS } from '../systems/SceneManager';
import { formatTimecode } from '../systems/AnimationTimeline';

interface TimelinePanelProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  playbackSpeed: number;
  activeSceneIndex: number;
  onTogglePlay: () => void;
  onReset: () => void;
  onSeek: (time: number) => void;
  onChangeSpeed: (speed: number) => void;
}

export const TimelinePanel: React.FC<TimelinePanelProps> = ({
  currentTime,
  duration,
  isPlaying,
  playbackSpeed,
  activeSceneIndex,
  onTogglePlay,
  onReset,
  onSeek,
  onChangeSpeed,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);

  const computeTimeFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return currentTime;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return currentTime;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Number((ratio * duration).toFixed(2));
    },
    [currentTime, duration],
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    onSeek(computeTimeFromClientX(e.clientX));
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    onSeek(computeTimeFromClientX(e.clientX));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <section
      aria-label="Línea de tiempo"
      className="bg-[#131620] border-t border-[#222736] px-3 sm:px-5 py-2.5 sm:py-3 shrink-0 select-none"
    >
      {/* Transport Row */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePlay}
            aria-label={isPlaying ? 'Pausar animación' : 'Reproducir animación'}
            className="inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-[#081018] font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Reproducir</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onReset}
            aria-label="Reiniciar línea de tiempo"
            title="Reiniciar al segundo 0"
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-[#1c202e] hover:bg-[#252b3d] border border-[#2a3042] text-slate-300 hover:text-white transition-colors shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Tabular Current / Total Timecode */}
          <div
            data-testid="timeline-timecode"
            className="flex items-center gap-1.5 pl-1 font-mono-tabular text-xs sm:text-sm"
          >
            <span className="text-white font-semibold">{formatTimecode(currentTime)}</span>
            <span className="text-slate-500">/</span>
            <span className="text-slate-400">{formatTimecode(duration)}</span>
          </div>
        </div>

        {/* Scene Indicator & Speed Selector */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            <span>Escena {activeSceneIndex} de 4</span>
          </div>

          <div className="flex items-center gap-1">
            <label htmlFor="timeline-speed" className="sr-only">
              Velocidad de reproducción
            </label>
            <select
              id="timeline-speed"
              value={playbackSpeed}
              onChange={(e) => onChangeSpeed(Number(e.target.value))}
              className="h-8 rounded-md bg-[#1b1f2c] border border-[#2a3042] px-2 font-mono-tabular text-xs text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
            >
              {PLAYBACK_SPEEDS.map((spd) => (
                <option key={spd} value={spd}>
                  {spd}x
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Scene Start Markers Row */}
      <div className="relative flex items-center h-6 mb-1.5 gap-1">
        {DEMO_SCENES.map((scene) => {
          const widthPct = ((scene.endTime - scene.startTime) / duration) * 100;
          const isActive = activeSceneIndex === scene.index;
          return (
            <button
              key={scene.id}
              type="button"
              onClick={() => onSeek(scene.startTime)}
              style={{ width: `${widthPct}%` }}
              className={`h-full px-2 rounded text-left text-[11px] font-medium truncate transition-colors border cursor-pointer ${
                isActive
                  ? 'bg-[#1e273c] border-sky-500/50 text-white'
                  : 'bg-[#181c27] border-[#252b3b] text-slate-400 hover:text-slate-200 hover:bg-[#1d2232]'
              }`}
              title={`Ir a ${scene.title} (${scene.startTime}s)`}
            >
              <span className="font-mono-tabular text-[10px] text-slate-500 mr-1.5">
                {scene.startTime}s
              </span>
              <span className="hidden sm:inline">Esc. {scene.index}</span>
              <span className="sm:hidden">E{scene.index}</span>
            </button>
          );
        })}
      </div>

      {/* Interactive Draggable Scrubber Track */}
      <div className="relative flex items-center h-7">
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative w-full h-7 flex items-center cursor-pointer touch-none"
        >
          {/* Base rail */}
          <div className="w-full h-2 rounded-full bg-[#212636] overflow-hidden relative">
            {/* Progress fill */}
            <div
              className="h-full bg-sky-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Scene boundary tick marks */}
          {DEMO_SCENES.map((scene) => {
            const leftPct = (scene.startTime / duration) * 100;
            return (
              <div
                key={`tick-${scene.id}`}
                style={{ left: `${leftPct}%` }}
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 w-0.5 h-3.5 bg-slate-400/60"
                aria-hidden="true"
              />
            );
          })}

          {/* Playhead thumb */}
          <div
            style={{ left: `${progressPct}%` }}
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-white border-2 border-sky-500 shadow"
            aria-hidden="true"
          />
        </div>

        {/* Screen-reader & keyboard accessible range input overlaid cleanly */}
        <input
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={currentTime}
          onChange={(e) => onSeek(Number(e.target.value))}
          aria-label="Posición de la línea de tiempo en segundos"
          className="sr-only"
        />
      </div>
    </section>
  );
};
