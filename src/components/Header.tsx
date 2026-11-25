'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'
import { preload } from 'react-dom'

import { Container } from '@/components/Container'
import avatarImage from '@/images/avatar.webp'
import avatar36 from '@/images/avatar/avatar-36.webp'
import avatar64 from '@/images/avatar/avatar-64.webp'
import avatar72 from '@/images/avatar/avatar-72.webp'
import avatar108 from '@/images/avatar/avatar-108.webp'
import avatar128 from '@/images/avatar/avatar-128.webp'

function AvatarContainer({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div
      className={clsx(
        className,
        'h-10 w-10 rounded-full bg-white/90 p-0.5 shadow-lg ring-1 shadow-zinc-800/5 ring-zinc-900/5 backdrop-blur-sm dark:bg-zinc-800/90 dark:ring-white/10',
      )}
      {...props}
    />
  )
}

function Avatar({
  large = false,
  className,
  ...props
}: Omit<React.ComponentPropsWithoutRef<typeof Link>, 'href'> & {
  large?: boolean
}) {
  const variants = large
    ? [avatar64, avatar128, avatarImage]
    : [avatar36, avatar72, avatar108]
  const { src, width, height } = variants[0]
  const srcSet = variants
    .map((image, index) => `${image.src} ${index + 1}x`)
    .join(', ')

  preload(src, { as: 'image', imageSrcSet: srcSet })

  return (
    <Link href="/" aria-label="Home" className={className} {...props}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Next Image does not accept a custom srcSet with static export. */}
      <img
        src={src}
        srcSet={srcSet}
        width={width}
        height={height}
        alt=""
        decoding="async"
        className={clsx(
          'rounded-full bg-zinc-100 object-cover dark:bg-zinc-800',
          large ? 'h-16 w-16' : 'h-9 w-9',
        )}
      />
    </Link>
  )
}

export function Header() {
  const isHomePage = usePathname() === '/'

  return (
    <header className="flex flex-none flex-col">
      {isHomePage ? (
        <Container className="-mb-3 pt-32">
          <Avatar large prefetch={false} className="block h-16 w-16" />
        </Container>
      ) : (
        <div className="h-16 pt-6">
          <Container>
            <AvatarContainer>
              <Avatar prefetch={false} />
            </AvatarContainer>
          </Container>
        </div>
      )}
    </header>
  )
}
