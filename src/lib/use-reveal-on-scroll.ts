import { useLayoutEffect, useRef, useState, type RefObject } from "react";

type RevealState = "visible" | "pending" | "revealed";

export function useRevealOnScroll<T extends Element>(): {
  ref: RefObject<T | null>;
  className: string;
} {
  const ref = useRef<T | null>(null);
  const [state, setState] = useState<RevealState>("visible");

  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const rect = node.getBoundingClientRect();
    const alreadyVisible = rect.top < window.innerHeight && rect.bottom > 0;
    if (alreadyVisible) return;

    setState("pending");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState("revealed");
          observer.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const className =
    state === "pending" ? "reveal-pending" : state === "revealed" ? "reveal-in" : "";

  return { ref, className };
}
