import {
  encryptAlpacaCredentials,
  decryptAlpacaCredentials,
} from "../src/lib/alpacaEncryption";
import { getAlpacaEncryptionMasterKey } from "../src/lib/alpacaMasterKey";

async function main() {
  const masterKey = await getAlpacaEncryptionMasterKey();

  const original = {
    keyId: "TEST_KEY_ID",
    secret: "TEST_SECRET_VALUE",
  };

  const ciphertext = encryptAlpacaCredentials(original, masterKey);
  const decrypted = decryptAlpacaCredentials(ciphertext, masterKey);

  const matches =
    decrypted.keyId === original.keyId && decrypted.secret === original.secret;

  console.log("Infisical encryption test - credentials match:", matches);
  console.log(
    "Ciphertext sample (string length):",
    typeof ciphertext === "string" ? ciphertext.length : 0,
  );
}

main().catch((error) => {
  console.error("Infisical encryption test failed:", error);
  process.exit(1);
});
