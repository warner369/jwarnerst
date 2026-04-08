# James Warner — Portfolio & Tools

Personal portfolio site and toolset for a ServiceNow Enterprise Solutions Consultant. Built with plain HTML, CSS, and vanilla JavaScript — deployed on Cloudflare Pages.

**Live:** [jameswarner.com.au](https://jameswarner.com.au)

---

## Pages

| Route | Description |
|---|---|
| `/` | Homepage |
| `/about` | Background and contact |
| `/experience` | Career timeline and certifications |
| `/tools` | Tool directory |
| `/tools/estimator` | Services Estimator |
| `/tools/mock-exams` | Mock Exams hub |
| `/tools/mock-exams/cis-df` | CIS-DF Mock Exam |
| `/tools/mock-exams/cad` | CAD Mock Exam |

---

## Tools

### Services Estimator
Pre-sales scoping calculator for ServiceNow ITSM implementations. Pick your modules, get an effort breakdown in days and cost (AUD).

- Multi-module selection with per-scope uplifts
- Email for enquiries: [jwarnerst@gmail.com](mailto:jwarnerst@gmail.com)

### Mock Exams
Practice exams for ServiceNow certifications. Questions are embedded directly in the HTML as a JSON data block.

- 90-minute countdown timer with pause/resume
- Per-domain score breakdown
- Instant answer reveal with explanations
- CIS-DF: Certified Implementation Specialist – Data Foundations (75 questions)
- CAD: Certified Application Developer (60 questions)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JS (ES6+) |
| Hosting | Cloudflare Pages |
| Build tool | None |

No frameworks, no bundler, no `node_modules`.

---

## Local Development

If you like this website, it is super simple to replicate. No build step required. Serve the root directory with any static server:

```bash
npx serve .
# or
python3 -m http.server 8080
```

---

## Deployment

The project deploys automatically via Cloudflare Pages on push to `main`.

1. Connect the repository to a Cloudflare Pages project
2. Set build command to *(none)* and output directory to `/`
3. Functions in `functions/` are auto-deployed as Cloudflare Workers

---

## Security

This is a static site with no server-side code or user authentication. Security considerations:

- **No external dependencies**: Pure HTML/CSS/JS, no CDN scripts or third-party libraries
- **No user input storage**: Forms use `mailto:` links only, no data persistence
- **External links**: All external links use `rel="noopener"` attribute
- **Content Security Policy**: Recommended to add CSP headers at the Cloudflare Pages level:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';
```

---

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge - latest 2 versions)
- Mobile-responsive design
- Accessibility features: semantic HTML, ARIA labels, keyboard navigation, reduced motion support

---

## License

Private — all rights reserved. Not licensed for reuse.