import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { getAgentDetail } from "@/lib/agents-data";
import { TradingAgentStatus } from "@/lib/domain";
import { requireAuth } from "@/lib/require-auth";
import { AgentActions } from "./agent-actions";
import { ChevronLeftIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { notFound } from "next/navigation";
import Link from "next/link";

interface Params {
  params: Promise<{ agentId: string }>;
}

export default async function AgentDetailPage({ params }: Params) {
  const user = await requireAuth();
  const { agentId } = await params;
  const data = await getAgentDetail(agentId, user.id);
  if (!data) {
    notFound();
  }

  const { agent, latestSnapshot, stats } = data;

  return (
    <main aria-labelledby="agent-detail-heading">
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 id="agent-detail-heading" className="text-xl font-semibold">
              {agent.name}
            </h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-2 text-sm">
              <span>{agent.symbol}</span>
              <span aria-hidden>·</span>
              <span>{agent.alpacaAccountType}</span>
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
            </p>
          </div>
          <AgentActions
            agentId={agent.id}
            agentName={agent.name}
            status={agent.status}
          />
        </div>
      </header>

      <section aria-labelledby="basic-info-heading" className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle id="basic-info-heading">Basic info</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Agent ID</dt>
                <dd className="font-mono text-xs">{agent.id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Symbol</dt>
                <dd>{agent.symbol}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd>{agent.status}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Account type</dt>
                <dd>{agent.alpacaAccountType}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd>{new Date(agent.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Updated</dt>
                <dd>{new Date(agent.updatedAt).toLocaleString()}</dd>
              </div>
              {agent.lastErrorAt && (
                <>
                  <div>
                    <dt className="text-muted-foreground">Last error at</dt>
                    <dd>{new Date(agent.lastErrorAt).toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Last error code</dt>
                    <dd>{agent.lastErrorCode ?? "—"}</dd>
                  </div>
                </>
              )}
            </dl>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="snapshot-heading" className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle id="snapshot-heading">Latest account snapshot</CardTitle>
          </CardHeader>
          <CardContent>
            {latestSnapshot ? (
              <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">Date</dt>
                  <dd>{latestSnapshot.date}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Equity</dt>
                  <dd>${latestSnapshot.equity.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Cash</dt>
                  <dd>${latestSnapshot.cash.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Equity max</dt>
                  <dd>${latestSnapshot.equityMax.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Cash max</dt>
                  <dd>${latestSnapshot.cashMax.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">PDT daytrades</dt>
                  <dd>{latestSnapshot.pdtDaytradeCount}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Session start</dt>
                  <dd>{latestSnapshot.sessionStart ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Session end</dt>
                  <dd>{latestSnapshot.sessionEnd ?? "—"}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-muted-foreground text-sm">
                No snapshots found for this agent.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="trade-stats-heading">
        <Card>
          <CardHeader>
            <CardTitle id="trade-stats-heading">Trade stats</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Total trades</dt>
                <dd>{stats.totalTrades}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last trade at</dt>
                <dd>{stats.lastTradeAt ?? "—"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
