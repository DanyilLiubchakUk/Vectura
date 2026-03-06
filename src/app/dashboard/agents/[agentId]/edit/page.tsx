import { getAgentDetail } from "@/lib/agents-data";
import { EditAgentForm } from "./edit-agent-form";
import { requireAuth } from "@/lib/require-auth";
import { ChevronLeftIcon } from "lucide-react";
import { notFound } from "next/navigation";
import Link from "next/link";

interface Params {
  params: Promise<{ agentId: string }>;
}

export default async function EditAgentPage({ params }: Params) {
  const user = await requireAuth();
  const { agentId } = await params;
  const data = await getAgentDetail(agentId, user.id);
  if (!data) {
    notFound();
  }

  return (
    <main aria-labelledby="edit-agent-heading">
      <header className="mb-6">
        <nav aria-label="Breadcrumb" className="mb-2">
          <Link
            href={`/dashboard/agents/${agentId}`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
          >
            <ChevronLeftIcon className="size-4" aria-hidden />
            Back to {data.agent.name}
          </Link>
        </nav>
        <h1 id="edit-agent-heading" className="text-xl font-semibold">
          Edit {data.agent.name}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Update agent name, symbol, and strategy parameters.
        </p>
      </header>

      <EditAgentForm
        agentId={agentId}
        initialName={data.agent.name}
        initialSymbol={data.agent.symbol}
        initialAlpacaAccountType={data.agent.alpacaAccountType}
        initialMaskedKeyId={data.agent.maskedKeyId}
        initialStrategyParams={data.agent.strategyParams}
      />
    </main>
  );
}
