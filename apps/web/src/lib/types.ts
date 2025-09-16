export interface NormalizedBoundingBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface RecognizedWord {
  readonly text: string;
  readonly box: NormalizedBoundingBox;
  readonly confidence: number;
}

export interface OcrResult {
  readonly words: RecognizedWord[];
  readonly fullText: string;
  readonly duration: number;
  readonly timestamp: number;
}
