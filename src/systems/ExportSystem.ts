/**
 * ExportSystem: Real PNG frame capture (with composited educational text overlays)
 * and honest experimental canvas video recording via MediaRecorder.
 *
 * Detects real browser MIME support; never fakes MP4 generation or shows fake buttons.
 * Structured as an extensible pipeline for future server/WebCodecs export.
 */

import { EvaluatedTextOverlay } from './AnimationTimeline';

export interface MediaRecorderCapability {
  supported: boolean;
  captureStreamSupported: boolean;
  supportedMimeTypes: string[];
  preferredMimeType: string | null;
  preferredExtension: string | null;
  reasonIfUnsupported: string | null;
}

const CANDIDATE_MIME_TYPES: { mime: string; ext: string }[] = [
  { mime: 'video/webm;codecs=vp9', ext: 'webm' },
  { mime: 'video/webm;codecs=vp8', ext: 'webm' },
  { mime: 'video/webm', ext: 'webm' },
  { mime: 'video/mp4;codecs=avc1.42E01E', ext: 'mp4' },
  { mime: 'video/mp4', ext: 'mp4' },
];

export function detectVideoExportCapability(): MediaRecorderCapability {
  if (typeof window === 'undefined' || typeof HTMLCanvasElement === 'undefined') {
    return {
      supported: false,
      captureStreamSupported: false,
      supportedMimeTypes: [],
      preferredMimeType: null,
      preferredExtension: null,
      reasonIfUnsupported: 'Entorno sin navegador.',
    };
  }

  const testCanvas = document.createElement('canvas');
  const captureStreamSupported = typeof testCanvas.captureStream === 'function';
  const mediaRecorderExists = typeof window.MediaRecorder === 'function';

  if (!captureStreamSupported || !mediaRecorderExists) {
    return {
      supported: false,
      captureStreamSupported,
      supportedMimeTypes: [],
      preferredMimeType: null,
      preferredExtension: null,
      reasonIfUnsupported: !captureStreamSupported
        ? 'Este navegador no soporta canvas.captureStream() para grabar video en tiempo real.'
        : 'Este navegador no soporta MediaRecorder para grabación de video.',
    };
  }

  const supportedMimeTypes: string[] = [];
  let preferredMimeType: string | null = null;
  let preferredExtension: string | null = null;

  for (const candidate of CANDIDATE_MIME_TYPES) {
    try {
      if (MediaRecorder.isTypeSupported(candidate.mime)) {
        supportedMimeTypes.push(candidate.mime);
        if (!preferredMimeType) {
          preferredMimeType = candidate.mime;
          preferredExtension = candidate.ext;
        }
      }
    } catch {
      // Ignore probe error
    }
  }

  if (!preferredMimeType) {
    return {
      supported: false,
      captureStreamSupported: true,
      supportedMimeTypes: [],
      preferredMimeType: null,
      preferredExtension: null,
      reasonIfUnsupported:
        'MediaRecorder está disponible pero no se detectó ningún códec de video compatible (WebM/MP4) en este navegador.',
    };
  }

  return {
    supported: true,
    captureStreamSupported: true,
    supportedMimeTypes,
    preferredMimeType,
    preferredExtension,
    reasonIfUnsupported: null,
  };
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapTextLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Captures the current WebGL canvas frame and composites active educational text overlays
 * cleanly into a downloadable PNG image.
 */
export function captureFrameAsPng(
  sourceCanvas: HTMLCanvasElement,
  activeTexts: EvaluatedTextOverlay[],
  options: {
    targetWidth?: number;
    targetHeight?: number;
    filename?: string;
    includeTexts?: boolean;
  } = {},
): boolean {
  const width = options.targetWidth ?? sourceCanvas.width;
  const height = options.targetHeight ?? sourceCanvas.height;
  if (width <= 0 || height <= 0) return false;

  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const ctx = outCanvas.getContext('2d');
  if (!ctx) return false;

  // Draw source WebGL frame with cover-aspect framing so 9:16 exports stay undistorted
  const srcAspect = sourceCanvas.width / sourceCanvas.height;
  const dstAspect = width / height;
  let sx = 0;
  let sy = 0;
  let sw = sourceCanvas.width;
  let sh = sourceCanvas.height;

  if (srcAspect > dstAspect) {
    sw = sourceCanvas.height * dstAspect;
    sx = (sourceCanvas.width - sw) / 2;
  } else {
    sh = sourceCanvas.width / dstAspect;
    sy = (sourceCanvas.height - sh) / 2;
  }

  ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, width, height);

  // Composite visible educational overlays
  if (options.includeTexts !== false) {
    const visible = activeTexts.filter((t) => t.visible && t.opacity > 0.02);
    for (const overlay of visible) {
      ctx.save();
      ctx.globalAlpha = overlay.opacity;
      const isTitle = overlay.item.role === 'title';
      const fontSize = Math.round(width * (isTitle ? 0.044 : 0.032));
      ctx.font = `${isTitle ? '700' : '500'} ${fontSize}px "Plus Jakarta Sans", "DM Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const maxTextW = width * 0.8;
      const lines = wrapTextLines(ctx, overlay.displayText, maxTextW);
      const lineHeight = fontSize * 1.3;
      const boxW = Math.min(
        width * 0.88,
        Math.max(...lines.map((l) => ctx.measureText(l).width)) + fontSize * 1.8,
      );
      const boxH = lines.length * lineHeight + fontSize * 1.1;
      const boxX = (width - boxW) / 2;
      const boxY =
        overlay.item.position === 'bottom'
          ? height - boxH - height * 0.06
          : height * 0.055;

      ctx.fillStyle = 'rgba(17, 21, 32, 0.90)';
      drawRoundedRect(ctx, boxX, boxY, boxW, boxH, Math.round(fontSize * 0.55));
      ctx.fill();

      ctx.fillStyle = '#f8fafc';
      lines.forEach((line, idx) => {
        const ly = boxY + fontSize * 0.55 + lineHeight * (idx + 0.5);
        ctx.fillText(line, width / 2, ly);
      });
      ctx.restore();
    }
  }

  const dataUrl = outCanvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = options.filename ?? `anima3d-frame-${Date.now()}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}

export interface ActiveVideoRecording {
  stop: () => void;
  mimeType: string;
}

/**
 * Starts a real experimental MediaRecorder capture of the WebGL canvas.
 */
export function startCanvasVideoRecording(
  canvas: HTMLCanvasElement,
  mimeType: string,
  extension: string,
  onComplete: (blobUrl: string, filename: string, sizeBytes: number) => void,
  onError: (message: string) => void,
): ActiveVideoRecording | null {
  try {
    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 3_500_000,
    });
    const chunks: BlobPart[] = [];

    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) {
        chunks.push(ev.data);
      }
    };

    recorder.onerror = () => {
      onError('Ocurrió un error durante la grabación de video en este navegador.');
    };

    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const filename = `anima3d-video-${Date.now()}.${extension}`;
      onComplete(url, filename, blob.size);
    };

    recorder.start(250);

    return {
      mimeType,
      stop: () => {
        if (recorder.state !== 'inactive') {
          recorder.stop();
        }
      },
    };
  } catch (err) {
    onError(
      err instanceof Error
        ? err.message
        : 'No fue posible iniciar MediaRecorder en este navegador.',
    );
    return null;
  }
}
