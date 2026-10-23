# Contributing to Ncmaz (Open Source MIT)

Thank you for your interest in contributing to **Ncmaz**! Ncmaz is a modern, fast, and secure magazine & editorial web application built with Vue 3.5, Vite 8, Tailwind CSS, and PocketBase.

This project is licensed under the **[MIT License](./LICENSE)**.

---

## 📜 Golden Rule: Feature Documentation is Mandatory

Because Ncmaz is an open-source project intended for a global community of developers, publishers, and creators, **every feature must be properly documented**.

> **No feature PR will be merged without corresponding documentation in `docs/features/`.**

When submitting a Pull Request for a new feature or architectural refactor:
1. Create a documentation file under `docs/features/<feature-name>.md` following our [Feature Documentation Guidelines](./docs/FEATURE-DOCUMENTATION-GUIDELINES.md).
2. Add your feature to the index in [`docs/README.md`](./docs/README.md).
3. Ensure all tests (`npm run test`), linter (`npm run lint`), and typechecks (`npm run typecheck`) pass cleanly.

---

## 🛠️ Development Setup

### Prerequisites
- Node.js >= 20.x
- npm >= 10.x

### Quick Start
```bash
# Clone the repository
git clone https://github.com/your-username/ncmaz.git
cd ncmaz

# Move to the frontend directory
cd frontend

# Install dependencies
npm install

# Start local development server
npm run dev
```

---

## 🧪 Quality Gates Before Submitting a PR

Run the full suite of verification commands:

```bash
cd frontend

# 1. Typecheck with vue-tsc
npm run typecheck

# 2. Linting with ESLint
npm run lint

# 3. Unit & Integration Tests with Vitest
npm run test

# 4. Production Build Verification
npm run build
```

---

## 📐 Architecture Principles

1. **Safe by Default**:
   - All rich content must be sanitized with DOMPurify (`sanitizeHtml`).
   - Never use `eval`, `new Function`, or unescaped `v-html`.
2. **Adapter-Based Data Architecture (`DataSource`)**:
   - Components must interact strictly through the `DataSource` abstraction (`src/api/source.ts`).
   - Never import data fixtures or database SDKs directly in Vue components.
3. **Responsive & Accessible**:
   - Support dark mode (`dark:`) across all components.
   - Use semantic HTML tags and ARIA labels.

---

## 📄 License

By contributing to Ncmaz, you agree that your contributions will be licensed under the project's [MIT License](./LICENSE).
