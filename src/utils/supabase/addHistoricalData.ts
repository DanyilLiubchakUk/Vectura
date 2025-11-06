import { Tfilteredsnapshot } from "@/utils/alpaca/getTradingData";
import { supabase } from "./supabaseClient";

export default async function addHistoricalData(
    snapshot: Tfilteredsnapshot
): Promise<{ data?: Tfilteredsnapshot; success: boolean; error?: any }> {
    try {
        const { error } = await supabase
            .from("historicalData")
            .insert([snapshot])
            .select();

        if (error) {
            return { success: false, error };
        }

        return { data: snapshot, success: true };
    } catch (error) {
        return { success: false, error };
    }
}
