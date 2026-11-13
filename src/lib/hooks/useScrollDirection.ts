"use client";

import { useState, useEffect, useRef } from "react";

interface ScrollDirectionOptions {
  threshold?: number;
  topOffset?: number;
}

/**
 * Returns true when navbar should be visible (scrolling up or near top),
 * and false when scrolling down (navbar slides up out of view).
 */
export function useScrollDirection({
  threshold = 8,
  topOffset = 60,
}: ScrollDirectionOptions = {}) {
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    lastScrollY.current = window.scrollY;

    const updateScrollDirection = () => {
      const currentScrollY = window.scrollY;

      // Always show near top of page
      if (currentScrollY <= topOffset) {
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY.current + threshold) {
        // Scrolling down -> hide navbar
        setIsVisible(false);
      } else if (currentScrollY < lastScrollY.current - threshold) {
        // Scrolling up -> show navbar
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY <= 0 ? 0 : currentScrollY;
      ticking.current = false;
    };

    const handleScroll = () => {
      if (!ticking.current) {
        window.requestAnimationFrame(updateScrollDirection);
        ticking.current = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [threshold, topOffset]);

  return isVisible;
}
