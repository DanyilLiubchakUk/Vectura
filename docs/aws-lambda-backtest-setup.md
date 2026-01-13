# AWS Lambda Backtest Setup Guide

This guide provides detailed, step-by-step instructions for setting up AWS Lambda, API Gateway (WebSocket), and IAM permissions to enable cloud-based backtest execution.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Create IAM Role for Lambda](#step-1-create-iam-role-for-lambda)
4. [Step 2: Create Lambda Function](#step-2-create-lambda-function)
5. [Step 3: Configure Lambda Environment Variables](#step-3-configure-lambda-environment-variables)
6. [Step 4: Create API Gateway WebSocket API](#step-4-create-api-gateway-websocket-api)
7. [Step 5: Configure API Gateway Routes](#step-5-configure-api-gateway-routes)
8. [Step 6: Deploy Lambda Package](#step-6-deploy-lambda-package)
9. [Step 7: Test the Setup](#step-7-test-the-setup)
10. [Step 8: Configure Backend Environment Variables](#step-8-configure-backend-environment-variables)
11. [Step 9: Enable CloudWatch Logging](#step-9-enable-cloudwatch-logging)
12. [Troubleshooting](#troubleshooting)

---

## Overview

The cloud backtest system uses:

-   **AWS Lambda**: Executes the backtest algorithm
-   **API Gateway (WebSocket)**: Handles real-time communication between frontend and Lambda
-   **IAM**: Manages permissions for Lambda to access AWS services

**Architecture Flow:**

1. Frontend sends backtest request via WebSocket to backend
2. Backend forwards request to API Gateway WebSocket
3. API Gateway invokes Lambda function
4. Lambda executes backtest and streams progress via API Gateway
5. Backend relays progress to frontend via WebSocket

---

## Prerequisites

Before starting, ensure you have:

-   An AWS account with appropriate permissions
-   AWS CLI installed and configured (optional, but recommended)
-   Node.js 20+ installed locally
-   Your backtest code ready to package
-   Environment variables for:
    -   Supabase (URL, Anon Key, Service Role Key)
    -   Alpaca (API Key, Secret Key, Base URL)
    -   AlphaVantage (API Key)

---

## Step 1: Create IAM Role for Lambda

### 1.1 Navigate to IAM Console

1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Search for "IAM" in the search bar
3. Click on **IAM** service

### 1.2 Create New Role

1. In the left sidebar, click **Roles**
2. Click the **Create role** button (top right)
3. Under **Trusted entity type**, select **AWS service**
4. Under **Use case**, select **Lambda**
5. Click **Next**

### 1.3 Add Permissions

1. In the **Permissions** section, you need to add:

    - **AWSLambdaBasicExecutionRole** (for CloudWatch Logs)
    - **AmazonAPIGatewayInvokeFullAccess** (for API Gateway WebSocket)

2. Search for "AWSLambdaBasicExecutionRole" in the search box
3. Check the box next to **AWSLambdaBasicExecutionRole**
4. Search for "AmazonAPIGatewayInvokeFullAccess"
5. Check the box next to **AmazonAPIGatewayInvokeFullAccess**
6. Click **Next**

### 1.4 Name and Create Role

1. In **Role name**, enter: `backtest-lambda-role`
2. (Optional) Add a description: "IAM role for backtest Lambda function"
3. Click **Create role**

### 1.5 Note the Role ARN

1. After creation, click on the role name `backtest-lambda-role`
2. Copy the **Role ARN** (e.g., `arn:aws:iam::123456789012:role/backtest-lambda-role`) - `arn:aws:iam::267067829449:role/backtest-lambda-role`**************************\_\_\_\_**************************
3. Save this for later use

---

## Step 2: Create Lambda Function

### 2.1 Navigate to Lambda Console

1. In AWS Console, search for "Lambda"
2. Click on **Lambda** service

### 2.2 Create Function

1. Click **Create function** button (top right)
2. Select **Author from scratch**
3. Configure:
    - **Function name**: `backtest-handler`
    - **Runtime**: Select **Node.js 20.x** (or latest available)
    - **Architecture**: Select **x86_64**
    - **Permissions**: Expand **Change default execution role**
        - Select **Use an existing role**
        - In **Existing role** dropdown, select `backtest-lambda-role`
4. Click **Create function**

### 2.3 Configure Basic Settings

1. Scroll down to **General configuration**
2. Click **Edit**
3. Set:
    - **Timeout**: `15 min 0 sec` (backtests can take time)
    - **Memory**: `1024 MB` (adjust based on your needs, minimum 512 MB)
4. Click **Save**

### 2.4 Note Function Details

1. In the function overview, note:
    - **Function ARN**: Save this for later `arn:aws:lambda:us-east-1:267067829449:function:backtest-handler`********************************\_\_********************************
    - **Function name**: `backtest-handler`

---

## Step 3: Configure Lambda Environment Variables

### 3.1 Navigate to Environment Variables

1. In your Lambda function page, scroll to **Configuration** tab
2. Click **Environment variables** in the left sidebar
3. Click **Edit**

### 3.2 Add Supabase Variables

Click **Add environment variable** for each:

1. **Key**: `NEXT_PUBLIC_SUPABASE_URL`

    - **Value**: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)

2. **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`

    - **Value**: Your Supabase anon/public key

### 3.3 Add Alpaca Variables

1. **Key**: `APCA_API_KEY_ID`

    - **Value**: Your Alpaca API key

2. **Key**: `APCA_API_SECRET_KEY`

    - **Value**: Your Alpaca secret key

3. **Key**: `APCA_API_BASE_URL`
    - **Value**: `https://paper-api.alpaca.markets` (for paper trading) or `https://api.alpaca.markets` (for live)

### 3.4 Add AlphaVantage Variable

1. **Key**: `ALPHA_VANTAGE_API_KEY`
    - **Value**: Your AlphaVantage API key

### 3.5 Add AWS API Gateway Endpoint

1. **Key**: `API_GATEWAY_ENDPOINT`
    - **Value**: Your API Gateway Management API endpoint
    - Format: `https://{api-id}.execute-api.{region}.amazonaws.com/{stage}`
    - Example: `https://abc123xyz.execute-api.us-east-1.amazonaws.com/prod`
    - **Important**: This is the HTTP endpoint, not the WebSocket URL (wss://)
    - You'll get this after creating and deploying your API Gateway (Step 5.6)
    - **Note**: You can come back and add this after Step 5.6 if you haven't created the API Gateway yet

### 3.6 Save Environment Variables

1. Click **Save** at the bottom
2. Verify all variables are listed correctly

**Important**: Environment variables are encrypted at rest. For production, consider using AWS Secrets Manager for sensitive values.

---

## Step 4: Create API Gateway WebSocket API

### 4.1 Navigate to API Gateway

1. In AWS Console, search for "API Gateway"
2. Click on **API Gateway** service

### 4.2 Create WebSocket API

1. Click **Create API** button
2. Under **WebSocket API**, click **Build**
3. Configure:
    - **API name**: `backtest-ws-api`
    - **Route selection expression**: `$request.body.action` (or `$default` for simple routing)
    - **Description**: (Optional) "WebSocket API for backtest execution"
4. Click **Next**

### 4.3 Configure Routes

1. You'll configure routes in the next step, but for now:
    - **Route selection expression**: Keep default `$request.body.action`
2. Click **Next**

### 4.4 Review and Create

1. Review your settings
2. Click **Create and deploy**

### 4.5 Note API Details

1. After creation, note:
    - **API endpoint**: `wss://xxxxx.execute-api.us-east-1.amazonaws.com/prod` `wss://lniu5cjltg.execute-api.us-east-1.amazonaws.com/prod/`**********************\_\_**********************
    - **API ID**: Save this for later `lniu5cjltg`******\_\_\_\_******
    - **API Gateway ID**: Save this for later TODO find that varible

---

## Step 5: Configure API Gateway Routes

### 5.1 Navigate to Routes

1. In your WebSocket API page, click **Routes** in the left sidebar
2. You'll see default routes: `$connect`, `$disconnect`, `$default`

**Note**: The API Gateway interface may show different sections:

-   **Route request**: Request configuration
-   **Integration request**: Lambda integration settings (this is what we need)
-   **Integration response**: Response transformation
-   **Route response**: Response configuration

We need to configure the **Integration request** for each route.

### 5.2 Configure $connect Route

**CRITICAL**: This is the most important route - if not configured correctly, WebSocket connections will fail with 500 errors or empty events.

1. Click on **$connect** route
2. Click on **Integration request** section (or **Attach integration** if you see that)
3. Configure the integration:
    - **Integration type**: Select **Lambda function** (or **AWS Service** → **Lambda function**)
    - **Lambda function**: Select `backtest-handler`
    - **Use Lambda Proxy integration**: **ENABLE THIS** ⚠️ (This is critical!)
        - This checkbox/option ensures the full event structure (including `requestContext`) is passed to Lambda
        - Without this, Lambda will receive an empty event `{}`
    - **Integration name**: `backtest-connect-integration` (optional)
4. Click **Save** or **Create and attach**

**If prompted to grant permission**: Click **Grant** to allow API Gateway to invoke Lambda

**Verification**: After configuration, test a WebSocket connection. In Lambda CloudWatch logs, you should see:

-   ✅ Good: `[Lambda] Received event: { "requestContext": { "connectionId": "...", ... } }`
-   ❌ Bad: `[Lambda] Received event: {}` (empty - means Lambda Proxy is not enabled)

### 5.3 Configure $disconnect Route

1. Click on **$disconnect** route
2. Click on **Integration request** section
3. Configure:
    - **Integration type**: **Lambda function**
    - **Lambda function**: `backtest-handler`
    - **Use Lambda Proxy integration**: **Enable this**
4. Click **Save**

**Note**: Grant permission if prompted

### 5.4 Configure $default Route

1. Click on **$default** route
2. Click on **Integration request** section
3. Configure:
    - **Integration type**: **Lambda function**
    - **Lambda function**: `backtest-handler`
    - **Use Lambda Proxy integration**: **Enable this**
4. Click **Save**

**Important**:

-   All three routes ($connect, $disconnect, $default) must have Lambda integrations attached
-   **Lambda Proxy integration must be enabled** for all routes - this is critical for passing the event structure
-   After configuring all routes, you must **Deploy API** for changes to take effect (see Step 5.6)`

### 5.5 Grant API Gateway Permission to Invoke Lambda

For each route integration, you need to grant API Gateway permission:

1. Go back to Lambda console
2. Open `backtest-handler` function
3. Click **Configuration** tab
4. Click **Permissions** in left sidebar
5. Under **Resource-based policy statements**, you should see entries for API Gateway
6. If not, you'll need to add them manually:
    - Click **Add permissions**
    - Select **AWS service**
    - Select **API Gateway**
    - Under **Statement ID**, enter: `api-gateway-invoke`
    - Under **API Gateway**, select your API
    - Under **Source ARN**, enter: `arn:aws:execute-api:REGION:ACCOUNT_ID:API_ID/*/*`
        - Replace `REGION`, `ACCOUNT_ID`, and `API_ID` with your values
    - Click **Add**

### 5.6 Deploy API

1. In API Gateway, click **Deploy API** button (top right)
2. Select **New stage**:
    - **Stage name**: `prod`
    - **Description**: (Optional) "Production stage"
3. Click **Deploy**
4. Note the **WebSocket URL** (e.g., `wss://xxxxx.execute-api.us-east-1.amazonaws.com/prod`)

---

## Step 6: Deploy Lambda Package

### 6.1 Build Lambda Package Locally

1. Open terminal in your project root
2. Run:

    ```bash
    npm run build:lambda
    ```

    This creates the Lambda-compatible bundle in `dist-lambda/`

    - The main file will be `dist-lambda/backtest-handler.js`
    - **Note**: The `ws` module is excluded from the bundle (not needed in Lambda)

3. Package the Lambda:
    ```bash
    npm run package:lambda
    ```
    This creates `backtest-lambda.zip` containing all necessary files

**Important**:

-   After building, verify that `dist-lambda/backtest-handler.js` exists before packaging
-   If you see errors about `ws` module after deployment, rebuild the package (the `ws` module should be excluded)

### 6.2 Upload to Lambda

**Via AWS Console**

1. Go to Lambda console
2. Open `backtest-handler` function
3. Scroll to **Code source** section
4. Click **Upload from** dropdown
5. Select **.zip file**
6. Click **Upload**
7. Select `backtest-lambda.zip` file
8. Click **Save**

### 6.3 Configure Handler

1. In Lambda console, go to **Configuration** tab
2. Click **General configuration** in the left sidebar
3. Click **Edit**
4. Under **Handler**, set it to: `backtest-handler.handler`
    - This tells Lambda to use the `handler` export from `backtest-handler.js`
5. Click **Save**

### 6.4 Verify Deployment

1. In Lambda console, check **Code source** section
2. You should see `backtest-handler.js` file listed
3. Check **Last modified** timestamp to confirm upload
4. Verify the **Handler** is set to `backtest-handler.handler`

---

## Step 7: Test the Setup

### 7.1 Verify Handler Configuration

**Critical**: Before testing, ensure the handler is correctly configured:

1. In Lambda console, go to **Configuration** tab
2. Click **General configuration**
3. Verify **Handler** is set to: `backtest-handler.handler`
    - If it shows `index.handler` or something else, click **Edit** and change it to `backtest-handler.handler`
    - The format is: `{filename}.{exportName}` where the file is `backtest-handler.js` and the export is `handler`
4. Verify **Timeout** is set to at least `15 min 0 sec` (backtests can take time)
    - If it's still at the default 3 seconds, click **Edit** and increase it
5. Click **Save** if you made changes

### 7.2 Test Lambda Function Directly

1. In Lambda console, open `backtest-handler`
2. Click **Test** tab
3. Click **Create new test event**
4. Name it: `websocket-test`
5. Use this test event (for $default route):

    ```json
    {
        "requestContext": {
            "routeKey": "$default",
            "connectionId": "test-connection-123",
            "requestId": "test-request-123",
            "domainName": "test.execute-api.us-east-1.amazonaws.com",
            "stage": "prod"
        },
        "body": "{\"type\":\"start_backtest\",\"mode\":\"cloud\",\"config\":{\"stock\":\"TQQQ\",\"startDate\":\"2024-01-01\",\"endDate\":\"2024-01-02\",\"startCapital\":1000}}"
    }
    ```

    **Or test $connect route**:

    ```json
    {
        "requestContext": {
            "routeKey": "$connect",
            "connectionId": "test-connection-123",
            "requestId": "test-request-123",
            "domainName": "test.execute-api.us-east-1.amazonaws.com",
            "stage": "prod"
        }
    }
    ```

    **Note**: The Lambda handler will log the full event structure, so you can see exactly what API Gateway is sending.

6. Click **Save**
7. Click **Test**
8. Check **Execution result** for errors

**Troubleshooting Common Errors**:

1. **"Cannot find module 'index'" error**:

    - Lambda is looking for `index.handler` but the file is `backtest-handler.js`
    - Solution: Go to **Configuration** → **General configuration** → **Edit** → Set Handler to `backtest-handler.handler` → **Save**

2. **"Cannot find module 'ws'" error**:

    - The `ws` module is being bundled but shouldn't be (it's not needed in Lambda)
    - Solution: Rebuild the Lambda package to ensure `ws` is excluded:
        ```bash
        npm run build:lambda
        npm run package:lambda
        ```
    - Then re-upload the new `backtest-lambda.zip` file
    - The `ws` module is marked as external in the build config and should not be included

3. **Verify package contents**:
    - In Lambda console, check **Code source** that `backtest-handler.js` exists
    - The package should NOT contain `ws` or `node_modules/ws`

### 7.2 Test WebSocket Connection

You can use a WebSocket client tool or write a simple test script:

```javascript
const WebSocket = require("ws");

const ws = new WebSocket("wss://YOUR_API_GATEWAY_URL/prod");

ws.on("open", () => {
    console.log("Connected");
    ws.send(
        JSON.stringify({
            type: "start_backtest",
            mode: "cloud",
            config: {
                stock: "TQQQ",
                startDate: "2024-01-01",
                endDate: "2024-01-02",
                startCapital: 1000,
            },
        })
    );
});

ws.on("message", (data) => {
    console.log("Received:", data.toString());
});

ws.on("error", (error) => {
    console.error("Error:", error);
});
```

**Troubleshooting WebSocket 500 Error**:

If you get a `500 Unexpected server response` error when connecting:

1. **Enable API Gateway CloudWatch Logs** (if not already enabled):

    **Step 1: Create IAM Role for API Gateway Logging**

    - Go to IAM console
    - Click **Roles** → **Create role**
    - Select **AWS service** → **API Gateway**
    - Click **Next**
    - Search for and select **AmazonAPIGatewayPushToCloudWatchLogs**
    - Click **Next**
    - Role name: `api-gateway-cloudwatch-logs-role`
    - Click **Create role**
    - **Note the Role ARN** (you'll need this)

    **Step 2: Enable Logging in API Gateway**

    - Go to API Gateway console
    - Select your WebSocket API (`backtest-ws-api`)
    - Click **Settings** in the left sidebar
    - Scroll to **CloudWatch log role ARN**
    - Click **Edit**
    - Paste the Role ARN from Step 1
    - Click **Save**

    **Step 3: Enable Logging for Your Stage**

    - In API Gateway, click **Stages** in the left sidebar
    - Click on your stage (e.g., `prod`)
    - Click **Logs/Tracing** tab
    - Enable **Logging level**: Select **INFO** or **ERROR**
    - Enable **Log full requests/responses data** (optional, for debugging)
    - Click **Save**

    **Step 4: View Logs in CloudWatch**

    - Go to CloudWatch console
    - Click **Log groups** in the left sidebar
    - Look for log group: `/aws/apigateway/backtest-ws-api`
    - Click on it to see log streams
    - Click on a log stream to see detailed logs

2. **Check Lambda Function Logs** (Easier to access):

    - Go to CloudWatch console
    - Click **Log groups** in the left sidebar
    - Look for: `/aws/lambda/backtest-handler`
    - Click on it to see log streams
    - Click on the most recent log stream
    - Look for errors when the $connect route is triggered

3. **Verify $connect Route**:

    - In API Gateway, go to **Routes**
    - Click on **$connect** route
    - Verify it has an integration attached to your Lambda function
    - Check that the integration type is **Lambda function**
    - Verify the Lambda function name is `backtest-handler`

4. **Check Lambda Permissions**:

    - Go to Lambda console → `backtest-handler`
    - **Configuration** → **Permissions**
    - Under **Resource-based policy statements**, verify there's an entry for API Gateway
    - If missing, API Gateway needs permission to invoke Lambda (see Step 5.5)

5. **Verify API Gateway Deployment**:

    - In API Gateway, ensure the API is deployed to a stage (e.g., `prod`)
    - The WebSocket URL should be: `wss://{api-id}.execute-api.{region}.amazonaws.com/{stage}`
    - Make sure you're using the correct stage name in the URL

6. **Check Lambda Function Logs**:

    - Go to CloudWatch Logs
    - Find the log group: `/aws/lambda/backtest-handler`
    - Check for any errors when the $connect route is triggered

7. **"No requestContext in event" or receiving empty event `{}`**:

    - **Symptom**: Lambda logs show `[Lambda] Received event: {}` (empty object)
    - **Cause**: Lambda Proxy integration is not enabled, or integration is not configured correctly
    - **Solution**:
        - Go to API Gateway → Routes → `$connect` (and other routes)
        - Click **Integration request**
        - **Enable "Use Lambda Proxy integration"** (or "Use proxy integration")
        - This is critical - without it, API Gateway doesn't pass the full event structure
        - Save and **Deploy API** again
    - **Verification**: After fixing, test WebSocket connection. Lambda logs should show:
        ```
        [Lambda] Received event: {
          "requestContext": {
            "connectionId": "...",
            "routeKey": "$connect"
          }
        }
        ```
    - If you still see `{}`, the integration is still not configured correctly

8. **Connection Errors (410 GoneException, 400 BadRequest)**:

    - **Symptom**: Lambda logs show errors like:
        ```
        ERROR [Lambda] Error sending to connection XXX: GoneException: UnknownError
        ERROR [Lambda] Error sending to connection test-connection-123: BadRequestException: Invalid connectionId
        ```
    - **Cause**:
        - **410 GoneException**: Connection is closed (normal when client disconnects)
        - **400 BadRequest**: Invalid connection ID (usually from Lambda test console using test connection IDs)
    - **Solution**: These errors are **expected and handled gracefully**:
        - The Lambda handler automatically removes closed connections from the active connections map
        - Test console errors (`test-connection-123`) can be ignored - they're from manual Lambda testing
        - Real connection errors (410) are logged but don't crash the handler
    - **Verification**: Check if your actual WebSocket connection (from frontend or TEST.ts) is working:
        - Look for `[Lambda] Successfully sent message to connection XXX` in logs
        - If you see progress events being received, the connection is working

9. **Connection Closes Before Backtest Completes**:

    - **Symptom**: Connection disconnects after ~20-30 seconds, backtest doesn't complete
    - **Cause**:
        - Client-side WebSocket timeout or connection not being kept alive
        - Network issues causing connection drops
        - Lambda execution timeout (default is 3 seconds, but you should increase it)
    - **Solution**:
        - **Increase Lambda timeout**: Go to Lambda → Configuration → General configuration → Edit → Timeout → Set to 5-15 minutes (depending on backtest duration)
        - **Keep connection alive on client**: Make sure your WebSocket client doesn't timeout
        - **Check backtest duration**: Long backtests may need longer timeouts
    - **Verification**:
        - Check Lambda logs for `[Lambda] Starting backtest` and `[Lambda] Backtest completed successfully`
        - If you see "Starting" but not "completed", the connection likely closed before completion

10. **Messages Not Being Sent (Send Operation Hanging)**:

    - **Symptom**: Lambda logs show "Sending command to API Gateway..." but never "Successfully sent message", Lambda request ends quickly (60-70ms)
    - **Cause**: Lambda doesn't have IAM permissions to call API Gateway Management API
    - **Solution**:
        - Go to Lambda → Configuration → Permissions
        - Click on the execution role (e.g., `backtest-handler-role-xxxxx`)
        - Click **Add permissions** → **Create inline policy**
        - Use JSON editor and add:
            ```json
            {
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Action": ["execute-api:ManageConnections"],
                        "Resource": "arn:aws:execute-api:*:*:*/*/@connections/*"
                    }
                ]
            }
            ```
        - Name it: `APIGatewayManageConnections`
        - Click **Create policy**
    - **Verification**: After adding permissions, test again. You should see "Successfully sent message" in logs

11. **Common Issues**:

-   **Missing $connect route integration**: The $connect route must have a Lambda integration
-   **Lambda timeout on connect**: Increase Lambda timeout if connection takes too long
-   **CORS issues**: WebSocket APIs don't use CORS, but check if there are any network/firewall issues
-   **Wrong endpoint format**: Use `wss://` (secure WebSocket), not `ws://` or `https://`
-   **Event structure mismatch**: Check CloudWatch logs to see the actual event structure being sent
-   **Connection not receiving messages**: Check that `API_GATEWAY_ENDPOINT` environment variable is set correctly in Lambda
-   **Send operation hanging**: Lambda needs `execute-api:ManageConnections` permission (see issue #9 above)

---

## Step 8: Configure Backend Environment Variables

### 8.1 Add API Gateway Endpoint

In your backend `.env` or environment configuration, add:

```env
NEXT_PUBLIC_WS_URL=wss://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod
API_GATEWAY_ENDPOINT=https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/prod
```

**Important Notes**:

-   Replace `YOUR_API_ID` with your actual API Gateway ID
-   The `API_GATEWAY_ENDPOINT` is the **Management API endpoint** (not the WebSocket URL)
-   It should be in the format: `https://{api-id}.execute-api.{region}.amazonaws.com/{stage}`
-   This is used by Lambda to send messages back to connected WebSocket clients
-   The WebSocket URL (for frontend connections) is: `wss://{api-id}.execute-api.{region}.amazonaws.com/{stage}`

## Troubleshooting

### Lambda Function Errors

**Error: "Cannot find module"**

-   If error is about `index`: Set Handler to `backtest-handler.handler` (see Step 6.3)
-   If error is about `ws`: Rebuild the package - `ws` should be excluded (marked as external)
    ```bash
    npm run build:lambda
    npm run package:lambda
    ```
    Then re-upload the new `backtest-lambda.zip` file
-   Ensure all dependencies are bundled in the Lambda package
-   Check that `node_modules` are included if needed (except `ws` which should be excluded)
-   Verify the handler path is correct

**Error: "Timeout"**

-   Increase Lambda timeout in function configuration
-   Check CloudWatch Logs for detailed error messages

**Error: "Environment variable not found"**

-   Verify all environment variables are set in Lambda configuration
-   Check variable names match exactly (case-sensitive)

### API Gateway Errors

**Error: "403 Forbidden"**

-   Check IAM permissions for API Gateway to invoke Lambda
-   Verify Lambda resource-based policy includes API Gateway

**Error: "WebSocket connection failed"**

-   Verify API Gateway is deployed to a stage
-   Check WebSocket URL is correct (starts with `wss://`)
-   Ensure CORS is configured if needed

**Error: "Route not found"**

-   Verify routes are configured in API Gateway
-   Check route selection expression matches your message format

### Connection Issues

**WebSocket disconnects immediately**

-   Check Lambda function logs in CloudWatch
-   Verify `$connect` route is properly configured
-   Check network/firewall settings

**No progress updates received**

-   Verify Lambda is emitting progress events
-   Check API Gateway integration is working
-   Review CloudWatch Logs for Lambda execution

### CloudWatch Logs

To view Lambda logs:

1. Go to Lambda console
2. Open `backtest-handler` function
3. Click **Monitor** tab
4. Click **View CloudWatch logs**
5. Review log streams for errors

---

## Additional Configuration

### Increase Lambda Memory/Timeout

If backtests are timing out or running slowly:

1. Go to Lambda function configuration
2. Edit **General configuration**
3. Increase **Memory** (also increases CPU)
4. Increase **Timeout** as needed

### Use AWS Secrets Manager (Recommended for Production)

Instead of environment variables, use Secrets Manager:

1. Create secrets in AWS Secrets Manager
2. Grant Lambda permission to read secrets
3. Update Lambda code to fetch secrets at runtime

### Enable X-Ray Tracing

For debugging:

1. In Lambda function, go to **Configuration** > **Monitoring and operations tools**
2. Enable **Active tracing**
3. View traces in AWS X-Ray console

---

## Summary

After completing these steps, you should have:

1. ✅ IAM role with proper permissions
2. ✅ Lambda function with environment variables
3. ✅ API Gateway WebSocket API with routes configured
4. ✅ Lambda package deployed
5. ✅ Backend configured with API Gateway endpoint
6. ✅ Frontend configured with WebSocket URL

Your cloud backtest system is now ready to use!

---

## Next Steps

1. Test the full flow from frontend
2. Monitor CloudWatch Logs for any issues
3. Adjust Lambda memory/timeout based on performance
4. Set up CloudWatch alarms for errors
5. Consider adding retry logic for failed backtests

---

## Support

If you encounter issues:

1. Check CloudWatch Logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure IAM permissions are properly configured
4. Review API Gateway route configurations

For AWS-specific issues, refer to:

-   [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
-   [API Gateway WebSocket Documentation](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html)
-   [IAM Documentation](https://docs.aws.amazon.com/iam/)
