import { CreateAgentForm } from "./create-agent-form";
import { requireAuth } from "@/lib/require-auth";
import { ChevronLeftIcon } from "lucide-react";
import Link from "next/link";

export default async function NewAgentPage() {
  const user = await requireAuth();

  return (
    <main aria-labelledby="create-agent-heading">
      <header className="mb-6">
        <nav aria-label="Breadcrumb" className="mb-2">
          <Link
            href="/dashboard/agents"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
          >
            <ChevronLeftIcon className="size-4" aria-hidden />
            Back to agents
          </Link>
        </nav>
        <h1 id="create-agent-heading" className="text-xl font-semibold">
          Create trading agent
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Connect an Alpaca account to start automated grid trading.
        </p>
      </header>

      <section aria-labelledby="form-heading">
        <CreateAgentForm />
      </section>
    </main>
  );
}
