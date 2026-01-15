import { SessionContext } from "./types.js";
export declare class ContextManager {
    private contextPath;
    private backupPath;
    constructor(projectDir: string);
    exists(): boolean;
    load(): SessionContext | null;
    save(context: SessionContext): void;
    private applyLimits;
    update(partial: Partial<SessionContext>): SessionContext;
    private deepMerge;
    formatForDisplay(context: SessionContext): string;
}
//# sourceMappingURL=context-manager.d.ts.map