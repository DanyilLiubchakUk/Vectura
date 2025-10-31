"use client";
import { useEffect } from "react";
import { supabase } from "@/utils/supabase/supabaseClient";

export default function Page() {
    const testConnection = async () => {
        try {
            const channels = await supabase.getChannels();
            console.log(channels); // shoud return empty array for unconfigured supabase project
            console.log("Successful conection with supabase");
        } catch (error) {
            console.error("Error testing connection with supabase:", error);
        }
    };
    useEffect(() => {
        testConnection();
    }, [supabase]);
    return (
        <main className="min-h-dvh p-6">
            <h1 className="text-2xl font-semibold">Vectura</h1>
        </main>
    );
}
