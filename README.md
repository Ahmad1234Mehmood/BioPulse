# BioPulse AI — React

The BioPulse AI biometric console, rebuilt as a React single-page app with the
**Synthetic Neo-Dark** design system. Same visual design as the static HTML
version, now mapped to reusable React components with a shared, consistent
sidebar and top bar across every page.

## Tech stack

- **React 18** + **Vite** (fast dev server & build)
- **React Router v6** for client-side routing between the six pages
- **Tailwind CSS** (compiled locally — no CDN) with the design tokens from
  `DESIGN.md` ported into `tailwind.config.js`
- **Material Symbols** + **Inter / Space Grotesk** loaded from Google Fonts

## Getting started

You need [Node.js](https://nodejs.org) 18+ installed.

```bash
# 1. install dependencies
npm install

# 2. start the dev server (http://localhost:5173)
npm run dev

# 3. build for production (outputs to dist/)
npm run build

# 4. preview the production build
npm run preview
```

Open the printed local URL in your browser. The app is fully responsive —
resize the window or open it on a phone to see the sidebar collapse into a
hamburger drawer.

## Project structure

```
biopulse-react/
├── index.html               # HTML entry (fonts + #root)
├── package.json
├── vite.config.js
├── tailwind.config.js        # Synthetic Neo-Dark design tokens
├── postcss.config.js
└── src/
    ├── main.jsx              # React entry, mounts <App/> in <BrowserRouter>
    ├── App.jsx               # Route table — maps each path to a page
    ├── index.css             # Tailwind layers + custom design classes
    ├── components/
    │   ├── Layout.jsx        # App shell: sidebar + drawer + topbar + <Outlet/>
    │   ├── Sidebar.jsx       # SHARED sidebar (desktop rail + mobile drawer)
    │   ├── TopBar.jsx        # SHARED top bar
    │   ├── navItems.js       # Single source of truth for nav links
    │   └── Icon.jsx          # Material Symbols helper
    └── pages/
        ├── Dashboard.jsx     #  /
        ├── Enroll.jsx        #  /enroll
        ├── Verify.jsx        #  /verify
        ├── Identify.jsx      #  /identify
        ├── Metrics.jsx       #  /metrics
        └── Assistant.jsx     #  /assistant
```

## Consistent chrome

The **sidebar** and **top bar** are single shared components
(`Sidebar.jsx`, `TopBar.jsx`) rendered once by `Layout.jsx`, so they are
identical on every page by construction. They follow the Enroll page design
(the canonical version). The active nav item is highlighted automatically based
on the current route via React Router's `NavLink`.

To add a new page:

1. Create `src/pages/MyPage.jsx`.
2. Add a `<Route>` in `src/App.jsx`.
3. Add an entry to `NAV_ITEMS` in `src/components/navItems.js`.

The sidebar and routing pick it up automatically.

## Pages

| Route        | Page          | Description                                |
| ------------ | ------------- | ------------------------------------------ |
| `/`          | Dashboard     | Facial Biometrics System overview          |
| `/enroll`    | Enroll        | Subject enrollment + registry              |
| `/verify`    | Verify (1:1)  | Identity verification against a template   |
| `/identify`  | Identify (1:N)| Gallery search with ranked matches         |
| `/metrics`   | Metrics       | ROC / DET / CMC curves + validation runs   |
| `/assistant` | AI Assistant  | Chat console with a Quick Insights rail    |

## Notes

- All theme colors, type scale, radii and spacing come from `tailwind.config.js`
  (ported from `DESIGN.md`). Custom effect classes (`glass-panel`, `mesh-bg`,
  `chart-grid`, `inner-glow*`, range-slider thumb, scrollbars) live in
  `src/index.css`.
- The design is intentionally unchanged from the static version; only the
  structure (shared components + routing + responsiveness) was added.
```
