import { useEffect, useState } from 'preact/hooks'
// import { supabase } from './lib/supabase.js'

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
    <figure class="crate-wrap">
      <svg
        class="crate"
        viewBox="0 0 360 360"
        role="img"
        aria-label="A crate of 30 eggs, the unit eggs are sold in"
      >
        <rect x="8" y="8" width="344" height="344" rx="18" fill="var(--ink)" />
        {eggs.map((e, i) => (
          <ellipse
            key={i}
            class="egg"
            style={{ '--i': i }}
            cx={e.x}
            cy={e.y}
            rx="17"
            ry="22"
            fill={i === 22 ? 'var(--yolk)' : 'var(--shell)'}
          />
        ))}
      </svg>
      <figcaption>One crate, 30 eggs. Order by the crate or by the tray.</figcaption>
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

  if (status === 'done') {
    return (
      <p class="form-result" role="status">
        You joined the waitlist. We will email you when Flezible opens in your area.
      </p>
    )
  }

  if (status === 'duplicate') {
    return (
      <p class="form-result" role="status">
        This email is already on the waitlist. We will email you when Flezible opens.
      </p>
    )
  }

  return (
    <form class="form" onSubmit={onSubmit}>
      <label>
        I am a
        <select name="role" required defaultValue="">
          <option value="" disabled>
            Choose one
          </option>
          {ROLES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label>
        Full name
        <input name="name" type="text" required minLength={2} maxLength={100} autoComplete="name" />
      </label>

      <label>
        Email
        <input name="email" type="email" required maxLength={254} autoComplete="email" />
      </label>

      <div class="row">
        <label>
          City or state
          <input name="city" type="text" maxLength={100} autoComplete="address-level2" placeholder="Enugu" />
        </label>
        <label>
          Phone, optional
          <input name="phone" type="tel" minLength={7} maxLength={20} autoComplete="tel" />
        </label>
      </div>

      <label>
        Plan you are most interested in, optional
        <select name="plan" defaultValue="">
          <option value="">Not sure yet</option>
          {plans.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name}, {naira(p.prices.monthly)} a month
            </option>
          ))}
        </select>
      </label>

      <div class="hp" aria-hidden="true">
        <label>
          Company
          <input name="company" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <button class="btn" type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Joining…' : 'Join the waitlist'}
      </button>

      {status === 'error' && (
        <p class="form-error" role="alert">
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
    <section id="pricing" class="section">
      <div class="wrap">
        <h2>Simple pricing for suppliers</h2>
        <p class="lead">
          Buying on Flezible is free. Buyers only cover the payment fee when they add money to their wallet.
          Every new supplier starts with 14 days free or their first 3 orders, whichever they choose.
        </p>

        <div class="period" role="group" aria-label="Billing period">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              class="period-btn"
              aria-pressed={period === p.id}
              onClick={() => setPeriod(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div class="plans">
          {plans.map((plan) => {
            const shown = plan.prices[period] ? period : 'monthly'
            const unit = PERIODS.find((p) => p.id === shown).unit
            return (
              <article class="plan" key={plan.code}>
                <h3>{plan.name}</h3>
                <p class="plan-tag">{plan.tagline}</p>
                <p class="price">
                  <span class="amount">{naira(plan.prices[shown])}</span>
                  <span class="per"> a {unit}</span>
                </p>
                <p class="plan-note">
                  {shown !== period ? 'Billed monthly only' : `${percent(plan.commissionBps)} commission on each order`}
                </p>
                {shown !== period && (
                  <p class="plan-note">{percent(plan.commissionBps)} commission on each order</p>
                )}
                <ul>
                  {plan.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
              </article>
            )
          })}
        </div>

        <p class="fine">
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
      <header class="top">
        <div class="wrap bar">
          <a class="brand" href="#top">
            <span class="brand-egg" aria-hidden="true" />
            Flezible
          </a>
          <nav aria-label="Main">
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
            <a class="btn btn-small" href="#waitlist">
              Join the waitlist
            </a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section class="hero">
          <div class="wrap hero-grid">
            <div>
              <h1>Order eggs from farms you can trust. Pay when they arrive.</h1>
              <p class="lead">
                Flezible connects egg farms and suppliers with shops, restaurants and bakeries. Your payment is held
                until you confirm delivery, and broken or spoiled eggs are reported with a photo.
              </p>
              <div id="waitlist" class="join">
                <h2>Join the waitlist</h2>
                <p>We are opening in Enugu first. Tell us who you are and we will email you when we launch.</p>
                <WaitlistForm plans={plans} />
              </div>
            </div>
            <Crate />
          </div>
        </section>

        <section id="how" class="section">
          <div class="wrap">
            <h2>How an order works</h2>
            <ol class="steps">
              <li>
                <h3>You place an order</h3>
                <p>Pick a supplier near you and pay from your Flezible wallet.</p>
              </li>
              <li>
                <h3>The supplier confirms</h3>
                <p>The farm or supplier accepts the order and the delivery.</p>
              </li>
              <li>
                <h3>The eggs arrive</h3>
                <p>A delivery partner brings them to your shop, kitchen or door.</p>
              </li>
              <li>
                <h3>You confirm, they get paid</h3>
                <p>Payment is released after you confirm. If eggs are broken or spoiled, report them with a photo.</p>
              </li>
            </ol>
          </div>
        </section>

        <section class="section section-alt">
          <div class="wrap who">
            <div>
              <h3>Farms and suppliers</h3>
              <p>
                List your eggs, set the areas you deliver to, and reach buyers beyond your neighbourhood. Orders,
                payments and reports sit in one place.
              </p>
            </div>
            <div>
              <h3>Shops, restaurants and bakeries</h3>
              <p>
                Find verified suppliers, see who delivers to you, and pay from a wallet that holds the money until
                the eggs arrive.
              </p>
            </div>
            <div>
              <h3>Delivery partners</h3>
              <p>Join as a rider or a company and take delivery jobs as orders come in.</p>
            </div>
          </div>
        </section>

        <Pricing plans={plans} />
      </main>

      <footer class="footer">
        <div class="wrap">
          <p>Flezible. Eggs from the farm to your store, warehouse or doorstep.</p>
          <a href="#waitlist">Join the waitlist</a>
        </div>
      </footer>
    </>
  )
}
