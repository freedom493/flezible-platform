# Flezible: waitlist, landing page and pricing

Stack: Vite + Preact, Supabase (free tier), Netlify (free tier).

## 1. Create the database (Supabase)

1. Sign in at supabase.com and create a new project (free plan). Save the database password.
2. Open **SQL Editor > New query**, paste all of `schema.sql`, and run it.
3. For the AI ordering MVP, open a new query, paste all of `002_marketplace.sql` and run it (after `schema.sql`). It adds profiles, sellers, delivery areas, listings, orders, order tracking and the matching function.
4. Open **Table Editor** and check that `waitlist`, `plans`, `plan_prices` and `admins` exist and show an RLS badge.
5. Open **Authentication > Users > Add user**, create yourself with an email and password.
6. In the SQL Editor, run the commented admin snippet at the bottom of `schema.sql` with your email. Only admins can read the waitlist.
7. Open **Project Settings > API** and copy the **Project URL** and the **anon / publishable key**. Never copy the `service_role` key into the website.

## 2. Create the website

```bash
npm create vite@latest flezible-platform -- --template preact
cd flezible-platform
npm install
npm install @supabase/supabase-js lucide-preact tailwindcss @tailwindcss/vite
```

Then:

1. Replace `index.html` and `vite.config.js` with the ones in this folder (the config adds the Tailwind plugin).
2. Replace `src/main.jsx`, and add `src/app.jsx`, `src/style.css` and `src/lib/supabase.js` from this folder. `style.css` holds the Tailwind theme (colours and the Google fonts); there is no tailwind.config file in Tailwind v4.
3. Delete the template leftovers: `src/index.css`, `src/app.css`, and the `src/assets` folder.
4. Create a file named `.env.local` in the project root:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

5. Run `npm run dev` and open the address it prints.

## 3. Test it

1. The pricing section should show Starter, Growth and Pro. Switch to Weekly and Daily: only Starter changes.
2. Submit the waitlist form. A new row should appear in **Table Editor > waitlist**.
3. Submit the same email again. You should see the "already on the waitlist" message.
4. In the SQL Editor, run the RLS check at the bottom of `schema.sql`. The anonymous role must see 0 waitlist rows.

## 4. Put it online (Netlify free tier)

1. Create a GitHub repository and push the project. Make sure `.env.local` is not committed.
2. In Netlify: **Add new site > Import an existing project > GitHub**, pick the repo.
3. Build command `npm run build`, publish directory `dist`.
4. Under **Site configuration > Environment variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, then redeploy.
5. Add `?ref=` to the links you share, for example `yoursite.netlify.app/?ref=x` or `?ref=meta_ads`. The code saves it in the `source` column so you can see which channel brings signups.

## 5. Keep it healthy

- Supabase free projects pause after a week of inactivity. Steady waitlist traffic keeps it active; check the dashboard weekly.
- Export your waitlist from Table Editor (CSV) regularly as a backup.
- Add a captcha such as Cloudflare Turnstile if spam signups appear. The honeypot field stops simple bots only.
- Before taking real money, move to Supabase Pro and register the business.
