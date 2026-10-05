/**
 * Client-side book cover prep — resize to a small JPEG data URL so covers
 * sync as text on books.cover_url without a separate blob store.
 */

const MAX_EDGE = 320;
const MAX_BYTES = 90_000;
const QUALITY_STEPS = [0.82, 0.7, 0.58, 0.46];

function canvasToDataUrl(canvas, quality) {
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Read a File into a compressed data URL. Rejects non-images and oversized
 * results after compression.
 */
export function fileToCoverDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file || !String(file.type || '').startsWith('image/')) {
      reject(new Error('Choose an image for the cover.'));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a usable image.'));
      img.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not prepare the cover.'));
          return;
        }
        ctx.fillStyle = '#f4f1ea';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        for (const quality of QUALITY_STEPS) {
          const dataUrl = canvasToDataUrl(canvas, quality);
          if (dataUrl.length <= MAX_BYTES) {
            resolve(dataUrl);
            return;
          }
        }
        reject(new Error('Cover is still too large — try a smaller photo.'));
      };
      img.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}

export function isCoverDataUrl(value) {
  return typeof value === 'string' && value.startsWith('data:image/');
}
