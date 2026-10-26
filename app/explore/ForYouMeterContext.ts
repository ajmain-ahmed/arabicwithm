'use client'
import {createContext,useContext} from 'react'
export interface PlayerSample {time:number;playing:boolean;rate:number;pause:()=>void}
export const MeterContext=createContext<((sample:PlayerSample)=>void)|null>(null)
export const useForYouMeter=()=>useContext(MeterContext)
