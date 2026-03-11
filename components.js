(function () {
  const path = window.location.pathname;

  function navLink(href, label) {
    const active = path === href || (href !== '/' && path.startsWith(href));
    return `<a href="${href}"${active ? ' class="active"' : ''}>${label}</a>`;
  }

  const rail = document.getElementById('site-rail');
  if (rail) {
    rail.innerHTML =
      `<a href="/" class="rail-name">JW</a>` +
      `<nav class="rail-nav">` +
        navLink('/tools', 'Tools') +
        navLink('/experience', 'Experience') +
        navLink('/about', 'About') +
      `</nav>` +
      `<div class="rail-foot"><div>Sydney, AU</div><div>2026</div></div>`;
  }

  const footer = document.getElementById('site-footer');
  if (footer) {
    footer.innerHTML =
      `<a href="mailto:jwarnerst@gmail.com" class="contact-link">Email ↗</a> ` +
      `<a href="https://linkedin.com/in/james-warner1" target="_blank" rel="noopener" class="contact-link">LinkedIn ↗</a>` +
      `<br/>© 2026 James Warner`;
  }
})();
