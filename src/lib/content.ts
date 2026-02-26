import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'
import remarkRehype from 'remark-rehype'
import rehypeRaw from 'rehype-raw'
import rehypeHighlight from 'rehype-highlight'
import rehypeStringify from 'rehype-stringify'

const CONTENT_DIR = path.join(process.cwd(), 'content')

export interface ArticleMeta {
  slug: string
  section: string          // directory name, e.g. "fundamentals"
  title: string
  excerpt: string
  isPremium: boolean
  order: number
  readingTime: number
  tags: string[]
  video?: string           // YouTube / any embed URL
  filePath: string
}

export interface Article extends ArticleMeta {
  contentHtml: string      // rendered HTML (only when authorized)
  rawContent: string       // raw markdown (never sent to client)
}

export interface Section {
  slug: string             // directory name
  name: string
  description: string
  icon: string
  order: number
  articles: ArticleMeta[]
}

// ─────────────────────────────────────────────
// Read all sections
// ─────────────────────────────────────────────
export function getAllSections(): Section[] {
  const dirs = fs.readdirSync(CONTENT_DIR).filter((d) => {
    const stat = fs.statSync(path.join(CONTENT_DIR, d))
    return stat.isDirectory()
  })

  const sections: Section[] = dirs.map((dir) => {
    const catFile = path.join(CONTENT_DIR, dir, '_category.json')
    const catMeta = JSON.parse(fs.readFileSync(catFile, 'utf8'))
    const articles = getArticlesForSection(dir)

    return {
      slug: dir,
      name: catMeta.name,
      description: catMeta.description,
      icon: catMeta.icon,
      order: catMeta.order,
      articles,
    }
  })

  return sections.sort((a, b) => a.order - b.order)
}

// ─────────────────────────────────────────────
// Read articles for a section (metadata only)
// ─────────────────────────────────────────────
export function getArticlesForSection(section: string): ArticleMeta[] {
  const sectionDir = path.join(CONTENT_DIR, section)
  const files = fs.readdirSync(sectionDir).filter(
    (f) => f.endsWith('.md') && !f.startsWith('_')
  )

  return files
    .map((file) => {
      const filePath = path.join(sectionDir, file)
      const raw = fs.readFileSync(filePath, 'utf8')
      const { data } = matter(raw)

      // slug = filename without extension and leading order prefix (e.g. "01-what-is-ai-agent")
      const slug = file.replace(/^\d+-/, '').replace(/\.md$/, '')

      return {
        slug,
        section,
        title: data.title || slug,
        excerpt: data.excerpt || '',
        isPremium: data.isPremium === true,
        order: data.order ?? 99,
        readingTime: data.readingTime ?? 5,
        tags: Array.isArray(data.tags) ? data.tags : [],
        video: data.video ?? undefined,
        filePath,
      } as ArticleMeta
    })
    .sort((a, b) => a.order - b.order)
}

// ─────────────────────────────────────────────
// Get all article slugs (for routing)
// ─────────────────────────────────────────────
export function getAllArticleSlugs(): { section: string; slug: string }[] {
  const sections = getAllSections()
  return sections.flatMap((s) =>
    s.articles.map((a) => ({ section: s.slug, slug: a.slug }))
  )
}

// ─────────────────────────────────────────────
// Find article by slug (searches all sections)
// ─────────────────────────────────────────────
export function findArticleFile(slug: string): { filePath: string; section: string } | null {
  const dirs = fs.readdirSync(CONTENT_DIR).filter((d) =>
    fs.statSync(path.join(CONTENT_DIR, d)).isDirectory()
  )

  for (const dir of dirs) {
    const sectionDir = path.join(CONTENT_DIR, dir)
    const files = fs.readdirSync(sectionDir).filter(
      (f) => f.endsWith('.md') && !f.startsWith('_')
    )
    for (const file of files) {
      const fileSlug = file.replace(/^\d+-/, '').replace(/\.md$/, '')
      if (fileSlug === slug) {
        return { filePath: path.join(sectionDir, file), section: dir }
      }
    }
  }
  return null
}

// ─────────────────────────────────────────────
// Get full article (with rendered content)
// Only call this AFTER auth check — never expose rawContent to client
// ─────────────────────────────────────────────
export async function getArticle(slug: string): Promise<Article | null> {
  const found = findArticleFile(slug)
  if (!found) return null

  const raw = fs.readFileSync(found.filePath, 'utf8')
  const { data, content } = matter(raw)

  const contentHtml = await renderMarkdown(content)

  return {
    slug,
    section: found.section,
    title: data.title || slug,
    excerpt: data.excerpt || '',
    isPremium: data.isPremium === true,
    order: data.order ?? 99,
    readingTime: data.readingTime ?? 5,
    tags: Array.isArray(data.tags) ? data.tags : [],
    video: data.video ?? undefined,
    filePath: found.filePath,
    contentHtml,
    rawContent: content, // ⚠️ never send to client
  }
}

// ─────────────────────────────────────────────
// Markdown → HTML renderer
// ─────────────────────────────────────────────
async function renderMarkdown(content: string): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)                  // tables, strikethrough, etc.
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)                  // allows raw HTML (e.g. <iframe> for video)
    .use(rehypeHighlight, { detect: true, ignoreMissing: true })
    .use(rehypeStringify)
    .process(content)

  return String(file)
}

// ─────────────────────────────────────────────
// Get next article in the same section
// ─────────────────────────────────────────────
export function getNextArticle(section: string, currentOrder: number): ArticleMeta | null {
  const articles = getArticlesForSection(section)
  return articles.find((a) => a.order > currentOrder) ?? null
}

// ─────────────────────────────────────────────
// Stats
// ─────────────────────────────────────────────
export function getStats() {
  const sections = getAllSections()
  const all = sections.flatMap((s) => s.articles)
  return {
    total: all.length,
    free: all.filter((a) => !a.isPremium).length,
    premium: all.filter((a) => a.isPremium).length,
    sections: sections.length,
  }
}
