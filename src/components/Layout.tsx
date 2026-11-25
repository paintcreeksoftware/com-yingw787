import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 flex justify-center sm:px-8">
        <div className="flex w-full max-w-7xl lg:px-8">
          <div className="w-full bg-white ring-1 ring-zinc-100 dark:bg-zinc-900 dark:ring-zinc-300/20" />
        </div>
      </div>
      <div className="relative flex w-full flex-col">
        <a
          href="#main-content"
          className="sr-only z-10 rounded-md bg-zinc-900 font-medium text-white focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:outline-2 focus:outline-offset-2 focus:outline-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 dark:focus:outline-zinc-100"
        >
          Skip to content
        </a>
        <Header />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-auto focus:outline-none"
        >
          {children}
        </main>
        <Footer />
      </div>
    </>
  )
}
