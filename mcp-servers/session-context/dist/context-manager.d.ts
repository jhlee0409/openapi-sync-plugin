import { SessionContext, UsageMetrics, UsageStatus } from "./types.js";
export declare class ContextManager {
    private contextPath;
    private backupPath;
    private projectDir;
    constructor(projectDir: string);
    exists(): boolean;
    load(): SessionContext | null;
    save(context: SessionContext): void;
    private applyLimits;
    update(partial: Partial<SessionContext>): SessionContext;
    private deepMerge;
    /**
     * Track a usage event (tool call, file read, etc.)
     */
    trackUsage(event: {
        tool_calls?: number;
        files_read?: number;
        files_modified?: number;
    }): UsageMetrics;
    /**
     * Calculate load score based on heuristics (0-100+)
     */
    calculateLoadScore(metrics: UsageMetrics): number;
    /**
     * Get current usage status with recommendations
     */
    getUsageStatus(): UsageStatus;
    /**
     * Compact the context - keep only essential recent data
     */
    compactContext(): SessionContext;
    /**
     * Reset usage tracking (e.g., after manual /clear)
     */
    resetUsage(): UsageMetrics;
    formatForDisplay(context: SessionContext): string;
}
//# sourceMappingURL=context-manager.d.ts.map