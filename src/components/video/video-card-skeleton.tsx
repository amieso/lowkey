import { Skeleton } from '@/components/ui/skeleton'

export function VideoCardSkeleton() {
  return (
    <div>
      <div className="aspect-video overflow-hidden rounded-lg border border-border">
        <Skeleton className="h-full w-full" />
      </div>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div className="flex-1">
          <Skeleton className="h-4 w-24 mb-1.5" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  )
}
