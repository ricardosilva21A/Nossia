import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

// Opens a panel as if you walked up to something on the wall: the panel starts exactly over the
// object it came from and grows to fill the screen; closing shrinks it back to the same spot.
type Props = {
  origin: DOMRect | null;
  label: string;
  className?: string;
  onClose: () => void;
  children: (close: () => void) => ReactNode;
};

const duration = 460;

function reducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function ZoomOverlay({ origin, label, className = "", onClose, children }: Props) {
  const panel = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"from" | "open" | "closing">(origin && !reducedMotion() ? "from" : "open");
  const [start, setStart] = useState<string>("none");

  // Measure where the panel will end up and start it scaled down over the origin.
  useLayoutEffect(() => {
    if (!origin || !panel.current) return;
    const target = panel.current.getBoundingClientRect();
    const scaleX = origin.width / target.width;
    const scaleY = origin.height / target.height;
    setStart(`translate(${origin.left - target.left}px, ${origin.top - target.top}px) scale(${scaleX}, ${scaleY})`);
  }, [origin]);

  useEffect(() => {
    if (phase !== "from" || start === "none") return;
    const frame = window.requestAnimationFrame(() => window.requestAnimationFrame(() => setPhase("open")));
    return () => window.cancelAnimationFrame(frame);
  }, [phase, start]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    panel.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function close() {
    if (!origin || reducedMotion()) {
      onClose();
      return;
    }
    setPhase("closing");
    window.setTimeout(onClose, duration);
  }

  const shrunk = phase !== "open";
  return (
    <div className={`zoom-backdrop ${shrunk ? "" : "is-open"}`} role="presentation" onClick={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div
        ref={panel}
        className={`zoom-panel ${className}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        style={{ transform: shrunk && start !== "none" ? start : "none", opacity: phase === "closing" ? 0.4 : 1, transition: phase === "from" ? "none" : undefined, visibility: phase === "from" && start === "none" && origin ? "hidden" : undefined }}
      >
        <button type="button" className="zoom-close" aria-label="Fechar" onClick={close}>×</button>
        {children(close)}
      </div>
    </div>
  );
}
