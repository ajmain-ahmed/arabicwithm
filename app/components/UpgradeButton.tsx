'use client'
import {Button,type ButtonProps} from '@mui/material'

/** Shared presentation only: callers retain their existing upgrade action. */
export default function UpgradeButton({sx,...props}:Omit<ButtonProps,'children'>){
 return <Button fullWidth variant="contained" {...props} data-premium-upgrade sx={[{
  minHeight:52,borderRadius:'12px',textTransform:'none',position:'relative',isolation:'isolate',overflow:'hidden',
  '&::before':{content:'""',position:'absolute',inset:'-50% -25%',zIndex:0,pointerEvents:'none',background:'linear-gradient(110deg,transparent 35%,rgba(255,255,255,.28) 50%,transparent 65%)',opacity:0,animation:'awmUpgradeSweep 3.6s ease-in-out infinite'},
  '&::after':{content:'""',position:'absolute',right:14,top:10,width:7,height:7,pointerEvents:'none',background:'rgba(255,255,255,.8)',clipPath:'polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%)',opacity:0,animation:'awmUpgradeSparkle 3.6s ease-in-out infinite'},
  '@keyframes awmUpgradeSweep':{'0%,60%':{transform:'translateX(-100%)',opacity:0},'65%':{opacity:1},'82%,100%':{transform:'translateX(100%)',opacity:0}},
  '@keyframes awmUpgradeSparkle':{'0%,70%,90%,100%':{opacity:0,transform:'scale(.6)'},'80%':{opacity:.65,transform:'scale(1)'}},
  '&.Mui-disabled::before, &.Mui-disabled::after':{animation:'none',opacity:0},
  '@media (prefers-reduced-motion: reduce)':{'&::before, &::after':{animation:'none',opacity:0}},
 },...(Array.isArray(sx)?sx:sx?[sx]:[])]}><span style={{position:'relative',zIndex:1}}>Upgrade to AWM+</span></Button>
}
