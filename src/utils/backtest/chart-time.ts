import type { Time } from "lightweight-charts";

export function convertToChartTime(time: string | number): Time {
    if (typeof time === "number") {
        return time as Time;
    }

    const date = new Date(time);
    if (!isNaN(date.getTime())) {
        return Math.floor(date.getTime() / 1000) as Time;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(time)) {
        return time as Time;
    }

    const datePart = time.split("T")[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
        return datePart as Time;
    }

    return time as Time;
}

export function ensureTimeAfter(startTime: Time, endTime: Time): Time | null {
    if (endTime === startTime) {
        if (typeof endTime === "number") {
            // Add 1 second to Unix timestamp
            return (endTime + 1) as Time;
        } else if (typeof endTime === "string") {
            // Add 1 day to date string (yyyy-mm-dd)
            try {
                const date = new Date(endTime + "T00:00:00Z");
                date.setUTCDate(date.getUTCDate() + 1);
                return (date.toISOString().split("T")[0]) as Time;
            } catch {
                return null;
            }
        } else {
            return null;
        }
    }

    return endTime;
}
