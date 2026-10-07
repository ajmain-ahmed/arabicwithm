import { expect,it } from 'vitest'
import { usernameSchema } from './username'
it('trims and folds usernames consistently',()=>expect(usernameSchema.parse(' Learner_1 ')).toBe('learner_1'))
it.each(['ab','1learner','has space','../escape','a'.repeat(31)])('rejects invalid username %s',value=>expect(usernameSchema.safeParse(value).success).toBe(false))
