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
    const testAlpaca = async () => {
        try {
            const response = await fetch("/api/alpaca");
            const data = await response.json();
            if (data.success) {
                console.log("Current Account:", data.account);
            } else {
                console.error("Error fetching Alpaca account:", data.error);
            }
        } catch (error) {
            console.error("Error testing Alpaca connection:", error);
        }
    };
    useEffect(() => {
        testConnection();
        testAlpaca();
    }, [supabase]);
    return (
        <main className="min-h-dvh p-6">
            <h1 className="text-2xl font-semibold">Vectura</h1>
        </main>
    );
}
