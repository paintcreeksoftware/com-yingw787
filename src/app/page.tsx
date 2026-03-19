import Image from 'next/image'
import {
  FaLinkedin,
  FaGithub,
  FaPersonHiking,
  FaPersonWalkingLuggage,
} from 'react-icons/fa6'

import { Container } from '@/components/Container'
import { SocialLink } from '@/components/SocialLink'

import portraitImage from '@/images/portrait.jpeg'

export default function Home() {
  return (
    <Container className="mt-16 sm:mt-32">
      <div className="grid grid-cols-1 gap-y-16 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-y-12">
        <div className="lg:pl-20">
          <div className="max-w-xs px-2.5 lg:max-w-none">
            <Image
              src={portraitImage}
              alt=""
              sizes="(min-width: 1024px) 32rem, 20rem"
              className="aspect-square rotate-3 rounded-2xl bg-zinc-100 object-cover dark:bg-zinc-800"
            />
          </div>
        </div>
        <div className="lg:order-first lg:row-span-2">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-800 sm:text-5xl dark:text-zinc-100">
            Nice to meet you! How can I help?
          </h1>
          <div className="mt-6 space-y-7 text-base text-zinc-600 dark:text-zinc-400">
            I&apos;m Ying, a software engineer and founder based near
            Washington, D.C. I like creating quality software products that
            people are happy to use, and that coincidentally make companies lots
            of money.
          </div>
          <div className="mt-6 flex gap-6">
            {/* eslint-disable @typescript-eslint/no-unsafe-assignment */}
            <SocialLink
              href="https://github.com/yingw787"
              aria-label="Follow on GitHub"
              icon={FaGithub}
            />
            <SocialLink
              href="https://linkedin.com/in/yingw787"
              aria-label="Follow on LinkedIn"
              icon={FaLinkedin}
            />
            <SocialLink
              href="https://blog.yingw787.com"
              aria-label="Personal Blog"
              icon={FaPersonHiking}
            />
            <SocialLink
              href="https://bytes.yingw787.com"
              aria-label="Professional Blog"
              icon={FaPersonWalkingLuggage}
            />
            {/* eslint-enable @typescript-eslint/no-unsafe-assignment */}
          </div>
        </div>
      </div>
    </Container>
  )
}
