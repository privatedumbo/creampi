interface CreampiConfig {
    linear: {
        workspace: string;
        team: string;
    };
    models: {
        worker: string;
        reviewer: string;
    };
    workflow: {
        review: boolean;
        maxReviewRounds: number;
    };
    branches: {
        pattern: string;
    };
    notify: {
        onTierComplete: boolean;
    };
}
declare function loadConfig(configPath?: string): CreampiConfig;

export { type CreampiConfig, loadConfig };
