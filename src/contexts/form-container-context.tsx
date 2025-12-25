"use client";

import { createContext, useContext, RefObject, ReactNode } from "react";

const FormContainerContext =
    createContext<RefObject<HTMLElement | null> | null>(null);

export function FormContainerProvider({
    containerRef,
    children,
}: {
    containerRef: RefObject<HTMLElement | null>;
    children: ReactNode;
}) {
    return (
        <FormContainerContext.Provider value={containerRef}>
            {children}
        </FormContainerContext.Provider>
    );
}

export function useFormContainer(): RefObject<HTMLElement | null> {
    const context = useContext(FormContainerContext);
    return context || { current: null };
}
