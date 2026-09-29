# SafeTrail Deployment Guide 🛡️

This guide explains how SafeTrail is configured to deploy with **GitHub Pages** (Frontend) and **Render** (Backend API).

---

## 1. Frontend: Automatic GitHub Pages Deployment

The frontend is configured with a GitHub Actions workflow at [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml). Whenever you push to the `main` branch, GitHub Actions will build and deploy the React app automatically.

### Step 1: Enable GitHub Pages in Repository Settings
1. Go to your GitHub repository: [https://github.com/vaishhh-19/SafeTrail](https://github.com/vaishhh-19/SafeTrail)
2. Click **Settings** (top navigation tab).
3. In the left sidebar, click **Pages** (under "Code and automation").
4. Under **Build and deployment** > **Source**, select **GitHub Actions** (instead of "Deploy from a branch").
5. Push your code to `main`. The workflow will trigger immediately!
6. Once completed, your frontend will be live at:
   👉 **`https://vaishhh-19.github.io/SafeTrail/`**

---

## 2. Backend: Free Cloud Deployment on Render

Because GitHub Pages only serves static frontend assets, your Python Flask + MongoDB backend is hosted on a cloud platform like [Render](https://render.com) (free tier).

### Step 1: Push Project to GitHub
All deployment files (`render.yaml`, `backend/Procfile`, and updated requirements) are already prepared.

### Step 2: Create Web Service on Render
1. Go to [https://dashboard.render.com](https://dashboard.render.com) and log in with your GitHub account.
2. Click **New +** > **Web Service** (or **Blueprint** to use `render.yaml`).
3. Connect your **`vaishhh-19/SafeTrail`** repository.
4. Set the following settings:
   - **Root Directory:** `backend`
   - **Environment:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `gunicorn "app:create_app()"`
5. Under **Environment Variables**, add:
   - `MONGO_URI`: Your MongoDB Atlas connection string (e.g. `mongodb+srv://<user>:<password>@cluster0.mongodb.net/safetrail?retryWrites=true&w=majority`)
   - `SECRET_KEY`: A secure random string
   - `JWT_SECRET_KEY`: A secure random string
   - `CORS_ORIGINS`: `https://vaishhh-19.github.io,http://localhost:5173`
6. Click **Create Web Service**.
7. Once deployed, Render will provide a public URL like:
   `https://safetrail-api.onrender.com`

---

## 3. Connect Frontend to Live Backend

Once your backend is live on Render:
1. In your GitHub repository, go to **Settings** > **Secrets and variables** > **Actions**.
2. Click the **Variables** tab (or **Secrets** tab).
3. Click **New repository variable**:
   - **Name:** `VITE_API_URL`
   - **Value:** `https://safetrail-api.onrender.com` (your Render URL without trailing slash)
4. Go to the **Actions** tab on GitHub, select **Deploy Frontend to GitHub Pages**, and click **Run workflow** (or simply push a new commit).

Your live GitHub Pages frontend will now automatically communicate with your live Render backend! 🚀
