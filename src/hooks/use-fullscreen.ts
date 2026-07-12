"use client"

import { useState, useEffect } from "react"
import { createLogger } from "@/lib/logger";

const logger = createLogger("use-fullscreen");

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    
    // Initial check
    setIsFullscreen(!!document.fullscreenElement)

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  const enterFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err: unknown) => {
        logger.error(
          "requestFullscreen failed",
          err instanceof Error ? err : new Error(String(err))
        );
      });
    }
  }

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch((err: unknown) => {
        logger.error(
          "exitFullscreen failed",
          err instanceof Error ? err : new Error(String(err))
        );
      });
    }
  }

  const toggleFullscreen = () => {
    if (isFullscreen) {
      exitFullscreen()
    } else {
      enterFullscreen()
    }
  }

  return {
    isFullscreen,
    enterFullscreen,
    exitFullscreen,
    toggleFullscreen,
  }
}
