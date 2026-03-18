import { forwardRef } from 'react'
import clsx from 'clsx'

export const ContainerOuter = forwardRef<
  React.ComponentRef<'div'>,
  React.ComponentPropsWithoutRef<'div'>
>(({ className, children, ...props }, ref) => (
  <div ref={ref} className={clsx('sm:px-8', className)} {...props}>
    <div className="mx-auto w-full max-w-7xl lg:px-8">{children}</div>
  </div>
))

ContainerOuter.displayName = 'ContainerOuter'

export const ContainerInner = forwardRef<
  React.ComponentRef<'div'>,
  React.ComponentPropsWithoutRef<'div'>
>(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    className={clsx('relative px-4 sm:px-8 lg:px-12', className)}
    {...props}
  >
    <div className="mx-auto max-w-2xl lg:max-w-5xl">{children}</div>
  </div>
))

ContainerInner.displayName = 'ContainerInner'

export const Container = forwardRef<
  React.ComponentRef<typeof ContainerOuter>,
  React.ComponentPropsWithoutRef<typeof ContainerOuter>
>(({ children, ...props }, ref) => (
  <ContainerOuter ref={ref} {...props}>
    <ContainerInner>{children}</ContainerInner>
  </ContainerOuter>
))

Container.displayName = 'Container'
