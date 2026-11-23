/**
 * ExportModal: Honest, real export workflow for ANIMA 3D STUDIO v0.1.
 * - Real PNG capture (1080x1920 9:16 vertical reference or current viewport, with composited texts)
 * - Real MediaRecorder capability detection & experimental canvas video recording
 *   (clearly reports detected MIME types or browser limitations without fake MP4 promises)
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Camera, Film, Download, Square, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  ActiveVideoRecording,
  captureFrameAsPng,
  detectVideoExportCapability,
  startCanvasVideoRecording,
} from '../systems/ExportSystem';
import { EvaluatedTextOverlay } from '../systems/AnimationTimeline';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  activeTexts: EvaluatedTextOverlay[];
  isVerticalPreview: boolean;
  onStartFullDemoPlayback: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  canvasRef,
  activeTexts,
  isVerticalPreview,
  onStartFullDemoPlayback,
}) => {
  const capability = useMemo(() => detectVideoExportCapability(), []);
  const [includeTexts, setIncludeTexts] = useState(true);
  const [export1080p, setExport1080p] = useState(true);
  const [pngStatus, setPngStatus] = useState<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [recordedVideo, setRecordedVideo] = useState<{
    url: string;
    filename: string;
    sizeKb: number;
    mimeType: string;
  } | null>(null);

  const recorderRef = useRef<ActiveVideoRecording | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (recorderRef.current) recorderRef.current.stop();
      if (recordedVideo?.url) URL.revokeObjectURL(recordedVideo.url);
    };
  }, [recordedVideo]);

  if (!isOpen) return null;

  const handleCapturePng = () => {
    const canvas = canvasRef.current;
    if (!canvas) {
      setPngStatus('No se encontró el lienzo 3D activo.');
      return;
    }
    const useVerticalRef = export1080p && isVerticalPreview;
    const ok = captureFrameAsPng(canvas, activeTexts, {
      targetWidth: useVerticalRef ? 1080 : canvas.width,
      targetHeight: useVerticalRef ? 1920 : canvas.height,
      includeTexts,
      filename: `anima3d-captura-${Date.now()}.png`,
    });
    setPngStatus(
      ok
        ? `Captura PNG guardada (${useVerticalRef ? '1080 × 1920' : `${canvas.width} × ${canvas.height}`}).`
        : 'No se pudo generar la captura PNG.',
    );
  };

  const handleStartRecording = () => {
    setRecordError(null);
    if (!capability.supported || !capability.preferredMimeType || !capability.preferredExtension) {
      setRecordError(capability.reasonIfUnsupported ?? 'Grabación no disponible.');
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) {
      setRecordError('El visor 3D no está inicializado.');
      return;
    }

    if (recordedVideo?.url) {
      URL.revokeObjectURL(recordedVideo.url);
      setRecordedVideo(null);
    }

    onStartFullDemoPlayback();
    setRecordingSeconds(0);

    const activeRec = startCanvasVideoRecording(
      canvas,
      capability.preferredMimeType,
      capability.preferredExtension,
      (url, filename, sizeBytes) => {
        setIsRecording(false);
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setRecordedVideo({
          url,
          filename,
          sizeKb: Math.max(1, Math.round(sizeBytes / 1024)),
          mimeType: capability.preferredMimeType ?? 'video/webm',
        });
      },
      (msg) => {
        setIsRecording(false);
        if (timerRef.current) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setRecordError(msg);
      },
    );

    if (activeRec) {
      recorderRef.current = activeRec;
      setIsRecording(true);
      const startedAt = Date.now();
      timerRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startedAt) / 1000;
        setRecordingSeconds(elapsed);
        if (elapsed >= 20.2 && recorderRef.current) {
          recorderRef.current.stop();
          recorderRef.current = null;
        }
      }, 200);
    }
  };

  const handleStopRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.stop();
      recorderRef.current = null;
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
    >
      <div className="w-full max-w-lg rounded-xl bg-[#151822] border border-[#2a3042] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#222736]">
          <h2 id="export-modal-title" className="font-display font-bold text-base text-white">
            Exportación y captura
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana de exportación"
            className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-[#222839] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[78vh] overflow-y-auto studio-scroll">
          {/* Section 1: PNG Frame Capture */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Camera className="w-4 h-4 text-sky-400" />
              <span>Captura de fotograma PNG</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Guarda el fotograma actual del visor 3D. En modo vertical 9:16 puedes escalar la salida a la resolución de referencia 1080 × 1920.
            </p>

            <div className="space-y-2 pt-1">
              <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                <span>Incluir títulos y textos educativos activos</span>
                <input
                  type="checkbox"
                  checked={includeTexts}
                  onChange={(e) => setIncludeTexts(e.target.checked)}
                  className="accent-sky-400 w-4 h-4 cursor-pointer"
                />
              </label>

              {isVerticalPreview && (
                <label className="flex items-center justify-between text-xs text-slate-300 cursor-pointer">
                  <span>Exportar a referencia vertical 1080 × 1920</span>
                  <input
                    type="checkbox"
                    checked={export1080p}
                    onChange={(e) => setExport1080p(e.target.checked)}
                    className="accent-sky-400 w-4 h-4 cursor-pointer"
                  />
                </label>
              )}
            </div>

            <button
              type="button"
              onClick={handleCapturePng}
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 text-[#081018] font-semibold text-xs transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar captura PNG</span>
            </button>

            {pngStatus && (
              <p className="flex items-center gap-1.5 text-xs text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>{pngStatus}</span>
              </p>
            )}
          </div>

          <hr className="border-[#222736]" />

          {/* Section 2: Real Experimental MediaRecorder Export */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Film className="w-4 h-4 text-sky-400" />
                <span>Grabación de video experimental</span>
              </div>
              <span className="text-[11px] font-mono-tabular text-slate-400">
                {capability.supported
                  ? capability.preferredMimeType
                  : 'No compatible'}
              </span>
            </div>

            {capability.supported ? (
              <>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Graba directamente el lienzo WebGL en tiempo real usando MediaRecorder. Al iniciar, la demostración se reproducirá desde el segundo 0 hasta completar 20s (o puedes detenerla antes).
                </p>

                <div className="text-[11px] text-slate-400">
                  Formatos detectados en este navegador:{' '}
                  <span className="font-mono-tabular text-slate-300">
                    {capability.supportedMimeTypes.join(', ')}
                  </span>
                </div>

                {!isRecording ? (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-[#202636] hover:bg-[#2a3145] border border-[#343d56] text-white font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <Film className="w-4 h-4 text-sky-400" />
                    <span>
                      Grabar demostración ({capability.preferredExtension?.toUpperCase()})
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-200 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span className="font-mono-tabular">
                      Detener grabación ({recordingSeconds.toFixed(1)}s / 20.0s)
                    </span>
                  </button>
                )}

                {recordedVideo && (
                  <div className="p-3 rounded-lg bg-[#192230] border border-emerald-500/35 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-emerald-200 truncate">
                        Video listo · {recordedVideo.filename}
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono-tabular">
                        {recordedVideo.sizeKb} KB · {recordedVideo.mimeType}
                      </p>
                    </div>
                    <a
                      href={recordedVideo.url}
                      download={recordedVideo.filename}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-[#071510] text-xs font-semibold shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Guardar</span>
                    </a>
                  </div>
                )}

                {recordError && (
                  <p className="flex items-start gap-1.5 text-xs text-rose-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{recordError}</span>
                  </p>
                )}
              </>
            ) : (
              <div className="p-3 rounded-lg bg-[#1b1f2c] border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Grabación directa no disponible en este navegador</p>
                  <p className="text-slate-300 mt-1 leading-relaxed">
                    {capability.reasonIfUnsupported} Puedes seguir usando la captura PNG de fotogramas. En futuras versiones se integrará renderizado avanzado multi-navegador.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
