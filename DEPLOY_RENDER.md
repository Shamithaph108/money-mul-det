Render deployment instructions

1) Create a Render account at https://render.com and connect your repository (GitHub/GitLab).

2) In Render, choose "Create a new service" and select "Web Service". Use the following settings:

   - Name: backend
   - Environment: Python
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn -k uvicorn.workers.UvicornWorker backend.api.main:app`

   Port is handled by Render via `$PORT`.

3) Create a second service and select "Static Site":

   - Name: frontend
   - Build Command: `cd frontend && npm ci && npm run build`
   - Publish Directory: `frontend/dist`

4) Optionally, enable automatic deploys (recommended).

5) After both services are deployed, update the frontend configuration if necessary to point to the backend URL returned by Render (or set environment variable in Render and adjust `CSVUpload.jsx` to use it).

Notes:
- `render.yaml` is included for repository-based automated provisioning; you can also create services through the Render console.
- For production tighten CORS in `backend/api/main.py` by replacing `allow_origins=["*"]` with your frontend origin(s).
