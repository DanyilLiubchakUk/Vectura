import { withAuth } from "@workos-inc/authkit-nextjs";
import { notFound, redirect } from "next/navigation";
import { getAgentDetail } from "@/lib/agents-data";

interface Params {
  params: Promise<{ agentId: string }>;
}

export default async function AgentDetailPage({ params }: Params) {
  const { user } = await withAuth();
  if (!user) {
    redirect("/login");
  }

  const { agentId } = await params;
  const data = await getAgentDetail(agentId);
  if (!data) {
    notFound();
  }

  const { agent, latestSnapshot, stats } = data;

  return (
    <main>
      <h1>Agent: {agent.name}</h1>

      <section>
        <h2>Basic info</h2>
        <ul>
          <li>Id: {agent.id}</li>
          <li>Symbol: {agent.symbol}</li>
          <li>Status: {agent.status}</li>
          <li>Account type: {agent.alpacaAccountType}</li>
          <li>Created at: {agent.createdAt}</li>
          <li>Updated at: {agent.updatedAt}</li>
          <li>Last error at: {agent.lastErrorAt ?? "—"}</li>
          <li>Last error code: {agent.lastErrorCode ?? "—"}</li>
        </ul>
      </section>

      <section>
        <h2>Latest account snapshot</h2>
        {latestSnapshot ? (
          <ul>
            <li>Date: {latestSnapshot.date}</li>
            <li>Equity: {latestSnapshot.equity}</li>
            <li>Cash: {latestSnapshot.cash}</li>
            <li>Equity max: {latestSnapshot.equityMax}</li>
            <li>Cash max: {latestSnapshot.cashMax}</li>
            <li>PDT daytrade count: {latestSnapshot.pdtDaytradeCount}</li>
            <li>
              Session start: {latestSnapshot.sessionStart ?? "not started"}
            </li>
            <li>Session end: {latestSnapshot.sessionEnd ?? "not ended"}</li>
          </ul>
        ) : (
          <p>No snapshots found for this agent.</p>
        )}
      </section>

      <section>
        <h2>Trade stats</h2>
        <ul>
          <li>Total trades: {stats.totalTrades}</li>
          <li>Last trade at: {stats.lastTradeAt ?? "—"}</li>
        </ul>
      </section>
    </main>
  );
}
