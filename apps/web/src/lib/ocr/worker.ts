/// <reference lib="webworker" />

import type { NormalizedBoundingBox, OcrResult, RecognizedWord } from '../types';
import { createTiles, type Tile } from './tiler';

type TesseractBoundingBox = {
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
};

type TesseractWord = {
  readonly text: string;
  readonly confidence?: number;
  readonly bbox?: TesseractBoundingBox;
};

type TesseractRecognizeResult = {
  readonly data: {
    readonly text: string;
    readonly words: readonly TesseractWord[];
  };
};

type TesseractWorker = {
  loadLanguage(language: string): Promise<void>;
  initialize(language: string): Promise<void>;
  reinitialize?(language: string): Promise<void>;
  setParameters(parameters: Record<string, string | number>): Promise<void>;
  recognize(
    image: ImageBitmap,
    options?: {
      readonly rectangle?: {
        readonly left: number;
        readonly top: number;
        readonly width: number;
        readonly height: number;
      };
    }
  ): Promise<TesseractRecognizeResult>;
  terminate(): Promise<void>;
};

type TesseractModule = {
  readonly createWorker: (config?: { readonly logger?: (message: unknown) => void }) => Promise<TesseractWorker>;
  readonly PSM?: Record<string, number>;
};

type InitMessage = {
  readonly type: 'INIT';
  readonly language?: string;
  readonly tileSize?: number;
  readonly minConfidence?: number;
};

type ProcessFrameMessage = {
  readonly type: 'PROCESS_FRAME';
  readonly bitmap: ImageBitmap;
  readonly width: number;
  readonly height: number;
  readonly timestamp: number;
};

type IncomingMessage = InitMessage | ProcessFrameMessage;

type ReadyMessage = { readonly type: 'READY' };
type ErrorMessage = { readonly type: 'ERROR'; readonly error: string };
type ResultMessage = { readonly type: 'RESULT'; readonly payload: OcrResult };
const workerScope = self as unknown as DedicatedWorkerGlobalScope;

interface WorkerConfig {
  language: string;
  tileSize: number;
  minConfidence: number;
}

const config: WorkerConfig = {
  language: 'eng',
  tileSize: 384,
  minConfidence: 0.6
};

let engine: TesseractWorker | null = null;
let currentLanguage: string | null = null;
const loadedLanguages = new Set<string>();
let moduleCache: Promise<TesseractModule> | null = null;

async function loadTesseractModule(): Promise<TesseractModule> {
  if (moduleCache) {
    return moduleCache;
  }

  moduleCache = new Promise<TesseractModule>((resolve, reject) => {
    try {
      if (typeof (workerScope as { Tesseract?: TesseractModule }).Tesseract === 'undefined') {
        importScripts('https://cdn.jsdelivr.net/npm/tesseract.js@4.1.1/dist/tesseract.min.js');
      }

      const module = (workerScope as { Tesseract?: TesseractModule }).Tesseract;
      if (!module) {
        moduleCache = null;
        reject(new Error('Unable to load Tesseract runtime.'));
        return;
      }

      resolve(module);
    } catch (error) {
      moduleCache = null;
      reject(error as Error);
    }
  });

  return moduleCache;
}

async function ensureEngine(): Promise<TesseractWorker> {
  const module = await loadTesseractModule();

  if (!engine) {
    engine = await module.createWorker({ logger: () => undefined });
  }

  if (!loadedLanguages.has(config.language)) {
    await engine.loadLanguage(config.language);
    loadedLanguages.add(config.language);
  }

  if (currentLanguage === null) {
    await engine.initialize(config.language);
    currentLanguage = config.language;
  } else if (currentLanguage !== config.language) {
    if (typeof engine.reinitialize === 'function') {
      await engine.reinitialize(config.language);
    } else {
      await engine.initialize(config.language);
    }
    currentLanguage = config.language;
  }

  const sparseMode = module.PSM?.SPARSE_TEXT ?? 11;

  await engine.setParameters({
    tessedit_pageseg_mode: String(sparseMode),
    preserve_interword_spaces: '1'
  });

  return engine;
}

function normaliseBox(
  tile: Tile,
  bbox: { readonly x0: number; readonly x1: number; readonly y0: number; readonly y1: number },
  frameWidth: number,
  frameHeight: number
): NormalizedBoundingBox {
  const width = Math.max(0, bbox.x1 - bbox.x0);
  const height = Math.max(0, bbox.y1 - bbox.y0);

  return {
    x: (tile.x + bbox.x0) / frameWidth,
    y: (tile.y + bbox.y0) / frameHeight,
    width: width / frameWidth,
    height: height / frameHeight
  };
}

function buildResult(
  words: Map<string, RecognizedWord>,
  textSegments: string[],
  duration: number,
  timestamp: number
): OcrResult {
  const orderedWords = Array.from(words.values()).sort((a, b) => {
    if (a.box.y === b.box.y) {
      return a.box.x - b.box.x;
    }

    return a.box.y - b.box.y;
  });

  const fullText = textSegments
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .join(' ')
    .replace(/\s+/gu, ' ')
    .trim();

  return {
    words: orderedWords,
    fullText,
    duration,
    timestamp
  };
}

async function handleFrame(message: ProcessFrameMessage): Promise<void> {
  const start = performance.now();
  const { bitmap, width, height, timestamp } = message;
  const deduped = new Map<string, RecognizedWord>();
  const segments: string[] = [];

  try {
    const tesseract = await ensureEngine();
    const tiles = createTiles(width, height, { tileSize: config.tileSize });

    for (const tile of tiles) {
      const { data } = await tesseract.recognize(bitmap, {
        rectangle: {
          left: tile.x,
          top: tile.y,
          width: tile.width,
          height: tile.height
        }
      });

      if (data.text) {
        segments.push(data.text);
      }

      for (const word of data.words) {
        const text = word.text?.trim();
        if (!text) {
          continue;
        }

        const confidence = (word.confidence ?? 0) / 100;
        if (confidence < config.minConfidence) {
          continue;
        }

        const bbox = word.bbox;
        if (!bbox) {
          continue;
        }

        const box = normaliseBox(tile, bbox, width, height);
        if (box.width <= 0 || box.height <= 0) {
          continue;
        }

        const area = box.width * box.height;
        if (area < 0.00005) {
          continue;
        }

        const key = `${text.toLowerCase()}-${Math.round(box.x * 1000)}-${Math.round(
          box.y * 1000
        )}`;
        const existing = deduped.get(key);
        if (!existing || confidence > existing.confidence) {
          deduped.set(key, { text, confidence, box });
        }
      }
    }

    const payload = buildResult(deduped, segments, performance.now() - start, timestamp);
    const response: ResultMessage = { type: 'RESULT', payload };
    workerScope.postMessage(response);
  } catch (error) {
    const messageText =
      error instanceof Error ? error.message : 'Unable to process OCR frame.';
    const response: ErrorMessage = { type: 'ERROR', error: messageText };
    workerScope.postMessage(response);
  } finally {
    bitmap.close();
  }
}

workerScope.addEventListener('message', (event: MessageEvent<IncomingMessage>) => {
  const message = event.data;

  if (message.type === 'INIT') {
    if (message.language) {
      config.language = message.language;
    }

    if (typeof message.tileSize === 'number' && Number.isFinite(message.tileSize)) {
      config.tileSize = Math.max(128, Math.floor(message.tileSize));
    }

    if (
      typeof message.minConfidence === 'number' &&
      message.minConfidence > 0 &&
      message.minConfidence < 1
    ) {
      config.minConfidence = message.minConfidence;
    }

    void ensureEngine()
      .then(() => {
        const response: ReadyMessage = { type: 'READY' };
        workerScope.postMessage(response);
      })
      .catch((error: unknown) => {
        const messageText =
          error instanceof Error ? error.message : 'Failed to initialise OCR engine.';
        const response: ErrorMessage = { type: 'ERROR', error: messageText };
        workerScope.postMessage(response);
      });

    return;
  }

  if (message.type === 'PROCESS_FRAME') {
    void handleFrame(message);
  }
});

export {};
