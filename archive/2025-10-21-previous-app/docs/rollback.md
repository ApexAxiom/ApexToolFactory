# Rollback guide

1. Identify the failed deployment in Amplify Hosting and note the last known good commit hash.
2. Revert locally: `git revert <bad_commit_sha>` or checkout the previous commit and create a hotfix branch.
3. Run validation locally:
   ```bash
   pnpm install
   pnpm lint
   pnpm typecheck
   pnpm test
   ```
4. Push the revert/hotfix branch and ensure Amplify completes the build successfully.
5. If immediate rollback is required, redeploy the prior artifact from Amplify’s console while the new build runs.
6. After stability is confirmed, open a postmortem issue documenting root cause and follow-up actions.
