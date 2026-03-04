# Vectura - Auto Trading

Vectura is an open-source project to build a fully automated stock trading system. It analyzes market data, reasons about buy/hold/sell actions, executes paper or real trades, and exposes dashboards.

## What it is

- **Automation**: Interpret price action and emit decisions.
- **Trading**: Executes via a brokerage API (with paper and real modes).
- **Free-tier friendly**: Designed to run using free/freemium tooling.

## High-level architecture

- **Frontend (Next.js)**: Dashboard.
- **Workflows (Trigger.dev)**: Scheduled jobs for intraday trading tasks (runs during market hours, including pre-market for stock split check).
- **Database (CockroachDB + Prisma)**: Stores historical bars, trade decisions, portfolio state, and analytics.
- **State management (Zustand)**: In-memory state management for backtesting and web.
- **Broker (Alpaca)**: Trading API for orders and market data.
- **Cloud backtest (Cloudflare Worker + Lambda)**: Worker receives client requests, invokes Lambda, uses Durable Objects to route progress to the right WebSocket connection. Lambda runs the backtest and POSTs progress to Worker callback.

## Backtesting

Vectura includes a comprehensive backtesting system with two execution modes:

### Local Mode

- Runs on your local machine via Server-Sent Events (SSE)
- Streams progress updates in real-time
- Suitable for quick backtests and development
- No cloud costs - uses your local resources
- Supports running multiple backtests in parallel

### Cloud Mode (Cloudflare Worker + AWS Lambda)

- **Client** connects to a Cloudflare Worker via WebSocket with a job ID
- **Worker** starts Lambda execution, returns job ID to client
- **Lambda** runs the backtest and POSTs progress to Worker callback
- **Worker** uses Durable Objects (keyed by job ID) to route progress to the right WebSocket → client
- Handles long-running backtests (up to 15 minutes)
- Real-time progress streaming through a single WebSocket connection
- Fully free-tier friendly: Cloudflare Workers (free tier) + AWS Lambda (free tier)
- Supports running multiple backtests in parallel

**Before the migration:** Cloud Mode previously used AWS API Gateway WebSocket to connect the client directly to Lambda. WebSocket connection API Gateway is only free for the first 12 months of AWS account creation. The migration to Cloudflare Workers + Durable Objects provides a fully free solution with no time limit.

### Quick Cloud Setup

For detailed setup instructions, see [docs/cloud-setup.md](docs/cloud-setup.md).

**Quick steps:**

1. Create AWS Lambda function (`backtest-handler`) with Node.js 24.x runtime
2. Create IAM user for Worker (Lambda invoke only)
3. Create Cloudflare Worker, configure Durable Objects for job routing
4. Set Worker secrets (AWS credentials, `CALLBACK_SECRET`)
5. Set environment variables in Lambda (CockroachDB, Alpaca, AlphaVantage, `CALLBACK_SECRET`)
6. Set `NEXT_PUBLIC_WS_URL` in `.env.local` to your Worker WebSocket URL
7. Build and deploy: `npm run deploy:lambda` (upload zip to Lambda), `cd worker && npm run deploy` (Worker)

**Environment Variables for Cloud Mode:**

```env
NEXT_PUBLIC_WS_URL=wss://vectura-progress-worker.YOUR_SUBDOMAIN.workers.dev
```

## Documentation

Vectura includes comprehensive documentation pages accessible from the web interface:

- **How the Backtest Works** (`/how-backtest-works`): Learn how to configure parameters, choose execution modes (Local vs Cloud), understand the algorithm, and interpret results. Everything you need to know about using and understanding the backtest.
- **Development Journey** (`/development-journey`): Read about the development process: from CSV files to Zustand, finding free APIs, implementing PDT rules, optimizing performance from 7 hours to fast execution, and the migration from AWS API Gateway to Cloudflare Workers.
- **Cloud Setup** ([docs/cloud-setup.md](docs/cloud-setup.md)): Step-by-step guide to set up Cloud Mode (Cloudflare Worker + AWS Lambda).

## Getting started

### Prerequisites

1. Create `.env.local` from `.env.example` and insert your API keys:
    - **CockroachDB**:
        - Set `COCKROACH_DATABASE_URL` (see `prisma/README.md`)
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

3. Set up the database: `npm run db:setup` (see `prisma/README.md`)

4. Run the development server: `npm run dev`

5. Deploy Trigger.dev workflows: `npx trigger.dev@latest deploy` (select to update versions if prompted)

### Managing Stock Ranges

The `/ranges` page allows you to manage historical stock data ranges stored in the database. Stock ranges are automatically created when you run backtests, and you can manage them through this interface.

**Features:**

- **View all ranges**: See all stocks with stored historical data, including their date ranges
- **Delete ranges**: Remove all stored data for a specific stock symbol
- **Adjust range size**: Make ranges bigger or smaller by changing the start and end dates
- **Move ranges**: Shift the entire date range to a different time period
- **Smart suggestions**: When a selected date is a closed market day, the system suggests the nearest open trading days

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
3. Fill in backtest parameters (stock, date range, capital)
4. Click "Run Backtest" and watch real-time progress
5. You can run multiple backtests in parallel - each will execute independently in either mode

**Via CLI:**

```bash
npm run backtest
# Follow prompts or provide arguments(optional):
# npm run backtest TQQQ 2024-01-01 2024-12-31 1000 7 500
```

**Cloud Mode Setup:**

- Requires AWS Lambda and Cloudflare Worker setup (see [Cloud Setup Guide](docs/cloud-setup.md))
- Set `NEXT_PUBLIC_WS_URL` in `.env.local` to your Cloudflare Worker URL

### Backtest Results

After running a backtest, you'll see comprehensive results with visualizations and detailed metrics:

#### Interactive Chart

The backtest results include an interactive chart powered by TradingView Lightweight Charts that displays:

- **Price Data**: Historical stock price over the backtest period
- **Equity Curve**: Shows how your total account equity changed over time
- **Cash Balance**: Displays the cash balance throughout the backtest
- **Execution Lines**: Visual markers showing when buy and sell orders were placed and executed
- **Fullscreen Mode**: Click to expand the chart for detailed analysis
- **Chart Controls**: Toggle visibility of different data series (price, equity, cash, executions)

#### Result Metrics

The results display includes comprehensive performance and risk metrics:

**Performance Metrics:**

- **Total Return**: Absolute dollar return and percentage return over the backtest period
- **Buy & Hold Comparison**: Comparison showing the difference between your strategy and buying and holding with the same contributions (both dollar and percentage)
- **Final Equity**: Total account equity at the end of the backtest
- **Maximum Equity**: Highest total account equity reached at any point during the backtest
- **Invested Cash**: Initial capital plus all additional cash invested over time

**Risk Metrics:**

- **Max Drawdown**: Largest loss from a historical equity peak to a subsequent trough (shown in both dollars and percentage)
- **Best/Worst Month**: The percentage return achieved in the best and worst single calendar months
- **Longest Drawdown Duration**: The longest period of drawdown in days
- **Return/Max Drawdown Ratio**: A risk-adjusted performance metric

**Trading Activity:**

- **Total Trades**: Total number of completed buy and sell executions during the backtest
- **Avg Trades/Month**: Average number of executed trades per month over the backtest period
- **Average Invested Capital %**: The average percentage of total capital that was invested over the backtest period

All metrics include tooltips with detailed descriptions to help you understand what each metric represents and how it's calculated.
