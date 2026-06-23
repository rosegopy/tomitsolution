# AGENTS.md

## Cursor Cloud specific instructions

### What this app is
"TomIT Solution" — an IT-asset buyback lead-generation site. Three services:
- **MongoDB** (data store, port 27017)
- **Backend**: FastAPI in `backend/server.py` (run on port 8001)
- **Frontend**: React (CRA + craco) in `frontend/` (dev server on port 3000)

### Running the services (dependencies are already installed by the update script)
Start them in this order; none are started by the update script.
- MongoDB: `mongod --dbpath /data/db --bind_ip 127.0.0.1` (data dir `/data/db` already exists)
- Backend: from `backend/`, `.venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001`
- Frontend: from `frontend/`, `BROWSER=none yarn start`

### Environment files (gitignored — recreate if missing)
- `backend/.env`: `MONGO_URL=mongodb://localhost:27017`, `DB_NAME=tomit_db`, `JWT_SECRET=...`, `ADMIN_EMAIL=admin@tomitsolution.in`, `ADMIN_PASSWORD=EnterpriseRecovery2026!`. The backend seeds the admin user and default pricing rates on startup.
- `frontend/.env`: `REACT_APP_BACKEND_URL=http://localhost:8001`. Without this the frontend defaults to the public Emergent preview URL, not the local backend.

### Non-obvious caveats
- **Admin auth over local http**: `/api/auth/login` sets the JWT cookie with `Secure=True`, so browsers/`requests` will NOT send it back over plain `http`. For local API testing of admin endpoints, use the `Authorization: Bearer <access_token>` header (the login response also returns `access_token`). The frontend works locally because it logs in and the dev server is same-origin.
- **Backend test suite** (`backend/tests/`, run with pytest, e.g. `REACT_APP_BACKEND_URL=http://localhost:8001 ADMIN_EMAIL=admin@tomitsolution.in ADMIN_PASSWORD='EnterpriseRecovery2026!' DB_NAME=tomit_db .venv/bin/python -m pytest tests/`): the tests target a running server via `REACT_APP_BACKEND_URL` and use cookie auth, so the admin-only tests fail against a local http server (Secure-cookie limitation above). They pass against the https preview deployment.
- **File upload / object storage** needs `EMERGENT_LLM_KEY` (Emergent Object Storage). It is not set locally, so `/api/uploads` and file-download tests fail locally; startup tolerates its absence. Quotes can be submitted without files.
- **emergentintegrations** is installed from a custom index: `--extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/`.
- **Lint** runs via craco/eslint during `yarn start`/`yarn build`; there are pre-existing `react-hooks/exhaustive-deps` warnings in `src/App.js` (non-blocking). Backend formatters available: `black`, `isort`, `flake8`, `mypy`.
