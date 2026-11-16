/** A valid 1×1 PNG. */
export const PNG_1X1_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
export const PNG_1X1 = `data:image/png;base64,${PNG_1X1_B64}`;
export const pngBytes = () =>
  new Uint8Array(Buffer.from(PNG_1X1_B64, "base64"));
