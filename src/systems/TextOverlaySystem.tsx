/**
 * TextOverlaySystem: Renders animated educational titles and explanatory captions
 * cleanly layered over the 3D viewport, strictly synchronized to AnimationTimeline.
 * Uses compositor-only CSS transforms/opacity (no backdrop-blur over WebGL).
 */

import React from 'react';
import { EvaluatedTextOverlay } from './AnimationTimeline';
import { SceneSegment } from './SceneManager';

interface TextOverlaySystemProps {
  activeTexts: EvaluatedTextOverlay[];
  activeScene: SceneSegment;
  isVerticalPreview: boolean;
}

export const TextOverlaySystem: React.FC<TextOverlaySystemProps> = ({
  activeTexts,
  activeScene,
  isVerticalPreview,
}) => {
  const visibleTexts = activeTexts.filter((t) => t.visible);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-5 select-none"
      aria-live="polite"
    >
      {/* Top zone: Opening Title or Top Educational Banner */}
      <div className="flex flex-col items-center gap-2 pt-1">
        {visibleTexts
          .filter((t) => t.item.position === 'top' || t.item.position === 'center-top')
          .map((t) => (
            <div
              key={t.item.id}
              data-testid={`overlay-${t.item.id}`}
              style={{
                opacity: t.opacity,
                transform: `translate3d(0, ${t.translateY.toFixed(1)}px, 0)`,
              }}
              className="max-w-[92%] rounded-2xl bg-[#111520]/90 px-4 py-3 text-center shadow-lg border border-white/10"
            >
              <h2
                className={`font-display font-bold tracking-tight text-white text-balance leading-tight ${
                  isVerticalPreview
                    ? 'text-base sm:text-lg'
                    : 'text-lg sm:text-2xl'
                }`}
              >
                {t.displayText}
              </h2>
            </div>
          ))}
      </div>

      {/* Bottom zone: Explanatory Captions */}
      <div className="flex flex-col items-center gap-2 pb-1">
        {visibleTexts
          .filter((t) => t.item.position === 'bottom')
          .map((t) => (
            <div
              key={t.item.id}
              data-testid={`overlay-${t.item.id}`}
              style={{
                opacity: t.opacity,
                transform: `translate3d(0, ${t.translateY.toFixed(1)}px, 0)`,
              }}
              className="max-w-[94%] rounded-xl bg-[#111520]/92 px-4 py-2.5 text-center shadow-lg border border-white/10"
            >
              <p
                className={`font-medium text-slate-50 leading-snug text-balance ${
                  isVerticalPreview ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
                }`}
              >
                {t.displayText}
              </p>
            </div>
          ))}

        {/* Subtle scene cue label when in 9:16 preview */}
        <div className="text-[11px] font-medium text-slate-700/75 bg-white/80 px-2.5 py-0.5 rounded-md border border-slate-900/10">
          {activeScene.title}
        </div>
      </div>
    </div>
  );
};
