import { getAgentsForDashboard } from "@/lib/agents-data";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function DashboardPage() {
  const { user } = await withAuth();
  if (!user) {
    redirect("/login");
  }

  const data = await getAgentsForDashboard();

  return (
    <main>
      <h1>Agent Dashboard</h1>

      <section>
        <h2>Overall</h2>
        <ul>
          <li>Total agents: {data.overall.totalAgents}</li>
          <li>Active agents: {data.overall.activeAgents}</li>
          <li>Paused agents: {data.overall.pausedAgents}</li>
          <li>Agents in error: {data.overall.errorAgents}</li>
          <li>Live agents: {data.overall.liveAgents}</li>
          <li>Paper agents: {data.overall.paperAgents}</li>
        </ul>
      </section>

      <section>
        <h2>Agents</h2>
        {data.agents.length === 0 ? (
          <p>No agents found.</p>
        ) : (
          <ul>
            {data.agents.map((agent) => (
              <li key={agent.id}>
                <Link href={`/dashboard/agents/${agent.id}`}>
                  {agent.name} ({agent.alpacaAccountType}) - {agent.status} -{" "}
                  {agent.symbol}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
