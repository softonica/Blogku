---
name: feature-documentation-rule
description: Mandates comprehensive documentation for every new feature, component, and API in Ncmaz Open Source.
trigger: always_on
---

# Feature Documentation Rule

In this repository (`ncmaz-clone`), which is an open-source project under the **MIT License**, documentation is a first-class requirement.

## Requirements
1. **Never close a feature without documentation**: Writing the technical documentation in `docs/features/<feature-name>.md` is part of the implementation, not an afterthought.
2. **Standard Document Format**: Follow the template defined in `docs/FEATURE-DOCUMENTATION-GUIDELINES.md`.
3. **Index Maintenance**: Always keep `docs/README.md` up to date with the latest list of feature docs.
4. **Code-Doc Parity**: Documentation must accurately reflect actual props, events, API interfaces, and authorization permissions.
