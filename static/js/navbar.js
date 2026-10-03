/**
 * navbar.js — Control del menú de navegación móvil responsivo y accesible
 */
document.addEventListener('DOMContentLoaded', () => {
  const toggleBtn = document.getElementById('navbarToggle');
  const navLinks = document.getElementById('navbarLinks');
  const overlay = document.getElementById('navbarOverlay');

  if (!toggleBtn || !navLinks) return;

  const openMenu = () => {
    toggleBtn.setAttribute('aria-expanded', 'true');
    toggleBtn.setAttribute('aria-label', 'Cerrar menú de navegación');
    navLinks.classList.add('is-open');
    if (overlay) overlay.classList.add('is-active');
    document.body.classList.add('menu-open');
  };

  const closeMenu = () => {
    toggleBtn.setAttribute('aria-expanded', 'false');
    toggleBtn.setAttribute('aria-label', 'Abrir menú de navegación');
    navLinks.classList.remove('is-open');
    if (overlay) overlay.classList.remove('is-active');
    document.body.classList.remove('menu-open');
  };

  // Click en el botón hamburguesa
  toggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  // Cerrar al hacer clic en el telón de fondo (overlay)
  if (overlay) {
    overlay.addEventListener('click', closeMenu);
  }

  // Cerrar al hacer clic en cualquier enlace dentro del menú
  navLinks.querySelectorAll('.navbar__link').forEach((link) => {
    link.addEventListener('click', closeMenu);
  });

  // Cerrar con la tecla Escape (accesibilidad)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('is-open')) {
      closeMenu();
      toggleBtn.focus();
    }
  });

  // Cerrar automáticamente si la ventana se amplía más allá del breakpoint móvil (768px)
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && navLinks.classList.contains('is-open')) {
      closeMenu();
    }
  });
});
