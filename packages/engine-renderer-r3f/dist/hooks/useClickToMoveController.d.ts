type UseClickToMoveControllerConfig = {
    arrivalThreshold: number;
    stuckMovementEpsilon: number;
    stuckTimeoutMs: number;
};
export declare function useClickToMoveController(config?: Partial<UseClickToMoveControllerConfig>): {
    setTarget: any;
    setRoute: any;
    cancelTarget: any;
    resolveDirection: any;
    registerProgress: any;
};
export {};
//# sourceMappingURL=useClickToMoveController.d.ts.map