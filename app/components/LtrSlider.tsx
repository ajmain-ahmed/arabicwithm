'use client'
import {Slider,type SliderProps} from '@mui/material'
import RtlProvider from '@mui/system/RtlProvider'
/** Timelines and numeric ranges keep their existing increasing direction,
 * independently of website locale. No DOM wrapper or locale-dependent key. */
export default function LtrSlider(props:SliderProps){return <RtlProvider value={false}><Slider {...props} dir="ltr"/></RtlProvider>}
