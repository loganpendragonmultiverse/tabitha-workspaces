import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const publicDirectory = new URL('../public/', import.meta.url);
await mkdir(publicDirectory, { recursive: true });

const icon = Buffer.from(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="g" x1="15" y1="8" x2="112" y2="122" gradientUnits="userSpaceOnUse">
      <stop stop-color="#5669f5"/><stop offset="1" stop-color="#8657d9"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="34" fill="url(#g)"/>
  <path d="M31 34h66v18H73v48H54V52H31z" fill="white"/>
  <rect x="88" y="70" width="15" height="9" rx="4.5" fill="#80e1c0"/>
  <rect x="88" y="84" width="11" height="9" rx="4.5" fill="#ffc46b"/>
</svg>`);

for (const size of [16, 32, 48, 96, 128]) {
  await sharp(icon)
    .resize(size, size)
    .png()
    .toFile(fileURLToPath(new URL(`icon-${size}.png`, publicDirectory)));
}
