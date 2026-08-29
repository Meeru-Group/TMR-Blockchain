# TMR Blockchain - Automatic Block Production Update

## What changed

- The existing `produceNextBlockIfDue()` routine is now invoked on API requests.
- PostgreSQL advisory locking remains responsible for preventing duplicate concurrent block creation.
- The Explorer auto-refresh interval was changed from 30 seconds to 12 seconds to match the configured block time.

## Important

This is request-driven block production for Vercel/serverless deployment. It is not a continuously running validator daemon. A block is produced when an API request arrives after the configured block interval has elapsed.

For a true continuously producing mainnet, run the consensus/block producer on a persistent worker or VM and keep the Explorer/API on Vercel.
