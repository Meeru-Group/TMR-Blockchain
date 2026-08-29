# Oracle Cloud deployment

1. Create an Ubuntu VM.
2. Install Node.js 22 and PostgreSQL.
3. Create database/user:
   `sudo -u postgres psql`
   `CREATE USER tmr WITH PASSWORD 'strong-password';`
   `CREATE DATABASE tmr_blockchain OWNER tmr;`
4. Upload this project to `/opt/tmr-blockchain`.
5. Copy `.env.example` to `.env` and set:
   `DATABASE_URL=postgresql://tmr:strong-password@127.0.0.1:5432/tmr_blockchain`
6. Run `npm install`.
7. Test with `npm start`.
8. Open only the required TCP port in Oracle security rules.
9. Install the included systemd service for automatic restart.
10. Put HTTPS/Nginx in front of the node before exposing it publicly.

Suggested public API:
`https://node.example.com/api/network`

Do not expose PostgreSQL port 5432 to the public internet.