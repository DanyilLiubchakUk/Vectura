# Vectura - Auto Trading

Vectura is an open-source project to build a fully automated stock trading system. It analyzes market data, reasons about buy/hold/sell actions, executes paper or real trades, and exposes dashboards.

## What it is

-   **Automation**: Interpret price action and emit decisions.
-   **Trading**: Executes via a brokerage API (with paper and real modes).
-   **Free-tier friendly**: Designed to run using free/freemium tooling.

## High-level architecture

-   **Frontend (Next.js)**: Dashboard.
-   **Workflows (Trigger.dev)**: Scheduled jobs for intraday trading tasks (runs during market hours, including pre-market for stock split check).
-   **Database (Supabase)**: Stores historical bars, trade decisions, portfolio state, and analytics.
-   **State management (Zustand)**: In-memory state management for backtesting and web.
-   **Broker (Alpaca)**: Trading API for orders and market data.

## Backtesting

Vectura includes a comprehensive backtesting system with two execution modes:

### Local Mode

-   Runs on your local machine via Server-Sent Events (SSE)
-   Streams progress updates in real-time
-   Suitable for quick backtests and development
-   No cloud costs - uses your local resources
-   Supports running multiple backtests in parallel

### Cloud Mode (AWS Lambda)

-   Runs on AWS Lambda via WebSocket API Gateway
-   Handles long-running backtests (up to 15 minutes)
-   Real-time progress streaming
-   Free tier eligible (1M requests/month, 400K GB-seconds/month)
-   Supports running multiple backtests in parallel

### Quick AWS Setup

For detailed AWS Lambda setup instructions, see [docs/aws-lambda-backtest-setup.md](docs/aws-lambda-backtest-setup.md).

**Quick steps:**

1. Create IAM role with Lambda execution and API Gateway permissions
2. Create Lambda function (`backtest-handler`) with Node.js 20.x runtime
3. Create API Gateway WebSocket API with routes: `$connect`, `$disconnect`, `$default`
4. Set environment variables in Lambda (Supabase, Alpaca, AlphaVantage keys)
5. Set `NEXT_PUBLIC_WS_URL` in your `.env.local` to the WebSocket URL
6. Build and deploy: `npm run deploy:lambda`
7. Upload `backtest-lambda.zip` to Lambda

**Environment Variables for Cloud Mode:**

```env
NEXT_PUBLIC_WS_URL=wss://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod
```

## Planned capabilities

-   **Dashboard UI**: Build out the Next.js frontend to display:
    -   Portfolio overview
    -   Trade history and analytics
    -   Real-time performance metrics
    -   Algorithm configuration interface
    -   Backtest results visualization

## Getting started

### Prerequisites

1. Create `.env.local` from `.env.example` and insert your API keys:

    - **Supabase**: Create your project and get:
        - `NEXT_PUBLIC_SUPABASE_URL`
        - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - **Trigger.dev**:
        - Get `TRIGGER_SECRET_KEY` from their dashboard
        - Get `TRIGGER_PROJECT_REF` from the dashboard `Tasks` tab - `npx trigger.dev@latest init -p TRIGGER_PROJECT_REF` (`TRIGGER_PROJECT_REF`: `proj_` followed by 20 characters)
        - Make sure `trigger.config.ts` has all your environment variables in the `syncEnvVars` function to sync them to the cloud
    - **Alpaca**: Create a trading account and get:
        - `APCA_API_BASE_URL` (endpoint should NOT end with `/v2/` - the SDK adds it automatically in v3)
        - `APCA_API_KEY_ID`
        - `APCA_API_SECRET_KEY`
    - **Alpha Vantage**: Create an API key at https://www.alphavantage.co/support/#api-key
        - `ALPHA_VANTAGE_API_KEY`

2. Install dependencies: `npm install`

3. Set up database tables (see SQL schemas below)

4. Run the development server: `npm run dev`

5. Deploy Trigger.dev workflows: `npx trigger.dev@latest deploy` (select to update versions if prompted)

### Managing Stock Ranges

The `/ranges` page allows you to manage historical stock data ranges stored in the database. Stock ranges are automatically created when you run backtests, and you can manage them through this interface.

**Features:**

-   **View all ranges**: See all stocks with stored historical data, including their date ranges
-   **Delete ranges**: Remove all stored data for a specific stock symbol
-   **Adjust range size**: Make ranges bigger or smaller by changing the start and end dates
-   **Move ranges**: Shift the entire date range to a different time period
-   **Smart suggestions**: When a selected date is a closed market day, the system suggests the nearest open trading days

**How to use:**

1. Navigate to `/ranges` page
2. Each stock symbol is displayed as a card showing:
    - Current stored date range
    - Interactive slider to adjust the range
    - Date input fields for precise date selection
3. Adjust the range using:
    - **Slider**: Drag the handles to change start/end dates
    - **Date inputs**: Type or select specific dates
4. The system validates dates in real-time:
    - Checks if dates are market trading days
    - Suggests nearest open days if a closed day is selected
5. Click "Update Range" to save changes:
    - Missing data will be automatically downloaded
    - Progress is shown in real-time
    - Data outside the new range is automatically deleted

**Note**: Ranges are automatically created when you run backtests. If no ranges exist, run a backtest first to create them.

### Running Backtests

**Via Web UI:**

1. Navigate to `/backtest` page
2. Select execution mode: **Local** (runs on your machine) or **Cloud** (AWS Lambda)
3. Fill in backtest parameters (stock, algorithm, date range, capital)
4. Click "Run Backtest" and watch real-time progress
5. You can run multiple backtests in parallel - each will execute independently in either mode

**Via CLI:**

```bash
npm run backtest
# Follow prompts or provide arguments(optional):
# npm run backtest TQQQ GridV0 2024-01-01 2024-12-31 1000 7 500
```

**Cloud Mode Setup:**

-   Requires AWS Lambda and API Gateway setup (see [AWS Setup Guide](docs/aws-lambda-backtest-setup.md))
-   Set `NEXT_PUBLIC_WS_URL` in `.env.local` to your WebSocket API endpoint

### Database setup

#### Backtest tables

To create tables for syncing backtest bars with Supabase, run this command in the Supabase SQL editor:

```sql
CREATE TABLE IF NOT EXISTS public.bt_bars_daily (
  symbol text NOT NULL,
  day date NOT NULL,
  data bytea NOT NULL,
  records int NOT NULL,
  start_ts bigint NOT NULL,
  end_ts bigint NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (symbol, day)
);
CREATE INDEX IF NOT EXISTS idx_bt_bars_daily_symbol_day ON public.bt_bars_daily (symbol, day);

CREATE TABLE IF NOT EXISTS public.bt_symbol_ranges (
  symbol text PRIMARY KEY,
  have_from date,
  have_to date,
  first_available_day date,
  updated_at timestamptz DEFAULT now(),
  splits jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_split_check date
);
```

#### Auto-trade tables

To run auto-trade, you need to create these tables with indexes in the Supabase SQL editor:

```sql
CREATE TABLE IF NOT EXISTS public.at_trade_summary (
  symbol text PRIMARY KEY NOT NULL,
  max_cash numeric NOT NULL,
  max_equity numeric NOT NULL,
  splits_last_updated_at date,
  splits jsonb NOT NULL DEFAULT '[]'::jsonb,
  pdt_days jsonb NOT NULL DEFAULT '[]'::jsonb,
  session_start text,
  session_end text
);
CREATE TABLE IF NOT EXISTS public.at_trade_history (
  id text PRIMARY KEY NOT NULL,
  timestamp text,
  trade_type text,
  shares numeric,
  price numeric,
  close_trade_id text
);
CREATE INDEX IF NOT EXISTS idx_at_trade_history ON public.at_trade_history (id, timestamp);

CREATE TABLE IF NOT EXISTS public.at_to_buy (
  id text PRIMARY KEY NOT NULL,
  at_price numeric,
  below_or_higher text
);
CREATE INDEX IF NOT EXISTS idx_at_to_buy ON public.at_to_buy (id, at_price);

CREATE TABLE IF NOT EXISTS public.at_to_sell (
  id text PRIMARY KEY NOT NULL,
  at_price numeric,
  below_or_higher text,
  shares numeric,
  trade_id text NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_at_to_sell ON public.at_to_sell (id, trade_id, at_price);

CREATE TABLE IF NOT EXISTS public.at_open_trades (
  id text PRIMARY KEY NOT NULL,
  timestamp text NOT NULL,
  price numeric NOT NULL,
  shares numeric NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_at_open_trades ON public.at_open_trades (id, timestamp);

CREATE TABLE IF NOT EXISTS public.at_algo_config (
  symbol text NOT NULL,
  algorithm text NOT NULL,
  capital_pct numeric NOT NULL, -- percentage of capital to use per buy
  buy_below_pct numeric NOT NULL, -- percentage below current price to set next buy
  sell_above_pct numeric NOT NULL, -- percentage above buy price to set sell
  buy_after_sell_pct numeric NOT NULL, -- percentage higher to buy more after each sell
  cash_floor numeric NOT NULL, -- minimum cash floor that should remain in account
  order_gap_pct numeric NOT NULL, -- percent gap to join orders (N %), use -1 to disable filtering
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (symbol, algorithm)
);
```
