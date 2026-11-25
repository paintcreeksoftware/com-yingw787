import Image, { type StaticImageData } from 'next/image'
import { StarIcon } from '@heroicons/react/20/solid'
import { UserIcon } from '@heroicons/react/24/outline'

interface TestimonialSectionProps {
  quote: React.ReactNode
  avatarImage?: StaticImageData
  name?: React.ReactNode
  role?: React.ReactNode
}

/**
 * Component that displays a single testimonial with quote, avatar, and attribution.
 * @param props - Component props
 * @param props.quote - The testimonial quote content
 * @param props.avatarImage - Optional photo of the person giving the testimonial
 * @param props.name - Optional name of the person
 * @param props.role - Role/title of the person
 * @returns JSX element for the testimonial section
 */
export const TestimonialSection = ({
  quote,
  avatarImage,
  name,
  role,
}: TestimonialSectionProps) => {
  return (
    <section className="px-6 py-6 sm:py-8 lg:px-4 dark:bg-zinc-900">
      <figure className="mx-auto max-w-2xl">
        <p className="sr-only">5 out of 5 stars</p>
        <div className="flex gap-x-1 text-[#c38300] dark:text-yellow-500">
          <StarIcon className="h-5 w-5 flex-none" aria-hidden="true" />
          <StarIcon className="h-5 w-5 flex-none" aria-hidden="true" />
          <StarIcon className="h-5 w-5 flex-none" aria-hidden="true" />
          <StarIcon className="h-5 w-5 flex-none" aria-hidden="true" />
          <StarIcon className="h-5 w-5 flex-none" aria-hidden="true" />
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
            {name && (
              <div className="font-semibold text-zinc-800 dark:text-zinc-100">
                {name}
              </div>
            )}
            {role && (
              <div className="mt-0.5 text-zinc-800 dark:text-zinc-100">
                {role}
              </div>
            )}
          </div>
        </figcaption>
      </figure>
    </section>
  )
}
