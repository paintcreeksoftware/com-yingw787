'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import clsx from 'clsx'

import { Container } from '@/components/Container'
import avatarImage from '@/images/avatar.webp'

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
  return (
    <Link href="/" aria-label="Home" className={className} {...props}>
      <Image
        src={avatarImage}
        alt=""
        sizes={large ? '4rem' : '2.25rem'}
        className={clsx(
          'rounded-full bg-zinc-100 object-cover dark:bg-zinc-800',
          large ? 'h-16 w-16' : 'h-9 w-9',
        )}
        priority
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
          <Avatar
            large
            prefetch={false}
            aria-current="page"
            className="block h-16 w-16"
          />
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
