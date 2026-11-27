'use client'
import {Component,type ReactNode} from 'react'
import {Alert,Button} from '@mui/material'
import {UiText} from '@/app/components/WebsiteLocaleProvider'
export default class ActivityBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
 state = { failed: false }
 static getDerivedStateFromError() { return { failed: true } }
 render() { return this.state.failed ? <Alert severity="warning"><UiText>{"This activity could not load."}</UiText>{' '}<Button onClick={()=>this.setState({failed:false})}><UiText>{"Retry"}</UiText></Button></Alert> : this.props.children }
}
