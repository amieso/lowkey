'use client'

import { Heart } from 'lucide-react'
import { Video } from '@/types/video'
import { getCommentsForVideo } from '@/data/comments'

interface CommentsModeProps {
  video: Video
}

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getAvatarColor(name: string): string {
  const colors = [
    'bg-blue-500/20 text-blue-400',
    'bg-purple-500/20 text-purple-400',
    'bg-green-500/20 text-green-400',
    'bg-orange-500/20 text-orange-400',
    'bg-pink-500/20 text-pink-400',
    'bg-cyan-500/20 text-cyan-400',
  ]
  const index = name.length % colors.length
  return colors[index]
}

export function CommentsMode({ video }: CommentsModeProps) {
  const comments = getCommentsForVideo(video.id)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-6">
        <p className="text-xs text-muted font-mono uppercase tracking-widest mb-2.5">
          {video.company}
        </p>
        <h2 className="text-xl font-medium text-foreground leading-tight tracking-tight">
          Comments
        </h2>
        <p className="text-sm text-muted mt-1">
          {comments.length} comment{comments.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Comment input placeholder */}
      <div className="mb-6">
        <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <span className="text-xs text-muted">You</span>
          </div>
          <input
            type="text"
            placeholder="Add a comment..."
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted/50 outline-none"
            disabled
          />
        </div>
      </div>

      {/* Comments list */}
      {comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-32 text-muted">
          <p className="text-sm">No comments yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              {/* Avatar */}
              {comment.avatarUrl ? (
                <img
                  src={comment.avatarUrl}
                  alt={comment.author}
                  className="w-8 h-8 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${getAvatarColor(comment.author)}`}>
                  <span className="text-xs font-medium">{getInitials(comment.author)}</span>
                </div>
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">
                    {comment.author}
                  </span>
                  <span className="text-xs text-muted/50">
                    {formatRelativeTime(comment.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-muted leading-relaxed">
                  {comment.text}
                </p>
                <div className="flex items-center gap-4 mt-2">
                  <button className="flex items-center gap-1.5 text-muted/60 hover:text-foreground transition-colors group">
                    <Heart className="w-3.5 h-3.5 group-hover:fill-current" />
                    <span className="text-xs">{comment.likes}</span>
                  </button>
                  <button className="text-xs text-muted/60 hover:text-foreground transition-colors">
                    Reply
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
