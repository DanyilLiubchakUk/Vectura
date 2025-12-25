import { addExternalCapital } from "@/backtest/backtestState";

export interface ContributionConfig {
    frequencyDays?: number;
    amount?: number;
    startDate: string;
}

export function initializeContribution(
    config: ContributionConfig
): Date | null {
    if (
        config.frequencyDays &&
        config.frequencyDays > 0 &&
        config.amount &&
        config.amount > 0
    ) {
        const firstContribution = new Date(config.startDate + "T00:00:00Z");
        firstContribution.setUTCDate(
            firstContribution.getUTCDate() + config.frequencyDays
        );
        return firstContribution;
    }
    return null;
}

export function processContributions(
    barTimestamp: string,
    nextContributionDate: Date | null,
    contributionAmount: number,
    contributionFrequencyDays: number
): Date | null {
    if (!nextContributionDate) {
        return null;
    }

    const barDate = new Date(barTimestamp);
    let currentNextDate = nextContributionDate;

    while (currentNextDate && barDate >= currentNextDate) {
        addExternalCapital(contributionAmount);

        currentNextDate = new Date(currentNextDate);
        currentNextDate.setUTCDate(
            currentNextDate.getUTCDate() + contributionFrequencyDays
        );
    }

    return currentNextDate;
}
