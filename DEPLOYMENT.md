# Deployment Guide for Erasmus Architect Demo

This guide explains how to deploy the application so you can access it via a link without running it in your terminal.

## Option 1: Vercel (Recommended for You)
**Best for:** Easy sharing, automatic updates, no server management.

1.  **Create a Vercel Account**: Go to [vercel.com](https://vercel.com) and sign up (you can use your GitHub account).
2.  **Import Project**:
    *   Click "Add New..." -> "Project".
    *   Select your Git repository (`erasmus-architect-demo`).
3.  **Configure**:
    *   Vercel normally auto-detects everything.
    *   **Environment Variables**: If you use API keys (like typical for AI features), you need to add them in the "Environment Variables" section on Vercel. Copy them from your local `.env.local` file.
4.  **Deploy**: Click "Deploy".
5.  **Get Link**: Once finished, Vercel gives you a URL (e.g., `erasmus-architect-demo.vercel.app`) that you can share with anyone.

## Option 2: Self-Hosting (For Your Developer)
**Best for:** Using your own server infrastructure, full control.

I have prepared the project for Docker deployment. Your developer can use the following instructions:

### Prerequisites
- Docker installed on the server.
- A domain pointing to the server IP.

### Deployment Steps (for Developer)

1.  **Build the Image**:
    ```bash
    docker build -t erasmus-architect-demo .
    ```

2.  **Run the Container**:
    ```bash
    docker run -d -p 3000:3000 --name erasmus-app \
      -e OPENAI_API_KEY=your_key_here \
      erasmus-architect-demo
    ```
    *(Replace `your_key_here` with actual API keys or pass an env file with `--env-file .env.local`)*

3.  **Access**:
    The app will be running on `http://localhost:3000` (or your server's IP).
    You typically want to set up Nginx or another reverse proxy to handle SSL (HTTPS) and point your domain to this port.

### Notes on Database (Supabase)
Since you mentioned **Supabase**:
- The application connects to Supabase via environment variables.
- Ensure these variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, etc.) are set in your deployment environment (Vercel Project Settings or Docker `-e` flags).
- You do **not** need to host the database yourself; the app will connect to your existing Supabase project from anywhere.
