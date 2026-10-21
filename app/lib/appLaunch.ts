import { z } from 'zod'

export const launchEmail = z.string().trim().toLowerCase().max(254).email()
export const APP_LAUNCH_CONSENT = 'Email me once when the ArabicWithM app launches.'
export const APP_LAUNCH_CONSENT_VERSION = 'app-launch-v1'
