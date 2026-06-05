import Link from 'next/link'

interface CompanyLinkProps {
  company: string // display label
  companySlug: string // stable URL key from the video data
  className?: string
  onClick?: (e: React.MouseEvent) => void
  children?: React.ReactNode
}

export function CompanyLink({ company, companySlug, className, onClick, children }: CompanyLinkProps) {
  return (
    <Link
      href={`/${companySlug}`}
      onClick={onClick}
      className={className}
    >
      {children || company}
    </Link>
  )
}
