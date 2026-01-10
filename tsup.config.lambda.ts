import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["lambda/backtest-handler.ts"],
    format: ["cjs"],
    target: "node20",
    outDir: "dist-lambda",
    minify: true,
    // External: AWS SDK (available in Lambda runtime), React, "@trigger.dev/sdk" (not needed)
    external: [
        "@aws-sdk/client-apigatewaymanagementapi",
        "@aws-sdk/client-lambda",
        "@types/aws-lambda",
        "react",
        "react-dom",
        "@trigger.dev/sdk",
    ],
    // Bundle everything else including Alpaca, Supabase, and zustand
    noExternal: [
        "@alpacahq/alpaca-trade-api",
        "@supabase/supabase-js",
        "zustand",
    ],
    splitting: false,
    sourcemap: false,
    clean: true,
    tsconfig: "tsconfig.json",
    esbuildOptions(options) {
        options.alias = {
            "@": "./src",
        };
        // Banner to intercept trigger.dev requires at runtime
        options.banner = {
            js: `(function() {
  if (typeof require !== 'undefined') {
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    Module.prototype.require = function(id) {
      if (id === '@trigger.dev/sdk') {
        console.warn('[Lambda] @trigger.dev/sdk not available, returning empty object');
        return {};
      }
      return originalRequire.apply(this, arguments);
    };
  }
})();`,
        };
    },
});
