import Image, { type StaticImageData } from 'next/image'
import { StarIcon } from '@heroicons/react/20/solid'
import { UserIcon } from '@heroicons/react/24/outline'

const STAR_RATING = 5

export interface Testimonial {
  id: string
  quote: React.ReactNode
  role: string
  avatarImage?: StaticImageData
  author?: {
    name: string
    profileUrl: string
  }
}

/**
 * Component that displays a single testimonial with quote, avatar, and attribution.
 * @param props - Component props
 * @param props.testimonial - The testimonial to display
 * @returns JSX element for the testimonial section
 */
export const TestimonialSection = ({
  testimonial: { quote, role, avatarImage, author },
}: {
  testimonial: Testimonial
}) => {
  return (
    <article className="py-6 sm:py-8">
      <figure className="mx-auto max-w-2xl">
        <p className="sr-only">{`${STAR_RATING} out of ${STAR_RATING} stars`}</p>
        <div className="flex gap-x-1 text-[#c38300] dark:text-yellow-500">
          {Array.from({ length: STAR_RATING }, (_, index) => (
            <StarIcon
              key={index}
              className="h-5 w-5 flex-none"
              aria-hidden="true"
            />
          ))}
        </div>
        <blockquote className="mt-5 text-xl leading-8 font-semibold tracking-tight sm:text-2xl sm:leading-9">
          <p className="text-zinc-800 dark:text-zinc-100">{quote}</p>
        </blockquote>
        <figcaption className="mt-5 flex items-center gap-x-6">
          <span
            aria-hidden="true"
            className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
          >
            {avatarImage ? (
              <Image
                src={avatarImage}
                alt=""
                sizes="3rem"
                className="size-full"
                loading="lazy"
              />
            ) : (
              <UserIcon className="size-6 text-zinc-500 dark:text-zinc-400" />
            )}
          </span>
          <div className="text-sm leading-6">
            {author && (
              <div className="font-semibold text-zinc-800 dark:text-zinc-100">
                <a
                  href={author.profileUrl}
                  className="rounded-sm text-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-900 dark:text-blue-400 dark:focus-visible:outline-zinc-100"
                >
                  {author.name}
                </a>
              </div>
            )}
            <div
              className={
                author
                  ? 'mt-0.5 text-zinc-600 dark:text-zinc-400'
                  : 'mt-0.5 text-zinc-800 dark:text-zinc-100'
              }
            >
              {role}
            </div>
          </div>
        </figcaption>
      </figure>
    </article>
  )
}
