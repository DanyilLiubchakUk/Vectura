"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageHeaderProps {
    title: string;
    description?: string;
}

export function PageHeader({ title, description }: PageHeaderProps) {
    return (
        <div>
            <Link
                href="/"
                className="inline-flex items-center text-xs md:text-sm text-muted-foreground hover:text-foreground mb-4 md:mb-6"
            >
                <ArrowLeft className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                Back to home
            </Link>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1.5 md:mb-2">
                {title}
            </h1>
            {description && (
                <p className="text-sm md:text-base text-muted-foreground">
                    {description}
                </p>
            )}
        </div>
    );
}
