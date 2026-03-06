import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAgentsForDashboard } from "@/lib/agents-data";
import { Card, CardContent } from "@/components/ui/card";
import { requireAuth } from "@/lib/require-auth";
import { TradingAgentStatus } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlusIcon } from "lucide-react";
import Link from "next/link";

export default async function AgentsPage() {
  const user = await requireAuth();
  const data = await getAgentsForDashboard(user.id);

  return (
    <main aria-labelledby="agents-page-heading">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 id="agents-page-heading" className="text-xl font-semibold">
          Agents
        </h1>
        <Button asChild>
          <Link href="/dashboard/agents/new">
            <PlusIcon className="size-4" aria-hidden />
            Create agent
          </Link>
        </Button>
      </header>

      {data.agents.length === 0 ? (
        <Card>
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
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Name</TableHead>
                <TableHead scope="col">Symbol</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col">Account type</TableHead>
                <TableHead scope="col">Latest snapshot</TableHead>
                <TableHead scope="col">Last trade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.agents.map((agent) => (
                <TableRow key={agent.id}>
                  <TableCell>
                    <Link
                      href={`/dashboard/agents/${agent.id}`}
                      className="font-medium hover:underline"
                    >
                      {agent.name}
                    </Link>
                  </TableCell>
                  <TableCell>{agent.symbol}</TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell>{agent.alpacaAccountType}</TableCell>
                  <TableCell>
                    {agent.latestSnapshot
                      ? `${agent.latestSnapshot.date} (equity $${agent.latestSnapshot.equity.toFixed(0)}, cash $${agent.latestSnapshot.cash.toFixed(0)})`
                      : "—"}
                  </TableCell>
                  <TableCell>{agent.lastTradeAt ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </main>
  );
}
