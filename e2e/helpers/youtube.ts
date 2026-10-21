import type {Page} from '@playwright/test'

export async function installYouTubeFixture(page:Page){
 await page.addInitScript({content:`
 window.__ytPlayers=[];
 window.YT={PlayerState:{ENDED:0,PLAYING:1},Player:class{
 constructor(element,options){this.options=options;this.time=options.playerVars.start||0;this.muted=false;this.volume=100;this.id=options.videoId;window.__ytPlayers.push(this);this.iframe=document.createElement('iframe');this.iframe.title='YouTube video player';this.iframe.srcdoc='<body style="background:#123;color:white">Playback fixture</body>';this.iframe.style.cssText='width:100%;height:100%;border:0';element.replaceWith(this.iframe);setTimeout(()=>options.events.onReady(),0)}
 getCurrentTime(){return this.time}getDuration(){return 1200}seekTo(time){this.time=time}playVideo(){this.options.events.onStateChange({data:1})}pauseVideo(){this.options.events.onStateChange({data:2})}mute(){this.muted=true}unMute(){this.muted=false}isMuted(){return this.muted}getVolume(){return this.volume}setVolume(v){this.volume=v}destroy(){this.iframe.remove()}
 }};
 window.__ytTime=(time,state=2)=>{const p=window.__ytPlayers.at(-1);p.time=time;p.options.events.onStateChange({data:state})};
 window.__ytError=code=>window.__ytPlayers.at(-1).options.events.onError({data:code});
 `})
}
