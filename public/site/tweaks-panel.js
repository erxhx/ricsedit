var v=Object.defineProperty;var o=(a,e)=>v(a,"name",{value:e,configurable:!0});const __TWEAKS_STYLE=`
  .twk-panel{position:fixed;right:16px;bottom:16px;z-index:2147483646;width:280px;
    max-height:calc(100vh - 32px);display:flex;flex-direction:column;
    background:rgba(250,249,247,.78);color:#29261b;
    -webkit-backdrop-filter:blur(24px) saturate(160%);backdrop-filter:blur(24px) saturate(160%);
    border:.5px solid rgba(255,255,255,.6);border-radius:14px;
    box-shadow:0 1px 0 rgba(255,255,255,.5) inset,0 12px 40px rgba(0,0,0,.18);
    font:11.5px/1.4 ui-sans-serif,system-ui,-apple-system,sans-serif;overflow:hidden}
  .twk-hd{display:flex;align-items:center;justify-content:space-between;
    padding:10px 8px 10px 14px;cursor:move;user-select:none}
  .twk-hd b{font-size:12px;font-weight:600;letter-spacing:.01em}
  .twk-x{appearance:none;border:0;background:transparent;color:rgba(41,38,27,.55);
    width:22px;height:22px;border-radius:6px;cursor:default;font-size:13px;line-height:1}
  .twk-x:hover{background:rgba(0,0,0,.06);color:#29261b}
  .twk-body{padding:2px 14px 14px;display:flex;flex-direction:column;gap:10px;
    overflow-y:auto;overflow-x:hidden;min-height:0;
    scrollbar-width:thin;scrollbar-color:rgba(0,0,0,.15) transparent}
  .twk-body::-webkit-scrollbar{width:8px}
  .twk-body::-webkit-scrollbar-track{background:transparent;margin:2px}
  .twk-body::-webkit-scrollbar-thumb{background:rgba(0,0,0,.15);border-radius:4px;
    border:2px solid transparent;background-clip:content-box}
  .twk-body::-webkit-scrollbar-thumb:hover{background:rgba(0,0,0,.25);
    border:2px solid transparent;background-clip:content-box}
  .twk-row{display:flex;flex-direction:column;gap:5px}
  .twk-row-h{flex-direction:row;align-items:center;justify-content:space-between;gap:10px}
  .twk-lbl{display:flex;justify-content:space-between;align-items:baseline;
    color:rgba(41,38,27,.72)}
  .twk-lbl>span:first-child{font-weight:500}
  .twk-val{color:rgba(41,38,27,.5);font-variant-numeric:tabular-nums}

  .twk-sect{font-size:10px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;
    color:rgba(41,38,27,.45);padding:10px 0 0}
  .twk-sect:first-child{padding-top:0}

  .twk-field{appearance:none;width:100%;height:26px;padding:0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;
    background:rgba(255,255,255,.6);color:inherit;font:inherit;outline:none}
  .twk-field:focus{border-color:rgba(0,0,0,.25);background:rgba(255,255,255,.85)}
  select.twk-field{padding-right:22px;
    background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='rgba(0,0,0,.5)' d='M0 0h10L5 6z'/></svg>");
    background-repeat:no-repeat;background-position:right 8px center}

  .twk-slider{appearance:none;-webkit-appearance:none;width:100%;height:4px;margin:6px 0;
    border-radius:999px;background:rgba(0,0,0,.12);outline:none}
  .twk-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;
    width:14px;height:14px;border-radius:50%;background:#fff;
    border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}
  .twk-slider::-moz-range-thumb{width:14px;height:14px;border-radius:50%;
    background:#fff;border:.5px solid rgba(0,0,0,.12);box-shadow:0 1px 3px rgba(0,0,0,.2);cursor:default}

  .twk-seg{position:relative;display:flex;padding:2px;border-radius:8px;
    background:rgba(0,0,0,.06);user-select:none}
  .twk-seg-thumb{position:absolute;top:2px;bottom:2px;border-radius:6px;
    background:rgba(255,255,255,.9);box-shadow:0 1px 2px rgba(0,0,0,.12);
    transition:left .15s cubic-bezier(.3,.7,.4,1),width .15s}
  .twk-seg.dragging .twk-seg-thumb{transition:none}
  .twk-seg button{appearance:none;position:relative;z-index:1;flex:1;border:0;
    background:transparent;color:inherit;font:inherit;font-weight:500;min-height:22px;
    border-radius:6px;cursor:default;padding:4px 6px;line-height:1.2;
    overflow-wrap:anywhere}

  .twk-toggle{position:relative;width:32px;height:18px;border:0;border-radius:999px;
    background:rgba(0,0,0,.15);transition:background .15s;cursor:default;padding:0}
  .twk-toggle[data-on="1"]{background:#34c759}
  .twk-toggle i{position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;
    background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
  .twk-toggle[data-on="1"] i{transform:translateX(14px)}

  .twk-num{display:flex;align-items:center;height:26px;padding:0 0 0 8px;
    border:.5px solid rgba(0,0,0,.1);border-radius:7px;background:rgba(255,255,255,.6)}
  .twk-num-lbl{font-weight:500;color:rgba(41,38,27,.6);cursor:ew-resize;
    user-select:none;padding-right:8px}
  .twk-num input{flex:1;min-width:0;height:100%;border:0;background:transparent;
    font:inherit;font-variant-numeric:tabular-nums;text-align:right;padding:0 8px 0 0;
    outline:none;color:inherit;-moz-appearance:textfield}
  .twk-num input::-webkit-inner-spin-button,.twk-num input::-webkit-outer-spin-button{
    -webkit-appearance:none;margin:0}
  .twk-num-unit{padding-right:8px;color:rgba(41,38,27,.45)}

  .twk-btn{appearance:none;height:26px;padding:0 12px;border:0;border-radius:7px;
    background:rgba(0,0,0,.78);color:#fff;font:inherit;font-weight:500;cursor:default}
  .twk-btn:hover{background:rgba(0,0,0,.88)}
  .twk-btn.secondary{background:rgba(0,0,0,.06);color:inherit}
  .twk-btn.secondary:hover{background:rgba(0,0,0,.1)}

  .twk-swatch{appearance:none;-webkit-appearance:none;width:56px;height:22px;
    border:.5px solid rgba(0,0,0,.1);border-radius:6px;padding:0;cursor:default;
    background:transparent;flex-shrink:0}
  .twk-swatch::-webkit-color-swatch-wrapper{padding:0}
  .twk-swatch::-webkit-color-swatch{border:0;border-radius:5.5px}
  .twk-swatch::-moz-color-swatch{border:0;border-radius:5.5px}
`;function useTweaks(a){const[e,r]=React.useState(a),s=React.useCallback((t,d)=>{const c=typeof t=="object"&&t!==null?t:{[t]:d};r(l=>({...l,...c})),window.parent.postMessage({type:"__edit_mode_set_keys",edits:c},"*")},[]);return[e,s]}o(useTweaks,"useTweaks");function TweaksPanel({title:a="Tweaks",children:e}){const[r,s]=React.useState(!1),t=React.useRef(null),d=React.useRef({x:16,y:16}),c=16,l=React.useCallback(()=>{const n=t.current;if(!n)return;const p=n.offsetWidth,u=n.offsetHeight,i=Math.max(c,window.innerWidth-p-c),w=Math.max(c,window.innerHeight-u-c);d.current={x:Math.min(i,Math.max(c,d.current.x)),y:Math.min(w,Math.max(c,d.current.y))},n.style.right=d.current.x+"px",n.style.bottom=d.current.y+"px"},[]);React.useEffect(()=>{if(!r)return;if(l(),typeof ResizeObserver=="undefined")return window.addEventListener("resize",l),()=>window.removeEventListener("resize",l);const n=new ResizeObserver(l);return n.observe(document.documentElement),()=>n.disconnect()},[r,l]),React.useEffect(()=>{const n=o(p=>{var i;const u=(i=p==null?void 0:p.data)==null?void 0:i.type;u==="__activate_edit_mode"?s(!0):u==="__deactivate_edit_mode"&&s(!1)},"onMsg");return window.addEventListener("message",n),window.parent.postMessage({type:"__edit_mode_available"},"*"),()=>window.removeEventListener("message",n)},[]);const x=o(()=>{s(!1),window.parent.postMessage({type:"__edit_mode_dismissed"},"*")},"dismiss"),k=o(n=>{const p=t.current;if(!p)return;const u=p.getBoundingClientRect(),i=n.clientX,w=n.clientY,b=window.innerWidth-u.right,g=window.innerHeight-u.bottom,h=o(m=>{d.current={x:b-(m.clientX-i),y:g-(m.clientY-w)},l()},"move"),f=o(()=>{window.removeEventListener("mousemove",h),window.removeEventListener("mouseup",f)},"up");window.addEventListener("mousemove",h),window.addEventListener("mouseup",f)},"onDragStart");return r?React.createElement(React.Fragment,null,React.createElement("style",null,__TWEAKS_STYLE),React.createElement("div",{ref:t,className:"twk-panel",style:{right:d.current.x,bottom:d.current.y}},React.createElement("div",{className:"twk-hd",onMouseDown:k},React.createElement("b",null,a),React.createElement("button",{className:"twk-x","aria-label":"Close tweaks",onMouseDown:n=>n.stopPropagation(),onClick:x},"\u2715")),React.createElement("div",{className:"twk-body"},e))):null}o(TweaksPanel,"TweaksPanel");function TweakSection({label:a,children:e}){return React.createElement(React.Fragment,null,React.createElement("div",{className:"twk-sect"},a),e)}o(TweakSection,"TweakSection");function TweakRow({label:a,value:e,children:r,inline:s=!1}){return React.createElement("div",{className:s?"twk-row twk-row-h":"twk-row"},React.createElement("div",{className:"twk-lbl"},React.createElement("span",null,a),e!=null&&React.createElement("span",{className:"twk-val"},e)),r)}o(TweakRow,"TweakRow");function TweakSlider({label:a,value:e,min:r=0,max:s=100,step:t=1,unit:d="",onChange:c}){return React.createElement(TweakRow,{label:a,value:`${e}${d}`},React.createElement("input",{type:"range",className:"twk-slider",min:r,max:s,step:t,value:e,onChange:l=>c(Number(l.target.value))}))}o(TweakSlider,"TweakSlider");function TweakToggle({label:a,value:e,onChange:r}){return React.createElement("div",{className:"twk-row twk-row-h"},React.createElement("div",{className:"twk-lbl"},React.createElement("span",null,a)),React.createElement("button",{type:"button",className:"twk-toggle","data-on":e?"1":"0",role:"switch","aria-checked":!!e,onClick:()=>r(!e)},React.createElement("i",null)))}o(TweakToggle,"TweakToggle");function TweakRadio({label:a,value:e,options:r,onChange:s}){const t=React.useRef(null),[d,c]=React.useState(!1),l=r.map(i=>typeof i=="object"?i:{value:i,label:i}),x=Math.max(0,l.findIndex(i=>i.value===e)),k=l.length,n=React.useRef(e);n.current=e;const p=o(i=>{const w=t.current.getBoundingClientRect(),b=w.width-4,g=Math.floor((i-w.left-2)/b*k);return l[Math.max(0,Math.min(k-1,g))].value},"segAt");return React.createElement(TweakRow,{label:a},React.createElement("div",{ref:t,role:"radiogroup",onPointerDown:o(i=>{c(!0);const w=p(i.clientX);w!==n.current&&s(w);const b=o(h=>{if(!t.current)return;const f=p(h.clientX);f!==n.current&&s(f)},"move"),g=o(()=>{c(!1),window.removeEventListener("pointermove",b),window.removeEventListener("pointerup",g)},"up");window.addEventListener("pointermove",b),window.addEventListener("pointerup",g)},"onPointerDown"),className:d?"twk-seg dragging":"twk-seg"},React.createElement("div",{className:"twk-seg-thumb",style:{left:`calc(2px + ${x} * (100% - 4px) / ${k})`,width:`calc((100% - 4px) / ${k})`}}),l.map(i=>React.createElement("button",{key:i.value,type:"button",role:"radio","aria-checked":i.value===e},i.label))))}o(TweakRadio,"TweakRadio");function TweakSelect({label:a,value:e,options:r,onChange:s}){return React.createElement(TweakRow,{label:a},React.createElement("select",{className:"twk-field",value:e,onChange:t=>s(t.target.value)},r.map(t=>{const d=typeof t=="object"?t.value:t,c=typeof t=="object"?t.label:t;return React.createElement("option",{key:d,value:d},c)})))}o(TweakSelect,"TweakSelect");function TweakText({label:a,value:e,placeholder:r,onChange:s}){return React.createElement(TweakRow,{label:a},React.createElement("input",{className:"twk-field",type:"text",value:e,placeholder:r,onChange:t=>s(t.target.value)}))}o(TweakText,"TweakText");function TweakNumber({label:a,value:e,min:r,max:s,step:t=1,unit:d="",onChange:c}){const l=o(n=>r!=null&&n<r?r:s!=null&&n>s?s:n,"clamp"),x=React.useRef({x:0,val:0});return React.createElement("div",{className:"twk-num"},React.createElement("span",{className:"twk-num-lbl",onPointerDown:o(n=>{n.preventDefault(),x.current={x:n.clientX,val:e};const p=(String(t).split(".")[1]||"").length,u=o(w=>{const b=w.clientX-x.current.x,g=x.current.val+b*t,h=Math.round(g/t)*t;c(l(Number(h.toFixed(p))))},"move"),i=o(()=>{window.removeEventListener("pointermove",u),window.removeEventListener("pointerup",i)},"up");window.addEventListener("pointermove",u),window.addEventListener("pointerup",i)},"onScrubStart")},a),React.createElement("input",{type:"number",value:e,min:r,max:s,step:t,onChange:n=>c(l(Number(n.target.value)))}),d&&React.createElement("span",{className:"twk-num-unit"},d))}o(TweakNumber,"TweakNumber");function TweakColor({label:a,value:e,onChange:r}){return React.createElement("div",{className:"twk-row twk-row-h"},React.createElement("div",{className:"twk-lbl"},React.createElement("span",null,a)),React.createElement("input",{type:"color",className:"twk-swatch",value:e,onChange:s=>r(s.target.value)}))}o(TweakColor,"TweakColor");function TweakButton({label:a,onClick:e,secondary:r=!1}){return React.createElement("button",{type:"button",className:r?"twk-btn secondary":"twk-btn",onClick:e},a)}o(TweakButton,"TweakButton"),Object.assign(window,{useTweaks,TweaksPanel,TweakSection,TweakRow,TweakSlider,TweakToggle,TweakRadio,TweakSelect,TweakText,TweakNumber,TweakColor,TweakButton});
