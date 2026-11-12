import { useEffect, useRef } from "react";
import type { RefObject } from "react";

const focusable = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// What every pop-up needs: Esc closes it, Tab stays inside it, and focus goes back to where it
// was when it closes.
export function useDialog<T extends HTMLElement>(onClose: (() => void) | null): RefObject<T | null> {
  const ref = useRef<T | null>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null;
    const node = ref.current;
    if (node && !node.contains(document.activeElement)) {
      const first = node.querySelector<HTMLElement>("[autofocus]") ?? node;
      if (first === node && !node.hasAttribute("tabindex")) node.setAttribute("tabindex", "-1");
      first.focus({ preventScroll: true });
    }
    const onKey = (event: KeyboardEvent) => {
      const current = ref.current;
      if (!current) return;
      if (event.key === "Escape" && close.current) {
        // Only the top-most dialog answers.
        const dialogs = document.querySelectorAll('[aria-modal="true"]');
        if (dialogs[dialogs.length - 1] !== current) return;
        event.stopPropagation();
        close.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = [...current.querySelectorAll<HTMLElement>(focusable)].filter((item) => item.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (before && document.contains(before)) before.focus({ preventScroll: true });
    };
  }, []);

  return ref;
}

// For pop-ups written inline: the same behaviour as useDialog, as a <section>.
export function DialogSection({ onClose, children, ...props }: { onClose: (() => void) | null; children: React.ReactNode } & React.HTMLAttributes<HTMLElement>) {
  const ref = useDialog<HTMLElement>(onClose);
  return <section ref={ref} role="dialog" aria-modal="true" {...props}>{children}</section>;
}
