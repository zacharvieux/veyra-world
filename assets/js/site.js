const navToggle = document.querySelector('.nav-toggle');
const primaryNav = document.querySelector('#primary-nav');

if (navToggle && primaryNav) {
  navToggle.addEventListener('click', () => {
    const isOpen = primaryNav.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });
}

const siteScript = document.currentScript;
if (siteScript) {
  const mediaStylesheet = document.createElement('link');
  mediaStylesheet.rel = 'stylesheet';
  mediaStylesheet.href = new URL('../css/media-refresh.css', siteScript.src).href;
  document.head.appendChild(mediaStylesheet);
}

document.querySelectorAll('img[src*="assets/images/ui/icons/"][src$=".webp"]').forEach((image) => {
  image.src = image.getAttribute('src').replace(/\.webp$/i, '.png');
});
