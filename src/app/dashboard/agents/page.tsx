import { getAgentsForDashboard } from "@/lib/agents-data";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AgentsPage() {
  const { user } = await withAuth();
  if (!user) {
    redirect("/login");
  }

  const data = await getAgentsForDashboard();

  return (
    <main>
      <h1>Agents</h1>

      {data.agents.length === 0 ? (
        <p>No agents found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Symbol</th>
              <th>Status</th>
              <th>Account type</th>
              <th>Last snapshot</th>
              <th>Last trade at</th>
            </tr>
          </thead>
          <tbody>
            {data.agents.map((agent) => (
              <tr key={agent.id}>
                <td>
                  <Link href={`/dashboard/agents/${agent.id}`}>
                    {agent.name}
                  </Link>
                </td>
                <td>{agent.symbol}</td>
                <td>{agent.status}</td>
                <td>{agent.alpacaAccountType}</td>
                <td>
                  {agent.latestSnapshot
                    ? `${agent.latestSnapshot.date} (equity ${agent.latestSnapshot.equity}, cash ${agent.latestSnapshot.cash})`
                    : "—"}
                </td>
                <td>{agent.lastTradeAt ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
