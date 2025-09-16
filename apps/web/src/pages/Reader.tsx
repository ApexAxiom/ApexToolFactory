import React, { useCallback, useMemo, useState } from 'react';

import AskBar from '../components/AskBar';
import CameraView, {
  type CameraViewStatus,
  type FrameMetadata
} from '../components/CameraView';
import OverlayCanvas from '../components/OverlayCanvas';
import useOcrWorker from '../hooks/useOcrWorker';
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion';

interface FrameSize {
  readonly width: number;
  readonly height: number;
}

/**
 * Full-screen reader surface combining camera capture, OCR overlay, and query input.
 *
 * @returns {JSX.Element} The primary Book Lens reader layout.
 * @example
 * ```tsx
 * <Reader />
 * ```
 */
export default function Reader(): JSX.Element {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [cameraStatus, setCameraStatus] = useState<CameraViewStatus>('idle');
  const [frameSize, setFrameSize] = useState<FrameSize | null>(null);
  const {
    words,
    fullText,
    status: workerStatus,
    error: workerError,
    processFrame
  } = useOcrWorker({
    language: 'eng'
  });

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
    },
    [processFrame]
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

  return (
    <div className="flex min-h-screen flex-col">
      <main className="relative flex-1 overflow-hidden">
        <CameraView
          active
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
        />
        <div
          aria-live="polite"
          className="pointer-events-none absolute inset-x-0 bottom-28 flex justify-center px-6"
        >
          {isCameraBlocked ? (
            <span className="rounded-full bg-red-500/80 px-4 py-2 text-sm font-medium text-white shadow-lg">
              Enable camera access to start scanning the page.
            </span>
          ) : cameraStatus === 'initializing' ? (
            <span className="rounded-full bg-slate-900/70 px-4 py-2 text-sm text-slate-100 shadow-lg">
              Preparing camera…
            </span>
          ) : workerStatus === 'loading' ? (
            <span className="rounded-full bg-slate-900/70 px-4 py-2 text-sm text-slate-100 shadow-lg">
              Loading reader intelligence…
            </span>
          ) : workerStatus === 'error' && workerError ? (
            <span className="rounded-full bg-red-500/80 px-4 py-2 text-sm font-medium text-white shadow-lg">
              {workerError}
            </span>
          ) : null}
        </div>
      </main>
      <AskBar
        ariaLiveMessage={
          fullText.trim().length > 0
            ? `Detected ${words.length} phrases on page.`
            : undefined
        }
        disabled={isCameraBlocked}
      />
    </div>
  );
}
