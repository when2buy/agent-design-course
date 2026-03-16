import Link from 'next/link'
import { getAllSections, getStats } from '@/lib/content'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  const sections = getAllSections()
  const stats = getStats()

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden py-24 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-purple-900/20" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm px-4 py-1.5 rounded-full mb-6">
            <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            Systematic AI Agent Engineering
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="text-white">Master</span>{' '}
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              AI Agent
            </span>
            <br />
            <span className="text-white">Design & Engineering</span>
          </h1>

          <p className="text-gray-400 text-xl mb-10 max-w-3xl mx-auto leading-relaxed">
            From first principles to production-grade system design — four tracks covering
            MicroGPT · Agent Principles · Design Patterns · Real Interview Questions.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/learn"
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25"
            >
              Start Learning →
            </Link>
            <Link
              href="/pricing"
              className="border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all"
            >
              View Plans
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{stats.total}+</div>
              <div className="text-gray-500 text-sm">In-depth Articles</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{stats.sections}</div>
              <div className="text-gray-500 text-sm">Core Tracks</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{stats.free}</div>
              <div className="text-gray-500 text-sm">Free Articles</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-4">Four Tracks, Full Coverage</h2>
          <p className="text-gray-400 text-center mb-12">A systematic learning path for AI engineers — from first principles to interview-ready</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '🧬', title: 'MicroGPT: First Principles', desc: 'No formulas, no jargon. From tokens to attention to the agent loop — understand how AI actually works at an intuitive level.' },
              { icon: '🔩', title: 'Agent Building Principles', desc: 'Tool Use, MCP, Skill Systems, RAG, Memory, Planning — one deep-dive article per pattern, covering theory, code, and tradeoffs.' },
              { icon: '🏗️', title: 'Agent Design Patterns', desc: 'System design for the AI era: CLI Agent, Personal Assistant, Data Pipeline, Code Review Bot — every pattern maps to a real engineering scenario.' },
              { icon: '🎯', title: 'Real Interview Questions (Core)', desc: 'Actual questions from OpenAI, Anthropic, Google DeepMind, and Meta AI — with complete design solutions and examiner scoring rubrics.' },
              { icon: '🔒', title: 'Server-Side Content Protection', desc: 'Premium content is verified server-side and never sent to the client. No client-side trick can bypass it.' },
              { icon: '🎬', title: 'Text + Video', desc: 'Each article optionally includes a walkthrough video. Read + watch + practice — then ship.' },
            ].map((f) => (
              <div key={f.title} className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 hover:border-blue-500/30 transition-all group">
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">{f.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Course Topics */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-4">Curriculum</h2>
          <p className="text-gray-400 text-center mb-12">{stats.sections} tracks · {stats.total}+ articles · {stats.free} free</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {sections.map((section) => (
              <Link
                href={`/learn?section=${section.slug}`}
                key={section.slug}
                className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 hover:border-blue-500/40 hover:bg-gray-800/70 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{section.icon}</span>
                  <span className="text-xs text-gray-500 bg-gray-700/50 px-2 py-1 rounded-full">
                    {section.articles.length} articles
                  </span>
                </div>
                <h3 className="font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  {section.name}
                </h3>
                <p className="text-gray-500 text-sm">{section.description}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/20 rounded-2xl p-12">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
            <p className="text-gray-400 mb-8">
              Sign up free to access all free content. Upgrade to Pro to unlock all {stats.total}+ articles.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-semibold transition-all">Sign Up Free</Link>
              <Link href="/pricing" className="border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white px-8 py-3 rounded-xl font-semibold transition-all">View Pro Plan</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-800 py-8 px-4 text-center text-gray-600 text-sm">
        <p>© 2024 Agent Design Course. All rights reserved.</p>
      </footer>
    </div>
  )
}
