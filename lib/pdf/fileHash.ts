/**
 * Computes a SHA-256 hash from a File or ArrayBuffer using the browser's crypto.subtle API.
 * Used to detect and block duplicate PDF uploads.
 */
export async function computeFileHash(fileOrBuffer: File | ArrayBuffer): Promise<string> {
  let buffer: ArrayBuffer;
  if (fileOrBuffer instanceof File) {
    buffer = await fileOrBuffer.arrayBuffer();
  } else {
    buffer = fileOrBuffer;
  }

  // Use crypto.subtle if available in secure contexts
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    try {
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      console.warn('crypto.subtle failed, falling back to fast digest', e);
    }
  }

  // Fallback fast rolling 64-bit polynomial hash for non-crypto contexts
  const view = new Uint8Array(buffer);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  const step = Math.max(1, Math.floor(view.length / 50000)); // Sample if huge

  for (let i = 0; i < view.length; i += step) {
    h1 = Math.imul(h1 ^ view[i], 2654435761);
    h2 = Math.imul(h2 ^ view[i], 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  return `${(h1 >>> 0).toString(16)}${(h2 >>> 0).toString(16)}_${buffer.byteLength}`;
}
