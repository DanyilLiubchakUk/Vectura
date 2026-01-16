import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Development Journey",
    description: "Explore the development journey of Vectura, from initial challenges to solutions and growth insights.",
    alternates: {
        canonical: '/development-journey',
    },
    openGraph: {
        title: "Development Journey",
        description: "Explore the development journey of Vectura, from initial challenges to solutions and growth insights.",
        url: '/development-journey',
        siteName: "Vectura",
        locale: 'en_US',
        type: 'website',
        images: [
            {
                url: '/images/social/educational-image.png',
                width: 1200,
                height: 630,
                alt: 'Development Journey',
                type: 'image/png',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'Development Journey',
        description: "Explore the development journey of Vectura, from initial challenges to solutions and growth insights.",
        images: ['/images/social/educational-image.png'],
    },
};

export default function DevelopmentJourneyLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
