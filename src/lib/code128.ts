/**
 * 🦅 Falcon ERP - Lightweight Code 128 (Subset B) Encoder
 * Zero-dependency SVG barcode generator designed for label printing on
 * low-end devices. Uses the full-width table of the 108 Code 128 symbols.
 */

const START_B = 104;
const STOP = 106;

// Canonical Code 128 symbol patterns (11 modules each, bar/space runs),
// except the stop symbol which spans 13 modules.
const PATTERNS: string[] = [
'11011001100','11001101100','11001100110','10010011000','10010001100',
'10001001100','10011001000','10011000100','10001100100','11001001000',
'11001000100','11000100100','10110011100','10011011100','10011001110',
'10111001100','10011101100','10011100110','11001110010','11001011100',
'11001001110','11011100100','11001110100','11101101110','11101001100',
'11100101100','11100100110','11101100100','11100110100','11100110010',
'11011011000','11011000110','11000110110','10100011000','10001011000',
'10001000110','10110001000','10001101000','10001100010','11010001000',
'11000101000','11000100010','10110111000','10110001110','10001101110',
'10111011000','10111000110','10001110110','11101110110','11010001110',
'11000101110','11011101000','11011100010','11011101110','11101011000',
'11101000110','11100010110','11101101000','11101100010','11100011010',
'11101111010','11001000010','11110001010','10100110000','10100001100',
'10010110000','10010000110','10000101100','10000100110','10110010000',
'10110000100','10011010000','10011000010','10000110100','10000110010',
'11000010010','11001010000','11110111010','11000010100','10001111010',
'10100111100','10010111100','10010011110','10111100100','10011110100',
'10011110010','11110100100','11110010100','11110010010','11011011110',
'11011110110','11110110110','10101111000','10100011110','10001011110',
'10111101000','10111100010','11110101000','11110100010','10111011110',
'10111101110','11101011110','11110101110','11010000100','11010010000',
'11010011100','1100011101011',
];

export interface BarcodeSymbols {
 values: number[];
 checksum: number;
 pattern: string[];
}

/**
 * Encodes an ASCII payload into Code 128 (Subset B) symbol values.
 */
export function encodeCode128(payload: string): BarcodeSymbols {
 const values: number[] = [START_B];
 let checksum = START_B;

 const sanitized = payload.replace(/[^\x20-\x7E]/g,'') ||'0';

 for (let i = 0; i < sanitized.length; i++) {
 const code = sanitized.charCodeAt(i);
 const value = code - 32; // Subset B maps ASCII → value
 values.push(value);
 checksum += value * (i + 1);
 }

 checksum = checksum % 103;
 values.push(checksum);

 const pattern = values.map((v) => PATTERNS[v]);
 pattern.push(PATTERNS[STOP]);

 return { values, checksum, pattern };
}

/**
 * Expands the module bit-strings into alternating bar/space runs.
 */
function expandToRuns(bits: string): { width: number; black: boolean }[] {
 const runs: { width: number; black: boolean }[] = [];
 for (const bit of bits) {
 const black = bit ==='1';
 const last = runs[runs.length - 1];
 if (last && last.black === black) {
 last.width += 1;
 } else {
 runs.push({ width: 1, black });
 }
 }
 return runs;
}

/**
 * Renders a Code 128 barcode as inline SVG markup (vector, print quality).
 * Dimensions are in millimetres so label printers can scale accurately.
 */
export function renderCode128Svg(payload: string, opts: { moduleWidth?: number; height?: number } = {}): string {
 if (!payload || !payload.trim()) return'';
 try {
 const moduleWidth = opts.moduleWidth ?? 0.6;
 const height = opts.height ?? 56;
 const { pattern } = encodeCode128(payload.trim());

 let totalWidth = 0;
 for (const bits of pattern) {
 totalWidth += bits.length * moduleWidth;
 }

 let x = 0;
 let path ='';
 pattern.forEach((bits) => {
 const runs = expandToRuns(bits);
 for (const run of runs) {
 if (run.black) {
 path +=`M${x.toFixed(2)} 0 h${(run.width * moduleWidth).toFixed(2)} v${height} h${(-run.width * moduleWidth).toFixed(2)} Z`;
 }
 x += run.width * moduleWidth;
 }
 });

 return`<svg xmlns="http://www.w3.org/2000/svg"width="${totalWidth.toFixed(2)}mm"height="${height}mm"viewBox="0 0 ${totalWidth.toFixed(2)} ${height}"preserveAspectRatio="none"><path d="${path.trim()}"fill="#000"/></svg>`;
 } catch {
 return'';
 }
}