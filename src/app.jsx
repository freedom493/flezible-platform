import { useEffect, useState } from 'preact/hooks'
import {
  ArrowRight,
  Building2,
  Camera,
  Check,
  ChevronDown,
  Clock,
  Coins,
  Egg,
  HelpCircle,
  MapPin,
  MessageSquare,
  PackageCheck,
  Shield,
  ShieldCheck,
  Sparkles,
  Store,
  Tractor,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from 'lucide-preact'
import { supabase } from './lib/supabase.js'

/* ---------- Shared Design Tokens & Styles ---------- */

const wrap = 'mx-auto w-[min(1200px,calc(100%-2.5rem))]'
const eyebrow = 'inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-brand uppercase rounded-full bg-brand-light px-3 py-1 ring-1 ring-brand/20'
const h2 = 'mt-3 font-display text-[clamp(1.85rem,3.8vw,2.75rem)] leading-[1.12] font-bold text-ink tracking-tight'

const btnPrimary =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-brand/25 transition-all duration-200 hover:bg-brand-deep hover:shadow-brand/35 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-wait disabled:opacity-60'

const btnSecondary =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 py-3 text-base font-semibold text-ink shadow-sm transition-all duration-200 hover:bg-slate-50 hover:border-slate-300'

const btnAccent =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-accent/20 transition-all duration-200 hover:bg-accent-deep hover:shadow-accent/30'

const label = 'grid gap-1.5 text-sm font-semibold text-slate-700'
const field =
  'w-full rounded-xl border border-line bg-white px-3.5 py-3 text-base text-ink transition-colors placeholder:text-slate-400 focus:border-brand focus:ring-4 focus:ring-brand/10 focus:outline-none'

/* ---------- Formatters & Static Data ---------- */

const naira = (kobo) => '₦' + Math.round(kobo / 100).toLocaleString('en-NG')
const percent = (bps) => `${bps / 100}%`

const PERIODS = [
  { id: 'monthly', label: 'Monthly', unit: 'month' },
  { id: 'weekly', label: 'Weekly', unit: 'week' },
  { id: 'daily', label: 'Daily', unit: 'day' },
]

const ROLES = [
  ['buyer', 'Shop, restaurant or bakery buying eggs'],
  ['farm', 'Egg poultry farm'],
  ['supplier', 'Egg distributor or wholesale supplier'],
  ['logistics', 'Delivery rider or logistics fleet'],
]

const STEPS = [
  {
    num: '01',
    icon: MessageSquare,
    title: 'Text what you need',
    desc: 'Say how many crates, egg size, and when you need them. No tedious order forms—just natural chat.',
    badge: 'Voice or text',
  },
  {
    num: '02',
    icon: Tractor,
    title: 'Verified farm matching',
    desc: 'Our engine matches your order instantly to verified poultry farms nearby with real-time fresh stock.',
    badge: '100% Verified Farms',
  },
  {
    num: '03',
    icon: Truck,
    title: 'Cushioned doorstep transit',
    desc: 'Specialized riders transport eggs in shock-absorbing trays straight to your kitchen, shop, or warehouse.',
    badge: 'Live Status Stepper',
  },
  {
    num: '04',
    icon: PackageCheck,
    title: 'Inspect, confirm, release',
    desc: 'Payment stays locked in escrow until you inspect. Any cracked or broken eggs? Upload a photo for an instant credit.',
    badge: 'Zero Broken Egg Risk',
  },
]

const AUDIENCES = [
  {
    icon: Store,
    role: 'Buyers & Food Businesses',
    sub: 'Bakeries, Caterers, Supermarkets & Restaurants',
    points: [
      'Guaranteed egg supply at transparent farm-gate prices',
      'Escrow protection: Zero advance payment risk',
      'Instant refund credit for any cracked eggs via photo upload',
      'Regular weekly or recurring delivery schedules',
    ],
    highlight: 'Never stop baking because of egg shortages.',
  },
  {
    icon: Tractor,
    role: 'Poultry Farms & Producers',
    sub: 'Small, Medium & Commercial Layer Farms',
    points: [
      'Offload entire layer shed productions without middlemen haggling',
      'List daily available stock in 20 seconds via WhatsApp',
      'Instant automated bank payouts when crates are delivered',
      'Set your custom delivery radius and minimum order crates',
    ],
    highlight: 'Predictable cashflow with verified buyers.',
  },
  {
    icon: Truck,
    role: 'Logistics & Dispatch Partners',
    sub: 'Motorcycle Couriers & Van Fleet Operators',
    points: [
      'Steady daily egg crate delivery gigs in your city',
      'Optimized pickup and delivery routes to minimize transit time',
      'Standardized crate handling guidelines to prevent breakage',
      'Prompt weekly delivery fee settlement direct to your wallet',
    ],
    highlight: 'Consistent high-volume daily runs.',
  },
]

const FALLBACK_PLANS = [
  {
    code: 'plan_a',
    name: 'Starter',
    tagline: 'For small farms & emerging egg distributors',
    commissionBps: 300,
    prices: { monthly: 500000, weekly: 150000, daily: 25000 },
    popular: false,
    features: [
      'Up to 250 crates monthly volume',
      'Basic analytics & 14 days order history',
      'Instant WhatsApp & email order alerts',
      'Monthly business performance report',
      'Standard 24h payout processing',
    ],
  },
  {
    code: 'plan_b',
    name: 'Growth',
    tagline: 'For established farms & busy suppliers',
    commissionBps: 130,
    prices: { monthly: 1000000 },
    popular: true,
    features: [
      'Unlimited monthly crate volume',
      'Priority matching algorithm rank',
      'Advanced analytics & 90 days order history',
      'WhatsApp, SMS & email notifications',
      'Weekly automated business summary',
      'Express priority escrow payout',
    ],
  },
  {
    code: 'plan_c',
    name: 'Pro Enterprise',
    tagline: 'For high-volume commercial hatcheries & hubs',
    commissionBps: 30,
    prices: { monthly: 1500000 },
    popular: false,
    features: [
      'Top-tier search & catalog promotion',
      'Lowest 0.3% commission per order',
      'Dedicated account manager in your state',
      'Daily WhatsApp executive reports',
      'Multi-vehicle delivery fleet dispatcher',
      'Real-time automated business tracker',
    ],
  },
]

const FAQS = [
  {
    q: 'How does escrow payment protection work?',
    a: 'When you order eggs on Flezible, your payment is held securely in an automated escrow vault. The farm or supplier only receives payment after the eggs are delivered to your door and you tap "Confirm Delivery". This eliminates payment risk for buyers and eliminates unpaid debts for farms.',
  },
  {
    q: 'What happens if some eggs arrive cracked or broken?',
    a: 'We understand fragile cargo! If any eggs in your delivery arrive cracked or spoiled, simply snap a clear photograph using your phone and submit it through the delivery confirmation screen. The damaged eggs are calculated and refunded or credited back to your account immediately.',
  },
  {
    q: 'What is the standard crate size in Nigeria?',
    a: 'On Flezible, 1 standard commercial crate contains exactly 30 eggs (1 crate = 30 eggs). A 30-crate order corresponds to 900 fresh eggs. You can choose egg sizes including Medium, Large, and Jumbo.',
  },
  {
    q: 'Do buyers have to pay subscription fees?',
    a: 'No! Buying eggs on Flezible is 100% free with no monthly subscription. Buyers only pay for the eggs they purchase and standard delivery fees. Every new supplier starts with 14 days free or their first 3 orders on us.',
  },
  {
    q: 'Which Nigerian cities are launching first?',
    a: 'We are launching first in Enugu and Lagos states, followed by Abuja, Ibadan, and Port Harcourt. Farms and buyers across all 36 states can join the waitlist now to gain early access when onboarding begins in their zone.',
  },
]

/* ---------- Supabase Plans Hook ---------- */

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
            popular: p.code === 'plan_b',
            features: p.features,
            prices: Object.fromEntries(p.plan_prices.map((x) => [x.billing_period, x.amount_kobo])),
          }))
        )
      })
  }, [])

  return plans
}

/* ---------- Waitlist Form ---------- */

function WaitlistForm({ plans }) {
  const [status, setStatus] = useState('idle') // idle | sending | done | duplicate | error
  const [message, setMessage] = useState('')

  async function onSubmit(e) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)

    // Honeypot: real people never see this field
    if (data.get('company')) {
      setStatus('done')
      return
    }

    if (!supabase) {
      setStatus('error')
      setMessage('The waitlist service is connecting. Please check back shortly.')
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
      setMessage('Something went wrong. Please check your network and try again.')
    }
  }

  if (status === 'done' || status === 'duplicate') {
    return (
      <div
        class="mt-6 rounded-2xl border border-brand/30 bg-brand-light p-6 text-center animate-fade-in"
        role="status"
      >
        <div class="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand text-white shadow-md">
          <Check size={24} strokeWidth={2.5} />
        </div>
        <h3 class="font-display text-xl font-bold text-brand-dark">
          {status === 'done' ? "You're on the early priority list!" : 'Already registered!'}
        </h3>
        <p class="mt-2 text-sm text-slate-700 leading-relaxed max-w-[42ch] mx-auto">
          {status === 'done'
            ? "We've reserved your priority spot. You'll receive early invite access when Flezible launches in your city."
            : "This email is already registered on our early access list. We will notify you as soon as operations open."}
        </p>
      </div>
    )
  }

  return (
    <form class="mt-6 grid gap-4 text-left" onSubmit={onSubmit}>
      <label class={label}>
        I represent a
        <select class={field} name="role" required defaultValue="">
          <option value="" disabled>
            Select your business type
          </option>
          {ROLES.map(([value, text]) => (
            <option key={value} value={value}>
              {text}
            </option>
          ))}
        </select>
      </label>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class={label}>
          Full Name
          <input
            class={field}
            name="name"
            type="text"
            required
            minLength={2}
            maxLength={100}
            placeholder="Chidi Okafor"
            autoComplete="name"
          />
        </label>
        <label class={label}>
          Work Email
          <input
            class={field}
            name="email"
            type="email"
            required
            maxLength={254}
            placeholder="chidi@freshbake.ng"
            autoComplete="email"
          />
        </label>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <label class={label}>
          City or State
          <input
            class={field}
            name="city"
            type="text"
            maxLength={100}
            placeholder="Enugu, Lagos, Abuja..."
            autoComplete="address-level2"
          />
        </label>
        <label class={label}>
          Phone (WhatsApp preferred)
          <input
            class={field}
            name="phone"
            type="tel"
            minLength={7}
            maxLength={20}
            placeholder="0803 123 4567"
            autoComplete="tel"
          />
        </label>
      </div>

      <label class={label}>
        Interested Supplier Plan (Optional)
        <select class={field} name="plan" defaultValue="">
          <option value="">Buyer (100% Free) or Not Sure Yet</option>
          {plans.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name} ({naira(p.prices.monthly)}/mo) — {percent(p.commissionBps)} commission
            </option>
          ))}
        </select>
      </label>

      {/* Honeypot field for bot protection */}
      <div class="absolute -left-[9999px] h-px w-px overflow-hidden" aria-hidden="true">
        <label>
          Company
          <input name="company" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <button class={`${btnPrimary} w-full mt-2`} type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Securing your spot…' : 'Join Early Access Waitlist'}
        {status !== 'sending' && <ArrowRight size={18} aria-hidden="true" />}
      </button>

      {status === 'error' && (
        <p class="mt-2 text-sm font-medium text-red-600" role="alert">
          {message}
        </p>
      )}

      <p class="text-xs text-center text-slate-500">
        🔒 100% privacy guarantee. No spam, ever. Unsubscribe at any time.
      </p>
    </form>
  )
}

/* ---------- Interactive Product Demo Component ---------- */

const DEMO_PRESETS = [
  {
    text: '30 crates of large eggs to New Haven, Enugu this Friday',
    crates: 30,
    eggs: 900,
    size: 'Large',
    dest: 'New Haven, Enugu',
    farm: 'Sunrise Hill Poultry, Ngwo (12 km away)',
    pricePerCrate: 420000, // ₦4,200 in kobo
    deliveryFee: 350000,
    eta: 'Friday by 11:00 AM',
  },
  {
    text: '75 crates medium eggs to Ikeja GRA bakery on Monday morning',
    crates: 75,
    eggs: 2250,
    size: 'Medium',
    dest: 'Ikeja GRA, Lagos',
    farm: 'Ojo Valley Layer Farms, Epe (Fresh Lay: Yesterday)',
    pricePerCrate: 395000,
    deliveryFee: 600000,
    eta: 'Monday by 8:30 AM',
  },
  {
    text: '120 crates large eggs to Garki II supermarket in Abuja',
    crates: 120,
    eggs: 3600,
    size: 'Large',
    dest: 'Garki II, Abuja',
    farm: 'Greenfield Commercial Farms, Kuje (Verified Grade-A)',
    pricePerCrate: 415000,
    deliveryFee: 900000,
    eta: 'Next Day Delivery',
  },
]

function InteractiveShowcase() {
  const [activeTab, setActiveTab] = useState('buyer') // buyer | farm | escrow
  const [selectedDemo, setSelectedDemo] = useState(0)
  const [orderConfirmed, setOrderConfirmed] = useState(false)

  const cur = DEMO_PRESETS[selectedDemo]
  const subtotal = cur.crates * cur.pricePerCrate
  const grandTotal = subtotal + cur.deliveryFee

  return (
    <div class="relative rounded-3xl border border-line bg-white p-5 shadow-2xl shadow-slate-900/5 sm:p-7">
      {/* Tab Selectors */}
      <div class="flex items-center gap-2 border-b border-line pb-4 overflow-x-auto">
        <button
          type="button"
          onClick={() => {
            setActiveTab('buyer')
            setOrderConfirmed(false)
          }}
          class={`cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === 'buyer'
              ? 'bg-brand text-white shadow-sm'
              : 'text-slate-600 hover:text-ink hover:bg-slate-100'
          }`}
        >
          <MessageSquare size={16} />
          Buyer Chat Order
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('farm')}
          class={`cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === 'farm'
              ? 'bg-brand text-white shadow-sm'
              : 'text-slate-600 hover:text-ink hover:bg-slate-100'
          }`}
        >
          <Tractor size={16} />
          Farm Stock Listing
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('escrow')}
          class={`cursor-pointer inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === 'escrow'
              ? 'bg-brand text-white shadow-sm'
              : 'text-slate-600 hover:text-ink hover:bg-slate-100'
          }`}
        >
          <ShieldCheck size={16} />
          Escrow & Photo Guarantee
        </button>
      </div>

      {/* Tab 1: Buyer Chat Order */}
      {activeTab === 'buyer' && (
        <div class="mt-5 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="inline-flex items-center gap-1.5 text-xs font-semibold text-brand bg-brand-light px-2.5 py-1 rounded-full">
              <Sparkles size={14} /> AI Order Assistant
            </span>
            <span class="text-xs text-slate-500">Pick a sample order text below:</span>
          </div>

          {/* Quick Preset Selector Buttons */}
          <div class="flex flex-wrap gap-2">
            {DEMO_PRESETS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setSelectedDemo(idx)
                  setOrderConfirmed(false)
                }}
                class={`cursor-pointer text-xs font-medium rounded-lg px-3 py-1.5 transition-all ${
                  selectedDemo === idx
                    ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {p.crates} crates ({p.dest.split(',')[0]})
              </button>
            ))}
          </div>

          {/* Chat bubbles */}
          <div class="space-y-3 rounded-2xl bg-slate-50 p-4 border border-line">
            {/* User Message */}
            <div class="flex justify-end">
              <div class="max-w-[85%] rounded-2xl rounded-br-xs bg-brand px-4 py-2.5 text-sm font-medium text-white shadow-sm">
                "{cur.text}"
              </div>
            </div>

            {/* AI Assistant Output Card */}
            <div class="max-w-[95%] rounded-2xl rounded-bl-xs border border-line bg-white p-4 shadow-sm">
              <div class="flex items-center justify-between border-b border-line pb-2.5">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Instant Parsed Order Match
                </span>
                <span class="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  <Check size={13} /> Matched in 0.4s
                </span>
              </div>

              <div class="mt-3 grid grid-cols-2 gap-3 text-xs sm:text-sm">
                <div>
                  <p class="text-slate-500">Quantity</p>
                  <p class="font-bold text-ink">
                    {cur.crates} crates <span class="text-xs font-normal text-slate-600">({cur.eggs} eggs)</span>
                  </p>
                </div>
                <div>
                  <p class="text-slate-500">Target Delivery</p>
                  <p class="font-bold text-ink">{cur.eta}</p>
                </div>
                <div>
                  <p class="text-slate-500">Egg Grade / Size</p>
                  <p class="font-bold text-ink">{cur.size} (Avg. 58-62g)</p>
                </div>
                <div>
                  <p class="text-slate-500">Destination</p>
                  <p class="font-bold text-ink truncate">{cur.dest}</p>
                </div>
              </div>

              <div class="mt-3 rounded-xl bg-slate-50 p-2.5 text-xs">
                <div class="flex items-center gap-1.5 text-slate-700">
                  <MapPin size={14} class="text-brand shrink-0" />
                  <span>
                    Supplied by: <strong class="text-ink">{cur.farm}</strong>
                  </span>
                </div>
              </div>

              {/* Price Breakdown */}
              <div class="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
                <div>
                  <span class="text-xs text-slate-500 block">Total Escrow Amount</span>
                  <span class="font-display text-lg font-bold text-ink">{naira(grandTotal)}</span>
                  <span class="text-xs text-slate-500 block">
                    ({naira(cur.pricePerCrate)}/crate + delivery)
                  </span>
                </div>

                {!orderConfirmed ? (
                  <button
                    type="button"
                    onClick={() => setOrderConfirmed(true)}
                    class="cursor-pointer inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                  >
                    Simulate Confirm Order
                    <ArrowRight size={14} />
                  </button>
                ) : (
                  <div class="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 px-3.5 py-2 text-xs font-bold text-emerald-800">
                    <Check size={16} strokeWidth={2.5} />
                    Funds Locked in Escrow 🔒
                  </div>
                )}
              </div>
            </div>
          </div>

          <p class="text-xs text-center text-slate-500">
            💡 The AI drafts the order. You check every line and tap confirm before payment locks in escrow.
          </p>
        </div>
      )}

      {/* Tab 2: Farm Listing */}
      {activeTab === 'farm' && (
        <div class="mt-5 space-y-4">
          <div class="rounded-2xl bg-slate-50 p-4 border border-line">
            <div class="flex items-center gap-2">
              <span class="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
                <Tractor size={18} />
              </span>
              <div>
                <h4 class="text-sm font-bold text-ink">Farm Voice / Chat Inventory Onboarding</h4>
                <p class="text-xs text-slate-500">How farmers update stock in 20 seconds</p>
              </div>
            </div>

            <div class="mt-3 rounded-xl bg-white p-3.5 border border-line text-xs sm:text-sm">
              <p class="text-slate-600 italic">
                "Hello Flezible, we gathered 350 fresh crates of large eggs today. Ready for delivery within Enugu and
                Nsukka at ₦4,150 per crate."
              </p>
            </div>

            <div class="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
              <div class="flex items-center justify-between text-xs text-emerald-800 font-semibold mb-2">
                <span>Automated Draft Listing</span>
                <span class="rounded bg-emerald-200 px-1.5 py-0.5 text-[10px]">Verified Biosecurity Farm</span>
              </div>
              <div class="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span class="text-slate-500 block">Available Crates</span>
                  <strong class="text-ink text-sm">350 crates (10,500 eggs)</strong>
                </div>
                <div>
                  <span class="text-slate-500 block">Price / Crate</span>
                  <strong class="text-ink text-sm">₦4,150</strong>
                </div>
                <div>
                  <span class="text-slate-500 block">Delivery Zone</span>
                  <strong class="text-ink text-sm">Enugu & Nsukka</strong>
                </div>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="rounded-xl border border-line p-3">
              <p class="font-bold text-ink">Zero Debt Guarantee</p>
              <p class="text-slate-500 mt-1">
                You never release crates until buyer funds are verified in escrow.
              </p>
            </div>
            <div class="rounded-xl border border-line p-3">
              <p class="font-bold text-ink">Automatic Payout</p>
              <p class="text-slate-500 mt-1">
                Direct bank transfer the second the buyer confirms drop-off.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Escrow & Quality Guarantee */}
      {activeTab === 'escrow' && (
        <div class="mt-5 space-y-4">
          <div class="grid gap-3 sm:grid-cols-3 text-xs">
            <div class="rounded-2xl border border-line bg-slate-50 p-3.5 text-center">
              <div class="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-xl bg-slate-200 text-slate-800 font-bold">
                1
              </div>
              <h5 class="font-bold text-ink">1. Secure Vault</h5>
              <p class="text-slate-500 mt-1">
                Buyer pays into an encrypted wallet. Funds are held in escrow.
              </p>
            </div>

            <div class="rounded-2xl border border-line bg-slate-50 p-3.5 text-center">
              <div class="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-xl bg-brand text-white font-bold">
                2
              </div>
              <h5 class="font-bold text-ink">2. Doorstep Check</h5>
              <p class="text-slate-500 mt-1">
                You count crates and inspect egg shells upon arrival.
              </p>
            </div>

            <div class="rounded-2xl border border-line bg-slate-50 p-3.5 text-center">
              <div class="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-xl bg-accent text-white font-bold">
                3
              </div>
              <h5 class="font-bold text-ink">3. Instant Settlement</h5>
              <p class="text-slate-500 mt-1">
                Confirm to pay the farm. Broken eggs refunded via 1 photo.
              </p>
            </div>
          </div>

          <div class="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <div class="flex items-start gap-3">
              <Camera size={20} class="text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h5 class="text-sm font-bold text-amber-900">Broken Egg Photo Protection</h5>
                <p class="text-xs text-amber-800 mt-1">
                  Cracked shells during transit? Simply snap a photo on delivery. Our automated claims engine credits
                  your wallet within minutes—no back-and-forth arguments with drivers.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Interactive Crate Volume & Savings Estimator ---------- */

function CrateCalculator() {
  const [weeklyCrates, setWeeklyCrates] = useState(50)
  const [userRole, setUserRole] = useState('buyer') // buyer | farm

  const eggsPerMonth = weeklyCrates * 4 * 30
  // Estimated procurement savings or earnings per crate vs open market middlemen
  const estimatedSavingsPerMonth = weeklyCrates * 4 * 350 * 100 // ~₦350/crate saved or earned
  const hoursSavedPerWeek = weeklyCrates > 100 ? 8 : 4

  return (
    <section class="py-16 md:py-24 bg-white border-y border-line">
      <div class={wrap}>
        <div class="text-center max-w-[65ch] mx-auto">
          <p class={eyebrow}>
            <TrendingUp size={14} /> Volume & Value Calculator
          </p>
          <h2 class={h2}>See what Flezible unlocks for your operation</h2>
          <p class="mt-3 text-base text-slate-600">
            Whether you run an artisanal bakery consuming 30 crates weekly or a commercial farm producing 500 crates,
            see your monthly impact.
          </p>
        </div>

        <div class="mt-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
          {/* Controls */}
          <div class="rounded-3xl border border-line bg-slate-50 p-6 sm:p-8">
            <div class="flex items-center gap-3">
              <span class="text-sm font-semibold text-slate-700">I am calculating as:</span>
              <div class="inline-flex rounded-xl bg-white border border-line p-1">
                <button
                  type="button"
                  onClick={() => setUserRole('buyer')}
                  class={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    userRole === 'buyer' ? 'bg-brand text-white shadow-xs' : 'text-slate-600 hover:text-ink'
                  }`}
                >
                  Bakery / Buyer
                </button>
                <button
                  type="button"
                  onClick={() => setUserRole('farm')}
                  class={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    userRole === 'farm' ? 'bg-brand text-white shadow-xs' : 'text-slate-600 hover:text-ink'
                  }`}
                >
                  Poultry Farm
                </button>
              </div>
            </div>

            <div class="mt-6">
              <div class="flex items-center justify-between">
                <label class="text-sm font-semibold text-ink">Weekly Egg Crate Volume</label>
                <span class="font-display text-xl font-bold text-brand">{weeklyCrates} crates / week</span>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                step="10"
                value={weeklyCrates}
                onInput={(e) => setWeeklyCrates(Number(e.currentTarget.value))}
                class="mt-3 w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
              <div class="flex justify-between text-xs text-slate-500 mt-1">
                <span>10 crates (Small shop)</span>
                <span>150 crates (Mid bakery)</span>
                <span>500+ crates (Industrial)</span>
              </div>
            </div>

            {/* Quick Presets */}
            <div class="mt-5 flex flex-wrap items-center gap-2">
              <span class="text-xs text-slate-500">Quick select:</span>
              {[20, 50, 100, 250, 500].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setWeeklyCrates(val)}
                  class={`cursor-pointer text-xs font-semibold px-2.5 py-1 rounded-md border transition ${
                    weeklyCrates === val
                      ? 'border-brand bg-brand text-white'
                      : 'border-line bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {val} crates
                </button>
              ))}
            </div>

            <div class="mt-6 border-t border-line pt-6 text-xs text-slate-600 space-y-2">
              <p class="flex items-center gap-2">
                <Check size={16} class="text-brand shrink-0" />
                <span>
                  <strong>1 Crate = 30 Eggs.</strong> {weeklyCrates} crates delivers {weeklyCrates * 30} fresh eggs
                  per week.
                </span>
              </p>
              <p class="flex items-center gap-2">
                <Check size={16} class="text-brand shrink-0" />
                <span>Zero advance deposit lost to unreliable middlemen or unverified sellers.</span>
              </p>
            </div>
          </div>

          {/* Results Display */}
          <div class="rounded-3xl border border-brand/20 bg-gradient-to-br from-brand-light via-white to-amber-50/50 p-6 sm:p-8 shadow-xl shadow-brand/5">
            <h3 class="text-xs font-bold uppercase tracking-wider text-brand">Estimated Monthly Return</h3>

            <div class="mt-4 grid gap-5">
              <div>
                <span class="text-xs text-slate-500 block">
                  {userRole === 'buyer' ? 'Monthly Procurement Savings' : 'Monthly Margin Uplift'}
                </span>
                <span class="font-display text-[2.4rem] font-bold text-ink leading-tight">
                  {naira(estimatedSavingsPerMonth)}
                </span>
                <span class="text-xs text-slate-500">
                  Estimated based on direct farm-gate matching vs open spot market.
                </span>
              </div>

              <div class="grid grid-cols-2 gap-4 border-t border-line/80 pt-4">
                <div>
                  <span class="text-xs text-slate-500 block">Eggs Sourced / Month</span>
                  <span class="font-display text-lg font-bold text-ink">
                    {eggsPerMonth.toLocaleString()} eggs
                  </span>
                </div>
                <div>
                  <span class="text-xs text-slate-500 block">Phone Calls Saved</span>
                  <span class="font-display text-lg font-bold text-ink">~{hoursSavedPerWeek} hrs / week</span>
                </div>
              </div>

              <div class="rounded-xl bg-white p-3.5 border border-line/80 text-xs text-slate-700">
                <span class="font-bold text-brand block mb-1">🛡️ Protected by Flezible Escrow:</span>
                100% of your weekly turnover is safeguarded. If any crate is delayed or damaged, funds remain in your
                hands.
              </div>

              <a class={`${btnPrimary} w-full text-center`} href="#waitlist">
                Reserve Early Priority Spot
                <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- Pricing Section ---------- */

function Pricing({ plans }) {
  const [period, setPeriod] = useState('monthly')

  return (
    <section id="pricing" class="scroll-mt-16 bg-slate-50 py-16 md:py-24 border-t border-line">
      <div class={wrap}>
        <div class="text-center max-w-[60ch] mx-auto">
          <p class={eyebrow}>
            <Coins size={14} /> Clear, Honest Pricing
          </p>
          <h2 class={h2}>Free for buyers. Simple plans for suppliers.</h2>
          <p class="mt-3 text-base text-slate-600">
            Buying on Flezible is completely free of subscription fees. Every new farm or supplier receives 14 days
            free or their first 3 completed orders on us.
          </p>

          {/* Billing Switcher */}
          <div
            class="mt-8 inline-flex rounded-2xl border border-line bg-white p-1 shadow-xs"
            role="group"
            aria-label="Billing period"
          >
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={period === p.id}
                onClick={() => setPeriod(p.id)}
                class={`cursor-pointer rounded-xl px-5 py-2.5 text-sm font-semibold transition-all ${
                  period === p.id ? 'bg-brand text-white shadow-xs' : 'text-slate-600 hover:text-ink'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div class="mt-12 grid gap-6 md:grid-cols-3 items-stretch">
          {plans.map((plan) => {
            const shown = plan.prices[period] ? period : 'monthly'
            const unit = PERIODS.find((p) => p.id === shown).unit
            const isPopular = plan.popular

            return (
              <article
                key={plan.code}
                class={`relative flex flex-col justify-between rounded-3xl border bg-white p-6 sm:p-8 transition-all duration-200 hover:shadow-xl ${
                  isPopular
                    ? 'border-brand shadow-lg shadow-brand/10 ring-2 ring-brand/20 -translate-y-1'
                    : 'border-line shadow-xs'
                }`}
              >
                {isPopular && (
                  <span class="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md">
                    Most Popular
                  </span>
                )}

                <div>
                  <h3 class="font-display text-2xl font-bold text-ink">{plan.name}</h3>
                  <p class="mt-1 text-xs text-slate-500 min-h-[32px]">{plan.tagline}</p>

                  <div class="mt-6 border-b border-line pb-6">
                    <p class="flex items-baseline gap-1">
                      <span class="font-display text-3xl sm:text-4xl font-bold text-ink">
                        {naira(plan.prices[shown])}
                      </span>
                      <span class="text-sm font-medium text-slate-500">/ {unit}</span>
                    </p>
                    <div class="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-900 border border-amber-200">
                      <span>{percent(plan.commissionBps)} commission per order</span>
                    </div>
                    {shown !== period && (
                      <p class="mt-1.5 text-xs text-slate-500">Billed on a monthly basis only</p>
                    )}
                  </div>

                  <ul class="mt-6 grid gap-3 text-sm text-slate-700">
                    {plan.features.map((f) => (
                      <li key={f} class="flex items-start gap-2.5">
                        <Check size={18} class="mt-0.5 shrink-0 text-brand" strokeWidth={2.5} />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div class="mt-8 border-t border-line pt-6">
                  <a
                    class={`w-full text-center ${isPopular ? btnPrimary : btnSecondary}`}
                    href="#waitlist"
                  >
                    Select {plan.name}
                  </a>
                </div>
              </article>
            )
          })}
        </div>

        <div class="mt-10 rounded-2xl border border-line bg-white p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-slate-600">
          <div class="flex items-center gap-2.5">
            <ShieldCheck size={20} class="text-brand shrink-0" />
            <span>
              <strong>Identity & Biosecurity First:</strong> Farms and suppliers are verified via physical site checks
              and registration, never by simply paying for a badge.
            </span>
          </div>
          <a class="font-semibold text-brand hover:underline shrink-0" href="#waitlist">
            Apply to be a verified farm &rarr;
          </a>
        </div>
      </div>
    </section>
  )
}

/* ---------- FAQ Section ---------- */

function FAQ() {
  const [openIdx, setOpenIdx] = useState(0)

  return (
    <section class="py-16 md:py-24 bg-white border-t border-line">
      <div class={wrap}>
        <div class="text-center max-w-[60ch] mx-auto">
          <p class={eyebrow}>
            <HelpCircle size={14} /> Frequently Asked Questions
          </p>
          <h2 class={h2}>Got questions? We have clear answers.</h2>
          <p class="mt-3 text-base text-slate-600">
            Everything you need to know about trading eggs on Flezible safely and transparently.
          </p>
        </div>

        <div class="mt-12 max-w-3xl mx-auto space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openIdx === idx
            return (
              <div
                key={idx}
                class="rounded-2xl border border-line bg-slate-50/50 transition-all duration-200 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? -1 : idx)}
                  class="cursor-pointer flex w-full items-center justify-between p-5 text-left font-display font-semibold text-ink sm:text-lg"
                  aria-expanded={isOpen}
                >
                  <span>{faq.q}</span>
                  <ChevronDown
                    size={20}
                    class={`text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-brand' : ''}`}
                  />
                </button>
                {isOpen && (
                  <div class="px-5 pb-5 text-sm sm:text-base text-slate-600 leading-relaxed border-t border-line/60 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ---------- Main Landing Page ---------- */

export function App() {
  const plans = usePlans()

  return (
    <div class="min-h-screen bg-canvas text-ink flex flex-col selection:bg-brand-light selection:text-brand-deep">
      {/* Top Notification Bar */}
      <div class="bg-night px-4 py-2 text-center text-xs text-white/90 font-medium border-b border-white/10">
        <span class="inline-flex items-center gap-1.5">
          <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          🇳🇬 Launching in Nigeria: Enugu & Lagos early access now open.
          <a href="#waitlist" class="underline ml-1 font-semibold text-emerald-300 hover:text-white">
            Join Waitlist &rarr;
          </a>
        </span>
      </div>

      {/* Main Sticky Header */}
      <header class="sticky top-0 z-30 border-b border-line bg-white/90 backdrop-blur-md">
        <div class={`${wrap} flex items-center justify-between py-3.5`}>
          {/* Logo */}
          <a class="inline-flex items-center gap-2.5 font-display text-xl font-bold text-ink group" href="#top">
            <span class="grid h-9 w-9 place-items-center rounded-xl bg-brand text-white shadow-md shadow-brand/25 transition-transform group-hover:scale-105">
              <Egg size={20} strokeWidth={2.5} />
            </span>
            <span>
              Flezible
              <span class="ml-1.5 rounded-full bg-brand-light px-2 py-0.5 text-[10px] font-bold text-brand uppercase tracking-wider">
                Marketplace
              </span>
            </span>
          </a>

          {/* Navigation Links */}
          <nav class="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600" aria-label="Main">
            <a class="hover:text-brand transition-colors" href="#how">
              How it works
            </a>
            <a class="hover:text-brand transition-colors" href="#audiences">
              Who it is for
            </a>
            <a class="hover:text-brand transition-colors" href="#pricing">
              Pricing
            </a>
            <a class="hover:text-brand transition-colors" href="#demo">
              Live Demo
            </a>
          </nav>

          {/* Header Action */}
          <div class="flex items-center gap-3">
            <a class={btnPrimary} href="#waitlist">
              <span>Join Waitlist</span>
              <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="top" class="flex-1">
        {/* Hero Section */}
        <section class="relative overflow-hidden bg-gradient-to-b from-white via-emerald-50/20 to-slate-50 pt-12 pb-20 md:pt-16 md:pb-28">
          {/* Subtle Ambient Mesh Blooms */}
          <div class="bg-grid-subtle absolute inset-0 pointer-events-none" aria-hidden="true" />
          <div
            class="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[56rem] -translate-x-1/2 rounded-full bg-emerald-300/15 blur-[120px]"
            aria-hidden="true"
          />
          <div
            class="pointer-events-none absolute top-1/2 -right-20 h-72 w-72 rounded-full bg-amber-300/15 blur-[110px]"
            aria-hidden="true"
          />

          <div class={`${wrap} relative grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]`}>
            {/* Left Hero Column */}
            <div>
              <div class="inline-flex items-center gap-2 rounded-full border border-emerald-300/60 bg-emerald-50/80 px-3.5 py-1 text-xs font-semibold text-emerald-800 shadow-xs">
                <span class="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Nigeria's Modern B2B Egg Distribution Platform
              </div>

              <h1 class="mt-5 font-display text-[clamp(2.4rem,5.6vw,4.1rem)] leading-[1.08] font-bold text-balance text-ink">
                Order fresh farm eggs by chat.{' '}
                <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-600">
                  Pay only when they arrive.
                </span>
              </h1>

              <p class="mt-5 max-w-[50ch] text-lg text-slate-600 leading-relaxed">
                Flezible connects commercial egg poultry farms and suppliers directly with bakeries, restaurants, and
                shops. Text your order, get matched with nearby verified farms, and enjoy 100% escrow protection.
              </p>

              {/* Value prop pills */}
              <div class="mt-6 grid grid-cols-2 gap-3 text-xs sm:text-sm text-slate-700 font-medium">
                <div class="flex items-center gap-2">
                  <span class="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <span>100% Escrow Protection</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <span>Photo Claim for Broken Eggs</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <span>30 Eggs Guaranteed / Crate</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="grid h-6 w-6 place-items-center rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <span>Direct Farm-Gate Wholesale</span>
                </div>
              </div>

              {/* Hero Action Buttons */}
              <div class="mt-8 flex flex-wrap items-center gap-4">
                <a class={btnPrimary} href="#waitlist">
                  Join Early Access Waitlist
                  <ArrowRight size={18} />
                </a>
                <a class={btnSecondary} href="#demo">
                  Try Interactive Demo
                </a>
              </div>

              {/* Social Proof Metric */}
              <div class="mt-8 flex items-center gap-3 pt-6 border-t border-line text-xs text-slate-500">
                <div class="flex -space-x-2">
                  <div class="grid h-8 w-8 place-items-center rounded-full bg-emerald-600 text-[11px] font-bold text-white ring-2 ring-white">
                    EB
                  </div>
                  <div class="grid h-8 w-8 place-items-center rounded-full bg-amber-600 text-[11px] font-bold text-white ring-2 ring-white">
                    PF
                  </div>
                  <div class="grid h-8 w-8 place-items-center rounded-full bg-slate-700 text-[11px] font-bold text-white ring-2 ring-white">
                    NH
                  </div>
                </div>
                <span>
                  Joining <strong>50+ bakeries & poultry farms</strong> on the early verification queue in Enugu & Lagos.
                </span>
              </div>
            </div>

            {/* Right Hero Column: Interactive Product Showcase */}
            <div id="demo">
              <InteractiveShowcase />
            </div>
          </div>
        </section>

        {/* Brand Metrics Strip */}
        <section class="border-y border-line bg-white py-10">
          <div class={wrap}>
            <div class="grid grid-cols-2 gap-6 md:grid-cols-4 text-center">
              <div>
                <p class="font-display text-3xl sm:text-4xl font-bold text-brand">30 Eggs</p>
                <p class="mt-1 text-xs sm:text-sm font-medium text-slate-500">Per Standard Crate</p>
              </div>
              <div>
                <p class="font-display text-3xl sm:text-4xl font-bold text-ink">100%</p>
                <p class="mt-1 text-xs sm:text-sm font-medium text-slate-500">Escrow Security on Orders</p>
              </div>
              <div>
                <p class="font-display text-3xl sm:text-4xl font-bold text-accent-deep">14 Days</p>
                <p class="mt-1 text-xs sm:text-sm font-medium text-slate-500">Free Supplier Trial</p>
              </div>
              <div>
                <p class="font-display text-3xl sm:text-4xl font-bold text-brand">0 Risk</p>
                <p class="mt-1 text-xs sm:text-sm font-medium text-slate-500">Instant Broken Egg Refunds</p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how" class="scroll-mt-16 py-16 md:py-24 bg-slate-50">
          <div class={wrap}>
            <div class="text-center max-w-[60ch] mx-auto">
              <p class={eyebrow}>
                <Clock size={14} /> Seamless Order Workflow
              </p>
              <h2 class={h2}>From chat message to bakery doorstep</h2>
              <p class="mt-3 text-base text-slate-600">
                Four clear steps engineered to remove supply headaches, price gouging, and cracked egg disputes.
              </p>
            </div>

            <div class="mt-12 grid gap-6 md:grid-cols-4">
              {STEPS.map((s) => {
                const Icon = s.icon
                return (
                  <div
                    key={s.num}
                    class="relative flex flex-col justify-between rounded-3xl border border-line bg-white p-6 shadow-xs transition-all duration-200 hover:shadow-md hover:-translate-y-1"
                  >
                    <div>
                      <div class="flex items-center justify-between">
                        <span class="grid h-12 w-12 place-items-center rounded-2xl bg-brand-light text-brand">
                          <Icon size={24} />
                        </span>
                        <span class="font-display text-2xl font-extrabold text-slate-300">{s.num}</span>
                      </div>

                      <h3 class="mt-5 font-display text-lg font-bold text-ink">{s.title}</h3>
                      <p class="mt-2 text-sm text-slate-600 leading-relaxed">{s.desc}</p>
                    </div>

                    <div class="mt-5 pt-4 border-t border-line">
                      <span class="text-xs font-semibold text-brand">{s.badge}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* Interactive Volume & Savings Calculator */}
        <CrateCalculator />

        {/* Who It Is For Section */}
        <section id="audiences" class="scroll-mt-16 py-16 md:py-24 bg-slate-50">
          <div class={wrap}>
            <div class="text-center max-w-[60ch] mx-auto">
              <p class={eyebrow}>
                <Users size={14} /> Ecosystem Participants
              </p>
              <h2 class={h2}>Built for every stakeholder in the egg crate</h2>
              <p class="mt-3 text-base text-slate-600">
                A unified marketplace uniting commercial layer farms, food businesses, and logistics operators.
              </p>
            </div>

            <div class="mt-12 grid gap-6 md:grid-cols-3">
              {AUDIENCES.map((a) => {
                const Icon = a.icon
                return (
                  <article
                    key={a.role}
                    class="flex flex-col justify-between rounded-3xl border border-line bg-white p-6 sm:p-8 shadow-xs transition-all duration-200 hover:shadow-lg"
                  >
                    <div>
                      <div class="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-white shadow-md shadow-brand/20">
                        <Icon size={24} />
                      </div>

                      <h3 class="mt-5 font-display text-xl font-bold text-ink">{a.role}</h3>
                      <p class="text-xs font-semibold text-brand mt-0.5">{a.sub}</p>

                      <ul class="mt-5 space-y-3 text-sm text-slate-600">
                        {a.points.map((p) => (
                          <li key={p} class="flex items-start gap-2.5">
                            <Check size={16} class="mt-0.5 shrink-0 text-emerald-600" strokeWidth={2.5} />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div class="mt-6 border-t border-line pt-4">
                      <p class="text-xs font-semibold text-ink bg-slate-50 p-3 rounded-xl border border-line">
                        "{a.highlight}"
                      </p>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <Pricing plans={plans} />

        {/* FAQ Section */}
        <FAQ />

        {/* High-Impact Dark Forest CTA & Waitlist Section */}
        <section
          id="waitlist"
          class="relative overflow-hidden bg-night py-16 text-white md:py-24 border-t border-emerald-950"
        >
          <div class="bg-grid-dark absolute inset-0 pointer-events-none" aria-hidden="true" />
          <div
            class="pointer-events-none absolute -bottom-36 left-1/2 h-80 w-[48rem] -translate-x-1/2 rounded-full bg-brand/30 blur-[130px]"
            aria-hidden="true"
          />

          <div class={`${wrap} relative`}>
            <div class="mx-auto max-w-2xl text-center">
              <span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/40">
                <Sparkles size={14} /> Be First in Line
              </span>

              <h2 class="mt-4 font-display text-[clamp(2rem,4.5vw,3.2rem)] font-bold text-balance leading-tight text-white">
                Secure your priority access when Flezible launches in your area
              </h2>

              <p class="mt-3 text-base text-white/75 max-w-[50ch] mx-auto">
                Join poultry farmers, commercial bakeries, and delivery riders already onboard for early activation in
                Enugu and Lagos.
              </p>
            </div>

            {/* Waitlist Form Card */}
            <div class="mt-10 mx-auto max-w-xl rounded-3xl bg-white p-6 sm:p-8 text-ink shadow-2xl shadow-black/50 border border-slate-100">
              <div class="border-b border-line pb-4 text-center">
                <h3 class="font-display text-xl font-bold text-ink">Join the Early Access List</h3>
                <p class="text-xs text-slate-500 mt-1">Free early onboarding. No commitment required.</p>
              </div>

              <WaitlistForm plans={plans} />
            </div>
          </div>
        </section>
      </main>

      {/* Modern Startup Footer */}
      <footer class="bg-night-dark border-t border-white/10 py-12 text-white/70 text-sm">
        <div class={wrap}>
          <div class="grid gap-8 sm:grid-cols-2 md:grid-cols-4 pb-10 border-b border-white/10">
            {/* Col 1 */}
            <div class="space-y-3">
              <div class="flex items-center gap-2 font-display text-lg font-bold text-white">
                <span class="grid h-7 w-7 place-items-center rounded-lg bg-brand text-white">
                  <Egg size={16} />
                </span>
                <span>Flezible</span>
              </div>
              <p class="text-xs text-white/60 leading-relaxed">
                Nigeria's B2B egg distribution marketplace. Connecting commercial poultry farms directly with food
                businesses through natural chat ordering and escrow security.
              </p>
              <div class="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/80 border border-white/10">
                <MapPin size={12} class="text-emerald-400" />
                <span>Enugu & Lagos, Nigeria</span>
              </div>
            </div>

            {/* Col 2 */}
            <div>
              <h4 class="text-xs font-bold uppercase tracking-wider text-white mb-3">Product</h4>
              <ul class="space-y-2 text-xs">
                <li>
                  <a href="#how" class="hover:text-white transition">
                    How Ordering Works
                  </a>
                </li>
                <li>
                  <a href="#demo" class="hover:text-white transition">
                    Interactive Order Demo
                  </a>
                </li>
                <li>
                  <a href="#pricing" class="hover:text-white transition">
                    Supplier Pricing Plans
                  </a>
                </li>
                <li>
                  <a href="#pricing" class="hover:text-white transition">
                    14-Day Free Trial
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 3 */}
            <div>
              <h4 class="text-xs font-bold uppercase tracking-wider text-white mb-3">Audience</h4>
              <ul class="space-y-2 text-xs">
                <li>
                  <a href="#audiences" class="hover:text-white transition">
                    Bakeries & Restaurants
                  </a>
                </li>
                <li>
                  <a href="#audiences" class="hover:text-white transition">
                    Commercial Poultry Farms
                  </a>
                </li>
                <li>
                  <a href="#audiences" class="hover:text-white transition">
                    Egg Distributors
                  </a>
                </li>
                <li>
                  <a href="#audiences" class="hover:text-white transition">
                    Logistics Partners
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 4 */}
            <div>
              <h4 class="text-xs font-bold uppercase tracking-wider text-white mb-3">Trust & Security</h4>
              <ul class="space-y-2 text-xs">
                <li class="flex items-center gap-1.5">
                  <Shield size={14} class="text-emerald-400" />
                  <span>Escrow Safe Settlement</span>
                </li>
                <li class="flex items-center gap-1.5">
                  <Camera size={14} class="text-emerald-400" />
                  <span>Photo Proof Protection</span>
                </li>
                <li class="flex items-center gap-1.5">
                  <Check size={14} class="text-emerald-400" />
                  <span>30 Eggs / Crate Standard</span>
                </li>
              </ul>
            </div>
          </div>

          <div class="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/50">
            <p>&copy; {new Date().getFullYear()} Flezible Platform. All rights reserved.</p>
            <p>Made with pride in Enugu, Nigeria 🇳🇬</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
