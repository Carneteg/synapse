# Synapse — Customer Intelligence Platform

Plain HTML/JS prototype. No framework, no build step. Open `index.html` in a browser.

## Project Structure

```
synapse/
├── index.html              # Entry point & sidebar nav
├── css/
│   ├── base.css            # Variables, reset, typography helpers
│   ├── layout.css          # Sidebar, topbar, main, grids
│   └── components.css      # Cards, badges, buttons, tables, inputs, etc.
└── js/
    ├── data.js             # All data — replace with API calls here
    ├── router.js           # Client-side page routing
    ├── components.js       # Reusable HTML fragment builders (UI.*)
    ├── app.js              # Bootstrap — wires nav, loads first page
    └── pages/
        ├── dashboard.js    # / — System overview
        ├── sync.js         # /sync — Data sync with live log
        ├── documents.js    # /documents — Searchable doc list
        ├── intelligence.js # /intelligence/* — 7 intel pages
        ├── qa.js           # QA summary + churn risk
        ├── mastermind.js   # Search, chat, articles, agents, settings
        ├── autoresponder.js# Dashboard, draft queue, config
        └── analytics.js    # Freshdesk, Jira, attachments
```

## How to Add Real Data

All dummy data lives in `js/data.js`. Each key maps directly to what a page renders.

To wire up a real API, replace a data constant with a fetch:

```js
// js/data.js — before
sources: [ { id: 'freshdesk', docs: 14832, ... } ]

// js/data.js — after (example)
let sources = [];
fetch('/api/sources')
  .then(r => r.json())
  .then(d => { DATA.sources = d; });
```

For live pages, add a `fetch` call at the top of the relevant page file and re-render
once the data arrives.

## How Routing Works

Pages register a render function:

```js
Router.register('my-page', () => `<div>HTML here</div>`);
```

Navigate to a page:

```js
Router.go('my-page');
```

Post-render logic (event listeners) goes in a `pageRendered` listener:

```js
document.addEventListener('pageRendered', ({ detail }) => {
  if (detail.id !== 'my-page') return;
  document.getElementById('my-btn').addEventListener('click', ...);
});
```

## Adding a New Page

1. Register it in the relevant `js/pages/*.js` file
2. Add a `nav-item` entry in `index.html`
3. Add the page title/tag to `pageMap` in `js/router.js`
4. Add any data it needs to `js/data.js`
