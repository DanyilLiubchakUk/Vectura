import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Manage Data Ranges",
    description: "Manage the data range for every stock that is cached, ensuring up-to-date and accurate historical information for your strategies.",
    alternates: {
        canonical: '/ranges',
    },
};

export default function RangesLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
