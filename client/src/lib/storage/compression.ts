/**
 * Compression utilities for reducing storage size
 */

import LZString from 'lz-string';

/**
 * Compress a JavaScript object to a string
 */
export function compress(data: any): string {
  try {
    const jsonString = JSON.stringify(data);
    const compressed = LZString.compressToUTF16(jsonString);
    return compressed;
  } catch (error) {
    console.error('Compression failed:', error);
    // Fall back to uncompressed JSON
    return JSON.stringify(data);
  }
}

/**
 * Decompress a string back to a JavaScript object
 */
export function decompress<T>(compressed: string): T | null {
  try {
    // First try to decompress
    const decompressed = LZString.decompressFromUTF16(compressed);

    if (decompressed) {
      return JSON.parse(decompressed);
    }

    // If decompression fails, try parsing as regular JSON
    // (in case it wasn't compressed)
    return JSON.parse(compressed);
  } catch (error) {
    console.error('Decompression failed:', error);

    // Last attempt: try parsing as regular JSON
    try {
      return JSON.parse(compressed);
    } catch {
      return null;
    }
  }
}

/**
 * Calculate compression ratio
 */
export function getCompressionRatio(original: any, compressed: string): number {
  const originalSize = new Blob([JSON.stringify(original)]).size;
  const compressedSize = new Blob([compressed]).size;
  return compressedSize / originalSize;
}

/**
 * Estimate the size of data in bytes
 */
export function estimateSize(data: any): number {
  const jsonString = JSON.stringify(data);
  return new Blob([jsonString]).size;
}

/**
 * Format bytes as human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Check if data should be compressed based on size
 */
export function shouldCompress(data: any, threshold: number = 10240): boolean {
  // Compress if data is larger than threshold (default 10KB)
  return estimateSize(data) > threshold;
}
