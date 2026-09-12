/**
 * Round-trip proof for client/src/utils/qr.js.
 * Encodes payloads, then decodes the finished matrix back to text. If the geometry,
 * masking, format bits or interleaving were wrong, the decode would not return the input.
 */
import { encodeQr, decodeQr, qrSvgString } from '../client/src/utils/qr.js';

const cases = [
  'LX|7QK32M|2026-10-12|2026-10-16|4|70',
  'A',
  'LUXORA-BOOKING-LX-ABC123-IN-20261012-OUT-20261016-NIGHTS-4-TOTAL-73104-CURRENCY-INR-END',
  '1234567890'.repeat(4),
  'réserve ✓ LX-Ä9',
];
let failed = 0;
for (const text of cases) {
  for (const ecc of ['M', 'L']) {
    try {
      const qr = encodeQr(text, { ecc });
      const back = decodeQr(qr);
      const ok = back === text;
      if (!ok) failed += 1;
      console.log(
        `${ok ? 'ok  ' : 'FAIL'} v${qr.version}/${qr.size}×${qr.size} ecc=${ecc} bytes=${new TextEncoder().encode(text).length}`,
        ok ? '' : `\n     want ${JSON.stringify(text)}\n     got  ${JSON.stringify(back)}`,
      );
    } catch (err) {
      failed += 1;
      console.log(`FAIL (throw) ecc=${ecc} :: ${err.message}`);
    }
  }
}

// structural checks: finder patterns present, quiet zone respected, svg path sane
const qr = encodeQr(cases[0]);
const m = qr.modules;
const dark = (r, c) => m[r][c];
const finderOk = dark(0, 0) && dark(0, 6) && dark(6, 0) && dark(6, 6) && !dark(1, 1) && dark(2, 2) && dark(3, 3) && dark(4, 4);
console.log(finderOk ? 'ok   finder patterns' : 'FAIL finder patterns');
const svg = qrSvgString(qr, { quiet: 2, cell: 4 });
const rectCount = (svg.path.match(/M/g) || []).length;
const expected = m.flat().filter(Boolean).length;
console.log(rectCount === expected ? `ok   svg has ${rectCount} modules` : `FAIL svg ${rectCount} vs matrix ${expected}`);
console.log(`     payload for the confirmation screen → ${cases[0].length} chars, version ${qr.version}`);
process.exit(failed ? 1 : 0);
