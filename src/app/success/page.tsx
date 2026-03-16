import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Animated checkmark */}
        <div className="w-24 h-24 mx-auto mb-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
          <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">You&apos;re Pro now! 🎉</h1>
        <p className="text-gray-400 mb-2">Welcome to Pro — thanks for your support!</p>
        <p className="text-gray-500 text-sm mb-10">
          You now have full access to all premium articles, video walkthroughs, and interview solutions.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/learn"
            className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-semibold transition-all"
          >
            Start Learning →
          </Link>
          <Link
            href="/dashboard"
            className="border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white px-8 py-3 rounded-xl font-semibold transition-all"
          >
            Go to Dashboard
          </Link>
        </div>

        <p className="text-gray-600 text-xs mt-8">
          A confirmation email has been sent to your inbox. Contact us if you have any questions.
        </p>
      </div>
    </div>
  )
}
