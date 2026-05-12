# Expense Tracker

A weekly NZD expense tracker built with Next.js. Resets every Monday, with a History tab for past weeks.

## Deploy to Vercel (5 minutes)

### Option A — GitHub (recommended)

1. Create a free account at [github.com](https://github.com) if you don't have one
2. Create a new repository called `expense-tracker`
3. Upload all these files into it (drag and drop the folder)
4. Go to [vercel.com](https://vercel.com) and sign up with your GitHub account
5. Click **Add New Project** → select your `expense-tracker` repo
6. Click **Deploy** — no settings to change
7. In ~60 seconds you'll get a live URL like `expense-tracker-yourname.vercel.app`

### Option B — Vercel CLI

```bash
npm install -g vercel
cd expense-tracker
vercel
```

Follow the prompts. Your app will be live in under a minute.

---

## Add to iPhone Home Screen

1. Open your Vercel URL in **Safari** on your iPhone
2. Tap the **Share** button (box with arrow)
3. Tap **Add to Home Screen**
4. Name it "Expenses" → tap **Add**

It will appear as an app icon on your home screen.

---

## Features

- Weekly budget tracker (resets every Monday)
- Daily expense summary on home screen
- Full log with running totals and amount remaining
- History tab showing all past weeks
- NZD currency
- Data saved locally on your device
