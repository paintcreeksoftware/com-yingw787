import { Container } from '@/components/Container'

export default function Home() {
  return (
    <Container className="mt-9">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-800 sm:text-5xl dark:text-zinc-100">
          Nice to meet you. How can I help?
        </h1>
        <p className="mt-6 text-base text-zinc-600 dark:text-zinc-400">
          I&apos;m Ying, a software engineer and founder based near Washington,
          D.C. I like creating quality software products that people are happy
          to use, and that coincidentally make companies lots of money.
        </p>
      </div>
    </Container>
  )
}
