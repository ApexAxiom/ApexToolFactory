import React, { useCallback, useEffect, useRef } from 'react';

const CAPTURE_INTERVAL_MS = 480;

export interface FrameMetadata {
  readonly width: number;
  readonly height: number;
  readonly timestamp: number;
}

export type CameraViewStatus =
  | 'idle'
  | 'initializing'
  | 'ready'
  | 'permission-denied'
  | 'error';

interface CameraViewProps {
  readonly active: boolean;
  readonly className?: string;
  readonly facingMode?: 'environment' | 'user';
  readonly onError?: (error: Error) => void;
  readonly onFrame: (
    frame: ImageBitmap,
    metadata: FrameMetadata
  ) => Promise<void> | void;
  readonly onStatusChange?: (status: CameraViewStatus) => void;
}

function isPermissionError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === 'NotAllowedError' ||
    error.name === 'PermissionDeniedError' ||
    error.name === 'SecurityError'
  );
}

async function createBitmap(canvas: HTMLCanvasElement): Promise<ImageBitmap> {
  if (typeof globalThis.createImageBitmap !== 'function') {
    throw new Error('ImageBitmap is not supported in this browser.');
  }

  return globalThis.createImageBitmap(canvas);
}

/**
 * Streams frames from the device camera and forwards throttled snapshots for OCR processing.
 *
 * @param {CameraViewProps} props Component properties controlling capture behaviour.
 * @returns {JSX.Element} Hidden video element acting as the capture surface.
 * @example
 * ```tsx
 * <CameraView active onFrame={(frame, meta) => console.log(meta.width, meta.height)} />
 * ```
 */
export default function CameraView({
  active,
  className,
  facingMode = 'environment',
  onError,
  onFrame,
  onStatusChange
}: CameraViewProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null);
  const lastCaptureRef = useRef<number>(0);
  const busyRef = useRef<boolean>(false);
  const statusRef = useRef<CameraViewStatus>('idle');

  const updateStatus = useCallback(
    (status: CameraViewStatus) => {
      if (statusRef.current === status) {
        return;
      }

      statusRef.current = status;
      onStatusChange?.(status);
    },
    [onStatusChange]
  );

  const stopStream = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }

    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      streamRef.current = null;
    }

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }

    busyRef.current = false;
    lastCaptureRef.current = 0;
  }, []);

  const captureLoop = useCallback(async (): Promise<void> => {
    animationFrameRef.current = requestAnimationFrame(captureLoop);

    if (!active) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return;
    }

    const now = performance.now();
    if (busyRef.current || now - lastCaptureRef.current < CAPTURE_INTERVAL_MS) {
      return;
    }

    lastCaptureRef.current = now;
    busyRef.current = true;

    const width = video.videoWidth;
    const height = video.videoHeight;
    if (width === 0 || height === 0) {
      busyRef.current = false;
      return;
    }

    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      busyRef.current = false;
      return;
    }

    context.drawImage(video, 0, 0, width, height);

    try {
      const bitmap = await createBitmap(canvas);
      const result = onFrame(bitmap, {
        width,
        height,
        timestamp: performance.now()
      });

      if (result instanceof Promise) {
        await result;
      }
    } catch (error) {
      if (error instanceof Error) {
        onError?.(error);
      }
    } finally {
      busyRef.current = false;
    }
  }, [active, onError, onFrame]);

  useEffect(() => {
    canvasRef.current = document.createElement('canvas');
    return () => {
      canvasRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!active) {
      stopStream();
      updateStatus('idle');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      updateStatus('error');
      return;
    }

    let cancelled = false;

    const startStream = async () => {
      updateStatus('initializing');

      try {
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        video.srcObject = stream;
        await video.play();

        updateStatus('ready');
        captureLoop().catch((error: unknown) => {
          if (error instanceof Error) {
            onError?.(error);
          }
        });
      } catch (error) {
        if (isPermissionError(error)) {
          updateStatus('permission-denied');
        } else {
          updateStatus('error');
        }

        if (error instanceof Error) {
          onError?.(error);
        }
      }
    };

    void startStream();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [active, captureLoop, facingMode, onError, stopStream, updateStatus]);

  return (
    <video
      aria-hidden
      className={className}
      muted
      playsInline
      ref={videoRef}
    />
  );
}
