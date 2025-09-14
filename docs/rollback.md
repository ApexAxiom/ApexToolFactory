# Rollback Guide

1. Revert to the previous stable commit:
   ```sh
   git revert <sha>
   ```
2. Push the revert commit to `main` to trigger App Runner deployment.
3. Monitor App Runner logs and ensure /healthz returns 200.
