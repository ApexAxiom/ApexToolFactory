import { useCallback, useEffect, useRef, useState } from 'react';

import type { FrameMetadata } from '../components/CameraView';
import type { OcrResult, RecognizedWord } from '../lib/types';

type WorkerStatus = 'loading' | 'ready' | 'error';

interface UseOcrWorkerOptions {
  readonly language: string;
  readonly minConfidence?: number;
  readonly tileSize?: number;
}

interface UseOcrWorkerResult {
  readonly words: RecognizedWord[];
  readonly fullText: string;
  readonly status: WorkerStatus;
  readonly error: string | null;
  readonly processFrame: (frame: ImageBitmap, metadata: FrameMetadata) => Promise<void>;
  readonly clear: () => void;
}

interface WorkerResultMessage {
  readonly type: 'RESULT';
  readonly payload: OcrResult;
}

interface WorkerReadyMessage {
  readonly type: 'READY';
}

interface WorkerErrorMessage {
  readonly type: 'ERROR';
  readonly error: string;
}

type WorkerInboundMessage = WorkerReadyMessage | WorkerResultMessage | WorkerErrorMessage;

const DISPATCH_INTERVAL_MS = 480;

function createWorkerInstance(): Worker {
  return new Worker(new URL('../lib/ocr/worker.ts', import.meta.url), {
    type: 'module'
  });
}

/**
 * Connects React components to the background OCR worker with smart throttling.
 *
 * @param {UseOcrWorkerOptions} options Worker configuration such as language.
 * @returns {UseOcrWorkerResult} OCR results, status flags, and submission helper.
 * @example
 * ```tsx
 * const { processFrame, words } = useOcrWorker({ language: 'eng' });
 * ```
 */
export default function useOcrWorker({
  language,
  minConfidence,
  tileSize
}: UseOcrWorkerOptions): UseOcrWorkerResult {
  const workerRef = useRef<Worker | null>(null);
  const statusRef = useRef<WorkerStatus>('loading');
  const [status, setStatus] = useState<WorkerStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [words, setWords] = useState<RecognizedWord[]>([]);
  const [fullText, setFullText] = useState('');
  const busyRef = useRef<boolean>(false);
  const lastDispatchRef = useRef<number>(0);

  useEffect(() => {
    statusRef.current = 'loading';
    setStatus('loading');
    setError(null);
    busyRef.current = false;
    lastDispatchRef.current = 0;

    const worker = createWorkerInstance();
    workerRef.current = worker;

    const handleMessage = (event: MessageEvent<WorkerInboundMessage>) => {
      const message = event.data;
      switch (message.type) {
        case 'READY':
          statusRef.current = 'ready';
          setStatus('ready');
          setError(null);
          break;
        case 'RESULT':
          statusRef.current = 'ready';
          busyRef.current = false;
          setStatus('ready');
          setWords(message.payload.words);
          setFullText(message.payload.fullText);
          break;
        case 'ERROR':
          statusRef.current = 'error';
          busyRef.current = false;
          setStatus('error');
          setError(message.error);
          break;
        default:
          break;
      }
    };

    worker.addEventListener('message', handleMessage as EventListener);

    const initPayload = {
      type: 'INIT',
      language,
      ...(typeof tileSize === 'number' ? { tileSize } : {}),
      ...(typeof minConfidence === 'number' ? { minConfidence } : {})
    } satisfies {
      readonly type: 'INIT';
      readonly language: string;
      readonly tileSize?: number;
      readonly minConfidence?: number;
    };

    worker.postMessage(initPayload);

    return () => {
      worker.removeEventListener('message', handleMessage as EventListener);
      worker.terminate();
      workerRef.current = null;
    };
  }, [language, minConfidence, tileSize]);

  const processFrame = useCallback(
    async (frame: ImageBitmap, metadata: FrameMetadata) => {
      const worker = workerRef.current;
      if (!worker || statusRef.current !== 'ready') {
        frame.close();
        return;
      }

      const now = performance.now();
      if (busyRef.current || now - lastDispatchRef.current < DISPATCH_INTERVAL_MS) {
        frame.close();
        return;
      }

      busyRef.current = true;
      lastDispatchRef.current = now;

      const payload = {
        type: 'PROCESS_FRAME' as const,
        bitmap: frame,
        width: metadata.width,
        height: metadata.height,
        timestamp: metadata.timestamp
      };

      worker.postMessage(payload, [frame]);
    },
    []
  );

  return {
    words,
    fullText,
    status,
    error,
    processFrame,
    clear: () => {
      setWords([]);
      setFullText('');
    }
  };
}
