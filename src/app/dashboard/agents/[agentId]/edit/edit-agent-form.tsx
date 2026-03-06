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
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import type { AlpacaAccountType } from "@/lib/domain";

const schema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  symbol: z.string().min(1, "Symbol is required").max(20).transform((s) => s.toUpperCase()),
  alpacaKeyId: z.string().optional(),
  alpacaSecretKey: z.string().optional(),
  capitalPct: z.coerce.number().min(1).max(100),
  buyBelowPct: z.coerce.number().min(0).max(100),
  sellAbovePct: z.coerce.number().min(0).max(100),
  buyAfterSellPct: z.coerce.number().min(0).max(100),
  cashFloor: z.coerce.number().min(0),
  orderGapPct: z.coerce.number().min(-1).max(100),
}).refine(
  (data) => {
    const hasKey = (data.alpacaKeyId ?? "").trim().length > 0;
    const hasSecret = (data.alpacaSecretKey ?? "").trim().length > 0;
    return !hasKey || (hasKey && hasSecret);
  },
  { message: "Provide both API key and secret to update credentials", path: ["alpacaSecretKey"] }
);

type FormValues = z.infer<typeof schema>;


interface EditAgentFormProps {
  agentId: string;
  initialName: string;
  initialSymbol: string;
  initialAlpacaAccountType: AlpacaAccountType;
  initialMaskedKeyId: string;
  initialStrategyParams: {
    capitalPct: number;
    buyBelowPct: number;
    sellAbovePct: number;
    buyAfterSellPct: number;
    cashFloor: number;
    orderGapPct: number;
  };
}

export function EditAgentForm({
  agentId,
  initialName,
  initialSymbol,
  initialAlpacaAccountType,
  initialMaskedKeyId,
  initialStrategyParams,
}: EditAgentFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      name: initialName,
      symbol: initialSymbol,
      alpacaKeyId: "",
      alpacaSecretKey: "",
      capitalPct: initialStrategyParams.capitalPct,
      buyBelowPct: initialStrategyParams.buyBelowPct,
      sellAbovePct: initialStrategyParams.sellAbovePct,
      buyAfterSellPct: initialStrategyParams.buyAfterSellPct,
      cashFloor: initialStrategyParams.cashFloor,
      orderGapPct: initialStrategyParams.orderGapPct,
    },
  });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      const body: Record<string, unknown> = {
        name: values.name,
        symbol: values.symbol,
        strategyParams: {
          capitalPct: values.capitalPct,
          buyBelowPct: values.buyBelowPct,
          sellAbovePct: values.sellAbovePct,
          buyAfterSellPct: values.buyAfterSellPct,
          cashFloor: values.cashFloor,
          orderGapPct: values.orderGapPct,
        },
      };
      const keyId = (values.alpacaKeyId ?? "").trim();
      const secret = (values.alpacaSecretKey ?? "").trim();
      if (keyId && secret) {
        body.alpacaKeyId = keyId;
        body.alpacaSecretKey = secret;
      }
      const res = await fetch(`/api/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = (await res.json().catch(() => ({}))) as { error?: string };

      if (!res.ok) {
        setSubmitError(data.error ?? "Failed to update agent");
        return;
      }

      router.push(`/dashboard/agents/${agentId}`);
      router.refresh();
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
            <CardTitle>Basic info</CardTitle>
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
            <CardTitle>Alpaca credentials</CardTitle>
            <CardDescription>
              Current key is shown for reference. Enter new key and secret to update.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Current API key ID</label>
              <Input
                value={initialMaskedKeyId}
                readOnly
                disabled
                className="bg-muted font-mono text-xs"
                aria-label="Current API key ID (masked, read-only)"
              />
              <p className="text-muted-foreground text-xs">
                Only last 4 characters shown. Secret is never displayed. Enter new credentials below to update.
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-sm font-medium">Account type</span>
              <p className="text-muted-foreground text-sm capitalize">
                {initialAlpacaAccountType} (detected from keys)
              </p>
            </div>
            <FormField
              control={form.control}
              name="alpacaKeyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor={field.name}>New API key ID</FormLabel>
                  <FormControl>
                    <Input
                      id={field.name}
                      type="text"
                      autoComplete="off"
                      placeholder="Leave blank to keep current"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Provide with secret to update credentials</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="alpacaSecretKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor={field.name}>New API secret</FormLabel>
                  <FormControl>
                    <Input
                      id={field.name}
                      type="password"
                      autoComplete="new-password"
                      placeholder="Leave blank to keep current"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Strategy parameters</CardTitle>
            <CardDescription>
              Grid strategy settings.
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
            {form.formState.isSubmitting ? "Saving…" : "Save changes"}
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
