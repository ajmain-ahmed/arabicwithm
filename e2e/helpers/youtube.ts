import type {Page} from '@playwright/test'

export async function installYouTubeFixture(page:Page){
 await page.addInitScript({content:`
 window.__ytPlayers=[];
 window.YT={PlayerState:{ENDED:0,PLAYING:1},Player:class{
 constructor(element,options){this.options=options;this.time=options.playerVars.start||0;this.muted=false;this.volume=100;this.id=options.videoId;window.__ytPlayers.push(this);this.iframe=document.createElement('iframe');this.iframe.title='YouTube video player';this.iframe.srcdoc='<body style="background:#123;color:white">Playback fixture</body>';this.iframe.addEventListener('load',()=>{const doc=this.iframe.contentDocument;const range=doc.createElement('input');range.type='range';range.min='0';range.max='1200';range.step='1';range.setAttribute('aria-label','Native timeline fixture');range.style.cssText='position:absolute;left:5%;bottom:22%;width:90%;height:28px;margin:0';range.value=String(this.time);range.addEventListener('input',()=>{this.seekTo(Number(range.value));this.options.events.onStateChange({data:this.playing?1:2})});doc.body.append(range);const play=doc.createElement('button');play.textContent='Native play/pause fixture';play.style.cssText='position:absolute;bottom:0;left:5%';play.onclick=()=>this.playing?this.pauseVideo():this.playVideo();doc.body.append(play)});this.iframe.style.cssText='width:100%;height:100%;border:0';element.replaceWith(this.iframe);setTimeout(()=>options.events.onReady(),0)}
 getAvailablePlaybackRates(){return [0.5,1,1.5,2]}getPlaybackRate(){return this.rate||1}setPlaybackRate(rate){this.rate=rate;this.options.events.onPlaybackRateChange({data:rate})}getCurrentTime(){return this.time}getDuration(){return 1200}seekTo(time){this.time=time}playVideo(){this.playing=true;this.options.events.onStateChange({data:1})}pauseVideo(){this.playing=false;this.options.events.onStateChange({data:2})}mute(){this.muted=true}unMute(){this.muted=false}isMuted(){return this.muted}getVolume(){return this.volume}setVolume(v){this.volume=v}destroy(){this.playing=false;this.destroyed=true;this.iframe.remove()}
 }};
 window.__ytTime=(time,state=2)=>{const p=window.__ytPlayers.at(-1);p.time=time;p.options.events.onStateChange({data:state})};
 window.__ytError=code=>window.__ytPlayers.at(-1).options.events.onError({data:code});
 `})
}
