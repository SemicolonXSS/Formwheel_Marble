import {ref,onValue} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js";
// A tab keeps its participant identity across refreshes. New tabs get new seats.
export function battleSession(game, db) {
 const key="fw:battle:session:"+game;
 let stored={};try{stored=JSON.parse(sessionStorage.getItem(key))||{}}catch{}
 const id=typeof stored.id==="string"&&/^[a-zA-Z0-9_-]{1,128}$/.test(stored.id)?stored.id:crypto.randomUUID();
 let code=/^[A-Z0-9]{6}$/.test(stored.code||"")?stored.code:"",offset=0;
 function remember(value){code=value;try{sessionStorage.setItem(key,JSON.stringify({id,code}))}catch{}}
 remember(code);
 onValue(ref(db,".info/serverTimeOffset"),s=>{offset=Number(s.val())||0});
 const status=document.createElement("p");status.setAttribute("role","status");status.style.cssText="font:13px system-ui;color:#667085";document.querySelector("main")?.append(status);
 onValue(ref(db,".info/connected"),s=>{status.textContent=s.val()?"온라인 연결됨 · 새로고침해도 방과 최고 점수를 복구해요.":"연결 대기 중 · 이 탭을 유지하면 재연결합니다."});
 return {id,get code(){return code},now:()=>Date.now()+offset,remember,clear:()=>remember("")};
}
