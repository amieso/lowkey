import Link from 'next/link'
import { companySlug } from '@/lib/utils'

interface CompanyLinkProps {
  company: string
  className?: string
  onClick?: (e: React.MouseEvent) => void
  children?: React.ReactNode
}

export function CompanyLink({ company, className, onClick, children }: CompanyLinkProps) {
  return (
    <Link
      href={`/company/${companySlug(company)}`}
      onClick={onClick}
      className={className}
    >
      {children || company}
    </Link>
  )
}
