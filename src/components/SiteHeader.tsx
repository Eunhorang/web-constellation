import { useEffect, useRef, useState } from "react";
import { CloseIcon, MenuIcon } from "./Icons";
import { ExternalLink } from "./Common";

interface SiteHeaderProps {
  siteName: string;
  githubUrl: string;
}

export function SiteHeader({ siteName, githubUrl }: SiteHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let frame = 0;
    const updateScrolledState = () => {
      frame = 0;
      setScrolled(window.scrollY > 12);
    };
    const handleScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(updateScrolledState);
    };
    updateScrolledState();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menuOpen && !event.defaultPrevented) {
        event.preventDefault();
        event.stopImmediatePropagation();
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !headerRef.current?.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    };
    const desktopQuery = window.matchMedia("(min-width: 48rem)");
    const handleDesktopChange = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    desktopQuery.addEventListener("change", handleDesktopChange);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      desktopQuery.removeEventListener("change", handleDesktopChange);
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);
  const closeMenuAndFocus = (headingId: string) => {
    setMenuOpen(false);
    window.requestAnimationFrame(() => {
      document.getElementById(headingId)?.focus({ preventScroll: true });
    });
  };

  return (
    <header ref={headerRef} className="site-header" data-scrolled={scrolled}>
      <div className="site-header__inner page-container">
        <a className="brand" href="#top" aria-label={`${siteName} 처음으로`} onClick={closeMenu}>
          <span className="brand__mark" aria-hidden="true">
            <span />
          </span>
          <span>{siteName}</span>
        </a>

        <button
          ref={menuButtonRef}
          type="button"
          className="menu-button"
          aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
          aria-expanded={menuOpen}
          aria-controls="primary-navigation"
          onClick={() => setMenuOpen((current) => !current)}
        >
          {menuOpen ? <CloseIcon /> : <MenuIcon />}
        </button>

        <nav
          id="primary-navigation"
          className="primary-navigation"
          data-open={menuOpen}
          aria-label="주요 메뉴"
        >
          <a href="#projects" onClick={() => closeMenuAndFocus("projects-title")}>프로젝트</a>
          <a href="#map" onClick={() => closeMenuAndFocus("map-title")}>지도</a>
          <a href="#about" onClick={() => closeMenuAndFocus("about-title")}>소개</a>
          <ExternalLink
            href={githubUrl}
            className="nav-github"
            onClick={() => {
              if (menuOpen) {
                closeMenu();
                window.requestAnimationFrame(() => menuButtonRef.current?.focus());
              }
            }}
          >
            GitHub
          </ExternalLink>
        </nav>
      </div>
    </header>
  );
}
