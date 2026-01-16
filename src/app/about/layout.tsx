import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "About Vectura",
    description: "The story behind Vectura, the challenges faced with slow computation, the limitations encountered, and the solutions developed to overcome them.",
    alternates: {
        canonical: '/about',
    },
    openGraph: {
        title: "About Vectura",
        description: "Represents the Vectura story, challenges overcome, and journey of development.",
        url: '/about',
        siteName: "Vectura",
        locale: 'en_US',
        type: 'website',
        images: [
            {
                url: '/images/social/about-image.png',
                width: 1200,
                height: 630,
                alt: 'About Vectura',
                type: 'image/png',
            },
        ],
    },
    twitter: {
        card: 'summary_large_image',
        title: 'About Vectura',
        description: "Represents the Vectura story, challenges overcome, and journey of development.",
        images: ['/images/social/about-image.png'],
    },
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
