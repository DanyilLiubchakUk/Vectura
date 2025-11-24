import { gzip, gunzip } from "zlib";
import { promisify } from "util";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export async function compressJson(
    compact: Array<[number, number]>
): Promise<Buffer> {
    const serialized = JSON.stringify(compact);
    return gzipAsync(Buffer.from(serialized));
}

export async function decompressGzip(buffer: Buffer): Promise<string> {
    return gunzipAsync(buffer).then((decompressed) =>
        decompressed.toString("utf-8")
    );
}

export function isHexString(value: string): boolean {
    return /^[0-9a-fA-F]+$/.test(value);
}

export function decodeHexString(raw: string): Buffer {
    return Buffer.from(raw, "hex");
}

export function decodeSupabaseBytea(raw: unknown): Buffer {
    if (Buffer.isBuffer(raw)) return raw;
    if (raw instanceof ArrayBuffer) return Buffer.from(raw);
    if (ArrayBuffer.isView(raw))
        return Buffer.from((raw as ArrayBufferView).buffer);

    if (typeof raw === "string") {
        if (raw.startsWith("\\x")) {
            const hexString = raw.replace(/\\x/g, "");
            const jsonString = Buffer.from(hexString, "hex").toString("utf-8");
            try {
                const parsed = JSON.parse(jsonString);
                if (
                    parsed &&
                    parsed.type === "Buffer" &&
                    Array.isArray(parsed.data)
                ) {
                    return Buffer.from(parsed.data);
                }
            } catch {
                if (hexString.length && isHexString(hexString)) {
                    return decodeHexString(hexString);
                }
            }
        }

        try {
            const parsed = JSON.parse(raw);
            if (
                parsed &&
                parsed.type === "Buffer" &&
                Array.isArray(parsed.data)
            ) {
                return Buffer.from(parsed.data);
            }
        } catch {}

        const trimmed = raw.trim();
        if (isHexString(trimmed)) {
            return decodeHexString(trimmed);
        }

        const asBase64 = Buffer.from(trimmed, "base64");
        if (asBase64.length >= 2) return asBase64;

        return Buffer.from(trimmed, "binary");
    }

    throw new Error("Unsupported bytea payload type");
}

export function isGzipBuffer(buffer: Buffer): boolean {
    return buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
}
