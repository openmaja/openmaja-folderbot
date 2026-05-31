# Contributing to OpenMaja FolderBot

Thanks for your interest in this project! FolderBot is a hobby proof-of-concept, so contributions
are welcome in the spirit of experimentation and learning — not enterprise-grade development.

---

## Ways to contribute

### Share an idea
Open a [GitHub Issue](https://github.com/openmaja/openmaja-folderbot/issues) and use the
**💡 Idea** label. Describe what you have in mind and, if possible, why it would be useful.
No formal template required — a few sentences is fine.

### Report a bug
Open a [GitHub Issue](https://github.com/openmaja/openmaja-folderbot/issues) with the **🐛 Bug**
label. Include:
- What you were trying to do
- What happened instead
- Your M365 / Power Platform environment (tenant type, Copilot Studio plan if relevant)

### Contribute code or docs
This project uses the standard **fork → branch → pull request** workflow:

1. Fork the repository on GitHub.
2. Create a branch with a short descriptive name (`fix/list-files-empty-folder`,
   `docs/improve-flows-guide`, `idea/planner-integration`).
3. Make your changes. Keep commits focused — one logical change per commit.
4. Open a Pull Request against the **`main`** branch. Describe what you changed and why.

There is no CI pipeline or automated test suite (it's a PoC), so PRs are reviewed manually.
Small, focused changes are much easier to review than large ones.

---

## Contributing the Power Platform solution (.zip)

If your contribution involves changes to the Power Platform solution, re-export it and include
the updated `.zip` in your PR. Always export as **unmanaged** — managed solutions cannot be
edited by deployers and are not suitable for an open-source project.

Please keep the changes in the solution minimal and focused, so to facilitate review.

Before submitting, carefully verify that the exported file does not contain:

- Credentials or connection secrets of any kind
- Personal data (names, email addresses, tenant-specific identifiers)
- IP-protected information belonging to your employer or any third party

**By submitting a contribution you confirm that:**
- The code and any exported solution files are free of the above.
- Copyright for your contributed code remains with you.
- You accept liability for your contribution under the terms and limitations of the
  [Apache License 2.0](LICENSE) that governs this project.

---

## Ground rules

- Be respectful and constructive.
- This is a hobby project — response times may be slow. Don't expect SLAs.
- No breaking changes to the exported solution without a clear migration path documented in the PR.
