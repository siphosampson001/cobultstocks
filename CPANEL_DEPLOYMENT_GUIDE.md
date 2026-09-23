# Cobult Stocks cPanel Deployment Guide

This application is a React frontend with an Express/Node.js backend. It must be deployed as a **Node.js application**, not as a static HTML website.

## What to upload

Build the application on your computer first:

```powershell
npm install
npm run build
```

Create a ZIP file containing these items from the project:

```text
dist/
  index.html
  assets/
  server.cjs
package.json
db_sim_store.json
```

The `dist/server.cjs` file is the production server startup file.

Do not upload these items:

- `node_modules/`
- `.env`
- API keys or passwords
- The development source files are not required for the production upload

You may upload the complete project instead, but the smaller production upload above is recommended.

## Upload using cPanel File Manager

1. Sign in to WebZim cPanel.
2. Open **File Manager**.
3. Open your home directory, not `public_html`, if possible.
4. Create a folder named `cobultstocks`.
5. Open the new folder.
6. Click **Upload** and upload your ZIP file.
7. Select the ZIP file, click **Extract**, and extract it inside the `cobultstocks` folder.
8. Confirm that `package.json` and the `dist` folder are directly inside `cobultstocks`.

The final structure should look like this:

```text
/home/YOUR_CPANEL_USER/cobultstocks/
  package.json
  db_sim_store.json
  dist/
    index.html
    server.cjs
    assets/
```

Do not put the Node application inside `public_html` unless WebZim specifically requires it. The Node application URL will serve the site.

## Create the Node.js application

1. In cPanel, open **Setup Node.js App** or **Application Manager**.
2. Choose **Create Application**.
3. Use settings similar to these:

| Setting | Value |
|---|---|
| Node.js version | 20 or newer |
| Application mode | Production |
| Application root | `cobultstocks` |
| Application URL | Your domain or subdomain |
| Startup file | `dist/server.cjs` |
| Application entry point | `dist/server.cjs` |

The application root must match the folder where `package.json` was uploaded.

## Install dependencies without Terminal

If cPanel shows a **Run NPM Install** button:

1. Open your application in **Setup Node.js App**.
2. Click **Run NPM Install**.
3. Wait for the installation to complete.
4. Click **Restart Application**.

If there is no **Run NPM Install** button and Terminal is unavailable, contact WebZim support and send them this request:

> Please run `npm install --omit=dev` in `/home/YOUR_CPANEL_USER/cobultstocks` and restart the Node.js application whose startup file is `dist/server.cjs`.

## Add environment variables

In the Node.js application settings, add these variables. Use your real production values in cPanel; do not upload a `.env` file.

```text
NODE_ENV=production
APP_URL=https://your-domain.com
JWT_SECRET=use-a-long-random-secret
GEMINI_API_KEY=your-gemini-api-key
MONGODB_URI=your-mongodb-atlas-connection-string
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=Cobult Stocks <your-smtp-user>
```

`MONGODB_URI` is strongly recommended for production. If MongoDB is not configured, the application falls back to local JSON storage, which is not suitable for multiple users or reliable hosting.

For Gmail, enable 2-Step Verification and use a Google **App Password** in `SMTP_PASS`; do not use the normal Gmail account password. For a cPanel mailbox, use the mailbox SMTP host and port shown in cPanel Email Accounts, commonly port `465` with `SMTP_SECURE=true` or port `587` with `SMTP_SECURE=false`. The `SMTP_FROM` address should match the authenticated mailbox to avoid provider rejection.

After saving the variables, use the application log to confirm `SMTP EMAIL SENT SUCCESSFULLY`. A failed send is recorded as `Failed` in the email log and the manual resend endpoint returns HTTP `502`; a record in the outbox is not proof that the receiver accepted the message. Also verify the domain's SPF, DKIM, and DMARC records with the mailbox provider.

Before going live, rotate any credentials that have previously been placed in `.env.example` or shared in chat. In MongoDB Atlas, add the WebZim server IP under **Network Access**.

## Start and test

1. Save the environment variables.
2. Click **Restart Application**.
3. Open the application URL in a browser.
4. Test login, product creation, a sale, and email notifications.

If the page does not open, check the Node.js application logs in cPanel. The most common causes are an incorrect application root, an incorrect startup file, missing dependencies, or missing environment variables.

## If WebZim only supports static hosting

Static hosting alone will not run this application because it needs the Express API. Ask WebZim whether your package includes **Node.js application hosting**. If it does not, use a hosting plan that supports Node.js, or deploy the backend to another Node.js host and configure the frontend/API URLs accordingly.
