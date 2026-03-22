'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, BuildLog } from '@/lib/supabase'

const YOUR_NAME = 'Varun Malani'

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

function Avatar() {
  return (
    <div
      style={{ background: '#a3e635' }}
      className="w-[34px] h-[34px] rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-black select-none mt-px"
    >
      VM
    </div>
  )
}

function Card({ post }: { post: BuildLog }) {
  return (
    <div
      style={{
        backgroundColor: '#111111',
        border: '1px solid #1e1e1e',
        transition: 'border-color 0.15s',
      }}
      className="rounded-[10px] px-4 py-3.5 flex gap-3 hover:[border-color:#a3e63530]"
    >
      <Avatar />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[13px] font-semibold" style={{ color: '#e8e8e8' }}>
            {post.name}
          </span>
          <span className="text-[11px] flex-shrink-0 ml-3" style={{ color: '#303030' }}>
            {timeAgo(post.created_at)}
          </span>
        </div>
        <p className="text-[13px] leading-[1.55] mb-2" style={{ color: '#606060' }}>
          {post.description}
        </p>
        {post.project_link && (
          <a
            href={post.project_link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold hover:underline"
            style={{ color: '#a3e635' }}
          >
            View Project
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
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
    if (!description.trim()) return

    setSubmitting(true)
    setError(null)

    const { error: err } = await supabase.from('build_logs').insert({
      name: YOUR_NAME,
      description: description.trim(),
      project_link: projectLink.trim() || null,
    })

    if (err) {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
      return
    }

    setDescription('')
    setProjectLink('')
    setSubmitting(false)
    fetchPosts()
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0c0c0c' }}>
      <div className="max-w-[600px] mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-baseline justify-between mb-1">
            <h1
              className="text-[22px] font-bold tracking-tight"
              style={{
                background: 'linear-gradient(90deg, #e8e8e8 0%, #a3e635 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Build Log
            </h1>
            {posts.length > 0 && (
              <span className="text-[11px]" style={{ color: '#404040' }}>
                {posts.length} thing{posts.length === 1 ? '' : 's'} shipped
              </span>
            )}
          </div>
          <p className="text-[12px]" style={{ color: '#404040' }}>
            What did you ship?
          </p>
        </div>

        <div className="h-px mb-6" style={{ background: '#1e1e1e' }} />

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-[10px] p-4 mb-8"
          style={{ background: '#111111', border: '1px solid #1e1e1e' }}
        >
          <div className="flex gap-2.5 mb-2.5">
            <div className="flex flex-col gap-1" style={{ flex: '0 0 180px' }}>
              <label className="text-[10px] font-medium uppercase tracking-widest" style={{ color: '#404040' }}>
                Project link <span style={{ color: '#2a2a2a', textTransform: 'none', letterSpacing: 0 }}>optional</span>
              </label>
              <input
                type="url"
                value={projectLink}
                onChange={(e) => setProjectLink(e.target.value)}
                placeholder="https://..."
                className="rounded-md px-2.5 py-2 text-[13px] outline-none transition"
                style={{
                  background: '#0c0c0c',
                  border: '1px solid #242424',
                  color: '#e8e8e8',
                }}
                onFocus={e => e.target.style.borderColor = '#a3e635'}
                onBlur={e => e.target.style.borderColor = '#242424'}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1 mb-3">
            <label className="text-[10px] font-medium uppercase tracking-widest" style={{ color: '#404040' }}>
              What did you ship?
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Built something. Learned something. Shipped something..."
              required
              rows={3}
              className="rounded-md px-2.5 py-2 text-[13px] outline-none transition"
              style={{
                background: '#0c0c0c',
                border: '1px solid #242424',
                color: '#e8e8e8',
                resize: 'none',
              }}
              onFocus={e => e.target.style.borderColor = '#a3e635'}
              onBlur={e => e.target.style.borderColor = '#242424'}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px]" style={{ color: '#2a2a2a' }}>
              Posting as <span style={{ color: '#404040' }}>{YOUR_NAME}</span>
            </span>
            <button
              type="submit"
              disabled={submitting || !description.trim()}
              className="rounded-md px-4 py-2 text-[12px] font-bold tracking-wide transition disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: '#a3e635', color: '#0c0c0c' }}
            >
              {submitting ? 'Posting…' : 'Post it →'}
            </button>
          </div>

          {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}
        </form>

        {/* Feed */}
        {posts.length > 0 && (
          <div
            className="text-[10px] font-semibold uppercase tracking-widest mb-3"
            style={{ color: '#303030' }}
          >
            Recent ships
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          {posts.length === 0 ? (
            <p className="text-center py-12 text-[13px]" style={{ color: '#303030' }}>
              Nothing shipped yet. You go first.
            </p>
          ) : (
            posts.map((post) => <Card key={post.id} post={post} />)
          )}
        </div>

      </div>
    </div>
  )
}
