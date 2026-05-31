type SpeechBubbleProps = {
    text: string;
    visible: boolean;
    trigger: number;
    charsPerSecond?: number;
    onDismiss?: () => void;
    onLetterRevealed?: () => void;
};
export default function SpeechBubble({ text, visible, trigger, charsPerSecond, onDismiss, onLetterRevealed, }: SpeechBubbleProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=SpeechBubble.d.ts.map