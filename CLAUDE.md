@AGENTS.md

## Dev server

Next.js 16 requires Node >=20.9.0. The system shell defaults to Node 18 and will fail with "Node.js version is required" on `npm run dev`.

Always start the dev server with:

```
source ~/.nvm/nvm.sh && nvm use 20 && npm run dev
```

The app runs on **port 3000**. A separate static site (editstudio.space) runs on port 3200 — don't confuse them.
