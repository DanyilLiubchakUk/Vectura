"use client";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AnimationsToggle } from "@/components/animations-toggle";
import { useAuth } from "@workos-inc/authkit-nextjs/components";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOutAction } from "@/app/actions/auth";
import { Menu, LogIn, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface AppHeaderProps {
    title?: string;
}

export function AppHeader({ title }: AppHeaderProps) {
    const pathname = usePathname();
    const { user, loading } = useAuth();

    const navItems = [
        { href: "/", label: "Home" },
        { href: "/about", label: "About" },
        { href: "/backtest", label: "Backtest" },
        { href: "/ranges", label: "Ranges" },
    ];

    return (
        <header className="sticky top-0 z-50 w-full min-w-0 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 overflow-x-hidden">
            <div className="flex h-16 items-center justify-between gap-2 px-4 md:px-6 lg:px-8 min-w-0">
                <div className="flex items-center gap-2 md:gap-4 lg:gap-6 min-w-0 flex-1">
                    <Link
                        href="/"
                        className="shrink-0 flex items-center hover:opacity-80 transition-opacity"
                        aria-label="Vectura Home"
                    >
                        <Logo className="h-5 w-auto" />
                        <h1 className="sr-only">Vectura</h1>
                    </Link>
                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-1 min-w-0">
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
                <div className="flex items-center gap-1 sm:gap-2 md:gap-4 shrink-0">
                    {title && (
                        <h2 className="hidden lg:block text-sm font-medium text-muted-foreground truncate max-w-[140px] xl:max-w-[200px]" title={title}>
                            {title}
                        </h2>
                    )}
                    {!loading && (
                        <>
                            {!user ? (
                                <Button variant="ghost" size="sm" asChild className="shrink-0">
                                    <Link
                                        href="/login"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            window.location.assign("/login");
                                        }}
                                    >
                                        <LogIn className="h-4 w-4 sm:mr-1" />
                                        <span className="hidden sm:inline">Sign in</span>
                                    </Link>
                                </Button>
                            ) : (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="gap-1.5 shrink-0 min-w-0"
                                        >
                                            <User className="h-4 w-4 shrink-0" />
                                            <span className="hidden md:inline max-w-[100px] lg:max-w-[140px] truncate">
                                                {user.email ?? user.firstName ?? "Account"}
                                            </span>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem disabled className="opacity-100">
                                            <span className="text-muted-foreground truncate max-w-[200px]">
                                                {user.email}
                                            </span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <form action={signOutAction}>
                                            <DropdownMenuItem asChild>
                                                <button type="submit" className="w-full cursor-pointer">
                                                    Sign out
                                                </button>
                                            </DropdownMenuItem>
                                        </form>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                        </>
                    )}
                    <span className="shrink-0 flex items-center gap-1">
                        <AnimationsToggle />
                        <ThemeToggle />
                    </span>
                </div>
            </div>
        </header>
    );
}
