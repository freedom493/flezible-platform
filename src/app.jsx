import { useEffect, useState } from 'preact/hooks'
import { Check, Egg, PackageCheck, Store, Tractor, Truck, Wallet, ShieldCheck } from 'lucide-preact'
import { supabase } from './lib/supabase.js'

/* ---------- shared class names ---------- */

const wrap = 'mx-auto w-[min(1120px,calc(100%-2.5rem))]'
const btn =
  'inline-block cursor-pointer rounded-full bg-yolk px-6 py-3 font-semibold text-ink hover:brightness-95 disabled:cursor-wait disabled:opacity-60'
const label = 'grid gap-1 text-[0.95rem] font-medium'
const field =
  'w-full rounded-lg border-[1.5px] border-ink bg-white px-3 py-2.5 text-base text-ink'

/* ---------- helpers and data ---------- */

const naira = (kobo) => '₦' + (kobo / 100).toLocaleString('en-NG')
const percent = (bps) => `${bps / 100}%`

const PERIODS = [
  { id: 'monthly', label: 'Monthly', unit: 'month' },
  { id: 'weekly', label: 'Weekly', unit: 'week' },
  { id: 'daily', label: 'Daily', unit: 'day' },
]

const ROLES = [
  ['supplier', 'Egg supplier or distributor'],
  ['farm', 'Egg farm'],
  ['buyer', 'Shop, restaurant or bakery buying eggs'],
  ['logistics', 'Delivery rider or company'],
]

const STEPS = [
  { icon: Wallet, title: 'You place an order', text: 'Pick a supplier near you and pay from your Flezible wallet.' },
  { icon: Tractor, title: 'The supplier confirms', text: 'The farm or supplier accepts the order and the delivery.' },
  { icon: Truck, title: 'The eggs arrive', text: 'A delivery partner brings them to your shop, kitchen or door.' },
  {
    icon: PackageCheck,
    title: 'You confirm, they get paid',
    text: 'Payment is released after you confirm. If eggs are broken or spoiled, report them with a photo.',
  },
]

const AUDIENCES = [
  {
    icon: Tractor,
    title: 'Farms and suppliers',
    text: 'List your eggs, set the areas you deliver to, and reach buyers beyond your neighbourhood. Orders, payments and reports sit in one place.',
  },
  {
    icon: Store,
    title: 'Shops, restaurants and bakeries',
    text: 'Find verified suppliers, see who delivers to you, and pay from a wallet that holds the money until the eggs arrive.',
  },
  {
    icon: Truck,
    title: 'Delivery partners',
    text: 'Join as a rider or a company and take delivery jobs as orders come in.',
  },
]

// Shown instantly and used if the database is unreachable. Prices are in kobo.
const FALLBACK_PLANS = [
  {
    code: 'plan_a',
    name: 'Starter',
    tagline: 'For suppliers just getting started',
    commissionBps: 300,
    prices: { monthly: 500000, weekly: 150000, daily: 25000 },
    features: [
      'Basic analytics, 14 days of history',
      'Limited WhatsApp and email notifications',
      'Monthly business report on WhatsApp',
    ],
  },
  {
    code: 'plan_b',
    name: 'Growth',
    tagline: 'For suppliers with steady orders',
    commissionBps: 130,
    prices: { monthly: 1000000 },
    features: [
      'Advanced analytics, 90 days of history',
      'WhatsApp and email notifications',
      'Weekly business report',
    ],
  },
  {
    code: 'plan_c',
    name: 'Pro',
    tagline: 'For high-volume suppliers',
    commissionBps: 30,
    prices: { monthly: 1500000 },
    features: [
      'Promotion across the platform',
      'SMS, email and WhatsApp notifications',
      'More advanced analytics, 180 days of history',
      'Daily business report on WhatsApp or email',
      'Business tracker',
    ],
  },
]

/* ---------- data hook: plans come from Supabase, fallback if it fails ---------- */

function usePlans() {
  const [plans, setPlans] = useState(FALLBACK_PLANS)

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('plans')
      .select('code,name,tagline,commission_bps,features,sort_order,plan_prices(billing_period,amount_kobo)')
      .eq('active', true)
      .order('sort_order')
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) return
        setPlans(
          data.map((p) => ({
            code: p.code,
            name: p.name,
            tagline: p.tagline,
            commissionBps: p.commission_bps,
            features: p.features,
            prices: Object.fromEntries(p.plan_prices.map((x) => [x.billing_period, x.amount_kobo])),
          }))
        )
      })
  }, [])

  return plans
}

/* ---------- the crate: the one memorable element ---------- */

function Crate() {
  const eggs = Array.from({ length: 30 }, (_, i) => ({
    x: 56 + (i % 6) * 49.6,
    y: 52 + Math.floor(i / 6) * 64,
  }))

  return (
    <figure class="w-full max-w-[26rem] justify-self-center lg:mt-4">
      <svg
        class="block h-auto w-full"
        viewBox="0 0 360 360"
        role="img"
        aria-label="A crate of 30 eggs, the unit eggs are sold in"
      >
        <rect x="8" y="8" width="344" height="344" rx="18" fill="var(--color-ink)" />
        {eggs.map((e, i) => (
          <ellipse
            key={i}
            class="egg"
            style={{ '--i': i }}
            cx={e.x}
            cy={e.y}
            rx="17"
            ry="22"
            fill={i === 22 ? 'var(--color-yolk)' : 'var(--color-shell)'}
          />
        ))}
      </svg>
      <figcaption class="mt-2 text-sm text-muted">One crate, 30 eggs. Order by the crate or by the tray.</figcaption>
    </figure>
  )
}

/* ---------- waitlist form ---------- */

function WaitlistForm({ plans }) {
  const [status, setStatus] = useState('idle') // idle | sending | done | duplicate | error
  const [message, setMessage] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)

    // Honeypot: real people never see this field, bots fill it in.
    if (data.get('company')) {
      setStatus('done')
      return
    }

    if (!supabase) {
      setStatus('error')
      setMessage('The waitlist is not connected yet. Please try again later.')
      return
    }

    setStatus('sending')
    const ref = new URLSearchParams(window.location.search).get('ref')

    const { error } = await supabase.from('waitlist').insert({
      email: String(data.get('email')).trim().toLowerCase(),
      full_name: String(data.get('name')).trim(),
      role: data.get('role'),
      city: String(data.get('city')).trim() || null,
      phone: String(data.get('phone')).trim() || null,
      plan_interest: data.get('plan') || null,
      source: ref ? ref.slice(0, 50) : null,
    })

    if (!error) {
      form.reset()
      setStatus('done')
    } else if (error.code === '23505') {
      setStatus('duplicate')
    } else {
      setStatus('error')
      setMessage('Something went wrong. Check your details and join the waitlist again.')
    }
  }

  if (status === 'done' || status === 'duplicate') {
    return (
      <p
        class="mt-5 flex items-start gap-2 border-l-4 border-field bg-shell p-4 font-medium"
        role="status"
      >
        <Check size={20} class="mt-0.5 shrink-0 text-field" aria-hidden="true" />
        {status === 'done'
          ? 'You joined the waitlist. We will email you when Flezible opens in your area.'
          : 'This email is already on the waitlist. We will email you when Flezible opens.'}
      </p>
    )
  }

  return (
    <form class="mt-5 grid gap-3.5" onSubmit={onSubmit}>
      <label class={label}>
        I am a
        <select class={field} name="role" required defaultValue="">
          <option value="" disabled>
            Choose one
          </option>
          {ROLES.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </label>

      <label class={label}>
        Full name
        <input class={field} name="name" type="text" required minLength={2} maxLength={100} autoComplete="name" />
      </label>

      <label class={label}>
        Email
        <input class={field} name="email" type="email" required maxLength={254} autoComplete="email" />
      </label>

      <div class="grid gap-3.5 sm:grid-cols-2">
        <label class={label}>
          City or state
          <input
            class={field}
            name="city"
            type="text"
            maxLength={100}
            autoComplete="address-level2"
            placeholder="Enugu"
          />
        </label>
        <label class={label}>
          Phone, optional
          <input class={field} name="phone" type="tel" minLength={7} maxLength={20} autoComplete="tel" />
        </label>
      </div>

      <label class={label}>
        Plan you are most interested in, optional
        <select class={field} name="plan" defaultValue="">
          <option value="">Not sure yet</option>
          {plans.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}, {naira(p.prices.monthly)} a month
            </option>
          ))}
        </select>
      </label>

      <div class="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label>
          Company
          <input name="company" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <button class={`${btn} justify-self-start`} type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Joining…' : 'Join the waitlist'}
      </button>

      {status === 'error' && (
        <p class="font-medium text-red-800" role="alert">
          {message}
        </p>
      )}
    </form>
  )
}

/* ---------- pricing ---------- */

function Pricing({ plans }) {
  const [period, setPeriod] = useState('monthly')

  return (
    <section id="pricing" class="scroll-mt-14 py-12 md:py-[4.5rem]">
      <div class={wrap}>
        <h2 class="text-[clamp(1.6rem,3.4vw,2.3rem)] leading-[1.1] font-bold">Simple pricing for suppliers</h2>
        <p class="mt-4 max-w-[56ch] text-lg text-muted">
          Buying on Flezible is free. Buyers only cover the payment fee when they add money to their wallet. Every
          new supplier starts with 14 days free or their first 3 orders, whichever they choose.
        </p>

        <div
          class="mt-6 inline-flex rounded-full border-[1.5px] border-ink bg-white p-1"
          role="group"
          aria-label="Billing period"
        >
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={period === p.id}
              onClick={() => setPeriod(p.id)}
              class={`cursor-pointer rounded-full px-4 py-2 text-[0.95rem] font-medium ${
                period === p.id ? 'bg-ink text-shell' : 'bg-transparent text-ink'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div class="mt-6 grid overflow-hidden rounded-2xl border-[1.5px] border-ink bg-white md:grid-cols-3">
          {plans.map((plan) => {
            const shown = plan.prices[period] ? period : 'monthly'
            const unit = PERIODS.find((p) => p.id === shown).unit
            return (
              <article
                key={plan.code}
                class="border-t-[1.5px] border-ink p-6 first:border-t-0 md:border-t-0 md:border-l-[1.5px] md:first:border-l-0"
              >
                <h3 class="text-xl font-semibold">{plan.name}</h3>
                <p class="mt-1 text-muted">{plan.tagline}</p>
                <p class="mt-4">
                  <span class="font-display text-[2rem] leading-none font-bold">{naira(plan.prices[shown])}</span>
                  <span class="text-muted"> a {unit}</span>
                </p>
                <p class="mt-1 font-medium text-field">{percent(plan.commissionBps)} commission on each order</p>
                {shown !== period && <p class="mt-1 text-sm text-muted">Billed monthly only</p>}
                <ul class="mt-4 grid gap-2">
                  {plan.features.map((f) => (
                    <li key={f} class="flex items-start gap-2">
                      <Check size={18} class="mt-1 shrink-0 text-field" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
              </article>
            )
          })}
        </div>

        <p class="mt-4 flex items-start gap-2 text-sm text-muted">
          <ShieldCheck size={18} class="mt-0.5 shrink-0" aria-hidden="true" />
          Weekly and daily payments are available on Starter. Suppliers become verified by passing identity and
          business checks, not by paying.
        </p>
      </div>
    </section>
  )
}

/* ---------- page ---------- */

export function App() {
  const plans = usePlans()

  return (
    <>
      <header class="sticky top-0 z-10 bg-ink text-shell">
        <div class={`${wrap} flex items-center justify-between py-3`}>
          <a class="inline-flex items-center gap-2 font-display text-xl font-bold no-underline" href="#top">
            <Egg size={22} class="text-yolk" aria-hidden="true" />
            Flezible
          </a>
          <nav class="flex items-center gap-5" aria-label="Main">
            <a class="hidden font-medium hover:underline sm:inline" href="#how">
              How it works
            </a>
            <a class="hidden font-medium hover:underline sm:inline" href="#pricing">
              Pricing
            </a>
            <a class={`${btn} px-4 py-2 text-sm`} href="#waitlist">
              Join the waitlist
            </a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section class="py-8 md:py-16">
          <div class={`${wrap} grid items-start gap-10 lg:grid-cols-[1.15fr_0.85fr]`}>
            <div>
              <h1 class="max-w-[16ch] text-[clamp(2.2rem,6vw,3.8rem)] leading-[1.1] font-bold">
                Order eggs from farms you can trust. Pay when they arrive.
              </h1>
              <p class="mt-4 max-w-[56ch] text-lg text-muted">
                Flezible connects egg farms and suppliers with shops, restaurants and bakeries. Your payment is held
                until you confirm delivery, and broken or spoiled eggs are reported with a photo.
              </p>
              <div id="waitlist" class="mt-8 max-w-[34rem] scroll-mt-20 rounded-2xl border-[1.5px] border-ink bg-white p-6">
                <h2 class="text-2xl leading-[1.1] font-bold">Join the waitlist</h2>
                <p class="mt-1.5 text-muted">
                  We are opening in Enugu first. Tell us who you are and we will email you when we launch.
                </p>
                <WaitlistForm plans={plans} />
              </div>
            </div>
            <Crate />
          </div>
        </section>

        <section id="how" class="scroll-mt-14 py-12 md:py-[4.5rem]">
          <div class={wrap}>
            <h2 class="text-[clamp(1.6rem,3.4vw,2.3rem)] leading-[1.1] font-bold">How an order works</h2>
            <ol class="mt-8 grid gap-6 md:grid-cols-4">
              {STEPS.map(({ icon: Icon, title, text }) => (
                <li key={title} class="border-t-2 border-ink pt-4">
                  <span class="mb-3 grid h-10 w-10 place-items-center rounded-full bg-yolk">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <h3 class="text-xl font-semibold">{title}</h3>
                  <p class="mt-1.5 text-muted">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section class="border-y border-line bg-white py-12 md:py-[4.5rem]">
          <div class={`${wrap} grid gap-8 md:grid-cols-3`}>
            {AUDIENCES.map(({ icon: Icon, title, text }) => (
              <div key={title}>
                <Icon size={28} class="text-field" aria-hidden="true" />
                <h3 class="mt-3 text-xl font-semibold">{title}</h3>
                <p class="mt-2 max-w-[46ch] text-muted">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <Pricing plans={plans} />
      </main>

      <footer class="bg-ink py-8 text-shell">
        <div class={`${wrap} flex flex-wrap items-center justify-between gap-4`}>
          <p>Flezible. Eggs from the farm to your store, warehouse or doorstep.</p>
          <a class="font-medium underline" href="#waitlist">
            Join the waitlist
          </a>
        </div>
      </footer>
    </>
  )
}