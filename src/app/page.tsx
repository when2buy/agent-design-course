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
            系统学习 AI Agent 开发
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="text-white">掌握</span>{' '}
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              AI Agent
            </span>
            <br />
            <span className="text-white">开发全栈技能</span>
          </h1>

          <p className="text-gray-400 text-xl mb-10 max-w-3xl mx-auto leading-relaxed">
            从第一性原理到生产级系统设计，四大专题带你从原理到面试全覆盖。
            MicroGPT · Agent 构建原则 · 设计模式 · 真实面试题库。
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/learn"
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 hover:shadow-lg hover:shadow-blue-500/25"
            >
              开始学习 →
            </Link>
            <Link
              href="/pricing"
              className="border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all"
            >
              查看订阅方案
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 mt-16">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{stats.total}+</div>
              <div className="text-gray-500 text-sm">精品文章</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{stats.sections}</div>
              <div className="text-gray-500 text-sm">核心主题</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{stats.free}</div>
              <div className="text-gray-500 text-sm">免费文章</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-gray-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-white mb-4">四大专题，全面覆盖</h2>
          <p className="text-gray-400 text-center mb-12">专为 AI 工程师设计的系统化学习路径——从原理到面试，一站搞定</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: '🧬', title: 'MicroGPT：从第一性原理出发', desc: '不背公式，不堆术语。从 Token 到 Attention 到 Agent Loop，用最直觉的方式讲清楚 AI 的底层原理。' },
              { icon: '🔩', title: 'Agent Building Principles', desc: 'Tool Use、MCP、Skill System、RAG、Memory、Planning——每个核心模式一篇深度文章，原理 + 代码 + 权衡。' },
              { icon: '🏗️', title: 'Agent Design Patterns', desc: '类比传统 System Design：CLI Agent、Personal Assistant、Data Pipeline……每个 Pattern 对应真实工程场景。' },
              { icon: '🎯', title: '真实面试题库（核心）', desc: '来自 OpenAI、Anthropic、Google DeepMind 的真实面试题，附完整设计方案与考官评分维度。拒绝刷题感，只讲真实考察。' },
              { icon: '🔒', title: '内容服务端严格保护', desc: 'Premium 内容在服务端验证，未订阅用户无法通过任何客户端手段获取正文。' },
              { icon: '🎬', title: '图文 + 视频双轨', desc: '每篇文章可附带讲解视频，结合代码示例，读完即可动手复现。' },
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
          <h2 className="text-3xl font-bold text-center text-white mb-4">课程大纲</h2>
          <p className="text-gray-400 text-center mb-12">{stats.sections} 大专题，{stats.total}+ 篇深度文章，{stats.free} 篇免费开放</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sections.map((section) => (
              <Link
                href={`/learn?section=${section.slug}`}
                key={section.slug}
                className="bg-gray-800/40 border border-gray-700/50 rounded-xl p-6 hover:border-blue-500/40 hover:bg-gray-800/70 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-3xl">{section.icon}</span>
                  <span className="text-xs text-gray-500 bg-gray-700/50 px-2 py-1 rounded-full">
                    {section.articles.length} 篇
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
            <h2 className="text-3xl font-bold text-white mb-4">准备好开始了吗？</h2>
            <p className="text-gray-400 mb-8">
              免费注册，立即访问基础内容。升级 Pro 解锁全部 {stats.total}+ 篇文章。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-semibold transition-all">免费注册</Link>
              <Link href="/pricing" className="border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white px-8 py-3 rounded-xl font-semibold transition-all">查看 Pro 方案</Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-800 py-8 px-4 text-center text-gray-600 text-sm">
        <p>© 2024 AI Agent 课程. 保留所有权利.</p>
      </footer>
    </div>
  )
}
