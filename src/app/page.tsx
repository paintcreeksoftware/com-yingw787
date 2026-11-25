import {
  FaLinkedin,
  FaGithub,
  FaPersonHiking,
  FaPersonWalkingLuggage,
  FaEnvelope,
} from 'react-icons/fa6'

import { Container } from '@/components/Container'
import { SocialLink } from '@/components/SocialLink'
import {
  TestimonialSection,
  type Testimonial,
} from '@/components/TestimonialSection'

import portrait300Jpeg from '@/images/portrait/portrait-300.jpeg'
import portrait420Jpeg from '@/images/portrait/portrait-420.jpeg'
import portrait600Jpeg from '@/images/portrait/portrait-600.jpeg'
import portrait900Jpeg from '@/images/portrait/portrait-900.jpeg'
import portrait1260Jpeg from '@/images/portrait/portrait-1260.jpeg'
import MikeEshelman from '@/images/picture_mike_eshelman.webp'
import AlanMcKellar from '@/images/picture_alan_mckellar.webp'
import MikeSpainhower from '@/images/picture_mike_spainhower.webp'

const portraitSizes =
  '(min-width: 78rem) 25.75rem, (min-width: 64rem) calc(50vw - 13.25rem), (min-width: 22rem) 18.75rem, calc(100vw - 3.25rem)'

const portraitAvifVariants = [
  [new URL('../images/portrait/portrait-300.avif', import.meta.url), 300],
  [new URL('../images/portrait/portrait-420.avif', import.meta.url), 420],
  [new URL('../images/portrait/portrait-600.avif', import.meta.url), 600],
  [new URL('../images/portrait/portrait-900.avif', import.meta.url), 900],
  [new URL('../images/portrait/portrait-1260.avif', import.meta.url), 1260],
] as const

const portraitAvifSrcSet = portraitAvifVariants
  .map(([url, width]) => `${url.pathname} ${width}w`)
  .join(', ')

const portraitJpegSrcSet = [
  portrait300Jpeg,
  portrait420Jpeg,
  portrait600Jpeg,
  portrait900Jpeg,
  portrait1260Jpeg,
]
  .map(({ src, width }) => `${src} ${width}w`)
  .join(', ')

const testimonials: Testimonial[] = [
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
    author: {
      name: 'Mike Eshelman',
      profileUrl: 'https://www.linkedin.com/in/eshelman',
    },
    role: 'fmr. CMO of Mr. Cooper (acq. Rocket Companies)',
  },
  {
    id: 'alan-mckellar',
    quote: (
      <>
        You want the data engineering job done right? You want Ying. He is the
        consummate professional who seeks to understand his customer’s needs and
        then implement innovative solutions. What I really enjoyed about working
        with Ying is that I knew I could provide some high-level requirements
        and step away to focus on other items. He always delivered for me and my
        teams.
      </>
    ),
    avatarImage: AlanMcKellar,
    author: {
      name: 'Alan McKellar',
      profileUrl: 'https://www.linkedin.com/in/alanmckellar',
    },
    role: 'fmr. VP of Engineering at Janus Health',
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
        were met. Ying’s ability to work seamlessly across functions and
        effectively apply technology to solve complex business issues is a
        testament to his exceptional engineering skills.
      </>
    ),
    avatarImage: MikeSpainhower,
    author: {
      name: 'Mike Spainhower',
      profileUrl: 'https://www.linkedin.com/in/spainhower',
    },
    role: 'fmr. CTO of Caribou',
  },
  {
    id: 'vp-acquisition-marketing',
    quote: (
      <>
        The reason this [project] was one of the more seamless integrations I’ve
        worked on is because of good attitudes from you and others and the
        willingness to come back to the table over and over again and clarify
        things through dialogue. A lot of companies never make it this far,
        they’re stuck with [legacy solutions].
      </>
    ),
    role: 'VP of Acquisition Marketing, Series F security startup',
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
    author: {
      name: 'Lihan Zhang',
      profileUrl: 'https://www.linkedin.com/in/lihan-zhang-3b24a594',
    },
    role: 'Software Engineer',
  },
  {
    id: 'addison-jones',
    quote: (
      <>
        Ying was the senior engineer and leader of the Data Engineering team at
        Caribou when I joined and both the company and I benefitted greatly from
        his technical knowledge, leadership skills, and friendly personality.
        Ying was instrumental in my growth as an engineer and challenged me to
        improve while also being fully supportive. His knowledge of software and
        data engineering is both broad and deep. Each project Ying led came in
        on time and with resounding success. I give my highest possible
        recommendation for Ying as both an engineer, leader, and friend.
      </>
    ),
    author: {
      name: 'Addison Jones',
      profileUrl: 'https://www.linkedin.com/in/addisonjones3',
    },
    role: 'Software Engineer',
  },
]

export default function Home() {
  return (
    <div>
      <link
        rel="preload"
        as="image"
        type="image/avif"
        imageSrcSet={portraitAvifSrcSet}
        imageSizes={portraitSizes}
        fetchPriority="high"
      />
      <Container className="mt-8 sm:mt-16 lg:mt-32">
        <div className="grid grid-cols-1 gap-y-10 lg:grid-cols-2 lg:grid-rows-[auto_1fr] lg:gap-y-12">
          <div className="lg:row-span-2">
            <h1 className="text-4xl font-bold tracking-tight text-zinc-800 sm:text-5xl lg:max-xl:text-[2.75rem]/tight dark:text-zinc-100">
              Need software?
            </h1>
            <p className="mt-6 text-base text-zinc-600 dark:text-zinc-400">
              I’m Ying, a software engineer and founder based near Washington,
              D.C. I like creating quality software products that people are
              happy to use, and that coincidentally make companies lots of
              money.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 lg:flex-nowrap lg:gap-6">
              <SocialLink
                href="https://github.com/yingw787"
                aria-label="Follow on GitHub"
                icon={FaGithub}
                label="GitHub"
              />
              <SocialLink
                href="https://linkedin.com/in/yingw787"
                aria-label="Follow on LinkedIn"
                icon={FaLinkedin}
                label="LinkedIn"
              />
              <SocialLink
                href="https://blog.yingw787.com"
                aria-label="Personal Blog"
                icon={FaPersonHiking}
                label="Personal Blog"
              />
              <SocialLink
                href="https://bytes.yingw787.com"
                aria-label="Professional Blog"
                icon={FaPersonWalkingLuggage}
                label="Professional Blog"
              />
              <SocialLink
                href="mailto:ying@paintcreeksoftware.com"
                aria-label="Email"
                icon={FaEnvelope}
                label="Email"
              />
            </div>
          </div>
          <div className="lg:pl-20">
            <div className="max-w-xs px-2.5 sm:max-lg:mx-auto lg:max-w-none">
              <picture>
                <source
                  type="image/avif"
                  srcSet={portraitAvifSrcSet}
                  sizes={portraitSizes}
                />
                <img
                  src={portrait420Jpeg.src}
                  srcSet={portraitJpegSrcSet}
                  sizes={portraitSizes}
                  width={portrait420Jpeg.width}
                  height={portrait420Jpeg.height}
                  alt=""
                  loading="eager"
                  fetchPriority="high"
                  className="aspect-square w-full rotate-3 rounded-2xl bg-zinc-100 object-cover dark:bg-zinc-800"
                />
              </picture>
            </div>
          </div>
        </div>
      </Container>
      <Container className="max-lg:mt-12">
        <section aria-labelledby="testimonials-heading">
          <h2 id="testimonials-heading" className="sr-only">
            Testimonials
          </h2>
          {testimonials.map((testimonial) => (
            <TestimonialSection
              key={testimonial.id}
              testimonial={testimonial}
            />
          ))}
        </section>
      </Container>
    </div>
  )
}
