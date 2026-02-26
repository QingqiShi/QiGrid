import type { RefObject } from "react";
import { useEffect, useRef } from "react";

/**
 * Manages drag-selection state with a document-level pointerup listener.
 * Returns a ref that tracks whether a drag is in progress — set to true
 * by cell pointerdown handlers, cleared on pointerup.
 */
export function useDragSelection(onSelectionMouseUp: (() => void) | undefined): RefObject<boolean> {
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (!onSelectionMouseUp) return;
    const handlePointerUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        onSelectionMouseUp();
      }
    };
    document.addEventListener("pointerup", handlePointerUp);
    return () => document.removeEventListener("pointerup", handlePointerUp);
  }, [onSelectionMouseUp]);

  return isDraggingRef;
}
