import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Vectura - Trading Strategy Backtesting Platform',
        short_name: 'Vectura',
        description: 'Simulate and analyze your trading strategies with historical market data. Professional backtesting platform for algorithmic trading.',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1e40af',
        orientation: 'any',
        categories: ['finance', 'productivity', 'business'],
        lang: 'en-US',
        dir: 'ltr',
        icons: [
            {
                src: '/favicon.ico',
                sizes: '16x16 32x32 48x48',
                type: 'image/x-icon',
            },
            {
                src: '/icon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
                purpose: 'any',
            },
            {
                src: '/web-app-manifest-192x192.png',
                sizes: '192x192',
                type: 'image/png',
                purpose: 'any',
            },
            {
                src: '/web-app-manifest-512x512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any',
            },
        ],
    }
}