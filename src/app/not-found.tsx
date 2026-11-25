import type { Metadata } from 'next'
import Link from 'next/link'

import { Container } from '@/components/Container'

export const metadata: Metadata = {
  title: 'Page not found',
}

export default function NotFound() {
  return (
    <Container data-not-found className="py-2">
      <div className="flex flex-col items-center">
        <p className="text-base font-semibold text-zinc-500 dark:text-zinc-400">
          404
        </p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-800 sm:text-5xl dark:text-zinc-100">
          Page not found
        </h1>
        <p className="mt-4 text-center text-base text-zinc-600 dark:text-zinc-400">
          Sorry, we couldn’t find the page you’re looking for.
        </p>
        <Link
          href="/"
          prefetch={false}
          className="mt-4 inline-flex items-center justify-center gap-2 rounded-md border border-zinc-500 bg-zinc-50 px-3 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 active:bg-zinc-100 active:text-zinc-900/60 active:transition-none dark:bg-zinc-800/50 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-zinc-50 dark:focus-visible:outline-zinc-100 dark:active:bg-zinc-800/50 dark:active:text-zinc-50/70 forced-colors:border-[ButtonText]"
        >
          Go back home
        </Link>
      </div>
    </Container>
  )
}
