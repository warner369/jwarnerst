# James Warner — Portfolio & Tools

Personal portfolio site and toolset for a ServiceNow Enterprise Solutions Consultant. Built with plain HTML, CSS, and vanilla JavaScript — deployed on Cloudflare Pages with serverless Workers for email delivery.

**Live:** [jameswarner.com.au](https://jameswarner.com.au)

---

## Pages

| Route | Description |
|---|---|
| `/` | Homepage |
| `/about` | Background and contact |
| `/experience` | Career timeline and certifications |
| `/tools` | Tool directory |
| `/tools/mock-exams/cis-df` | Mock Exams |

---

## Tools

### Services Estimator
Pre-sales scoping calculator for ServiceNow ITSM implementations. Configures module scope, calculates effort in days and cost (AUD), and delivers a formatted PDF and email estimate to a recipient.

- Supports multi-module selection with per-scope uplifts
- PDF generation via jsPDF (loaded via CDN)
- Email delivery via `/api/send-estimate` → Resend API

### Mock Exams
Practice exams for ServiceNow certifications. Questions are embedded directly in the HTML as a JSON data block.

- 90-minute countdown timer with pause/resume
- Per-domain score breakdown
- Instant answer reveal with explanations
- CIS-DF: Certified Implementation Specialist — Discovery & Service Mapping (75 questions)
- CAD: Certified Application Developer (60 questions)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JS (ES6+) |
| Hosting | Cloudflare Pages |
| Serverless | Cloudflare Workers (`functions/api/`) |
| Email | [Resend](https://resend.com) |
| PDF | jsPDF (CDN) |
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

> Note: The contact form and estimate email functions require Cloudflare Workers to run. For local function testing, use [Wrangler](https://developers.cloudflare.com/workers/wrangler/):
>
> ```bash
> npx wrangler pages dev .
> ```
> You will need a `.dev.vars` file with `RESEND_API_KEY=re_...` for local function execution.

---

## Deployment

The project deploys automatically via Cloudflare Pages on push to `main`.

1. Connect the repository to a Cloudflare Pages project
2. Set build command to *(none)* and output directory to `/`
3. Add `RESEND_API_KEY` to environment variables
4. Functions in `functions/api/` are auto-deployed as Cloudflare Workers

---

## License

Private — all rights reserved. Not licensed for reuse.
