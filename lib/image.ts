/**
 * Shrinks an image in the browser before upload so photos stay small enough to keep in the
 * database (and fast on the public page). Returns a JPEG data URL.
 */
export async function resizeImage(file: File, maxSize = 600, quality = 0.85): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('File harus berupa gambar');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Browser tidak bisa memproses gambar');
  ctx.fillStyle = '#ffffff'; // transparent PNGs become white, not black, in JPEG
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', quality);
}
