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

const refreshedAssetSelectors = [
  'img[src*="assets/images/ui/icons/"][src$=".webp"]',
  'img[src*="assets/images/ui/dividers/"][src$=".webp"]'
].join(',');

document.querySelectorAll(refreshedAssetSelectors).forEach((image) => {
  const currentSrc = image.getAttribute('src');
  if (currentSrc) {
    image.src = currentSrc.replace(/\.webp$/i, '.png');
  }
});
