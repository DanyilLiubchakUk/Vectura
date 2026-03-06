"use client";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GRID_TRADE_DEFAULT_CONFIG } from "@/utils/trading/algorithms/constants";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";


const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  symbol: z.string().min(1, "Symbol is required").max(20).transform((s) => s.toUpperCase()),
  alpacaKeyId: z.string().min(1, "API key is required").transform((s) => s.trim()),
  alpacaSecretKey: z.string().min(1, "API secret is required").transform((s) => s.trim()),
  capitalPct: z.coerce.number().min(1).max(100)
    .default(GRID_TRADE_DEFAULT_CONFIG.capitalPct),
  buyBelowPct: z
    .coerce.number().min(0).max(100)
    .default(GRID_TRADE_DEFAULT_CONFIG.buyBelowPct),
  sellAbovePct: z
    .coerce.number().min(0).max(100)
    .default(GRID_TRADE_DEFAULT_CONFIG.sellAbovePct),
  buyAfterSellPct: z
    .coerce.number().min(0).max(100)
    .default(GRID_TRADE_DEFAULT_CONFIG.buyAfterSellPct),
  cashFloor: z
    .coerce.number().min(0)
    .default(GRID_TRADE_DEFAULT_CONFIG.cashFloor),
  orderGapPct: z
    .coerce.number().min(-1).max(100)
    .default(GRID_TRADE_DEFAULT_CONFIG.orderGapPct),
});

type FormValues = z.infer<typeof schema>;

export function CreateAgentForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      name: "",
      symbol: "SPY",
      alpacaKeyId: "",
      alpacaSecretKey: "",
      capitalPct: GRID_TRADE_DEFAULT_CONFIG.capitalPct,
      buyBelowPct: GRID_TRADE_DEFAULT_CONFIG.buyBelowPct,
      sellAbovePct: GRID_TRADE_DEFAULT_CONFIG.sellAbovePct,
      buyAfterSellPct: GRID_TRADE_DEFAULT_CONFIG.buyAfterSellPct,
      cashFloor: GRID_TRADE_DEFAULT_CONFIG.cashFloor,
      orderGapPct: GRID_TRADE_DEFAULT_CONFIG.orderGapPct,
    },
  });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: values.name,
          symbol: values.symbol,
          alpacaKeyId: values.alpacaKeyId.trim(),
          alpacaSecretKey: values.alpacaSecretKey.trim(),
          strategyParams: {
            capitalPct: values.capitalPct,
            buyBelowPct: values.buyBelowPct,
            sellAbovePct: values.sellAbovePct,
            buyAfterSellPct: values.buyAfterSellPct,
            cashFloor: values.cashFloor,
            orderGapPct: values.orderGapPct,
          },
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        details?: string;
        id?: string;
      };

      if (!res.ok) {
        setSubmitError(data.error ?? "Failed to create agent");
        return;
      }

      if (data.id) {
        router.push(`/dashboard/agents/${data.id}`);
        router.refresh();
      } else {
        router.push("/dashboard/agents");
        router.refresh();
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        aria-describedby={submitError ? "form-error" : undefined}
        className="space-y-6"
      >
        {submitError && (
          <div
            id="form-error"
            role="alert"
            className="bg-destructive/10 text-destructive rounded-md border border-destructive/20 px-4 py-3 text-sm"
          >
            {submitError}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle id="form-heading">Basic info</CardTitle>
            <CardDescription>Agent name and trading symbol.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor={field.name}>Name</FormLabel>
                  <FormControl>
                    <Input
                      id={field.name}
                      placeholder="My Grid Agent"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="symbol"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor={field.name}>Symbol</FormLabel>
                  <FormControl>
                    <Input
                      id={field.name}
                      placeholder="SPY"
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Stock symbol to trade (e.g. SPY, QQQ)</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alpaca account</CardTitle>
            <CardDescription>
              Enter your API credentials. Paper vs live is detected automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="alpacaKeyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor={field.name}>API key ID</FormLabel>
                  <FormControl>
                    <Input
                      id={field.name}
                      type="text"
                      autoComplete="off"
                      placeholder="AK..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="alpacaSecretKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor={field.name}>API secret key</FormLabel>
                  <FormControl>
                    <Input
                      id={field.name}
                      type="password"
                      autoComplete="new-password"
                      placeholder="********"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Stored encrypted. Never shared or logged.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Strategy parameters (optional)</CardTitle>
            <CardDescription>
              Grid strategy settings. Defaults are used if left blank.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="capitalPct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor={field.name}>Capital % per buy</FormLabel>
                  <FormControl>
                    <Input
                      id={field.name}
                      type="number"
                      min={1}
                      max={100}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="buyBelowPct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor={field.name}>Buy below %</FormLabel>
                  <FormControl>
                    <Input
                      id={field.name}
                      type="number"
                      min={0}
                      max={100}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sellAbovePct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor={field.name}>Sell above %</FormLabel>
                  <FormControl>
                    <Input
                      id={field.name}
                      type="number"
                      min={0}
                      max={100}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="buyAfterSellPct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor={field.name}>Buy after sell %</FormLabel>
                  <FormControl>
                    <Input
                      id={field.name}
                      type="number"
                      min={0}
                      max={100}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cashFloor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor={field.name}>Cash floor ($)</FormLabel>
                  <FormControl>
                    <Input
                      id={field.name}
                      type="number"
                      min={0}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="orderGapPct"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor={field.name}>Order gap %</FormLabel>
                  <FormControl>
                    <Input
                      id={field.name}
                      type="number"
                      min={-1}
                      max={100}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Use -1 to disable</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Creating…" : "Create agent"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={form.formState.isSubmitting}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
