-- CreateTable
CREATE TABLE "symbol_ranges" (
    "symbol" STRING NOT NULL,
    "have_from" DATE,
    "have_to" DATE,
    "first_available_day" DATE,
    "splits" JSONB NOT NULL DEFAULT '[]',
    "last_split_check" DATE,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "symbol_ranges_pkey" PRIMARY KEY ("symbol")
);

-- CreateTable
CREATE TABLE "bars_daily" (
    "symbol" STRING NOT NULL,
    "day" DATE NOT NULL,
    "data" BYTES NOT NULL,
    "records" INT4 NOT NULL,
    "start_ts" INT8 NOT NULL,
    "end_ts" INT8 NOT NULL,

    CONSTRAINT "bars_daily_pkey" PRIMARY KEY ("symbol","day")
);

-- CreateTable
CREATE TABLE "users" (
    "user_id" STRING NOT NULL,
    "email" STRING,
    "name" STRING,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "trading_agents" (
    "agent_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" STRING NOT NULL,
    "name" STRING NOT NULL,
    "status" STRING NOT NULL,
    "symbol" STRING NOT NULL,
    "alpaca_encrypted" STRING NOT NULL,
    "alpaca_account_id" STRING NOT NULL,
    "alpaca_account_type" STRING NOT NULL DEFAULT 'live',
    "strategy_params" JSONB NOT NULL,
    "risk_limits" JSONB NOT NULL DEFAULT '{}',
    "last_error_at" TIMESTAMP(3),
    "last_error_code" STRING,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trading_agents_pkey" PRIMARY KEY ("agent_id")
);

-- CreateTable
CREATE TABLE "trade_executions" (
    "execution_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agent_id" UUID NOT NULL,
    "minute_slot" TIMESTAMP(3) NOT NULL,
    "status" STRING NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "orders_placed" INT4 NOT NULL DEFAULT 0,
    "error_code" STRING,
    "error_message" STRING,

    CONSTRAINT "trade_executions_pkey" PRIMARY KEY ("execution_id")
);

-- CreateTable
CREATE TABLE "trade_history" (
    "agent_id" UUID NOT NULL,
    "trade_id" STRING NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "side" STRING NOT NULL,
    "symbol" STRING NOT NULL,
    "qty" DECIMAL NOT NULL,
    "price" DECIMAL NOT NULL,
    "alpaca_order_id" STRING,
    "client_order_id" STRING NOT NULL,
    "close_trade_id" STRING,

    CONSTRAINT "trade_history_pkey" PRIMARY KEY ("agent_id","trade_id")
);

-- CreateTable
CREATE TABLE "account_snapshots" (
    "agent_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "equity" DECIMAL NOT NULL,
    "cash" DECIMAL NOT NULL,
    "equity_max" DECIMAL NOT NULL,
    "cash_max" DECIMAL NOT NULL,
    "pdt_daytrade_count" INT4 NOT NULL DEFAULT 0,
    "pdt_days" JSONB NOT NULL DEFAULT '[]',
    "session_start" TIMESTAMP(3),
    "session_end" TIMESTAMP(3),

    CONSTRAINT "account_snapshots_pkey" PRIMARY KEY ("agent_id","date")
);

-- CreateTable
CREATE TABLE "position_snapshots" (
    "agent_id" UUID NOT NULL,
    "snapshot_at" TIMESTAMP(3) NOT NULL,
    "positions" JSONB NOT NULL DEFAULT '[]',
    "cash" DECIMAL NOT NULL,
    "equity" DECIMAL NOT NULL,

    CONSTRAINT "position_snapshots_pkey" PRIMARY KEY ("agent_id","snapshot_at")
);

-- CreateTable
CREATE TABLE "execution_logs" (
    "execution_id" UUID NOT NULL,
    "seq_id" INT4 NOT NULL,
    "level" STRING NOT NULL,
    "message" STRING,
    "code" STRING,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "execution_logs_pkey" PRIMARY KEY ("execution_id","seq_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trading_agents_alpaca_account_id_key" ON "trading_agents"("alpaca_account_id");

-- CreateIndex
CREATE INDEX "trading_agents_status_idx" ON "trading_agents"("status");

-- CreateIndex
CREATE INDEX "trading_agents_user_id_created_at_idx" ON "trading_agents"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "trade_executions_agent_id_minute_slot_idx" ON "trade_executions"("agent_id", "minute_slot" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "trade_executions_agent_id_minute_slot_key" ON "trade_executions"("agent_id", "minute_slot");

-- CreateIndex
CREATE INDEX "trade_history_agent_id_timestamp_idx" ON "trade_history"("agent_id", "timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "trade_history_agent_id_client_order_id_key" ON "trade_history"("agent_id", "client_order_id");

-- AddForeignKey
ALTER TABLE "trading_agents" ADD CONSTRAINT "trading_agents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_executions" ADD CONSTRAINT "trade_executions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "trading_agents"("agent_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_history" ADD CONSTRAINT "trade_history_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "trading_agents"("agent_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_snapshots" ADD CONSTRAINT "account_snapshots_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "trading_agents"("agent_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_snapshots" ADD CONSTRAINT "position_snapshots_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "trading_agents"("agent_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_logs" ADD CONSTRAINT "execution_logs_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "trade_executions"("execution_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CHECK constraints (per docs/vectura-v1.2/02-cockroachdb-schema.md; Prisma schema cannot express these)
ALTER TABLE "trading_agents" ADD CONSTRAINT "trading_agents_status_check" CHECK (status IN ('ACTIVE', 'PAUSED', 'ERROR', 'DELETED'));
ALTER TABLE "trading_agents" ADD CONSTRAINT "trading_agents_alpaca_account_type_check" CHECK (alpaca_account_type IN ('paper', 'live'));
ALTER TABLE "trade_executions" ADD CONSTRAINT "trade_executions_status_check" CHECK (status IN ('RUNNING', 'SUCCESS', 'PARTIAL_FAILURE', 'FAILED'));
ALTER TABLE "trade_history" ADD CONSTRAINT "trade_history_side_check" CHECK (side IN ('buy', 'sell'));
