"use client";

import { forwardRef, useState, type FormEvent, type KeyboardEvent } from "react";

type ComposerProps = {
  busy: boolean;
  onSubmit: (question: string) => void;
};

/** Question input: Enter sends, Shift+Enter adds a line; Enter during IME composition is ignored. */
export const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer({ busy, onSubmit }, ref) {
  const [value, setValue] = useState("");
  const canSend = !busy && value.trim().length > 0;

  function send() {
    if (!canSend) return;
    onSubmit(value.trim());
    setValue("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    send();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-3 rounded-[14px] border border-[#d9e3f0] bg-white p-3 shadow-[0_4px_12px_#1a3a6910]"
    >
      <label htmlFor="composer-input" className="sr-only">
        Ask a question
      </label>
      <textarea
        id="composer-input"
        ref={ref}
        rows={2}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about a webhook, payment or error code…"
        className="min-h-11 flex-1 resize-none bg-transparent px-1 py-1.5 text-sm text-[#182539] placeholder:text-[#8a97aa] focus:outline-none"
      />
      <button
        type="submit"
        disabled={!canSend}
        className="rounded-[9px] bg-[#2459d3] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4bb8] disabled:cursor-not-allowed disabled:bg-[#9db3e6] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#f6b442]"
      >
        Send
      </button>
    </form>
  );
});
