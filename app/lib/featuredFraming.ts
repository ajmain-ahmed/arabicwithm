export interface FeaturedPosition { x: number; y: number }
export const DEFAULT_FEATURED_POSITION: FeaturedPosition = { x: 50, y: 50 }
export const FEATURED_DESKTOP_RATIO = '2560 / 1080'
export const FEATURED_MOBILE_HEIGHT = 'clamp(430px, 56dvh, 560px)'
export const FEATURED_MOBILE_PREVIEW_WIDTH = 390 - 2 * 16
export const FEATURED_MOBILE_PREVIEW_HEIGHT = Math.min(560, Math.max(430, 844 * .56))
export const featuredObjectPosition = (position: FeaturedPosition = DEFAULT_FEATURED_POSITION) => `${position.x}% ${position.y}%`
export const clampPosition = (value: number) => Math.max(0, Math.min(100, value))
export function dragFeaturedPosition(position: FeaturedPosition, dx: number, dy: number, frame: {width:number;height:number}, image: {width:number;height:number}): FeaturedPosition {
 const scale = Math.max(frame.width / image.width, frame.height / image.height)
 const overflowX = image.width * scale - frame.width, overflowY = image.height * scale - frame.height
 return { x: overflowX > .01 ? clampPosition(position.x - dx / overflowX * 100) : position.x,
          y: overflowY > .01 ? clampPosition(position.y - dy / overflowY * 100) : position.y }
}
