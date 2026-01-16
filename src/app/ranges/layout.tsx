import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Manage Data Ranges",
    description: "Manage the data range for every stock that is cached, ensuring up-to-date and accurate historical information for your strategies.",
    alternates: {
        canonical: '/ranges',
    },
    openGraph: {
        title: "Manage Data Ranges",
        description: "Manage the data range for every stock that is cached, ensuring up-to-date and accurate historical information for your strategies.",
        url: '/ranges',
        siteName: "Vectura",
        locale: 'en_US',
        type: 'website',
        images: [
            {
                url: '/images/social/admin-image.png',
                width: 1200,
                height: 630,
                alt: 'Manage Data Ranges',
                type: 'image/png',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Manage Data Ranges',
        description: "Manage the data range for every stock that is cached, ensuring up-to-date and accurate historical information for your strategies.",
        images: ['/images/social/admin-image.png'],
    },
};

export default function RangesLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
