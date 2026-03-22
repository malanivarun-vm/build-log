'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, BuildLog } from '@/lib/supabase'

function timeAgo(dateStr: string): string {
  const now = new Date()
  const date = new Date(dateStr)
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')
}

const AVATAR_COLORS = [
  '#7c5cfc', '#e05cfc', '#fc5c7d', '#fc8c5c',
  '#5caafc', '#5cfcca', '#fcdc5c', '#a0fc5c',
]

function avatarColor(name: string): string {
  let hash = 0
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffffffff
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function Avatar({ name }: { name: string }) {
  const bg = avatarColor(name)
  return (
    <div
      style={{ backgroundColor: bg }}
      className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold text-white select-none"
    >
      {getInitials(name)}
    </div>
  )
}

function Card({ post }: { post: BuildLog }) {
  return (
    <div
      style={{
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
      }}
      className="rounded-xl p-5 flex gap-4"
    >
      <Avatar name={post.name} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <span className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
            {post.name}
          </span>
          <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
            {timeAgo(post.created_at)}
          </span>
        </div>
        <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
          {post.description}
        </p>
        {post.project_link && (
          <a
            href={post.project_link}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--accent)' }}
            className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
          >
            View Project
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 10L10 2M10 2H4M10 2V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </a>
        )}
      </div>
    </div>
  )
}

export default function BuildLogApp({ initialPosts }: { initialPosts: BuildLog[] }) {
  const [posts, setPosts] = useState<BuildLog[]>(initialPosts)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [projectLink, setProjectLink] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from('build_logs')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setPosts(data)
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('build_logs_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'build_logs' }, () => {
        fetchPosts()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchPosts])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !description.trim()) return

    setSubmitting(true)
    setError(null)

    const payload = {
      name: name.trim(),
      description: description.trim(),
      project_link: projectLink.trim() || null,
    }

    const { error: err } = await supabase.from('build_logs').insert(payload)

    if (err) {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
      return
    }

    setName('')
    setDescription('')
    setProjectLink('')
    setSubmitting(false)
    fetchPosts()
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-1" style={{ color: 'var(--text-primary)' }}>
            Build Log
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Ship something. Tell everyone.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
          }}
          className="rounded-xl p-6 mb-8 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Your name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
              required
              style={{
                backgroundColor: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--text-primary)',
              }}
              className="rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#7c5cfc] focus:border-transparent placeholder:text-[#444460] transition"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              What did you ship?
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Built a dark-mode build log for my PM cohort using Next.js and Supabase..."
              required
              rows={3}
              style={{
                backgroundColor: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--text-primary)',
                resize: 'vertical',
              }}
              className="rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#7c5cfc] focus:border-transparent placeholder:text-[#444460] transition"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Project link{' '}
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              type="url"
              value={projectLink}
              onChange={(e) => setProjectLink(e.target.value)}
              placeholder="https://..."
              style={{
                backgroundColor: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                color: 'var(--text-primary)',
              }}
              className="rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#7c5cfc] focus:border-transparent placeholder:text-[#444460] transition"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !name.trim() || !description.trim()}
            style={{ backgroundColor: 'var(--accent)' }}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#6b4de6] disabled:opacity-40 disabled:cursor-not-allowed transition self-end min-w-[100px]"
          >
            {submitting ? 'Posting…' : 'Post it'}
          </button>
        </form>

        {/* Feed */}
        <div className="flex flex-col gap-3">
          {posts.length === 0 ? (
            <p className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>
              No posts yet. Be the first to ship something.
            </p>
          ) : (
            posts.map((post) => <Card key={post.id} post={post} />)
          )}
        </div>
      </div>
    </div>
  )
}
