import { supabase } from "@/utils/supabase/supabaseClient";

export default async function getTradedStocks(): Promise<{
    data?: string[];
    success: boolean;
    error?: any;
}> {
    try {
        const stocks: any = await supabase.from("tradedStocks").select("name");
        return { data: stocks.data.map((v: any) => v.name), success: true };
    } catch (error) {
        return { success: false, error };
    }
}
