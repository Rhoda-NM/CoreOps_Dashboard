// ZIP STORE format: deterministic entries, CRC32, UTF-8 names, no external tool.
const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(bytes: Buffer) { let c = 0xffffffff; for (const b of bytes) c = table[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
export function zip(files: Record<string, string>, maxBytes = 8 * 1024 * 1024) {
  const parts: Buffer[] = [], directory: Buffer[] = []; let offset = 0, total = 22;
  for (const [name, value] of Object.entries(files)) {
    const filename = Buffer.from(name), bytes = Buffer.from(value);
    total += 30 + 46 + filename.length * 2 + bytes.length;
    if (total > maxBytes) throw new Error("EXPORT_TOO_LARGE");
    const checksum = crc32(bytes), header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50); header.writeUInt16LE(20, 4); header.writeUInt16LE(0x800, 6);
    header.writeUInt16LE(33, 12); header.writeUInt32LE(checksum, 14); header.writeUInt32LE(bytes.length, 18); header.writeUInt32LE(bytes.length, 22); header.writeUInt16LE(filename.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6); central.writeUInt16LE(0x800, 8); central.writeUInt16LE(33, 14);
    central.writeUInt32LE(checksum, 16); central.writeUInt32LE(bytes.length, 20); central.writeUInt32LE(bytes.length, 24); central.writeUInt16LE(filename.length, 28); central.writeUInt32LE(offset, 42);
    parts.push(header, filename, bytes); directory.push(central, filename); offset += header.length + filename.length + bytes.length;
  }
  const end = Buffer.alloc(22), count = Object.keys(files).length, size = directory.reduce((n, b) => n + b.length, 0);
  end.writeUInt32LE(0x06054b50); end.writeUInt16LE(count, 8); end.writeUInt16LE(count, 10); end.writeUInt32LE(size, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...parts, ...directory, end]);
}
export function csv(rows: Record<string, unknown>[], columns: string[]) {
  const cell = (v: unknown) => {
    let s = v == null ? "" : v instanceof Date ? v.toISOString() : typeof v === "object" ? JSON.stringify(v) : String(v);
    // Prisma Decimal.toJSON() is a string: CSV must contain its exact digits,
    // without retaining JSON's enclosing quotation marks as cell content.
    if (v && typeof v === "object" && !(v instanceof Date)) { const decoded: unknown = JSON.parse(s); if (typeof decoded === "string") s = decoded; }
    if (/^[\s\u0000-\u001f]*[=+\-@]/.test(s) || /^[\t\r\n]/.test(s)) s = `'${s}`;
    return `"${s.replaceAll('"', '""')}"`;
  };
  return [columns.map(cell).join(","), ...rows.map(row => columns.map(c => cell(row[c])).join(","))].join("\r\n");
}
