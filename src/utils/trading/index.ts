export type TAutoTrade = Promise<{
    message: string;
    success: boolean;
}>;

export default async function AutoTrade(): TAutoTrade {

    // Top level function to trade on schedule

    return { message: "This time waited for changes in the market for a better trade", success: true };
}
