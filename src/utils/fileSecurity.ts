export type UploadFolder = 'avatars' | 'products';

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES: Record<UploadFolder, number> = {
  avatars: 2 * 1024 * 1024, // 2 MB
  products: 5 * 1024 * 1024, // 5 MB
};
const MAX_DIMENSION: Record<UploadFolder, number> = {
  avatars: 768,
  products: 1400,
};

function hasValidMagicBytes(bytes: Uint8Array, mime: string): boolean {
  if (bytes.length < 12) return false;

  // JPEG: FF D8 FF
  if (mime === 'image/jpeg') {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (mime === 'image/png') {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  // WebP: "RIFF" .... "WEBP"
  if (mime === 'image/webp') {
    const riff = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
    const webp = String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]);
    return riff === 'RIFF' && webp === 'WEBP';
  }

  return false;
}

/**
 * Validates extension, MIME, and magic bytes, strips EXIF/metadata by
 * decoding onto a clean HTML5 canvas, resizes large uploads, and outputs
 * a sanitized File with a randomized UUID filename + safe DataURL fallback.
 */
export async function processSecureImageUpload(
  file: File,
  folder: UploadFolder
): Promise<{ sanitizedFile: File; dataUrl: string }> {
  const maxBytes = MAX_BYTES[folder];
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new Error('Only .jpg, .jpeg, .png, and .webp image files are allowed.');
  }
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error('Unsupported file MIME type. Use JPG, PNG, or WebP.');
  }
  if (file.size <= 0 || file.size > maxBytes) {
    const limitMb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(`Image must be ${limitMb} MB or smaller.`);
  }

  const headerBuf = await file.slice(0, 16).arrayBuffer();
  const headerBytes = new Uint8Array(headerBuf);
  if (!hasValidMagicBytes(headerBytes, file.type)) {
    throw new Error('File signature does not match a valid JPG, PNG, or WebP image.');
  }

  // Re-encode via canvas to strip all EXIF / GPS / embedded metadata & enforce dimensions
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Image appears corrupted or unreadable.'));
      el.src = objectUrl;
    });

    const maxDim = MAX_DIMENSION[folder];
    const scale = Math.min(1, maxDim / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas image processing unavailable in this browser.');
    }
    ctx.drawImage(img, 0, 0, width, height);

    const outputMime = 'image/webp';
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Could not re-encode sanitized image.'))),
        outputMime,
        0.86
      );
    });

    const randomName =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? `${crypto.randomUUID()}.webp`
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.webp`;

    const sanitizedFile = new File([blob], randomName, { type: outputMime });
    const dataUrl = canvas.toDataURL(outputMime, 0.86);

    return { sanitizedFile, dataUrl };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
