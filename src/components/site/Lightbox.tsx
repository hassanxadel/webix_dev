import { useRef } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { Button } from "./Button";

type LightboxProps = {
  shots: string[];
  /** The screenshot showing; null = closed. */
  at: number | null;
  onAt: (at: number | null) => void;
  label: string;
};

/** Full-size screenshots: arrow keys or buttons step through them, Esc or ✕ closes, and focus returns to what opened it. */
export function Lightbox({ shots, at, onAt, label }: LightboxProps) {
  const many = shots.length > 1;
  const opener = useRef<HTMLElement | null>(null);
  const step = (by: number) => at !== null && onAt((at + by + shots.length) % shots.length);

  return (
    <Dialog.Root open={at !== null} onOpenChange={(open) => !open && onAt(null)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-night/90 backdrop-blur-sm" />
        <Dialog.Content
          aria-describedby={undefined}
          onOpenAutoFocus={() => (opener.current = document.activeElement as HTMLElement)}
          // Radix only returns focus to a Dialog.Trigger, and this dialog has none.
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            opener.current?.focus();
          }}
          onKeyDown={(e) => {
            if (!many || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
            e.preventDefault();
            step(e.key === "ArrowLeft" ? -1 : 1);
          }}
          className="fixed inset-0 z-[61] flex items-center justify-center p-4 outline-none sm:p-10"
        >
          {at !== null && (
            <>
              <Dialog.Title className="sr-only">
                {label}, screenshot {at + 1} of {shots.length}
              </Dialog.Title>
              <img src={shots[at]} alt={`${label}, screenshot ${at + 1}`} className="max-h-full max-w-full rounded-lg object-contain" />
            </>
          )}
          <Dialog.Close asChild>
            <Button variant="icon" aria-label="Close" className="absolute right-4 top-4 z-10">
              <X size={18} strokeWidth={2.6} aria-hidden />
            </Button>
          </Dialog.Close>
          {many && (
            <>
              <Button variant="icon" aria-label="Previous screenshot" onClick={() => step(-1)} className="absolute left-4 top-[calc(50%-1.375rem)] z-10">
                <ArrowLeft size={18} strokeWidth={2.6} aria-hidden />
              </Button>
              <Button variant="icon" aria-label="Next screenshot" onClick={() => step(1)} className="absolute right-4 top-[calc(50%-1.375rem)] z-10">
                <ArrowRight size={18} strokeWidth={2.6} aria-hidden />
              </Button>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
