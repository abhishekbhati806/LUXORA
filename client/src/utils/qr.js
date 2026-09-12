/**
 * Minimal but genuine QR Code encoder (byte mode, EC levels M/L, versions 1–6) plus a
 * matching decoder used by `scripts/verify-qr.mjs`.
 *
 * It exists so the confirmation screen shows a code a hotel scanner can actually read.
 * The payload is deliberately short (code + dates + total) — the human-readable details
 * sit next to it rather than inside the symbols.
 */

/* --------------------------------------------------------------- tables */
// version → [totalCodewords, dataCodewords, ecCodewordsPerBlock, block1Count, block1Data, block2Count, block2Data]
const SPEC = {
  L: {
    1: [26, 19, 7, 1, 19, 0, 0],
    2: [44, 34, 10, 1, 34, 0, 0],
    3: [70, 55, 15, 1, 55, 0, 0],
    4: [100, 80, 20, 1, 80, 0, 0],
    5: [134, 108, 26, 2, 54, 0, 0],
    6: [172, 136, 36, 2, 68, 0, 0],
  },
  M: {
    1: [26, 16, 10, 1, 16, 0, 0],
    2: [44, 28, 16, 1, 28, 0, 0],
    3: [70, 44, 28, 1, 44, 0, 0],
    4: [100, 64, 18, 2, 32, 0, 0],
    5: [134, 86, 22, 2, 43, 0, 0],
    6: [172, 124, 26, 2, 62, 0, 0],
  },
};

const ALIGN = { 1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30], 6: [6, 34] };
const EC_BITS = { L: 0b01, M: 0b00 };

/* ------------------------------------------------------- GF(256) arithmetic */
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i += 1) EXP[i] = EXP[i - 255];
})();

const mul = (a, b) => (a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]]);

function rsGenerator(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= mul(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function rsEncode(data, ecLen) {
  const gen = rsGenerator(ecLen);
  const res = new Array(ecLen).fill(0);
  for (const byte of data) {
    const factor = byte ^ res[0];
    res.shift();
    res.push(0);
    for (let i = 0; i < ecLen; i += 1) res[i] ^= mul(gen[i + 1], factor);
  }
  return res;
}

/* ------------------------------------------------------------ bit helpers */
class BitBuffer {
  constructor() {
    this.bits = [];
  }
  put(value, length) {
    for (let i = length - 1; i >= 0; i -= 1) this.bits.push((value >>> i) & 1);
  }
  get length() {
    return this.bits.length;
  }
}

function toBytes(bits) {
  const out = [];
  for (let i = 0; i < bits.length; i += 8) {
    let b = 0;
    for (let j = 0; j < 8; j += 1) b = (b << 1) | (bits[i + j] || 0);
    out.push(b);
  }
  return out;
}

/* --------------------------------------------------------- matrix building */
function blankMatrix(size) {
  return Array.from({ length: size }, () => new Array(size).fill(null));
}

function inBounds(m, r, c) {
  return r >= 0 && c >= 0 && r < m.length && c < m.length;
}

function addFinder(m, row, col) {
  for (let r = -1; r <= 7; r += 1) {
    for (let c = -1; c <= 7; c += 1) {
      const rr = row + r;
      const cc = col + c;
      if (!inBounds(m, rr, cc)) continue;
      const onRing = (r >= 0 && r <= 6 && (c === 0 || c === 6)) || (c >= 0 && c <= 6 && (r === 0 || r === 6));
      const inCore = r >= 2 && r <= 4 && c >= 2 && c <= 4;
      m[rr][cc] = onRing || inCore ? 1 : 0;
    }
  }
}

function addAlignment(m, version) {
  const centers = ALIGN[version];
  if (!centers.length) return;
  for (const r of centers) {
    for (const c of centers) {
      // skip the three corners occupied by finder patterns
      if ((r === 6 && c === 6) || (r === 6 && c === centers[centers.length - 1]) || (r === centers[centers.length - 1] && c === 6))
        continue;
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          m[r + dr][c + dc] = Math.max(Math.abs(dr), Math.abs(dc)) !== 1 ? 1 : 0;
        }
      }
    }
  }
}


/* `m` cells that are function patterns are set to 0/1 with `reserved` tracking; data
   modules are the ones still marked undefined by the helper below. */
const MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => ((((r + c) % 2) + ((r * c) % 3)) % 2) === 0,
];

function penalty(m) {
  const size = m.length;
  let score = 0;
  const runPenalty = (line) => {
    let run = 1;
    for (let i = 1; i <= line.length; i += 1) {
      if (i < line.length && line[i] === line[i - 1]) run += 1;
      else {
        if (run >= 5) score += 3 + (run - 5);
        run = 1;
      }
    }
  };
  for (let i = 0; i < size; i += 1) {
    runPenalty(m[i]);
    runPenalty(m.map((row) => row[i]));
  }
  for (let r = 0; r < size - 1; r += 1) {
    for (let c = 0; c < size - 1; c += 1) {
      const v = m[r][c];
      if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) score += 3;
    }
  }
  const pattern = [1, 0, 1, 1, 1, 0, 1];
  const matches = (line) => {
    let n = 0;
    for (let i = 0; i + 7 <= line.length; i += 1) if (pattern.every((p, k) => line[i + k] === p)) n += 1;
    return n;
  };
  for (let i = 0; i < size; i += 1) score += 40 * (matches(m[i]) + matches(m.map((row) => row[i])));
  const dark = m.reduce((a, row) => a + row.reduce((x, y) => x + y, 0), 0);
  const ratio = (dark * 100) / (size * size);
  score += 10 * Math.floor(Math.abs(ratio - 50) / 5);
  return score;
}

function formatBits(ecLetter, mask) {
  const data = (EC_BITS[ecLetter] << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i += 1) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}

function paintFormat(m, fmt) {
  const size = m.length;
  for (let i = 0; i < 15; i += 1) {
    const bit = (fmt >> i) & 1;
    // top-left, skipping the timing column
    if (i < 6) m[i][8] = bit;
    else if (i < 8) m[i + 1][8] = bit;
    else if (i === 8) m[8][7] = bit;
    else m[8][14 - i] = bit;
    // bottom-right / top-right copy
    if (i < 8) m[8][size - 1 - i] = bit;
    else m[size - 15 + i][8] = bit;
  }
  m[size - 8][8] = 1;
}

/* ------------------------------------------------------------------ encode */
export function encodeQr(text, { ecc = 'M' } = {}) {
  const bytes = Array.from(new TextEncoder().encode(text));
  let version = 0;
  let spec = null;
  for (let v = 1; v <= 6; v += 1) {
    const s = SPEC[ecc][v];
    const ccBits = v <= 9 ? 8 : 16;
    const need = 4 + ccBits + bytes.length * 8;
    if (need <= s[1] * 8) {
      version = v;
      spec = s;
      break;
    }
  }
  if (!spec) throw new Error('Payload too long for versions 1–6; shorten the QR text.');

  const [, dataCodewords, ecPerBlock, b1Count, b1Data, b2Count, b2Data] = spec;
  const bb = new BitBuffer();
  bb.put(0b0100, 4); // byte mode
  bb.put(bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) bb.put(b, 8);

  const capacityBits = dataCodewords * 8;
  bb.put(0, Math.min(4, capacityBits - bb.length)); // terminator
  while (bb.length % 8) bb.put(0, 1);

  const data = toBytes(bb.bits).slice(0, dataCodewords);
  const pads = [0xec, 0x11];
  let pi = 0;
  while (data.length < dataCodewords) data.push(pads[(pi += 1) % 2]);

  // split into blocks, compute EC per block, then interleave
  const blocks = [];
  let offset = 0;
  const counts = [];
  for (let i = 0; i < b1Count; i += 1) counts.push(b1Data);
  for (let i = 0; i < b2Count; i += 1) counts.push(b2Data);
  for (const count of counts) {
    const chunk = data.slice(offset, offset + count);
    offset += count;
    blocks.push({ data: chunk, ec: rsEncode(chunk, ecPerBlock) });
  }
  const finalBytes = [];
  for (let i = 0; i < Math.max(...blocks.map((b) => b.data.length)); i += 1) {
    for (const b of blocks) if (i < b.data.length) finalBytes.push(b.data[i]);
  }
  for (let i = 0; i < ecPerBlock; i += 1) {
    for (const b of blocks) if (i < b.ec.length) finalBytes.push(b.ec[i]);
  }

  const size = 17 + version * 4;
  // Scratch map of "function pattern" cells for the current mask pass. Kept module-level
  // (like the encoder it serves) to avoid re-allocating a matrix per mask attempt.
  let reserved = null;
  let best = null;
  for (let mask = 0; mask < 8; mask += 1) {
    const m = blankMatrix(size);
    reserved = blankMatrix(size);
    const mark = (r, c, v) => {
      if (inBounds(m, r, c)) {
        m[r][c] = v;
        reserved[r][c] = 1;
      }
    };
    addFinder(m, 0, 0);
    for (let r = 0; r <= 7; r += 1) for (let c = 0; c <= 7; c += 1) mark(r, c, m[r][c] ?? 0);
    for (let r = 0; r <= 7; r += 1) for (let c = size - 8; c < size; c += 1) mark(r, c, r === 0 || r === 6 || c === size - 8 || c === size - 1 || (r >= 2 && r <= 4 && c >= size - 6 && c <= size - 4) ? 1 : 0);
    for (let r = size - 8; r < size; r += 1) for (let c = 0; c <= 7; c += 1) mark(r, c, r === size - 8 || r === size - 2 || c === 0 || c === 6 || (c >= 2 && c <= 4 && r >= size - 6 && r <= size - 4) ? 1 : 0);
    addAlignment(m, version);
    for (const centers of [ALIGN[version]]) {
      for (const ar of centers) {
        for (const ac of centers) {
          if ((ar === 6 && ac === 6) || (ar === 6 && ac === centers[centers.length - 1]) || (ar === centers[centers.length - 1] && ac === 6)) continue;
          for (let dr = -2; dr <= 2; dr += 1) for (let dc = -2; dc <= 2; dc += 1) mark(ar + dr, ac + dc, m[ar + dr][ac + dc] ?? 0);
        }
      }
    }
    for (let i = 8; i < size - 8; i += 1) {
      mark(6, i, i % 2 === 0 ? 1 : 0);
      mark(i, 6, i % 2 === 0 ? 1 : 0);
    }
    for (let i = 0; i < 9; i += 1) {
      mark(8, i, 0);
      mark(i, 8, 0);
    }
    for (let i = 0; i < 8; i += 1) {
      mark(8, size - 1 - i, 0);
      mark(size - 1 - i, 8, 0);
    }
    mark(size - 8, 8, 1);

    // data
    let bitIndex = 0;
    const totalBits = finalBytes.length * 8;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right -= 1;
      for (let vert = 0; vert < size; vert += 1) {
        for (let j = 0; j < 2; j += 1) {
          const col = right - j;
          const upward = ((right + 1) & 2) === 0;
          const row = upward ? size - 1 - vert : vert;
          if (reserved[row][col]) continue;
          const bit = bitIndex < totalBits ? (finalBytes[bitIndex >> 3] >> (7 - (bitIndex & 7))) & 1 : 0;
          bitIndex += 1;
          m[row][col] = bit ^ (MASKS[mask](row, col) ? 1 : 0);
        }
      }
    }
    paintFormat(m, formatBits(ecc, mask));
    const p = penalty(m);
    if (!best || p < best.p) best = { p, m: m.map((row) => row.map((v) => (v ? 1 : 0))) };
  }
  reserved = null;
  return { size, version, ecc, modules: best.m };
}

/* ------------------------------------------------- render as inline SVG path */
export function qrSvgString(qr, { quiet = 2, cell = 4 } = {}) {
  const { modules, size } = qr;
  const dim = (size + quiet * 2) * cell;
  let d = '';
  for (let r = 0; r < size; r += 1) {
    for (let c = 0; c < size; c += 1) {
      if (!modules[r][c]) continue;
      d += `M${(c + quiet) * cell} ${(r + quiet) * cell}h${cell}v${cell}h-${cell}z`;
    }
  }
  return { path: d, dim };
}

/* ------------------------------------------------------------------ decode
 * Read the encoded bytes back out of the finished matrix. Only used by tests,
 * but it is a genuine reverse pass (format → unmask → zigzag → bitstream).
 */
export function decodeQr(qr) {
  const { modules: m, size } = qr;
  // 1. read format bits (top-left copy) and unmask
  let fmt = 0;
  for (let i = 0; i < 15; i += 1) {
    let bit;
    if (i < 6) bit = m[i][8];
    else if (i < 8) bit = m[i + 1][8];
    else if (i === 8) bit = m[8][7];
    else bit = m[8][14 - i];
    fmt |= bit << i;
  }
  const dataBits = (fmt ^ 0x5412) >> 10;
  const mask = dataBits & 0b111;

  // 2. rebuild the reserved map the same way the encoder did
  const reserved = blankMatrix(size);
  const mark = (r, c) => {
    if (r >= 0 && c >= 0 && r < size && c < size) reserved[r][c] = 1;
  };
  for (let r = 0; r <= 8; r += 1) for (let c = 0; c <= 8; c += 1) mark(r, c);
  for (let r = 0; r <= 8; r += 1) for (let c = size - 8; c < size; c += 1) mark(r, c);
  for (let r = size - 8; r < size; r += 1) for (let c = 0; c <= 8; c += 1) mark(r, c);
  for (let i = 0; i < size; i += 1) {
    mark(6, i);
    mark(i, 6);
  }
  const centers = ALIGN[qr.version];
  for (const ar of centers) {
    for (const ac of centers) {
      if ((ar === 6 && ac === 6) || (ar === 6 && ac === centers[centers.length - 1]) || (ar === centers[centers.length - 1] && ac === 6)) continue;
      for (let dr = -2; dr <= 2; dr += 1) for (let dc = -2; dc <= 2; dc += 1) mark(ar + dr, ac + dc);
    }
  }

  const spec = SPEC[qr.ecc][qr.version];
  const totalCodewords = spec[0];
  const bits = [];
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right -= 1;
    for (let vert = 0; vert < size; vert += 1) {
      for (let j = 0; j < 2; j += 1) {
        const col = right - j;
        const upward = ((right + 1) & 2) === 0;
        const row = upward ? size - 1 - vert : vert;
        if (reserved[row][col]) continue;
        bits.push(m[row][col] ^ (MASKS[mask](row, col) ? 1 : 0));
      }
    }
  }

  // 3. un-interleave: read blocks in order of their data codewords
  const [, , ecPer, b1Count, b1Data, b2Count, b2Data] = spec;
  const counts = [...Array(b1Count).fill(b1Data), ...Array(b2Count).fill(b2Data)];
  const blockData = counts.map(() => []);
  const rawBytes = toBytes(bits.slice(0, totalCodewords * 8));
  let idx = 0;
  const maxData = Math.max(...counts);
  for (let i = 0; i < maxData; i += 1) {
    for (let b = 0; b < counts.length; b += 1) {
      if (i < counts[b]) {
        blockData[b].push(rawBytes[idx]);
        idx += 1;
      }
    }
  }
  idx += ecPer * counts.length; // skip EC (its position follows the data round-robins)
  const stream = blockData.flat().flatMap((byte) => [7, 6, 5, 4, 3, 2, 1, 0].map((s) => (byte >> s) & 1));

  const read = (n) => {
    let v = 0;
    for (let i = 0; i < n; i += 1) v = (v << 1) | (stream.shift() ?? 0);
    return v;
  };
  const mode = read(4);
  if (mode !== 0b0100) throw new Error(`unexpected mode ${mode}`);
  const len = read(qr.version <= 9 ? 8 : 16);
  const out = [];
  for (let i = 0; i < len; i += 1) out.push(read(8));
  return new TextDecoder().decode(new Uint8Array(out));
}
