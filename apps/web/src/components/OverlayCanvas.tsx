import React, { useEffect, useMemo, useRef } from 'react';

import type { RecognizedWord } from '../lib/types';
import type { Entity } from '../state/entitiesStore';

interface OverlayCanvasProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  readonly words: readonly RecognizedWord[];
  readonly frameSize: { readonly width: number; readonly height: number } | null;
  readonly prefersReducedMotion?: boolean;
  readonly interactive?: boolean;
  readonly entities?: readonly Entity[];
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
  interactive = false,
  entities = [],
  ...props
}: OverlayCanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

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

    // Removed center reticle / crosshair for a cleaner UI
  }, [frameSize, prefersReducedMotion, words]);

  const wordToEntity = useMemo(() => {
    const map = new Map<string, Entity>();
    for (const ent of entities) {
      map.set(ent.label.toLowerCase(), ent);
    }
    return map;
  }, [entities]);

  return (
    <div ref={containerRef} className="relative" {...props}>
      <canvas className="absolute inset-0" ref={canvasRef} />
      {interactive
        ? words.map((word, idx) => {
            const left = `${word.box.x * 100}%`;
            const top = `${word.box.y * 100}%`;
            const width = `${word.box.width * 100}%`;
            const height = `${word.box.height * 100}%`;
            const key = `${word.text}-${idx}`;
            const match = wordToEntity.get(word.text.toLowerCase());
            const href = match?.url || `https://en.wikipedia.org/wiki/${encodeURIComponent(word.text)}`;
            const description = match?.description;
            return (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="group absolute rounded-sm outline-none ring-sky-400/50 focus-visible:ring-2"
                style={{ left, top, width, height }}
                title={match?.label || word.text}
              >
                <span className="sr-only">{match?.label || word.text}</span>
                {description ? (
                  <div className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden max-w-[240px] rounded-xl border border-slate-200 bg-white/80 p-2 text-[11px] text-slate-700 shadow-lg supports-[backdrop-filter]:backdrop-blur-md group-hover:block">
                    {description}
                  </div>
                ) : null}
              </a>
            );
          })
        : null}
    </div>
  );
}
