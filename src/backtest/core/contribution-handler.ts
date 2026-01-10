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

export interface ProcessedContribution {
    timestamp: string;
    amount: number;
}

export interface ContributionProcessResult {
    nextContributionDate: Date | null;
    processedContributions: ProcessedContribution[];
}

export function processContributions(
    barTimestamp: string,
    nextContributionDate: Date | null,
    contributionAmount: number,
    contributionFrequencyDays: number
): ContributionProcessResult {
    if (!nextContributionDate) {
        return {
            nextContributionDate: null,
            processedContributions: [],
        };
    }

    const barDate = new Date(barTimestamp);
    let currentNextDate = nextContributionDate;
    const processedContributions: ProcessedContribution[] = [];

    while (currentNextDate && barDate >= currentNextDate) {
        addExternalCapital(contributionAmount);
        processedContributions.push({
            timestamp: barTimestamp,
            amount: contributionAmount,
        });

        currentNextDate = new Date(currentNextDate);
        currentNextDate.setUTCDate(
            currentNextDate.getUTCDate() + contributionFrequencyDays
        );
    }

    return {
        nextContributionDate: currentNextDate,
        processedContributions,
    };
}
