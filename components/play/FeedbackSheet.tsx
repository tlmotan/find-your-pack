"use client";

// PROPOSED, AND STILL OWED A PRD LINE.
//
// The post-game feedback sheet (mockup-prompts.md §10): it rises over the ended
// screen on its own, a couple of hundred milliseconds after the game finishes.
// No button opens it, because it is part of the transition out of the game
// rather than something the player goes looking for.
//
// It sits against AGENTS.md hard rule 10 (v1 scope), so it needs a PRD line
// before this counts as shipped. It does NOT sit against hard rule 1: the form
// asks for no personal data, and nothing here sends or stores an answer —
// onSubmit hands the taps to the caller and that is the end of them.
//
// Not a modal: no backdrop, no focus trap, no blur, and the ended screen stays
// readable behind it. The brief is a sheet arriving after a finished
// experience, not a dialog interrupting one.

import { FeedbackForm, type FeedbackResponse } from "@/components/ui/feedback-form";
import { useSheetEntrance } from "@/hooks/useSheetEntrance";
import { isSheetInteractive } from "@/lib/feedback-sheet";

type Props = {
  /**
   * Whether the ended screen is actually on show yet.
   *
   * False while the block wipe's columns are still clearing over it — starting
   * the rise under the columns would spend the whole travel out of sight.
   */
  ready?: boolean;
  onSubmit?: (data: FeedbackResponse) => void;
  /** The screen the sheet rises over, dimmed while it is up. */
  children: React.ReactNode;
};

export function FeedbackSheet({ ready = true, onSubmit, children }: Props) {
  const { phase, present, dismiss } = useSheetEntrance(ready);

  return (
    <div className="relative">
      {/* Dimmed in step with the rise. Opacity rather than an overlay, so the
          ended screen fades toward the same ground it already sits on instead
          of gaining a grey film. */}
      <div className="sheet-dim" data-phase={present ? phase : "below"}>
        {children}
      </div>

      {present ? (
        <section
          aria-labelledby="feedback-heading"
          // Inert until it stops moving: a chip that slides out from under a
          // thumb mid-press is how someone sends the wrong answer.
          inert={!isSheetInteractive(phase)}
          data-phase={phase}
          // Capped and scrollable: with the comment box open on a 360x640
          // phone the content is taller than the sheet's share of the screen,
          // and the overflow would otherwise run off the top edge.
          className="sheet-rise rounded-t-md border-t border-rule bg-ground-raised fixed inset-x-0 bottom-0 z-40 flex max-h-[92dvh] min-h-[66dvh] flex-col overflow-y-auto px-5 pt-7 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        >
          <div id="feedback-heading" className="sr-only">
            Before you go: how was that?
          </div>
          <FeedbackForm
            className="mx-auto w-full max-w-[26rem]"
            onSubmit={(data) => {
              onSubmit?.(data);
              dismiss();
            }}
            onCancel={dismiss}
          />
        </section>
      ) : null}
    </div>
  );
}
