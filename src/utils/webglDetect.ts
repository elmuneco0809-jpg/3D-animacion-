/**
 * WebGL hardware vs software renderer detection and mobile performance profile.
 * Ensures smooth 30fps+ operation on iPhone 11 Safari and non-blocking
 * frame pacing on software WebGL (SwiftShader/llvmpipe).
 */

export interface RenderProfile {
  isSoftwareGl: boolean;
  isMobile: boolean;
  maxDpr: number;
  enableShadows: boolean;
  enableAntialias: boolean;
  rendererName: string;
  webglSupported: boolean;
}

let cachedProfile: RenderProfile | null = null;

export function detectRenderProfile(): RenderProfile {
  if (cachedProfile) return cachedProfile;

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      isSoftwareGl: false,
      isMobile: false,
      maxDpr: 1,
      enableShadows: true,
      enableAntialias: true,
      rendererName: 'SSR',
      webglSupported: false,
    };
  }

  let isSoftwareGl = false;
  let rendererName = 'Unknown';
  let webglSupported = false;

  try {
    const canvas = document.createElement('canvas');
    const gl =
      (canvas.getContext('webgl2') as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl') as WebGLRenderingContext | null);

    if (gl) {
      webglSupported = true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      rendererName = String(gl.getParameter(param) || 'WebGL');
      isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(
        rendererName,
      );
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    } else {
      isSoftwareGl = true;
      webglSupported = false;
    }
  } catch {
    isSoftwareGl = true;
    webglSupported = false;
  }

  const isMobile =
    typeof navigator !== 'undefined' &&
    (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
      window.innerWidth < 768);

  const dpr = window.devicePixelRatio || 1;
  // Cap DPR at 1 on software WebGL, 1.5 on mobile (iPhone 11 Safari friendly), and 2 on desktop GPUs
  const maxDpr = isSoftwareGl ? 1 : isMobile ? Math.min(dpr, 1.5) : Math.min(dpr, 2);

  cachedProfile = {
    isSoftwareGl,
    isMobile,
    maxDpr,
    enableShadows: !isSoftwareGl,
    enableAntialias: !isSoftwareGl,
    rendererName,
    webglSupported,
  };

  return cachedProfile;
}
