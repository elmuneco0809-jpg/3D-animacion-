import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateTimelineFrame,
  evaluateBlinkWeight,
  formatTimecode,
  getActiveScene,
  CAMERA_PRESETS,
} from './AnimationTimeline';
import {
  createDefaultStudioSettings,
  loadStudioSettings,
  saveStudioSettings,
  clearStudioSettings,
} from './SceneManager';

test('Scene segments resolve accurately across all 4 scenes of the 20s demo', () => {
  assert.equal(getActiveScene(0).index, 1);
  assert.equal(getActiveScene(3.9).index, 1);
  assert.equal(getActiveScene(4.0).index, 2);
  assert.equal(getActiveScene(7.9).index, 2);
  assert.equal(getActiveScene(8.0).index, 3);
  assert.equal(getActiveScene(14.9).index, 3);
  assert.equal(getActiveScene(15.0).index, 4);
  assert.equal(getActiveScene(20.0).index, 4);
});

test('Scene 1 (0-4s): opaque character, profile camera, animated title visible', () => {
  const settings = createDefaultStudioSettings();
  const frame = evaluateTimelineFrame(2.0, settings);

  assert.equal(frame.activeScene.index, 1);
  assert.equal(frame.torsoOpacity, 1.0);
  assert.equal(frame.effectiveLayer, 1);
  assert.equal(frame.highlightedOrgan, null);
  assert.equal(frame.waterFlowVisibility, 0);

  const titleOverlay = frame.activeTexts.find((t) => t.item.id === 'text-title');
  assert.ok(titleOverlay?.visible);
  assert.equal(titleOverlay?.displayText, '¿Qué sucede cuando bebes agua?');
});

test('Scene 2 (4-8s): torso turns semi-transparent and esophagus is highlighted', () => {
  const settings = createDefaultStudioSettings();
  const frame = evaluateTimelineFrame(6.0, settings);

  assert.equal(frame.activeScene.index, 2);
  assert.ok(frame.torsoOpacity < 0.35, `Expected torsoOpacity < 0.35, got ${frame.torsoOpacity}`);
  assert.equal(frame.highlightedOrgan, 'esophagus');
  assert.ok(frame.waterFlowProgress > 0 && frame.waterFlowProgress < 0.35);
  assert.ok(frame.esophagusArrowAlpha > 0.5);
});

test('Scene 3 (8-15s): stomach and small intestine progression with water particles', () => {
  const settings = createDefaultStudioSettings();
  const stomachFrame = evaluateTimelineFrame(10.0, settings);
  const intestineFrame = evaluateTimelineFrame(13.5, settings);

  assert.equal(stomachFrame.activeScene.index, 3);
  assert.equal(stomachFrame.highlightedOrgan, 'stomach');
  assert.ok(stomachFrame.waterFlowVisibility > 0.8);

  assert.equal(intestineFrame.highlightedOrgan, 'smallIntestine');
  assert.ok(
    intestineFrame.waterFlowProgress > stomachFrame.waterFlowProgress,
    'Water progress must advance monotonically along the digestive tract',
  );
});

test('Scene 4 (15-20s): absorption highlights, explanatory text, and zoom-out', () => {
  const settings = createDefaultStudioSettings();
  const absorbFrame = evaluateTimelineFrame(16.5, settings);
  const endFrame = evaluateTimelineFrame(19.9, settings);

  assert.equal(absorbFrame.activeScene.index, 4);
  assert.equal(absorbFrame.highlightedOrgan, 'smallIntestine');
  assert.ok(absorbFrame.absorptionIntensity > 0.8);
  assert.ok(absorbFrame.absorptionArrowAlpha > 0.8);

  const absorptionText = absorbFrame.activeTexts.find(
    (t) => t.item.id === 'text-absorption',
  );
  assert.ok(absorptionText?.visible);
  assert.equal(
    absorptionText?.displayText,
    'Gran parte del agua se absorbe en el intestino delgado.',
  );

  // Camera zooms back out toward the end
  assert.ok(
    endFrame.cameraPose.position[2] > absorbFrame.cameraPose.position[2] + 1.0,
    'Camera should smoothly zoom out at the end of Scene 4',
  );
});

test('Manual camera preset, layer override, and custom title edit apply immediately', () => {
  const settings = createDefaultStudioSettings();
  settings.demoTitle = 'Mi animación personalizada';
  settings.cameraMode = 'cameraB';
  settings.manualLayerMode = 3;
  settings.selectedOrgan = 'stomach';

  const frame = evaluateTimelineFrame(1.5, settings);
  assert.deepEqual(frame.cameraPose, CAMERA_PRESETS.cameraB);
  assert.equal(frame.effectiveLayer, 3);
  assert.equal(frame.highlightedOrgan, 'stomach');
  assert.ok(frame.torsoOpacity <= 0.15);

  const titleOverlay = frame.activeTexts.find((t) => t.item.id === 'text-title');
  assert.equal(titleOverlay?.displayText, 'Mi animación personalizada');
});

test('Deterministic blink waveform stays bounded in [0, 1]', () => {
  for (let t = 0; t <= 20; t += 0.05) {
    const w = evaluateBlinkWeight(t);
    assert.ok(w >= 0 && w <= 1.0001, `Blink weight out of bounds at t=${t}: ${w}`);
  }
});

test('LocalStorage persistence saves, reloads, and resets cleanly', () => {
  const memory = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => {
      memory.set(k, v);
    },
    removeItem: (k: string) => {
      memory.delete(k);
    },
  };

  const settings = createDefaultStudioSettings();
  settings.demoTitle = 'Hidratación Humana';
  settings.backgroundColor = '#eef6fb';
  settings.playbackSpeed = 1.5;
  settings.organVisibility.largeIntestine = false;

  saveStudioSettings(settings, mockStorage);
  const loaded = loadStudioSettings(mockStorage);

  assert.equal(loaded.demoTitle, 'Hidratación Humana');
  assert.equal(loaded.backgroundColor, '#eef6fb');
  assert.equal(loaded.playbackSpeed, 1.5);
  assert.equal(loaded.organVisibility.largeIntestine, false);

  clearStudioSettings(mockStorage);
  const afterClear = loadStudioSettings(mockStorage);
  assert.equal(afterClear.demoTitle, '¿Qué sucede cuando bebes agua?');
});

test('Timecode formats cleanly with consistent padding', () => {
  assert.equal(formatTimecode(0), '00.0s');
  assert.equal(formatTimecode(4.25), '04.3s');
  assert.equal(formatTimecode(20), '20.0s');
});
