# Branch Protection Setup (Manual Steps)

The GitHub MCP tooling available in this environment does not expose a branch
protection / ruleset API, so this must be configured manually by a repository
admin. Follow these steps to protect `main`:

1. Go to the repository on GitHub: **Settings → Branches** (or **Settings → Rules → Rulesets** for the newer Rulesets UI).
2. Under **Branch protection rules**, click **Add branch protection rule** (or **New ruleset** if using Rulesets).
3. Set **Branch name pattern** to `main`.
4. Enable:
   - **Require a pull request before merging**
   - **Require approvals** — set to `1` required approving review
   - **Do not allow bypassing the above settings** (so admins are also subject to the rule)
   - **Restrict who can push to matching branches** — leave empty / no direct push bypass, or restrict to no one, to block direct pushes
5. (Recommended) Also enable:
   - **Require status checks to pass before merging** → select the `build` check from `.github/workflows/build.yml`
   - **Require branches to be up to date before merging**
6. Click **Create** (or **Save changes**).

Once applied, direct pushes to `main` will be rejected, and all changes must land via a reviewed pull request that passes CI.
