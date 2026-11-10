'use client'

import { useEffect, useState } from 'react'
import ContactDialog from './ContactDialog'
import SupportDialog from './SupportDialog'

export default function SiteDialogs() {
  const [dialog, setDialog] = useState<'contact' | 'support' | null>(null)

  useEffect(() => {
    const openContact = () => setDialog('contact')
    const openSupport = () => setDialog('support')
    window.addEventListener('open-contact-dialog', openContact)
    window.addEventListener('open-support-dialog', openSupport)
    return () => {
      window.removeEventListener('open-contact-dialog', openContact)
      window.removeEventListener('open-support-dialog', openSupport)
    }
  }, [])

  return (
    <>
      <ContactDialog open={dialog === 'contact'} onClose={() => setDialog(null)} />
      <SupportDialog open={dialog === 'support'} onClose={() => setDialog(null)} />
    </>
  )
}
