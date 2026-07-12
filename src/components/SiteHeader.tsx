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
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menuOpen) {
        setMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header" data-scrolled={scrolled}>
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
          <a href="#projects" onClick={closeMenu}>프로젝트</a>
          <a href="#map" onClick={closeMenu}>지도</a>
          <a href="#about" onClick={closeMenu}>소개</a>
          <ExternalLink href={githubUrl} className="nav-github">GitHub</ExternalLink>
        </nav>
      </div>
    </header>
  );
}
