const CITY_JOB_CSS=`
.lifeJobStatus{margin-top:8px;padding-top:7px;border-top:1px solid #ffffff12;color:#ffd071;font-size:6px;font-weight:850;letter-spacing:.08em}
.cityJobSection{margin-top:5px;padding:10px 12px;border-radius:8px;background:linear-gradient(135deg,rgba(255,208,113,.12),rgba(116,235,255,.07));border:1px solid rgba(255,208,113,.2)}
.cityJobSection small{display:block;color:#ffd071;font-size:7px;font-weight:950;letter-spacing:.14em}
.cityJobSection b{display:block;margin-top:4px;color:#a9bdc2;font-size:7px;line-height:1.45}
.lifeActionList .cityJobButton{border-left:3px solid #ffd071;background:linear-gradient(90deg,rgba(255,208,113,.09),rgba(255,255,255,.04))}
.lifeActionList .cityJobButton.ready em{color:#72efb7}
.lifeActionList .cityJobButton.unavailable{opacity:.62;border-left-color:#71858b}
.lifeActionList .cityJobButton.unavailable em{color:#a7b3b6}
.mapJournalCard.job{border-color:rgba(255,208,113,.38);background:linear-gradient(145deg,rgba(255,208,113,.1),rgba(6,18,25,.88))}
`;

export function installCityJobUi(){
  if(typeof document==='undefined')return;
  if(!document.querySelector('style[data-city-job-ui]')){
    const style=document.createElement('style');style.dataset.cityJobUi='true';style.textContent=CITY_JOB_CSS;document.head.appendChild(style);
  }
  const hud=document.querySelector('#lifeHud'),controls=hud?.querySelector('.lifeControls');if(!hud||document.querySelector('#lifeJobStatus'))return;
  const status=document.createElement('div');status.id='lifeJobStatus';status.className='lifeJobStatus';status.textContent='CITY WORK · 0 SHIFTS · 0 CR EARNED';hud.insertBefore(status,controls||null);
}
