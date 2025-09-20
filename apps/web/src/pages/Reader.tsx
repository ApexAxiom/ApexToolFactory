import React, { useCallback, useMemo, useRef, useState } from 'react';

import AskBar from '../components/AskBar';
import CameraView, {
  type CameraViewStatus,
  type FrameMetadata
} from '../components/CameraView';
import ResultsPanel from '../components/ResultsPanel';
import { useEntitiesStore } from '../state/entitiesStore';
import OverlayCanvas from '../components/OverlayCanvas';
import useOcrWorker from '../hooks/useOcrWorker';
import usePageEntities from '../hooks/usePageEntities';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';

interface FrameSize {
  readonly width: number;
  readonly height: number;
}

export default function Reader(): JSX.Element {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [cameraStatus, setCameraStatus] = useState<CameraViewStatus>('idle');
  const [frameSize, setFrameSize] = useState<FrameSize | null>(null);
  const [autoCaptureEnabled, setAutoCaptureEnabled] = useState(true);
  const [paused, setPaused] = useState(false);
  const stableCounterRef = useRef(0);
  const lastWordsRef = useRef<string>('');
  const {
    words,
    fullText,
    status: workerStatus,
    error: workerError,
    processFrame,
    clear: clearOcr
  } = useOcrWorker({
    language: 'eng'
  });
  const { ask, status: entityStatus, error: askError, summary, lastQuery } = usePageEntities();

  const setEntities = useEntitiesStore((s) => s.setEntities);

  const handleFrame = useCallback(
    async (bitmap: ImageBitmap, metadata: FrameMetadata) => {
      setFrameSize((current) => {
        if (
          current &&
          current.width === metadata.width &&
          current.height === metadata.height
        ) {
          return current;
        }

        return { width: metadata.width, height: metadata.height };
      });
      await processFrame(bitmap, metadata);

      // Detect stability of OCR words
      const current = words.map((w) => w.text).join(' ');
      if (current === lastWordsRef.current && current.length > 0) {
        stableCounterRef.current += 1;
      } else {
        stableCounterRef.current = 0;
        lastWordsRef.current = current;
      }

      if (autoCaptureEnabled && !paused && stableCounterRef.current >= 4) {
        setPaused(true);
        const autoEntities = words.slice(0, 50).map((w, i) => {
          return {
            id: `${w.text}-${i}`,
            label: w.text,
            rank: 1,
            source: 'auto' as const
          };
        });
        setEntities(autoEntities);
      }
    },
    [autoCaptureEnabled, paused, processFrame, setEntities, words]
  );

  const overlayAriaLabel = useMemo(() => {
    if (words.length === 0) {
      return 'Camera view with no detected text yet';
    }

    const preview = words
      .slice(0, 3)
      .map((word) => word.text)
      .join(', ');

    return `Camera overlay showing highlighted words: ${preview}`;
  }, [words]);

  const isCameraBlocked =
    cameraStatus === 'permission-denied' || cameraStatus === 'error';

  const placeholder = useMemo(() => {
    if (words.length === 0) {
      return undefined;
    }

    const snippet = words
      .slice(0, 4)
      .map((word) => word.text)
      .join(' ');

    return snippet.length > 0 ? `Ask about "${snippet}"` : undefined;
  }, [words]);

  const summaryMessage = useMemo(() => {
    if (!summary) {
      return null;
    }

    const headline = lastQuery ? `About ${lastQuery}: ` : '';
    const content = `${headline}${summary}`.trim();
    if (content.length <= 240) {
      return content;
    }

    return `${content.slice(0, 237)}...`;
  }, [lastQuery, summary]);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col md:flex-row">
        <main className="relative flex-1 overflow-hidden">
          <CameraView
            active
            paused={paused}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(error) => {
              // eslint-disable-next-line no-console -- Developer telemetry for troubleshooting camera issues.
              console.error('CameraView error', error);
            }}
            onFrame={handleFrame}
            onStatusChange={setCameraStatus}
          />
          <OverlayCanvas
            aria-label={overlayAriaLabel}
            className="absolute inset-0"
            frameSize={frameSize}
            prefersReducedMotion={prefersReducedMotion}
            words={words}
            interactive={paused}
            entities={useEntitiesStore.getState().entities}
          />
          <div
            aria-live="polite"
            className="pointer-events-none absolute inset-x-0 bottom-32 flex justify-center px-6"
          >
            {isCameraBlocked ? (
              <span className="rounded-full bg-red-500/80 px-4 py-2 text-sm font-medium text-white shadow-lg">
                Enable camera access to start scanning the page.
              </span>
            ) : cameraStatus === 'initializing' ? (
              <span className="rounded-full bg-slate-900/70 px-4 py-2 text-sm text-white shadow-lg">
                Preparing camera.
              </span>
            ) : workerStatus === 'loading' ? (
              <span className="rounded-full bg-slate-900/70 px-4 py-2 text-sm text-white shadow-lg">
                Loading reader intelligence.
              </span>
            ) : workerStatus === 'error' && workerError ? (
              <span className="rounded-full bg-red-500/80 px-4 py-2 text-sm font-medium text-white shadow-lg">
                {workerError}
              </span>
            ) : null}
          </div>
        </main>
        <aside className="md:w-[380px] w-full border-l border-slate-200 bg-white/80 supports-[backdrop-filter]:backdrop-blur-md overflow-y-auto max-h-screen">
          <div className="mx-auto w-full max-w-md p-4">
            <h2 className="sr-only">Results</h2>
            <ResultsPanel />
            <div className="mt-4 flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  checked={autoCaptureEnabled}
                  onChange={(e) => setAutoCaptureEnabled(e.target.checked)}
                />
                Auto capture
              </label>
              {paused ? (
                <button
                  className="rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-sm text-slate-900 shadow-sm supports-[backdrop-filter]:backdrop-blur-md"
                  onClick={() => {
                    setPaused(false);
                    clearOcr();
                  }}
                >
                  Resume camera
                </button>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
      <AskBar
        ariaLiveMessage={
          fullText.trim().length > 0
            ? `Detected ${words.length} phrases on page.`
            : undefined
        }
        disabled={isCameraBlocked}
        errorMessage={askError}
        infoMessage={summaryMessage}
        loading={entityStatus === 'loading'}
        onSubmit={ask}
        placeholder={placeholder}
      />
    </div>
  );
}
