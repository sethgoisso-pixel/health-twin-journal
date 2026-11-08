import { qrcodegen } from "./qrcodegen";

/** Encodes text as a QR code (error correction level M) and returns the dark/light grid. Throws if the text is too long. */
export function qrGrid(text: string): boolean[][] {
  const qr = qrcodegen.QrCode.encodeText(text, qrcodegen.QrCode.Ecc.MEDIUM);
  const grid: boolean[][] = [];
  for (let y = 0; y < qr.size; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < qr.size; x++) row.push(qr.getModule(x, y));
    grid.push(row);
  }
  return grid;
}

/** SVG path for the dark modules, with a 4-module quiet zone. */
export function qrSvgPath(grid: boolean[][], border = 4): { d: string; size: number } {
  const parts: string[] = [];
  grid.forEach((row, y) => row.forEach((dark, x) => { if (dark) parts.push(`M${x + border},${y + border}h1v1h-1z`); }));
  return { d: parts.join(" "), size: grid.length + border * 2 };
}
