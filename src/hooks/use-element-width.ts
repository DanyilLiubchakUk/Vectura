import { useEffect, useState, type RefObject } from "react";

export function useElementWidth(
    ref?: RefObject<HTMLElement | null>,
    selector?: string
): number {
    const [width, setWidth] = useState(0);

    useEffect(() => {
        if (!ref && !selector) return;

        let resizeObserver: ResizeObserver | null = null;
        let mutationObserver: MutationObserver | null = null;

        const getElement = (): HTMLElement | null => {
            if (ref?.current) {
                return selector
                    ? (ref.current.querySelector(selector) as HTMLElement | null)
                    : ref.current;
            }
            if (selector) {
                return document.querySelector(selector) as HTMLElement | null;
            }
            return null;
        };

        const setupResizeObserver = (element: HTMLElement) => {
            const update = () => setWidth(element.getBoundingClientRect().width);
            update();
            resizeObserver = new ResizeObserver(update);
            resizeObserver.observe(element);
        };

        const element = getElement();
        if (element) {
            setupResizeObserver(element);
        } else {
            const container = ref?.current || document.body;
            mutationObserver = new MutationObserver(() => {
                const element = getElement();
                if (element) {
                    setupResizeObserver(element);
                    mutationObserver?.disconnect();
                }
            });
            mutationObserver.observe(container, { childList: true, subtree: true });
        }

        return () => {
            resizeObserver?.disconnect();
            mutationObserver?.disconnect();
        };
    }, [ref, selector]);

    return width;
}
