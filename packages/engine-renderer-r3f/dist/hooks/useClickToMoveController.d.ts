import type { MovementPoint } from "@pointclick-engine/engine-core";
type UseClickToMoveControllerConfig = {
    arrivalThreshold: number;
    stuckMovementEpsilon: number;
    stuckTimeoutMs: number;
};
type AutoMoveDirection = {
    horizontal: number;
    vertical: number;
    snapToTarget?: {
        x: number;
        z: number;
    };
};
export declare function useClickToMoveController(config?: Partial<UseClickToMoveControllerConfig>): {
    setTarget: (x: number, z: number) => void;
    setRoute: (route: MovementPoint[]) => void;
    cancelTarget: () => void;
    resolveDirection: (currentX: number, currentZ: number, delta: number, hasManualInput: boolean) => AutoMoveDirection;
    registerProgress: (currentX: number, currentZ: number, delta: number, hasManualInput: boolean) => {
        stuck: boolean;
    };
};
export {};
//# sourceMappingURL=useClickToMoveController.d.ts.map