"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  TradingAgentStatus,
  type TradingAgentStatus as TradingAgentStatusType,
} from "@/lib/domain";
import { PauseIcon, PlayIcon, Trash2Icon, PencilIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

interface AgentActionsProps {
  agentId: string;
  agentName: string;
  status: TradingAgentStatusType;
}

export function AgentActions({
  agentId,
  agentName,
  status,
}: AgentActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  async function handleStatusToggle() {
    setIsToggling(true);
    try {
      const newStatus =
        status === TradingAgentStatus.ACTIVE
          ? TradingAgentStatus.PAUSED
          : TradingAgentStatus.ACTIVE;
      const res = await fetch(`/api/agents/${agentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setIsToggling(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/agents/${agentId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/dashboard/agents");
        router.refresh();
      }
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Agent actions">
      <Button
        variant="outline"
        size="sm"
        onClick={handleStatusToggle}
        disabled={isToggling}
        aria-label={
          status === TradingAgentStatus.ACTIVE ? "Pause agent" : "Activate agent"
        }
      >
        {status === TradingAgentStatus.ACTIVE ? (
          <>
            <PauseIcon className="size-4" aria-hidden />
            Pause
          </>
        ) : (
          <>
            <PlayIcon className="size-4" aria-hidden />
            Activate
          </>
        )}
      </Button>
      <Button variant="outline" size="sm" asChild>
        <Link href={`/dashboard/agents/${agentId}/edit`} aria-label={`Edit ${agentName}`}>
          <PencilIcon className="size-4" aria-hidden />
          Edit
        </Link>
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            size="sm"
            aria-label={`Delete agent ${agentName}`}
          >
            <Trash2Icon className="size-4" aria-hidden />
            Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
              <Trash2Icon className="size-4" aria-hidden />
            </AlertDialogMedia>
            <AlertDialogTitle>Delete agent?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{agentName}&quot; and all its
              associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
