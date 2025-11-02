import Alpaca from "@alpacahq/alpaca-trade-api";

const alpaca = new Alpaca();

export async function getAccountForExample(): Promise<{
    data: any | null;
    error?: undefined | any;
}> {
    try {
        const account = await alpaca.getAccount();
        return { data: account };
    } catch (error) {
        console.error("Error fetching the account data for example: ", error);
        return { data: null, error };
    }
}
