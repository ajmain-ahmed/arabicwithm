'use client'
import Link from 'next/link'
import { Button, type ButtonProps } from '@mui/material'

/** Keep the Link component function inside the client boundary used by MUI. */
export default function RouteButton({ href, ...props }: Omit<ButtonProps<'a'>, 'component' | 'href'> & { href: string }) {
  return <Button component={Link} href={href} {...props} />
}
