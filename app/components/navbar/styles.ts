export const NAV_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cookie&display=swap');

  .nav-link {
    position: relative;
    cursor: pointer;
    padding-bottom: 2px;
  }
  .nav-link::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0;
    width: 0; height: 1px;
    background: var(--awm-gold);
    transition: width 0.25s cubic-bezier(.22,1,.36,1);
  }
  .nav-link:hover::after { width: 100%; }

  .mobile-list-btn:hover { background: color-mix(in srgb, var(--awm-gold) 6%, transparent) !important; }

  .mega-menu-item {
    position: relative;
    cursor: pointer;
    transition: all 0.2s ease;
    padding: 4px 0;
  }
  .mega-menu-item:hover {
    color: var(--awm-forest);
    transform: translateX(4px);
  }

  .learn-trigger {
    position: relative;
  }
  .learn-trigger::before {
    content: '';
    position: absolute;
    bottom: -20px;
    left: 0;
    right: 0;
    height: 20px;
    background: transparent;
    z-index: 1201;
  }

  .cartoon-header-link {
    cursor: pointer;
    transition: color 0.2s ease;
  }
  .cartoon-header-link:hover {
    color: var(--awm-gold) !important;
  }
`
