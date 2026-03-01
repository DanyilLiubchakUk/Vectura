import { InfisicalSDK } from "@infisical/sdk";

const MASTER_KEY_NAME_FALLBACK = "ALPACA_ENCRYPTION_MASTER_KEY";
const MASTER_KEY_LENGTH_BYTES = 32;

let cachedMasterKey: Buffer | null = null;
let infisicalClientPromise: Promise<InfisicalSDK> | null = null;

async function getInfisicalClient(): Promise<InfisicalSDK> {
  if (infisicalClientPromise) {
    return infisicalClientPromise;
  }

  const clientId = process.env.INFISICAL_CLIENT_ID;
  const clientSecret = process.env.INFISICAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "INFISICAL_CLIENT_ID and INFISICAL_CLIENT_SECRET must be set to use Infisical SDK",
    );
  }

  infisicalClientPromise = (async () => {
    const client = new InfisicalSDK();

    await client.auth().universalAuth.login({
      clientId,
      clientSecret,
    });

    return client;
  })();

  return infisicalClientPromise;
}

export async function getAlpacaEncryptionMasterKey(): Promise<Buffer> {
  if (cachedMasterKey) {
    return cachedMasterKey;
  }

  const environment = process.env.INFISICAL_ENVIRONMENT;
  const projectId = process.env.INFISICAL_PROJECT_ID;
  const secretName =
    process.env.INFISICAL_ALPACA_MASTER_KEY_NAME ?? MASTER_KEY_NAME_FALLBACK;

  if (!environment || !projectId) {
    throw new Error(
      "INFISICAL_ENVIRONMENT and INFISICAL_PROJECT_ID must be set to fetch ALPACA_ENCRYPTION_MASTER_KEY",
    );
  }

  const client = await getInfisicalClient();

  const secret = await client.secrets().getSecret({
    environment,
    projectId,
    secretName,
    viewSecretValue: true,
  });

  const value = secret.secretValue;

  if (!value) {
    throw new Error(
      `Infisical secret ${secretName} has no value (secretValue is empty)`,
    );
  }

  const key = Buffer.from(value, "base64");

  if (key.length !== MASTER_KEY_LENGTH_BYTES) {
    throw new Error(
      `ALPACA_ENCRYPTION_MASTER_KEY must decode to ${MASTER_KEY_LENGTH_BYTES} bytes, but got ${key.length}`,
    );
  }

  cachedMasterKey = key;
  return cachedMasterKey;
}
