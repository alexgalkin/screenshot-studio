/**
 * Browser export encoder.
 *
 * PNG, JPEG, and WebP go through libsquoosh codecs compiled to WebAssembly.
 * Clipboard copies skip that and use canvas.toBlob(). AVIF stays on encodeAvif.
 * A codec failure falls back to canvas.toBlob() for PNG, JPEG, and WebP.
 */

import type { ExportFormat, QualityPreset } from "./types";
import { QUALITY_PRESETS } from "./types";

export interface SharpProcessingResult {
  blob: Blob;
  dataURL: string;
  fileSize: number;
}

const FALLBACK_QUALITY: Record<ExportFormat, Record<QualityPreset, number>> = {
  jpeg: { high: 0.85, medium: 0.75, low: 0.60 },
  webp: { high: 0.82, medium: 0.72, low: 0.55 },
  png: { high: 1, medium: 1, low: 1 },
};

function getMimeType(format: ExportFormat): string {
  switch (format) {
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    default:
      return "image/png";
  }
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to create blob"))),
      mimeType,
      quality
    );
  });
}

function flattenOntoWhite(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const flat = document.createElement("canvas");
  flat.width = canvas.width;
  flat.height = canvas.height;
  const context = flat.getContext("2d");
  if (!context) return canvas;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, flat.width, flat.height);
  context.drawImage(canvas, 0, 0);
  return flat;
}

function readImageData(canvas: HTMLCanvasElement): ImageData {
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    throw new Error("Canvas is not readable");
  }
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

async function encodeWithCodec(
  canvas: HTMLCanvasElement,
  format: ExportFormat,
  qualityPreset: QualityPreset
): Promise<Blob> {
  const settings = QUALITY_PRESETS[qualityPreset];
  const source = format === "jpeg" ? flattenOntoWhite(canvas) : canvas;
  const imageData = readImageData(source);

  if (format === "jpeg") {
    const { default: encode } = await import("@jsquash/jpeg/encode");
    const buffer = await encode(imageData, { quality: settings.jpeg });
    return new Blob([buffer], { type: "image/jpeg" });
  }

  if (format === "webp") {
    const { default: encode } = await import("@jsquash/webp/encode");
    const buffer = await encode(imageData, { quality: settings.webp });
    return new Blob([buffer], { type: "image/webp" });
  }

  const { default: encode } = await import("@jsquash/png/encode");
  const buffer = await encode(imageData);
  return new Blob([buffer], { type: "image/png" });
}

/**
 * Compress a canvas for download.
 * Pass skipApi for clipboard copies so the codec WASM stays unloaded.
 */
export async function processWithSharp(
  canvas: HTMLCanvasElement,
  format: ExportFormat,
  qualityPreset: QualityPreset,
  options?: { skipApi?: boolean; onProgress?: (percent: number) => void }
): Promise<SharpProcessingResult> {
  const { skipApi = false, onProgress } = options ?? {};

  const finish = (blob: Blob): SharpProcessingResult => {
    const dataURL = URL.createObjectURL(blob);
    return { blob, dataURL, fileSize: blob.size };
  };

  if (skipApi) {
    const quality = format !== "png" ? FALLBACK_QUALITY[format][qualityPreset] : undefined;
    const blob = await canvasToBlob(canvas, getMimeType(format), quality);
    onProgress?.(90);
    return finish(blob);
  }

  onProgress?.(65);

  try {
    const blob = await encodeWithCodec(canvas, format, qualityPreset);
    onProgress?.(90);
    return finish(blob);
  } catch (error) {
    console.warn("In-browser codec failed, using canvas encoding:", error);
    const quality = format !== "png" ? FALLBACK_QUALITY[format][qualityPreset] : undefined;
    const blob = await canvasToBlob(canvas, getMimeType(format), quality);
    onProgress?.(90);
    return finish(blob);
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}
