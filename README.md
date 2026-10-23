# Blogku — Modern Editorial & Magazine Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue-3.5-emerald.svg)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.3-purple.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4.3-sky.svg)](https://tailwindcss.com/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.0.0-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)

> **Blogku** is a high-performance, modern magazine and digital editorial platform engineered with three core principles: **Secure by Default**, **Lightning Fast**, and **Simple to Maintain**.

Built with **Vue 3.5 (Composition API)**, **Vite 8**, **Tailwind CSS v4**, and designed for seamless backend integration with **PocketBase** or REST APIs.

---

## 🌟 Key Highlights

- **Editorial Magazine Layouts**: Visually rich typography, responsive article cards (vertical, horizontal, compact, and overlay formats), hero carousels, and natural dark mode out-of-the-box.
- **Tiptap v2 Rich Text Editor**: Headless ProseMirror-powered visual editor supporting headings, blockquotes, code blocks, lists, image uploads, external image URLs, and embedded media (YouTube/Vimeo).
- **Multi-Format Media Support**: First-class handling of Standard articles, Video posts, Audio/Podcast episodes with built-in playback, and image galleries.
- **Taxonomies & Content Management**: Comprehensive category hierarchy, instant on-the-fly tag creation, and a dedicated Admin CRUD dashboard for taxonomies.
- **Role-Based Access Control (RBAC)**: Centralized authorization matrix and route guards supporting `admin`, `author`, and `subscriber` roles.
- **Interactive Community Features**: Nested multi-level comments, user reactions (likes, claps), saved bookmark lists, and administrative moderation tools.
- **Hardened Security**: Rigorous HTML sanitization powered by DOMPurify, complete absence of unsafe `eval()` or dynamic execution, strict origin handling, and zero CVE vulnerabilities.
- **High Performance & Core Web Vitals**: Built-in CSS theme tokens with Tailwind CSS v4, local non-blocking typography, zero layout shift (CLS), and sub-second builds.

---

## 🚀 Live Demo

- **Production App**: [https://md5u8xz.app.neoapp.id](https://md5u8xz.app.neoapp.id)
- **Submission Portal**: [https://md5u8xz.app.neoapp.id/submission](https://md5u8xz.app.neoapp.id/submission)
  - *Demo credentials: Username `demo` / Password `demo`*

---

## 🏗️ Architecture & Monorepo Structure

Blogku is structured as a clean monorepo. Frontend business logic is decoupled from data sources using a unified **`DataSource` contract** (`src/api/source.ts`), enabling easy swapping between mock datasets, PocketBase, or custom backend services without modifying UI components.

```text
blogku/
├── frontend/                       # Vue 3.5 Single Page Application
│   ├── e2e/                        # Playwright end-to-end test suite
│   ├── public/                     # Static assets, fonts, avatars, icons
│   ├── src/
│   │   ├── api/                    # DataSource interface & mock implementation
│   │   ├── components/             # Reusable UI, layout, post, and editor components
│   │   ├── composables/            # Shared reactive composables
│   │   ├── lib/                    # Security sanitization, permissions, and formatters
│   │   ├── pages/                  # Route views (Home, Posts, Admin, Auth, Profile)
│   │   ├── router/                 # Vue Router with RBAC navigation guards
│   │   ├── stores/                 # Pinia state stores (Auth, UI, Bookmark, Drafts)
│   │   ├── styles/                 # Tailwind CSS v4 entrypoint & theme variables
│   │   ├── App.vue                 # Application root
│   │   └── main.ts                 # Vue application bootstrap
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts              # Vite configuration with @tailwindcss/vite
├── AGENTS.md                       # AI pairing & contribution guidelines
├── CONTRIBUTING.md                 # Community contribution guide
├── LICENSE                         # MIT License
├── README.md                       # Main project documentation
└── package.json                    # Monorepo workspaces manager
```

---

## 🛠️ Quick Start

### Prerequisites

- **Node.js**: `v22.x` or `v24.x LTS` (tested and verified on Node `v24.22.1 LTS`)
- **npm**: `v10.x` or higher

### 1. Clone & Install

```bash
git clone https://github.com/softonica/Blogku.git
cd Blogku

# Install dependencies across all workspaces
npm install
```

### 2. Development

Run the frontend development server with Hot Module Replacement (HMR):

```bash
# From repository root
npm run dev

# Or directly in the frontend workspace
npm --workspace=frontend run dev
```

Open your browser at `http://localhost:5173`.

### 3. Verification & Quality Gates

Run the automated test suite, TypeScript type checker, and linter:

```bash
# Type check TypeScript & Vue components
npm run typecheck

# Lint with ESLint
npm run lint

# Run unit tests with Vitest
npm run test

# Build production bundle
npm run build
```

---

## 🔒 Security Best Practices

Blogku takes web security seriously:

1. **Strict HTML Sanitization**: Every rich-text fragment and user-generated HTML is cleansed via `DOMPurify` using an explicit tag and attribute whitelist before rendering.
2. **Zero Code Injection**: No use of `eval()`, `new Function()`, or unescaped template execution.
3. **Safe External Assets**: Image URLs and embeds are verified against permitted domain policies with full administrative configurability.
4. **Vulnerability Mitigation**: Dependencies are strictly pinned and overridden to ensure zero known CVE vulnerabilities (`npm audit` reports 0 issues).

---

## 👥 Demo Roles (Mock Mode)

When running locally in mock data mode, you can test various roles:

| Role | Email / Identifier | Permissions |
| :--- | :--- | :--- |
| **Administrator** | `admin@blogku.com` | Full access: Taxonomy CRUD, user moderation, post editing, system settings |
| **Author** | `author@blogku.com` | Create, edit, and publish personal posts, manage drafts |
| **Subscriber** | `subscriber@blogku.com` | Browse content, like articles, bookmark posts, leave comments |
| **Submission Demo**| `demo` / `demo` | Quick-access demo author for the Faust submission portal |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/softonica/Blogku/issues) or submit a Pull Request.

Please review [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting changes.

---

## 📄 License

Distributed under the **[MIT License](./LICENSE)**. Open source software for modern publishing.
