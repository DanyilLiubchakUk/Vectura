# Vectura — AI-Powered Trading Assistant

Vectura is an open-source project to build a fully automated, AI-assisted stock trading system. It analyzes news and market data, reasons about buy/hold/sell actions, executes paper or real trades, and exposes dashboards.

## What it is
- **AI reasoning + automation**: Models interpret news/sentiment + price action and emit decisions.
- **Trading**: Executes via a brokerage API(with paper and real modes).
- **Transparent**: Stores reasoning, confidence, and outcomes for auditability.
- **Free-tier friendly**: Designed to run using free/freemium tooling.

## High-level architecture
- **Frontend (Next.js)**: Dashboard to view portfolio, trades, metrics, and AI reasoning.
- **Workflows (Trigger.dev)**: Scheduled jobs for pre-market, intraday, and end-of-day tasks.
- **Database (Supabase)**: Stores decisions, logs, portfolio, and analytics; supports realtime updates.
- **Broker (Alpaca)**: Trading API for orders and market data.
- **AI Layer (OpenRouter)**: Access to a variety of models with fallback strategies.

## Planned capabilities
- Portfolio overview and performance timeline
- AI decision viewer with confidence scores
- News and sentiment feed
- Risk limits and trading cooldowns

## Getting started
- Create .env.local from .env.example, and isert your keys:
    - For supabase create your project, get your `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` varibles
    - For Trigger.dev add `TRIGGER_SECRET_KEY` from their dashboard. Make sure that `trigger.config.ts` has in `syncEnvVars` funciton all of your environment varibles, to have them on cloud. And `TRIGGER_PROJECT_REF` from dashboard `Tasks` tab: it shoud say you to run: `npx trigger.dev@latest init -p TRIGGER_PROJECT_REF`, where the `TRIGGER_PROJECT_REF` is `proj_(20 charecters)`
- Install dependencies and run dev server: `npm install && npm run dev`
- When need to deploy new version of scheduled cron, run `npx trigger.dev@latest deploy` (select to update versions if promted)