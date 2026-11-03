import {expect,it} from 'vitest'
import {existingProfileImage,parsePresetRef,presetImageUrl,presetRefFromUrl} from './profilePresets'
it('maps canonical preset paths including nested and Unicode names without expiring URLs',()=>{
 const ref='profile-pictures/birds/blue bird.avif'
 expect(presetImageUrl(ref)).toBe('/api/profile-presets/profile-pictures/birds/blue%20bird.avif')
 expect(presetRefFromUrl(presetImageUrl(ref))).toBe(ref)
 expect(existingProfileImage(presetImageUrl(ref))).toBe(presetImageUrl(ref))
})
it('rejects arbitrary buckets, traversal, URL schemes and unsupported files',()=>{
 for(const ref of ['profile-media/private.png','profile-pictures/../secret.png','profile-pictures/a%2fb.png','profile-pictures/a\\b.png','profile-pictures//a.png','profile-pictures/a.svg','https://example.test/a.png','profile-pictures/a.png?token=x'])expect(parsePresetRef(ref)).toBeNull()
 expect(parsePresetRef('profile-banners/one.avif','profile-pictures')).toBeNull()
})
it('preserves existing HTTP images and rejects non-image-route or script references',()=>{
 expect(existingProfileImage('https://example.test/old.webp')).toBe('https://example.test/old.webp')
 for(const value of ['javascript:alert(1)','/api/covers/private/avatar','/api/profile-presets/profile-media/a.png',null])expect(existingProfileImage(value)).toBeNull()
})
