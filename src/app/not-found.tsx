import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      <h1 className="text-5xl font-medium text-foreground mb-1">404</h1>
      <p className="text-sm text-muted mb-6">This page could not be found</p>
      <Link href="/">
        <Button size="sm">Back to home</Button>
      </Link>
    </div>
  )
}
