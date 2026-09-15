"use client";

import { useEffect } from "react";

export default function SecurityLayer() {
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
    };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent PrintScreen
      if (e.key === "PrintScreen") {
        e.preventDefault();
        try {
          navigator.clipboard.writeText(''); 
        } catch (err) {}
      }
      
      // Prevent common screenshot shortcuts (Windows: Win+Shift+S, Mac: Cmd+Shift+3/4/5)
      if (e.metaKey && e.shiftKey && (e.key === 's' || e.key === 'S' || e.key === '3' || e.key === '4' || e.key === '5')) {
        e.preventDefault();
      }

      // Prevent Copy/Paste/Cut shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C' || e.key === 'v' || e.key === 'V' || e.key === 'x' || e.key === 'X')) {
        e.preventDefault();
      }
    };

    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("cut", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("dragstart", handleDragStart);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("cut", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("dragstart", handleDragStart);
    };
  }, []);

  return null;
}
