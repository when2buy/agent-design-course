'use client'
import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const features = {
  free: [
    'Access all free articles',
    'MicroGPT fundamentals',
    'Agent loop & ReAct intro',
    'CLI Agent series (free chapters)',
    'Interview question overviews',
  ],
  pro: [
    '✨ Everything in Free',
    'All premium articles',
    'Video walkthrough per article',
    'Tool design best practices',
    'Advanced planning (ToT, LATS)',
    'Multi-agent system architecture',
    'MCP deep dive',
    'Skill System & RAG patterns',
    'Production deployment guide',
    'Full interview solutions + scoring',
    'Code examples & downloadable notes',
    'Early access to new content',
    'Priority support',
  ],
}

export default function PricingPage({
  searchParams,
}: {
  searchParams?: { cancelled?: string }
}) {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isPro = session?.user?.subscriptionStatus === 'pro'

  async function handleCheckout() {
    if (!session) {
      router.push('/register?redirect=/pricing')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to create checkout session. Please try again.')
        return
      }

      window.location.href = data.url
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePortal() {
    setLoading(true)
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    setLoading(false)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">Choose Your Plan</h1>
        <p className="text-gray-400 text-lg">Start free, upgrade anytime. Annual subscription, cancel whenever.</p>
      </div>

      {/* Cancelled notice */}
      {searchParams?.cancelled && (
        <div className="mb-8 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-6 py-4 rounded-xl text-center text-sm">
          Checkout cancelled. No charge was made. Feel free to reach out if you have questions.
        </div>
      )}

      {error && (
        <div className="mb-8 bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-xl text-center text-sm">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Free */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-2xl p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-2">Free</h2>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-white">$0</span>
              <span className="text-gray-500">/ forever</span>
            </div>
          </div>
          <ul className="space-y-3 mb-8">
            {features.free.map((f) => (
              <li key={f} className="flex items-center gap-3 text-gray-300 text-sm">
                <span className="text-green-400 shrink-0">✓</span>{f}
              </li>
            ))}
          </ul>
          {!session ? (
            <Link href="/register" className="block text-center border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white py-3 rounded-xl font-semibold transition-all">
              Sign Up Free
            </Link>
          ) : isPro ? (
            <div className="text-center text-gray-500 py-3 text-sm">Included in Pro</div>
          ) : (
            <div className="text-center text-green-400 py-3 text-sm font-medium">✓ Current plan</div>
          )}
        </div>

        {/* Pro */}
        <div className="relative bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-2 border-blue-500/50 rounded-2xl p-8">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold px-4 py-1 rounded-full">
              Most Popular
            </span>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold text-white mb-2">Pro</h2>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-white">$39</span>
              <span className="text-gray-400">/ year</span>
            </div>
            <p className="text-gray-500 text-sm mt-1">~$3.25/mo · Secure payment via Stripe</p>
          </div>

          <ul className="space-y-3 mb-8">
            {features.pro.map((f) => (
              <li key={f} className="flex items-center gap-3 text-gray-200 text-sm">
                <span className={f.startsWith('✨') ? 'text-yellow-400 shrink-0' : 'text-blue-400 shrink-0'}>
                  {f.startsWith('✨') ? '✨' : '✓'}
                </span>
                {f.startsWith('✨') ? f.slice(2) : f}
              </li>
            ))}
          </ul>

          {isPro ? (
            <div className="space-y-3">
              <div className="text-center text-green-400 py-2 font-medium">✓ Current plan</div>
              <button
                onClick={handlePortal}
                disabled={loading}
                className="w-full border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50"
              >
                {loading ? 'Redirecting...' : 'Manage subscription'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 disabled:opacity-50 text-white py-3 rounded-xl font-bold text-lg transition-all transform hover:scale-105"
            >
              {loading ? 'Redirecting to Stripe...' : session ? 'Upgrade to Pro ✨' : 'Sign up & upgrade'}
            </button>
          )}

          {/* Stripe trust badge */}
          <div className="flex items-center justify-center gap-2 mt-4 text-gray-600 text-xs">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M10.9 2.1L4.5 5.5C3.6 6 3 6.9 3 7.9v8.2c0 1 .6 1.9 1.5 2.4l6.4 3.4c.9.5 2 .5 2.9 0l6.4-3.4c.9-.5 1.5-1.4 1.5-2.4V7.9c0-1-.6-1.9-1.5-2.4L13.8 2.1c-.9-.5-2-.5-2.9 0z"/>
            </svg>
            Secured by Stripe
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-20 max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold text-white text-center mb-8">FAQ</h2>
        <div className="space-y-4">
          {[
            { q: 'What payment methods are accepted?', a: 'Credit and debit cards (Visa, Mastercard, Amex, and more) via Stripe. Your payment info never touches our servers.' },
            { q: 'Can premium content really not be bypassed?', a: 'Yes. Content is gated server-side and never sent to the browser. No dev tools trick can retrieve it.' },
            { q: 'Can I get a refund?', a: 'We offer a 7-day no-questions-asked refund. Just email us and Stripe will process the refund to your original payment method.' },
            { q: 'What happens when my subscription expires?', a: 'It auto-renews annually. You can cancel anytime in the Stripe customer portal — you keep access until the end of the current period.' },
          ].map((item) => (
            <div key={item.q} className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-5">
              <h3 className="font-semibold text-white mb-2">{item.q}</h3>
              <p className="text-gray-400 text-sm">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
