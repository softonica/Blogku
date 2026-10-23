# Gemini & Antigravity Rules — Ncmaz Open Source Project

This project is an open-source (MIT License) modern editorial & magazine application built with Vue 3.5, Vite 8, Tailwind CSS, and PocketBase.

## 🚨 Mandatory Rule: Feature Documentation Requirement

Every feature implemented or modified in this repository MUST be accompanied by comprehensive technical documentation in `docs/features/`.

### Enforcement Checklist (Definition of Done)
Whenever implementing a feature or completing a task:
1. **Implementation**: Code adheres to TypeScript strict typing and Vue 3 Composition API `<script setup>`.
2. **Architecture**: Always interact with data via `DataSource` in `src/api/source.ts` (never import mock/backend data directly in components).
3. **Security**: Ensure DOMPurify sanitization (`sanitizeHtml`) for any rich text, strictly zero `eval`/`new Function`.
4. **Documentation**:
   - Write or update the corresponding feature document in `docs/features/<feature-name>.md`.
   - Update the table of contents in `docs/README.md`.
5. **Quality Gates**:
   - `npm run typecheck` passes with zero errors.
   - `npm run lint` passes with zero errors.
   - `npm run test` passes with all tests green.
   - `npm run build` succeeds cleanly.
