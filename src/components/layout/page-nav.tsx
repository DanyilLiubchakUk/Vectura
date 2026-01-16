"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageNavProps {
    previousLink?: { href: string; label: string };
    nextLink?: { href: string; label: string };
}

export function PageNav({ previousLink, nextLink }: PageNavProps) {
    return (
        <div className="flex gap-4">
            {previousLink ? (
                <Link
                    href={previousLink.href}
                    className="flex-1 [&:hover_button]:bg-muted [&:hover_button]:text-accent-foreground"
                >
                    <Button variant="outline" className="w-full">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {previousLink.label}
                    </Button>
                </Link>
            ) : (
                <Link
                    href="/"
                    className="flex-1 [&:hover_button]:bg-muted [&:hover_button]:text-accent-foreground"
                >
                    <Button variant="outline" className="w-full">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to home
                    </Button>
                </Link>
            )}
            {nextLink && (
                <Link
                    href={nextLink.href}
                    className="flex-1 [&:hover_button]:bg-muted-foreground [&:hover_button]:text-accent"
                >
                    <Button className="w-full">
                        {nextLink.label}
                        <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                    </Button>
                </Link>
            )}
        </div>
    );
}
