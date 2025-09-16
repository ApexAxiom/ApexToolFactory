import React, { useEffect, useRef } from 'react';

import type { RecognizedWord } from '../lib/types';

interface OverlayCanvasProps
  extends Omit<React.CanvasHTMLAttributes<HTMLCanvasElement>, 'children'> {
  readonly words: readonly RecognizedWord[];
  readonly frameSize: { readonly width: number; readonly height: number } | null;
  readonly prefersReducedMotion?: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Draws OCR underlines and the targeting reticle above the live camera feed.
 *
 * @param {OverlayCanvasProps} props Canvas presentation properties.
 * @returns {JSX.Element} Positioned canvas element for the reader overlay.
 * @example
 * ```tsx
 * <OverlayCanvas words={words} frameSize={{ width: 1280, height: 720 }} />
 * ```
 */
export default function OverlayCanvas({
  words,
  frameSize,
  prefersReducedMotion = false,
  ...props
}: OverlayCanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const { width: clientWidth, height: clientHeight } = canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;

    if (canvas.width !== clientWidth * pixelRatio || canvas.height !== clientHeight * pixelRatio) {
      canvas.width = Math.max(1, Math.floor(clientWidth * pixelRatio));
      canvas.height = Math.max(1, Math.floor(clientHeight * pixelRatio));
    }

    context.resetTransform?.();
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, clientWidth, clientHeight);

    const underlineThickness = Math.max(2, clientHeight * 0.003);

    for (const word of words) {
      const normalizedConfidence = clamp(word.confidence, 0, 1);
      const alpha = 0.2 + normalizedConfidence * 0.6;
      const x = word.box.x * clientWidth;
      const y = word.box.y * clientHeight;
      const width = word.box.width * clientWidth;
      const height = word.box.height * clientHeight;

      context.beginPath();
      context.strokeStyle = `rgba(148, 197, 255, ${alpha.toFixed(3)})`;
      context.lineWidth = underlineThickness;
      context.lineCap = 'round';
      context.moveTo(x, y + height);
      context.lineTo(x + width, y + height);
      context.stroke();
    }

    const centerX = clientWidth / 2;
    const centerY = clientHeight / 2;
    const aspectRatio = frameSize
      ? frameSize.width / Math.max(frameSize.height, 1)
      : clientWidth / Math.max(clientHeight, 1);
    const radiusBase = Math.min(clientWidth, clientHeight) * 0.08;
    const radius = Math.max(24, aspectRatio > 1.2 ? radiusBase * 0.9 : radiusBase);

    context.save();
    context.lineWidth = 2;
    context.strokeStyle = prefersReducedMotion ? 'rgba(250, 250, 252, 0.75)' : 'rgba(250, 250, 252, 0.9)';
    context.setLineDash(prefersReducedMotion ? [] : [8, 6]);
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.stroke();

    context.setLineDash([]);
    context.beginPath();
    context.moveTo(centerX - radius * 0.6, centerY);
    context.lineTo(centerX + radius * 0.6, centerY);
    context.moveTo(centerX, centerY - radius * 0.6);
    context.lineTo(centerX, centerY + radius * 0.6);
    context.stroke();
    context.restore();
  }, [frameSize, prefersReducedMotion, words]);

  return <canvas ref={canvasRef} {...props} />;
}
