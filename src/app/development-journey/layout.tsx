import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Development Journey",
    description: "Explore the development journey of Vectura, from initial challenges to solutions and growth insights.",
    alternates: {
        canonical: '/development-journey',
    },
};

export default function DevelopmentJourneyLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
