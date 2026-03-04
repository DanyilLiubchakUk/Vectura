# Complete Setup Guide - From Scratch

This guide walks you through setting up the cloud backtest system.

## Table of Contents

1. [Overview](#overview)
2. [Data Flow](#data-flow)
3. [Part 1: AWS Account](#part-1-aws-account)
4. [Part 2: Cloudflare Account](#part-2-cloudflare-account)
5. [Part 3: Lambda](#part-3-lambda)
6. [Part 4: IAM User for Worker](#part-4-iam-user-for-worker)
7. [Part 5: Cloudflare Worker](#part-5-cloudflare-worker)
8. [Part 6: Next.js Frontend](#part-6-nextjs-frontend)
9. [Values Reference](#values-reference)
10. [Troubleshooting](#troubleshooting)

---

## Overview

-   **Cloudflare Worker** - Coordinator: POST /start-backtest, POST /callback, GET /cancel-check, POST /cancel, WebSocket. Uses Durable Objects.
-   **AWS Lambda** - Runs backtest, POSTs progress/result to Worker callback. Checks Worker for cancel.
-   **Next.js** - UI only. Client POSTs to Worker, connects WebSocket to Worker.

---

## Data Flow

1. Client → POST Worker `/start-backtest` → Worker invokes Lambda, returns `{ jobId }`
2. Client → WebSocket `wss://worker?jobId=X`
3. Worker forwards WebSocket to Durable Object (keyed by jobId)
4. Lambda → POST Worker `/callback` with progress/result → Worker forwards to Durable Objects → Durable Objects sends to client
5. Lambda polls Worker `/cancel-check` to detect user cancel

---

## Part 1: AWS Account

1. Go to [aws.amazon.com](https://aws.amazon.com) → Create account
2. Sign in, note **Account ID** (top right → Account)
3. Select region (e.g. **us-east-1**)

---

## Part 2: Cloudflare Account

1. Go to [cloudflare.com](https://www.cloudflare.com) → Sign up
2. Workers & Pages → Create Worker (use "Hello World!" - we will overwrite it)
3. Note Workers subdomain (e.g. `vectura-progress-worker.YOUR_SUBDOMAIN.workers.dev`)

---

## Part 3: Lambda

### 3.1 Create Role

1. IAM → Roles → Create role
2. Trusted entity: AWS service → Lambda
3. Attach **AWSLambdaBasicExecutionRole**
4. Name: `backtest-lambda-role`

### 3.2 Create Function

1. Lambda → Create function
2. Name: `backtest-handler`
3. Runtime: Node.js 24.x
4. Role: `backtest-lambda-role`

### 3.3 Configure

-   Timeout: 15 min
-   Memory: 1024 MB
-   **Handler: `backtest-handler.handler`**

### 3.4 Environment Variables

| Key                             | Value                                                 |
| ------------------------------- | ----------------------------------------------------- |
| `ALPHA_VANTAGE_API_KEY`         | (Alpha Vantage)                                       |
| `APCA_API_BASE_URL`             | `https://paper-api.alpaca.markets`                    |
| `APCA_API_KEY_ID`               | (Alpaca)                                              |
| `APCA_API_SECRET_KEY`           | (Alpaca)                                              |
| `CALLBACK_SECRET`               | Same value as Worker `CALLBACK_SECRET` (see Part 5.2) |
| `COCKROACH_DATABASE_URL`        | (your CockroachDB connection string)                  |

### 3.5 Deploy Code

```bash
npm run deploy:lambda
```

Upload `backtest-lambda.zip` in Lambda console.

---

## Part 4: IAM User for Worker

The Worker needs Lambda invoke only.

### 4.1 Create User

1. IAM → Users → Create user
2. Name: `vectura-worker`

### 4.2 Create Policy

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "lambda:InvokeFunction",
            "Resource": "arn:aws:lambda:REGION:ACCOUNT_ID:function:backtest-handler"
        }
    ]
}
```

Replace REGION and ACCOUNT_ID. Name: `VecturaWorkerPolicy`

### 4.3 Attach and Create Access Key

1. Attach `VecturaWorkerPolicy` to `vectura-worker`
2. Security credentials → Create access key → Application running outside AWS
3. Save **Access key ID** and **Secret access key** - add as Worker secrets

---

## Part 5: Cloudflare Worker

### 5.1 Install and Log In

```bash
cd worker
npm install
npm run login
```

### 5.2 Set Secrets

```bash
cd worker
npm run put-secret AWS_ACCESS_KEY_ID
npm run put-secret AWS_SECRET_ACCESS_KEY
npm run put-secret CALLBACK_SECRET
```

-   Use access key/secret from Part 4.3
-   `CALLBACK_SECRET`: random string (e.g. `openssl rand -hex 32`). Use the **same value** in Lambda env.

### 5.3 Deploy

```bash
npm run deploy
```

Note the URL: `https://vectura-progress-worker.YOUR_SUBDOMAIN.workers.dev`. WebSocket: `wss://` same host.

---

## Part 6: Next.js Frontend

### 6.1 Environment Variables

Add to Vercel or `.env.local`:

| Key                  | Value                                                      |
| -------------------- | ---------------------------------------------------------- |
| `NEXT_PUBLIC_WS_URL` | `wss://vectura-progress-worker.YOUR_SUBDOMAIN.workers.dev` |

---

## Values Reference

| Item             | Example                                           |
| ---------------- | ------------------------------------------------- |
| Lambda           | `backtest-handler`                                |
| Worker URL       | `https://vectura-progress-worker.xxx.workers.dev` |
| Worker WebSocket | `wss://vectura-progress-worker.xxx.workers.dev`   |

---

## Limits

-   **15 minute maximum** - Lambda enforces a 15 min limit per backtest. If exceeded, the user sees: "Backtest exceeded 15 minute limit. Please use a shorter date range."

---

## Debugging

-   **Wrangler tail** - `cd worker && npm run log`

---

## Troubleshooting

-   **"Cannot find module 'index'"** - Lambda Handler is wrong. Go to Lambda console → Code → Runtime settings → Edit → set Handler to `backtest-handler.handler` (not `index.handler`) → Save.
-   **Result not received** - Ensure Lambda `CALLBACK_SECRET` matches Worker.
-   **"Backtest exceeded 15 minute limit"** - Use a shorter date range. Lambda max runtime is 15 min.

---

## Migration from AWS API Gateway

Previously, Cloud Mode used **AWS API Gateway WebSocket** to connect the client directly to Lambda. The client would connect to a WebSocket API, Lambda would handle the connection, and progress was streamed over that connection.

API Gateway is only free for the first 12 months of AWS account creation. After that, costs accumulate. The migration to Cloudflare Workers + Durable Objects provides:

-   **Fully free tier** - Cloudflare Workers and Durable Objects have generous free limits with no time limit
-   **Same client experience** - The client still uses a single WebSocket connection; the Worker acts as a proxy
-   **Job-based routing** - Durable Objects keyed by job ID handle stateful memory per backtest session, so Lambda and client stay in sync via the shared job ID
