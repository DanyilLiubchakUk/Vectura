import Alpaca from "@alpacahq/alpaca-trade-api";

const PAPER_BASE_URL = "https://paper-api.alpaca.markets";
const LIVE_BASE_URL = "https://api.alpaca.markets";

export type AlpacaAccountType = "paper" | "live";

function getBaseUrl(accountType: AlpacaAccountType): string {
  return accountType === "paper" ? PAPER_BASE_URL : LIVE_BASE_URL;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  const r = err as { response?: { status?: number; data?: unknown } };
  if (r?.response?.status) return `HTTP ${r.response.status}`;
  return String(err);
}

async function tryValidate(
  keyId: string,
  secretKey: string,
  accountType: AlpacaAccountType
): Promise<{ alpacaAccountId: string } | { error: string }> {
  try {
    const alpaca = new Alpaca({
      keyId,
      secretKey,
      baseUrl: getBaseUrl(accountType),
    });
    const account = await alpaca.getAccount();
    if (account?.id) {
      return { alpacaAccountId: String(account.id) };
    }
    return { error: "No account ID in response" };
  } catch (err) {
    return { error: getErrorMessage(err) };
  }
}

/**
 * Validates Alpaca credentials by trying both paper and live endpoints.
 * Auto-detects account type;
 */
export async function validateAlpacaCredentials(
  keyId: string,
  secretKey: string
): Promise<
  | { success: true; alpacaAccountId: string; accountType: AlpacaAccountType }
  | { success: false; error: string }
> {
  const keyIdTrimmed = keyId?.trim();
  const secretTrimmed = secretKey?.trim();

  if (!keyIdTrimmed || !secretTrimmed) {
    return { success: false, error: "API key and secret are required" };
  }

  const paper = await tryValidate(keyIdTrimmed, secretTrimmed, "paper");
  if ("alpacaAccountId" in paper) {
    return {
      success: true,
      alpacaAccountId: paper.alpacaAccountId,
      accountType: "paper",
    };
  }

  const live = await tryValidate(keyIdTrimmed, secretTrimmed, "live");
  if ("alpacaAccountId" in live) {
    return {
      success: true,
      alpacaAccountId: live.alpacaAccountId,
      accountType: "live",
    };
  }

  const paperErr = "error" in paper ? paper.error : "unknown";
  const liveErr = "error" in live ? live.error : "unknown";
  return {
    success: false,
    error: `Invalid Alpaca credentials. Paper: ${paperErr}. Live: ${liveErr}. Check key ID and secret.`,
  };
}
