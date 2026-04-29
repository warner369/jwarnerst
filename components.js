(function () {
  const path = window.location.pathname;

  function navLink(href, label, iconSVG) {
    const active = path === href || (href !== '/' && path.startsWith(href));
    return (
      `<a href="${href}"${active ? ' class="active"' : ''}>` +
        `<span class="nav-icon">${iconSVG}</span>` +
        `<span class="nav-text">${label}</span>` +
      `</a>`
    );
  }

  const SEARCH_INDEX = [
    {
      title: 'Home',
      url: '/',
      excerpt: 'Enterprise Solutions Consultant — ServiceNow Specialist.',
      keywords: 'james warner enterprise solutions consultant servicenow specialist portfolio home'
    },
    {
      title: 'Tools',
      url: '/tools',
      excerpt: 'Interactive tools including the Services Estimator and mock certification exams.',
      keywords: 'tools services estimator mock exams cis-df cad servicenow interactive'
    },
    {
      title: 'Services Estimator',
      url: '/tools/estimator',
      excerpt: 'Estimate ServiceNow implementation effort, team composition, phasing, and cost.',
      keywords: 'estimator services effort cost days weeks delivery servicenow implementation modules org size team phasing'
    },
    {
      title: 'Mock Exams — CIS-DF',
      url: '/tools/mock-exams/cis-df',
      excerpt: 'Practice exam for the ServiceNow CIS-Discovery Framework certification.',
      keywords: 'mock exam certification practice questions cis-df discovery framework servicenow'
    },
    {
      title: 'Mock Exams — CAD',
      url: '/tools/mock-exams/cad',
      excerpt: 'Practice exam for the ServiceNow Certified Application Developer certification.',
      keywords: 'mock exam certification practice questions cad certified application developer servicenow'
    },
    {
      title: 'Invoice Generator',
      url: '/tools/invoice',
      excerpt: 'Create and download PDF invoices with automatic GST calculation.',
      keywords: 'invoice generator pdf billing gst tax consulting'
    },
    {
      title: 'Experience',
      url: '/experience',
      excerpt: 'Professional timeline and certifications.',
      keywords: 'experience work history career certifications resume background jobs roles'
    },
    {
      title: 'About',
      url: '/about',
      excerpt: 'Background and contact information for James Warner.',
      keywords: 'about bio background contact james warner sydney australia'
    }
  ];

  const searchIconSVG = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="5.5" cy="5.5" r="4.5" stroke="currentColor" stroke-width="1.25"/><line x1="9.35" y1="9.35" x2="13" y2="13" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/></svg>`;

  const toolsIconSVG = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M10.5 1.5A3 3 0 0 0 7.7 5.9L2 11.5a1 1 0 1 0 1.5 1.5L9 7.3A3 3 0 1 0 10.5 1.5z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  const expIconSVG = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="1" y="5" width="12" height="8" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M5 5V4a2 2 0 0 1 4 0v1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><line x1="1" y1="9" x2="13" y2="9" stroke="currentColor" stroke-width="1.2"/></svg>`;

  const aboutIconSVG = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><circle cx="7" cy="5" r="2.5" stroke="currentColor" stroke-width="1.2"/><path d="M1.5 13a5.5 5.5 0 0 1 11 0" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;

  const rail = document.getElementById('site-rail');
  if (rail) {
    rail.innerHTML =
      `<div class="rail-top">` +
        `<a href="/" class="rail-name">JW</a>` +
        `<button class="rail-toggle" id="rail-toggle" aria-label="Collapse sidebar" aria-expanded="true">&#8249;</button>` +
      `</div>` +
      `<button class="rail-search-btn" id="rail-search-btn" aria-label="Search site">` +
        searchIconSVG +
        `<span class="nav-text">Search</span>` +
      `</button>` +
      `<nav class="rail-nav">` +
        navLink('/tools', 'Tools', toolsIconSVG) +
        navLink('/experience', 'Experience', expIconSVG) +
        navLink('/about', 'About', aboutIconSVG) +
      `</nav>` +
      `<div class="rail-foot"><div>Sydney, AU</div><div>2026</div></div>`;
  }

  /* ── Rail collapse ── */
  const toggle = document.getElementById('rail-toggle');
  if (toggle && rail) {
    const isMobile = () => window.innerWidth <= 720;

    const applyCollapsed = (collapsed) => {
      rail.classList.toggle('collapsed', collapsed);
      document.body.classList.toggle('rail-collapsed', collapsed);
      toggle.innerHTML = collapsed ? '&#8250;' : '&#8249;';
      toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    };

    if (!isMobile() && localStorage.getItem('rail-collapsed') === '1') {
      applyCollapsed(true);
    }

    toggle.addEventListener('click', () => {
      if (isMobile()) return;
      const collapsed = !rail.classList.contains('collapsed');
      applyCollapsed(collapsed);
      localStorage.setItem('rail-collapsed', collapsed ? '1' : '0');
    });
  }

  /* ── Search ── */
  function buildSearchOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'search-overlay';
    overlay.className = 'search-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Search');
    overlay.innerHTML =
      `<div class="search-modal">` +
        `<div class="search-input-wrap">` +
          searchIconSVG +
          `<input type="text" class="search-input" id="search-input" placeholder="Search…" autocomplete="off" spellcheck="false" />` +
          `<button class="search-close" id="search-close" aria-label="Close search">ESC</button>` +
        `</div>` +
        `<div class="search-results" id="search-results"></div>` +
        `<div class="search-hint">Type to search · Ctrl+K to open</div>` +
      `</div>`;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('#search-input');
    const results = overlay.querySelector('#search-results');

    let searchTimeout;
    input.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        const q = input.value.trim().toLowerCase();
        if (!q) { results.replaceChildren(); return; }

        const matches = SEARCH_INDEX.filter(item =>
          item.keywords.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.excerpt.toLowerCase().includes(q)
        );

        if (matches.length === 0) {
          /* Use textContent — never innerHTML — for user-supplied query strings */
          const noResult = document.createElement('div');
          noResult.className = 'search-no-results';
          noResult.textContent = `No results for "${input.value}"`;
          results.replaceChildren(noResult);
          return;
        }

        /* SEARCH_INDEX values are developer-controlled string literals, but we still
           use DOM methods to stay consistent with the guidelines and avoid any
           future risk if the index is ever loaded dynamically. */
        const nodes = matches.map(item => {
          const a = document.createElement('a');
          a.href = item.url;
          a.className = 'search-result-item';

          const title = document.createElement('div');
          title.className = 'search-result-title';
          title.textContent = item.title;

          const excerpt = document.createElement('div');
          excerpt.className = 'search-result-excerpt';
          excerpt.textContent = item.excerpt;

          a.append(title, excerpt);
          return a;
        });
        results.replaceChildren(...nodes);
      }, 150);
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeSearch();
    });
    overlay.querySelector('#search-close').addEventListener('click', closeSearch);
  }

  function openSearch() {
    if (!document.getElementById('search-overlay')) buildSearchOverlay();
    const overlay = document.getElementById('search-overlay');
    overlay.classList.add('open');
    setTimeout(() => {
      const input = overlay.querySelector('#search-input');
      if (input) { input.value = ''; input.focus(); }
      const results  = overlay.querySelector('#search-results');
      if (results) results.innerHTML = '';
    }, 30);
  }

  function closeSearch() {
    const overlay = document.getElementById('search-overlay');
    if (overlay) overlay.classList.remove('open');
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSearch();
    if (e.key === 'k' && (e.ctrlKey || e.metaKey)) {
      const tag = document.activeElement.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        openSearch();
      }
    }
  });

  const searchBtn = document.getElementById('rail-search-btn');
  if (searchBtn) searchBtn.addEventListener('click', openSearch);

  /* ── Footer ── */
  const footer = document.getElementById('site-footer');
  if (footer) {
    footer.innerHTML =
      `<a href="mailto:jwarnerst@gmail.com" class="contact-link">Email ↗</a> ` +
      `<a href="https://linkedin.com/in/james-warner1" target="_blank" rel="noopener" class="contact-link">LinkedIn ↗</a>` +
      `<br/>© 2026 James Warner`;
  }
})();
