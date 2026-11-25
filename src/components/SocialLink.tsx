import React from 'react'

import Link from 'next/link'

export function SocialLink({
  icon: Icon,
  label,
  ...props
}: React.ComponentPropsWithoutRef<typeof Link> & {
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <Link
      className="group inline-flex min-h-11 max-w-full items-center gap-2 px-3 max-lg:rounded-full max-lg:bg-zinc-50 max-lg:py-2 max-lg:ring-1 max-lg:ring-zinc-200 max-lg:ring-inset max-lg:hover:bg-zinc-100 lg:-m-1 lg:block lg:min-h-0 lg:p-1 dark:max-lg:bg-zinc-800/50 dark:max-lg:ring-white/10 dark:max-lg:hover:bg-zinc-800"
      {...props}
    >
      <Icon className="size-4 shrink-0 fill-zinc-500 transition group-hover:fill-zinc-600 lg:size-6 dark:fill-zinc-400 dark:group-hover:fill-zinc-300" />
      <span className="min-w-0 text-xs font-medium text-zinc-700 lg:hidden dark:text-zinc-200">
        {label}
      </span>
    </Link>
  )
}
