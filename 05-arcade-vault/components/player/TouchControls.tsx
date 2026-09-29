"use client";

import { useEffect, useRef, type PointerEvent } from "react";

export type TouchButtonMode = "hold" | "tap" | "repeat";

export type TouchButton = {
  code: string;
  label: string;
  mode: TouchButtonMode;
  area: "left" | "right";
  wide?: boolean;
};

const REPEAT_DELAY_MS = 180;
const REPEAT_INTERVAL_MS = 60;

type Active = { pointerId: number; stop: () => void };

function fire(type: "keydown" | "keyup", code: string) {
  window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true, cancelable: true }));
}

export function TouchControls({
  buttons,
  disabled,
}: {
  buttons: TouchButton[];
  disabled: boolean;
}) {
  const activeRef = useRef(new Map<string, Active>());

  useEffect(() => {
    const active = activeRef.current;
    if (disabled) {
      active.forEach((a) => a.stop());
      active.clear();
    }
    return () => {
      active.forEach((a) => a.stop());
      active.clear();
    };
  }, [disabled]);

  const release = (code: string, pointerId: number) => {
    const a = activeRef.current.get(code);
    if (!a || a.pointerId !== pointerId) return;
    a.stop();
    activeRef.current.delete(code);
  };

  const press = (e: PointerEvent<HTMLButtonElement>, b: TouchButton) => {
    e.preventDefault();
    if (disabled || activeRef.current.has(b.code)) return;
    e.currentTarget.setPointerCapture(e.pointerId);

    if (b.mode === "tap") {
      fire("keydown", b.code);
      fire("keyup", b.code);
      activeRef.current.set(b.code, { pointerId: e.pointerId, stop: () => {} });
      return;
    }

    fire("keydown", b.code);
    let delayId: ReturnType<typeof setTimeout> | undefined;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    if (b.mode === "repeat") {
      delayId = setTimeout(() => {
        intervalId = setInterval(() => fire("keydown", b.code), REPEAT_INTERVAL_MS);
      }, REPEAT_DELAY_MS);
    }
    activeRef.current.set(b.code, {
      pointerId: e.pointerId,
      stop: () => {
        clearTimeout(delayId);
        clearInterval(intervalId);
        fire("keyup", b.code);
      },
    });
  };

  if (buttons.length === 0) return null;

  const renderGroup = (area: TouchButton["area"]) => (
    <div className={`touch-group touch-${area}`}>
      {buttons
        .filter((b) => b.area === area)
        .map((b) => (
          <button
            key={b.code}
            type="button"
            tabIndex={-1}
            disabled={disabled}
            className={`touch-btn${b.wide ? " wide" : ""}`}
            data-code={b.code}
            onPointerDown={(e) => press(e, b)}
            onPointerUp={(e) => release(b.code, e.pointerId)}
            onPointerCancel={(e) => release(b.code, e.pointerId)}
            onLostPointerCapture={(e) => release(b.code, e.pointerId)}
            onContextMenu={(e) => e.preventDefault()}
          >
            {b.label}
          </button>
        ))}
    </div>
  );

  return (
    <div className="touch-controls" aria-label="Controles táctiles">
      {renderGroup("left")}
      {renderGroup("right")}
    </div>
  );
}
