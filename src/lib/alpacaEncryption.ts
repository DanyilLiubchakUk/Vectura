import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

export type AlpacaCredentials = {
  keyId: string;
  secret: string;
};

type StoredAlpacaCiphertext = {
  iv: string;
  ct: string;
  tag: string;
};

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;
const MASTER_KEY_LENGTH_BYTES = 32;

export function encryptAlpacaCredentials(
  credentials: AlpacaCredentials,
  masterKey: Buffer,
): string {
  if (masterKey.length !== MASTER_KEY_LENGTH_BYTES) {
    throw new Error(
      `ALPACA_ENCRYPTION_MASTER_KEY must be ${MASTER_KEY_LENGTH_BYTES} bytes; got ${masterKey.length}`,
    );
  }

  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, masterKey, iv);
  const plaintext = JSON.stringify(credentials);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  const payload: StoredAlpacaCiphertext = {
    iv: iv.toString("base64"),
    ct: ciphertext.toString("base64"),
    tag: tag.toString("base64"),
  };

  return JSON.stringify(payload);
}

export function decryptAlpacaCredentials(
  serialized: string,
  masterKey: Buffer,
): AlpacaCredentials {
  if (masterKey.length !== MASTER_KEY_LENGTH_BYTES) {
    throw new Error(
      `ALPACA_ENCRYPTION_MASTER_KEY must be ${MASTER_KEY_LENGTH_BYTES} bytes; got ${masterKey.length}`,
    );
  }

  let payload: StoredAlpacaCiphertext;
  try {
    payload = JSON.parse(serialized) as StoredAlpacaCiphertext;
  } catch {
    throw new Error("Invalid alpaca_encrypted payload: not valid JSON");
  }

  if (!payload.iv || !payload.ct || !payload.tag) {
    throw new Error("Invalid alpaca_encrypted payload: missing fields");
  }

  const iv = Buffer.from(payload.iv, "base64");
  const ciphertext = Buffer.from(payload.ct, "base64");
  const tag = Buffer.from(payload.tag, "base64");

  const decipher = createDecipheriv(ALGORITHM, masterKey, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");

  const parsed = JSON.parse(decrypted) as Partial<AlpacaCredentials>;

  if (typeof parsed.keyId !== "string" || typeof parsed.secret !== "string") {
    throw new Error("Invalid decrypted Alpaca credentials shape");
  }

  return {
    keyId: parsed.keyId,
    secret: parsed.secret,
  };
}
