import { useEffect, useState } from 'preact/hooks'
import {
  ArrowRight,
  Check,
  Egg,
  MessageSquare,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Store,
  Tractor,
  Truck,
  Wallet,
} from 'lucide-preact'
import { supabase } from './lib/supabase.js'

/* ---------- shared class names ---------- */

const wrap = 'mx-auto w-[min(1120px,calc(100%-2.5rem))]'
const eyebrow = 'text-sm font-semibold tracking-wide text-brand uppercase'
const h2 = 'mt-2 font-display text-[clamp(1.7rem,3.6vw,2.5rem)] leading-[1.1] font-bold'
const btnPrimary =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 font-semibold text-white shadow-lg shadow-brand/30 hover:bg-brand-deep disabled:cursor-wait disabled:opacity-60'
const btnLime =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-lime px-4 py-2.5 text-sm font-semibold text-ink hover:brightness-95'
const label = 'grid gap-1.5 text-sm font-medium'
const field =
  'w-full rounded-xl border border-line bg-white px-3.5 py-3 text-base text-ink placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/15 focus:outline-none'

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
  { icon: MessageSquare, title: 'Say what you need', text: 'Type your order the way you would text a friend, then check it.' },
  { icon: Tractor, title: 'A supplier confirms', text: 'Farms and suppliers that can deliver to you get the order.' },
  { icon: Truck, title: 'The eggs arrive', text: 'A delivery partner brings them to your shop, kitchen or door.' },
  {
    icon: PackageCheck,
    title: 'You confirm, they get paid',
    text: 'Payment is released after you confirm. Broken or spoiled eggs are reported with a photo.',
  },
]

const AUDIENCES = [
  {
    icon: Tractor,
    title: 'Farms and suppliers',
    text: 'List your eggs by chatting, set where you deliver, and reach buyers beyond your neighbourhood.',
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
        class="mt-5 flex items-start gap-2.5 rounded-xl border border-success/30 bg-success/10 p-4 font-medium"
        role="status"
      >
        <Check size={20} class="mt-0.5 shrink-0 text-success" aria-hidden="true" />
        {status === 'done'
          ? 'You joined the waitlist. We will email you when Flezible opens in your area.'
          : 'This email is already on the waitlist. We will email you when Flezible opens.'}
      </p>
    )
  }

  return (
    <form class="mt-5 grid gap-4" onSubmit={onSubmit}>
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

      <div class="grid gap-4 sm:grid-cols-2">
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

      <button class={btnPrimary} type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Joining…' : 'Join the waitlist'}
        {status !== 'sending' && <ArrowRight size={18} aria-hidden="true" />}
      </button>

      {status === 'error' && (
        <p class="font-medium text-red-700" role="alert">
          {message}
        </p>
      )}
    </form>
  )
}

/* ---------- example of ordering by chat (illustration, not interactive) ---------- */

function ChatDemo() {
  return (
    <figure>
      <div class="rounded-3xl border border-line bg-white p-5 shadow-[0_24px_60px_-24px_rgba(91,75,255,0.35)] sm:p-6">
        <div class="flex items-center justify-between">
          <span class="inline-flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles size={16} class="text-brand" aria-hidden="true" />
            Flezible assistant
          </span>
          <span class="rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-muted">Example</span>
        </div>

        <div class="mt-5 flex justify-end">
          <p class="max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-white">
            30 crates to Enugu on Friday
          </p>
        </div>

        <div class="mt-3 max-w-[94%] rounded-2xl rounded-bl-md border border-line bg-canvas p-4">
          <p class="text-sm text-muted">Here is your order. Check it, then confirm.</p>
          <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-sm">
            <dt class="text-muted">Quantity</dt>
            <dd class="font-medium">30 crates (900 eggs)</dd>
            <dt class="text-muted">Deliver to</dt>
            <dd class="font-medium">Enugu</dd>
            <dt class="text-muted">Needed by</dt>
            <dd class="font-medium">Friday</dd>
            <dt class="text-muted">Matched on</dt>
            <dd class="font-medium">Location, stock and price</dd>
          </dl>
          <span class="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-sm font-semibold text-white">
            Confirm order
            <ArrowRight size={16} aria-hidden="true" />
          </span>
        </div>
      </div>
      <figcaption class="mt-3 text-sm text-muted">An example of ordering by chat. Ordering opens at launch.</figcaption>
    </figure>
  )
}

/* ---------- pricing ---------- */

function Pricing({ plans }) {
  const [period, setPeriod] = useState('monthly')

  return (
    <section id="pricing" class="scroll-mt-16 bg-white py-16 md:py-24">
      <div class={wrap}>
        <p class={eyebrow}>Pricing</p>
        <h2 class={h2}>Simple pricing for suppliers</h2>
        <p class="mt-4 max-w-[56ch] text-lg text-muted">
          Buying on Flezible is free. Buyers only cover the payment fee when they add money to their wallet. Every
          new supplier starts with 14 days free or their first 3 orders, whichever they choose.
        </p>

        <div
          class="mt-7 inline-flex rounded-xl border border-line bg-canvas p-1"
          role="group"
          aria-label="Billing period"
        >
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={period === p.id}
              onClick={() => setPeriod(p.id)}
              class={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold ${period === p.id ? 'bg-ink text-white' : 'bg-transparent text-muted hover:text-ink'
                }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div class="mt-6 grid gap-5 md:grid-cols-3">
          {plans.map((plan) => {
            const shown = plan.prices[period] ? period : 'monthly'
            const unit = PERIODS.find((p) => p.id === shown).unit
            return (
              <article key={plan.code} class="rounded-2xl border border-line bg-white p-6 shadow-sm">
                <h3 class="font-display text-xl font-semibold">{plan.name}</h3>
                <p class="mt-1 text-muted">{plan.tagline}</p>
                <p class="mt-5">
                  <span class="font-display text-[2.1rem] leading-none font-bold">{naira(plan.prices[shown])}</span>
                  <span class="text-muted"> a {unit}</span>
                </p>
                <p class="mt-2 inline-block rounded-full bg-brand/10 px-3 py-1 text-sm font-semibold text-brand">
                  {percent(plan.commissionBps)} commission per order
                </p>
                {shown !== period && <p class="mt-2 text-sm text-muted">Billed monthly only</p>}
                <ul class="mt-5 grid gap-2.5 border-t border-line pt-5">
                  {plan.features.map((f) => (
                    <li key={f} class="flex items-start gap-2.5">
                      <Check size={18} class="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
                      {f}
                    </li>
                  ))}
                </ul>
              </article>
            )
          })}
        </div>

        <p class="mt-5 flex items-start gap-2 text-sm text-muted">
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
      <header class="sticky top-0 z-20 border-b border-white/10 bg-night/85 text-white backdrop-blur-md">
        <div class={`${wrap} flex items-center justify-between py-3`}>
          <a class="inline-flex items-center gap-2 font-display text-lg font-bold" href="#top">
            <span class="grid h-8 w-8 place-items-center rounded-lg bg-lime text-ink">
              <Egg size={18} aria-hidden="true" />
            </span>
            Flezible
          </a>
          <nav class="flex items-center gap-6" aria-label="Main">
            <a class="hidden text-sm font-medium text-white/80 hover:text-white sm:inline" href="#how">
              How it works
            </a>
            <a class="hidden text-sm font-medium text-white/80 hover:text-white sm:inline" href="#pricing">
              Pricing
            </a>
            <a class={btnLime} href="#waitlist">
              Join the waitlist
            </a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section class="relative overflow-hidden bg-night text-white">
          <div class="bg-grid absolute inset-0" aria-hidden="true" />
          <div
            class="pointer-events-none absolute -top-40 left-1/2 h-[26rem] w-[52rem] -translate-x-1/2 rounded-full bg-brand/40 blur-[130px]"
            aria-hidden="true"
          />
          <div
            class="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-lime/15 blur-[110px]"
            aria-hidden="true"
          />

          <div class={`${wrap} relative grid items-start gap-12 py-14 md:py-20 lg:grid-cols-[1.1fr_0.9fr]`}>
            <div>
              <p class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-sm font-medium text-white/90">
                <span class="h-2 w-2 rounded-full bg-lime" aria-hidden="true" />
                Opening first in Nigeria
              </p>
              <h1 class="mt-6 max-w-[18ch] font-display text-[clamp(2.3rem,6vw,4rem)] leading-[1.05] font-bold text-balance">
                Order eggs by chat.{' '}
                <span class="bg-linear-to-r from-lime to-white bg-clip-text text-transparent">
                  Pay when they arrive.
                </span>
              </h1>
              <p class="mt-5 max-w-[52ch] text-lg text-white/75">
                Flezible connects egg farms and suppliers with shops, restaurants and bakeries. Tell us what you need,
                we match it to farms near you, and your payment is held until you confirm delivery.
              </p>
              <ul class="mt-7 grid gap-3 text-white/85">
                {[
                  'Matched by location, stock and price',
                  'Payment held until you confirm delivery',
                  'Broken or spoiled eggs reported with a photo',
                ].map((t) => (
                  <li key={t} class="flex items-center gap-2.5">
                    <span class="grid h-5 w-5 place-items-center rounded-full bg-lime text-ink">
                      <Check size={13} strokeWidth={3} aria-hidden="true" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div id="waitlist" class="scroll-mt-24 rounded-3xl bg-white p-6 text-ink shadow-2xl shadow-black/30 sm:p-7">
              <h2 class="font-display text-2xl font-bold">Join the waitlist</h2>
              <p class="mt-1.5 text-muted">Tell us who you are and we will email you when we launch.</p>
              <WaitlistForm plans={plans} />
            </div>
          </div>
        </section>

        <section class="py-16 md:py-24">
          <div class={`${wrap} grid items-center gap-12 lg:grid-cols-2`}>
            <div>
              <p class={eyebrow}>Ordering</p>
              <h2 class={h2}>Type it like a text message</h2>
              <p class="mt-4 max-w-[48ch] text-lg text-muted">
                No long forms. Say how many crates, where and when. Flezible turns it into an order you can check and
                edit, then finds the farms and suppliers that can deliver.
              </p>
              <p class="mt-4 max-w-[48ch] text-lg text-muted">
                Farms get the same ease: list your stock, prices and delivery areas by chatting, then confirm.
              </p>
            </div>
            <ChatDemo />
          </div>
        </section>

        <section id="how" class="scroll-mt-16 bg-white py-16 md:py-24">
          <div class={wrap}>
            <p class={eyebrow}>How it works</p>
            <h2 class={h2}>From message to doorstep</h2>
            <ol class="mt-10 grid gap-5 md:grid-cols-4">
              {STEPS.map(({ icon: Icon, title, text }) => (
                <li key={title} class="rounded-2xl border border-line bg-canvas p-5">
                  <span class="grid h-11 w-11 place-items-center rounded-xl bg-brand text-white">
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <h3 class="mt-4 font-display text-lg font-semibold">{title}</h3>
                  <p class="mt-1.5 text-muted">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section class="py-16 md:py-24">
          <div class={wrap}>
            <p class={eyebrow}>Who it is for</p>
            <h2 class={h2}>Built for both sides of the crate</h2>
            <div class="mt-10 grid gap-5 md:grid-cols-3">
              {AUDIENCES.map(({ icon: Icon, title, text }) => (
                <div key={title} class="rounded-2xl border border-line bg-white p-6">
                  <Icon size={28} class="text-brand" aria-hidden="true" />
                  <h3 class="mt-4 font-display text-lg font-semibold">{title}</h3>
                  <p class="mt-2 text-muted">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Pricing plans={plans} />

        <section class="relative overflow-hidden bg-night py-16 text-white md:py-20">
          <div
            class="pointer-events-none absolute -bottom-32 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-brand/50 blur-[120px]"
            aria-hidden="true"
          />
          <div class={`${wrap} relative text-center`}>
            <h2 class="mx-auto max-w-[20ch] font-display text-[clamp(1.8rem,4vw,2.7rem)] leading-[1.1] font-bold text-balance">
              Be first in line when Flezible opens in your area
            </h2>
            <a class={`${btnPrimary} mt-8`} href="#waitlist">
              Join the waitlist
              <ArrowRight size={18} aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>

      <footer class="bg-ink py-8 text-white/70">
        <div class={`${wrap} flex flex-wrap items-center justify-between gap-4 text-sm`}>
          <p>Flezible. Eggs from the farm to your store, warehouse or doorstep.</p>
          <a class="font-medium text-white underline" href="#waitlist">
            Join the waitlist
          </a>
        </div>
      </footer>
    </>
  )
}