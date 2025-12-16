"use client";

import { cn } from "@/lib/utils";

interface LogoProps extends React.SVGProps<SVGSVGElement> {
    className?: string;
}

export function Logo({ className, ...props }: LogoProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 480 75"
            fill="currentColor"
            className={cn("text-foreground", className)}
            {...props}
        >
            <title>VECTURA Logo</title>
            <desc>
                A stylized representation of the word VECTURA created with
                geometric shapes for each letter.
            </desc>
            <g id="VECTURA">
                <g id="letter-V">
                    <path d="M 0 0 L 30 75 L 60 0" />
                </g>
                <g id="letter-E">
                    <path d="M 75 0 L 75 25 L 120 12.5" />
                    <path d="M 75 25 L 75 50 L 120 37.5" />
                    <path d="M 75 50 L 75 75 L 120 62.5" />
                </g>
                <g id="letter-C">
                    <path d="M 135 0 L 135 37.5 L 180 18.75" />
                    <path d="M 135 37.5 L 135 75 L 180 56.25" />
                </g>
                <g id="letter-T">
                    <path d="M 195 0 L 255 0 L 255 15 L 240 15 L 225 75 L 210 15 L 195 15" />
                </g>
                <g id="letter-U">
                    <path d="M 270 75 L 285 0 L 300 75" />
                    <path d="M 300 75 L 315 0 L 330 75" />
                </g>
                <g id="letter-R">
                    <path d="M 345 0 L 405 18.75 L 345 37.5" />
                    <path d="M 345 37.5 L 360 37.5 L 360 75 L 345 75 L 345 37.5" />
                    <path d="M 360 37.5 L 405 75 L 390 75 L 345 37.5" />
                </g>
                <g id="letter-A">
                    <path d="M 420 75 L 450 0 L 480 75" />
                </g>
            </g>
        </svg>
    );
}
