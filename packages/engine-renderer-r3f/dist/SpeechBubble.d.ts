type SpeechBubbleProps = {
    text: string;
    visible: boolean;
    trigger: number;
    charsPerSecond?: number;
    onDismiss?: () => void;
    onLetterRevealed?: () => void;
};
export default function SpeechBubble({ text, visible, trigger, charsPerSecond, onDismiss, onLetterRevealed, }: SpeechBubbleProps): any;
export {};
//# sourceMappingURL=SpeechBubble.d.ts.map