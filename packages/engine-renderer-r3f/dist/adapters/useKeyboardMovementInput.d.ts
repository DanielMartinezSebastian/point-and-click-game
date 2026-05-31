export type KeyboardMovementState = {
    moveLeft: boolean;
    moveRight: boolean;
    moveUp: boolean;
    moveDown: boolean;
    anyKeyPressed: boolean;
};
export declare function useKeyboardMovementInput(): {
    clearPressedKeys: () => void;
    getKeyboardMovement: () => KeyboardMovementState;
};
//# sourceMappingURL=useKeyboardMovementInput.d.ts.map