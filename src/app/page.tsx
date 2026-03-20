import Image, { type StaticImageData } from 'next/image'
import {
  FaLinkedin,
  FaGithub,
  FaPersonHiking,
  FaPersonWalkingLuggage,
} from 'react-icons/fa6'

import { Container } from '@/components/Container'
import { SocialLink } from '@/components/SocialLink'
import { TestimonialSection } from '@/components/TestimonialSection'

import portraitImage from '@/images/portrait.jpeg'
import MikeEshelman from '@/images/picture_mike_eshelman.jpeg'
import AlanMcKellar from '@/images/picture_alan_mckellar.png'
import MikeSpainhower from '@/images/picture_mike_spainhower.jpg'
import DefaultAvatar from '@/images/picture_default_avatar.jpg'

interface TestimonialQuote {
  id: string
  quote: React.ReactNode
  avatarImage: StaticImageData
  name?: React.ReactNode
  role?: React.ReactNode
}

const testimonials: TestimonialQuote[] = [
  {
    id: 'mike-eshelman',
    quote: (
      <>
        Ying is an incredible talent. The first time we met in Q3 2023, I had
        mentioned a few things about the mortgage industry, and how consumers
        had limited access to understanding a certain topic. Within 3 days, he
        had a working OpenAI ChatGPT persona trained and running on a site that
        blew me away. He has an entrepreneurial spirit, strong work ethic, and a
        desire to continue learning which is a fantastic recipe for success.
      </>
    ),
    avatarImage: MikeEshelman,
    name: (
      <a href="https://www.linkedin.com/in/eshelman" className="text-blue-600">
        Mike Eshelman
      </a>
    ),
    role: <>fmr. CMO of Mr.Cooper (acq. Rocket Mortgage)</>,
  },
  {
    id: 'alan-mckellar',
    quote: (
      <>
        You want the data engineering job done right? You want Ying. He is the
        consummate professional who seeks to understand his customer&apos;s
        needs and then implement innovative solutions. What I really enjoyed
        about working with Ying is that I knew I could provide some high-level
        requirements and step away to focus on other items. He always delivered
        for me and my teams.
      </>
    ),
    avatarImage: AlanMcKellar,
    name: (
      <a
        href="https://www.linkedin.com/in/alanmckellar"
        className="text-blue-600"
      >
        Alan McKellar
      </a>
    ),
    role: <>fmr. VP of Engineering at Janus Health</>,
  },
  {
    id: 'mike-spainhower',
    quote: (
      <>
        Initially, I had concerns about our acquisition channel reporting
        pipeline, which had been experiencing frequent downtime. This hindered
        our ability to effectively measure, improve, and scale our acquisition
        channels. However, Ying stepped in and implemented measures to
        strengthen the pipelines, thereby ensuring that the business could
        depend on accurate and timely acquisition channel data. I was
        particularly impressed by the level of engagement that Ying brought to
        the project, collaborating with stakeholders to ensure that their needs
        were met. Ying&apos;s ability to work seamlessly across functions and
        effectively apply technology to solve complex business issues is a
        testament to his exceptional engineering skills.
      </>
    ),
    avatarImage: MikeSpainhower,
    name: (
      <a
        href="https://www.linkedin.com/in/spainhower"
        className="text-blue-600"
      >
        Mike Spainhower
      </a>
    ),
    role: <>fmr. CTO of Caribou</>,
  },
  {
    id: 'vp-acquisition-marketing',
    quote: (
      <>
        The reason this [project] was one of the more seamless integrations I’ve
        worked on is because of good attitudes from you and others and the
        willingness to come back to the table over and over again and clarify
        things through dialogue. A lot of companies never make it this far,
        they&apos;re stuck with [legacy solutions].
      </>
    ),
    avatarImage: DefaultAvatar,
    role: <>VP of Acquisition Marketing, Series F security startup</>,
  },
  {
    id: 'lihan-zhang',
    quote: (
      <>
        As a former direct report to Ying, I am extremely grateful for the
        opportunity to have worked with him. Ying is laser-focused on delivering
        high-quality results for the business while also understanding the
        importance of seeing people as people. He genuinely cares about the
        well-being of his team and is a strong champion of both their
        professional and personal growth. I can say wholeheartedly that I would
        not be the engineer I am today without his guidance.
      </>
    ),
    avatarImage: DefaultAvatar,
    name: (
      <a
        href="https://www.linkedin.com/in/lihan-zhang-3b24a594"
        className="text-blue-600"
      >
        Lihan Zhang
      </a>
    ),
  },
]

export default function Home() {
  return (
    <div>
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
              people are happy to use, and that coincidentally make companies
              lots of money.
            </div>
            <div className="mt-6 flex gap-6">
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
            </div>
          </div>
        </div>
      </Container>
      <Container>
        {testimonials.map((testimonial) => {
          return (
            <TestimonialSection
              key={testimonial.id}
              quote={testimonial.quote}
              avatarImage={testimonial.avatarImage}
              name={testimonial.name}
              role={testimonial.role}
            />
          )
        })}
      </Container>
    </div>
  )
}
