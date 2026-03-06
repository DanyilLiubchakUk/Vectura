import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAgentsForDashboard } from "@/lib/agents-data";
import { TradingAgentStatus } from "@/lib/domain";
import { requireAuth } from "@/lib/require-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const user = await requireAuth();
  const data = await getAgentsForDashboard(user.id);

  return (
    <main aria-labelledby="dashboard-heading">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 id="dashboard-heading" className="text-xl font-semibold">
          Agent Dashboard
        </h1>
        <Button asChild>
          <Link href="/dashboard/agents/new">
            <PlusIcon className="size-4" aria-hidden />
            Create agent
          </Link>
        </Button>
      </header>

      <section
        aria-labelledby="overall-stats-heading"
        className="mb-8"
      >
        <h2 id="overall-stats-heading" className="sr-only">
          Overall statistics
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total agents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{data.overall.totalAgents}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {data.overall.activeAgents}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Paused</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {data.overall.pausedAgents}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">In error</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{data.overall.errorAgents}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Live accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {data.overall.liveAgents}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Paper accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {data.overall.paperAgents}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section aria-labelledby="agents-heading">
        <div className="flex items-center justify-between gap-4">
          <h2 id="agents-heading" className="text-lg font-medium">
            Agents
          </h2>
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/agents">View all</Link>
          </Button>
        </div>
        {data.agents.length === 0 ? (
          <Card className="mt-4">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-center">
                No agents yet. Create one to get started.
              </p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/agents/new">Create agent</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <ul
            className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            role="list"
          >
            {data.agents.slice(0, 6).map((agent) => (
              <li key={agent.id}>
                <Link
                  href={`/dashboard/agents/${agent.id}`}
                  className="block"
                  aria-label={`View ${agent.name} agent details`}
                >
                  <Card className="transition-colors hover:bg-muted/50">
                    <CardHeader className="flex flex-row items-start justify-between gap-2">
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                      <Badge
                        variant={
                          agent.status === TradingAgentStatus.ACTIVE
                            ? "default"
                            : agent.status === TradingAgentStatus.PAUSED
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {agent.status}
                      </Badge>
                    </CardHeader>
                    <CardContent className="text-sm">
                      <p className="text-muted-foreground">
                        {agent.symbol} · {agent.alpacaAccountType}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
