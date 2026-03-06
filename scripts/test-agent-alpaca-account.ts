import { getAlpacaEncryptionMasterKey } from "../src/lib/alpacaMasterKey";
import { decryptAlpacaCredentials } from "../src/lib/alpacaEncryption";
import { getAlpacaBaseUrl } from "../src/utils/alpaca/config";
import Alpaca from "@alpacahq/alpaca-trade-api";
import { prisma } from "../src/lib/db-cli";
import type { AlpacaAccountType } from "../src/lib/domain";

function getAgentIdFromArgs(): string {
  const [, , argAgentId] = process.argv;
  const envAgentId = process.env.AGENT_ID;

  const agentId = (argAgentId ?? envAgentId ?? "").trim();
  if (!agentId) {
    throw new Error(
      "Agent id is required. Pass it as `npm run agent:alpaca:test -- <agent-id>` or set AGENT_ID in your environment.",
    );
  }

  return agentId;
}

function assertAccountType(
  value: string,
): AlpacaAccountType {
  if (value === "paper" || value === "live") {
    return value;
  }
  throw new Error(
    `Invalid alpacaAccountType '${value}' on trading_agents row; expected 'paper' or 'live'.`,
  );
}

async function main(): Promise<void> {
  const agentId = getAgentIdFromArgs();

  console.log(`Testing Alpaca credentials for agent ${agentId}...`);

  const agent = await prisma.tradingAgent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      alpacaEncrypted: true,
      alpacaAccountId: true,
      alpacaAccountType: true,
    },
  });

  if (!agent) {
    throw new Error(`No trading_agents row found for id ${agentId}`);
  }

  if (!agent.alpacaEncrypted) {
    throw new Error(
      `Agent ${agentId} has no alpaca_encrypted value; create or update the agent via the UI first.`,
    );
  }

  const accountType = assertAccountType(agent.alpacaAccountType);

  const masterKey = await getAlpacaEncryptionMasterKey();
  const { keyId, secret } = decryptAlpacaCredentials(
    agent.alpacaEncrypted,
    masterKey,
  );

  const alpaca = new Alpaca({
    keyId,
    secretKey: secret,
    baseUrl: getAlpacaBaseUrl(accountType),
  });

  const account = await alpaca.getAccount();

  if (!account?.id) {
    throw new Error("Alpaca getAccount() succeeded but returned no account id");
  }

  console.log(
    `Alpaca getAccount OK for agent ${agent.id} → Alpaca account ${String(
      account.id,
    )} (type=${accountType}).`,
  );
}

main()
  .catch((error) => {
    const message =
      error instanceof Error ? error.message : String(error);
    console.error("Agent Alpaca test failed:", message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
