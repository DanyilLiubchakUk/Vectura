"use client";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface AppHeaderProps {
    title?: string;
}

export function AppHeader({ title }: AppHeaderProps) {
    const pathname = usePathname();

    const navItems = [
        { href: "/", label: "Home" },
        { href: "/about", label: "About" },
        { href: "/backtest", label: "Backtest" },
        { href: "/ranges", label: "Ranges" },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            <div className="flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">
                <div className="flex items-center gap-4 md:gap-6">
                    <Link
                        href="/"
                        className="flex items-center hover:opacity-80 transition-opacity"
                        aria-label="Vectura Home"
                    >
                        <Logo className="h-5 w-auto" />
                        <h1 className="sr-only">Vectura</h1>
                    </Link>
                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-1">
                        {navItems.map((item) => (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "px-3 py-2 text-sm font-medium rounded-md transition-colors",
                                    pathname === item.href
                                        ? "bg-accent text-accent-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                                )}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </nav>
                    {/* Mobile Navigation */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="md:hidden"
                                aria-label="Open menu"
                            >
                                <Menu className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-40">
                            {navItems.map((item) => (
                                <DropdownMenuItem key={item.href} asChild>
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            "w-full",
                                            pathname === item.href &&
                                                "bg-accent text-accent-foreground"
                                        )}
                                    >
                                        {item.label}
                                    </Link>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
                <div className="flex items-center gap-4">
                    {title && (
                        <h2 className="hidden md:block text-sm font-medium text-muted-foreground">
                            {title}
                        </h2>
                    )}
                    <ThemeToggle />
                </div>
            </div>
        </header>
    );
}
