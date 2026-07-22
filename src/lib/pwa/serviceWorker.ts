import {
  PUBLIC_ASSET_PATHS,
  PWA_CACHE_PREFIX,
  SENSITIVE_PATH_PREFIXES,
} from "./policy";

export function createServiceWorker(buildVersion: string) {
  const version =
    buildVersion.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80) || "local";
  return `"use strict";
const CACHE_PREFIX=${JSON.stringify(PWA_CACHE_PREFIX)};
const CACHE_NAME=CACHE_PREFIX+"-${version}";
const OFFLINE_URL="/offline";
const PUBLIC_PATHS=${JSON.stringify(PUBLIC_ASSET_PATHS)};
const SENSITIVE_PATHS=${JSON.stringify(SENSITIVE_PATH_PREFIXES)};
const safePath=p=>PUBLIC_PATHS.some(x=>p===x||p.startsWith(x));
const sensitivePath=p=>SENSITIVE_PATHS.some(x=>p===x||p.startsWith(x));
const cacheable=r=>r.ok&&!r.redirected&&r.type!=="opaqueredirect"&&!/no-store|private/i.test(r.headers.get("cache-control")||"")&&!r.headers.has("set-cookie");
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE_NAME).then(async cache=>{const response=await fetch(OFFLINE_URL,{cache:"no-store"});if(cacheable(response))await cache.put(OFFLINE_URL,response);}))); 
self.addEventListener("activate",event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME)await caches.delete(key);await self.clients.claim();})()));
self.addEventListener("fetch",event=>{const request=event.request;if(request.method!=="GET")return;const url=new URL(request.url);if(url.origin!==self.location.origin)return;if(request.mode==="navigate"){event.respondWith(fetch(request).catch(()=>caches.match(OFFLINE_URL)));return;}if(sensitivePath(url.pathname)||request.headers.has("authorization"))return;if(!safePath(url.pathname))return;event.respondWith((async()=>{const cached=await caches.match(request);if(cached)return cached;const response=await fetch(request);if(cacheable(response)){const cache=await caches.open(CACHE_NAME);await cache.put(request,response.clone());}return response;})());});
self.addEventListener("message",event=>{if(event.data?.type==="SKIP_WAITING")self.skipWaiting();if(event.data?.type==="CLEAR_CACHES")event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(CACHE_PREFIX)).map(k=>caches.delete(k)))));});
self.addEventListener("push",event=>{if(!event.data)return;let data={};try{data=event.data.json();}catch{data={body:event.data.text()};}event.waitUntil(self.registration.showNotification(data.title||"JunkQuote Pro",{body:data.body||"You have an update.",icon:"/icons/icon-192.png",badge:"/icons/icon-192.png",data:{url:data.url||"/dashboard"}}));});
self.addEventListener("notificationclick",event=>{event.notification.close();const target=new URL(event.notification.data?.url||"/dashboard",self.location.origin);if(target.origin!==self.location.origin)return;event.waitUntil(clients.openWindow(target.href));});`;
}
