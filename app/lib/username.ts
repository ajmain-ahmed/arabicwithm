import { z } from 'zod'

const reserved = new Set(['admin','administrator','support','awm','awmplus','arabicwithm','root','system','moderator','help','null'])
export const usernameSchema = z.string().trim().toLowerCase().min(3, 'Use at least 3 characters.').max(24, 'Use at most 24 characters.').regex(/^[a-z][a-z0-9_]*$/, 'Start with a letter and use letters, numbers or underscores.').refine(value => !reserved.has(value), 'That username is reserved.')
