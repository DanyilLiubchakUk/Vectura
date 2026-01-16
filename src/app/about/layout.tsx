import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "About Vectura",
    description: "The story behind Vectura, the challenges faced with slow computation, the limitations encountered, and the solutions developed to overcome them.",
    alternates: {
        canonical: '/about',
    },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
