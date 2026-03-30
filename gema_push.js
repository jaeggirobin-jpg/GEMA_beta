/* gema_push.js — Web Push Nachrichten (Client-Vorbereitung)
   Braucht VAPID-Keys und Server-Endpoint fuer volle Funktionalitaet.
   Jetzt: Permission anfragen + Subscription erstellen.
*/
(function(w){
  'use strict';
  var VAPID_PUBLIC_KEY=''; // Wird spaeter gesetzt

  var GemaPush={
    isSupported:function(){
      return 'serviceWorker' in navigator && 'PushManager' in window;
    },
    getPermission:function(){
      if(!this.isSupported())return 'unsupported';
      return Notification.permission; // 'granted','denied','default'
    },
    requestPermission:function(cb){
      if(!this.isSupported()){if(cb)cb('unsupported');return;}
      Notification.requestPermission().then(function(result){
        if(cb)cb(result);
      });
    },
    subscribe:function(cb){
      if(!VAPID_PUBLIC_KEY){console.warn('[GemaPush] VAPID Key fehlt — Push noch nicht konfiguriert');if(cb)cb(null);return;}
      navigator.serviceWorker.ready.then(function(reg){
        return reg.pushManager.subscribe({
          userVisibleOnly:true,
          applicationServerKey:VAPID_PUBLIC_KEY
        });
      }).then(function(sub){
        console.log('[GemaPush] Subscription:',JSON.stringify(sub));
        // TODO: Subscription an Supabase senden
        if(cb)cb(sub);
      }).catch(function(err){
        console.warn('[GemaPush] Subscribe failed:',err);
        if(cb)cb(null);
      });
    },
    // Lokale Benachrichtigung (ohne Server)
    notify:function(title,body,url){
      if(Notification.permission!=='granted')return;
      var n=new Notification(title||'GEMA',{
        body:body||'',
        icon:'/icon-192.svg',
        badge:'/icon-192.svg'
      });
      if(url)n.onclick=function(){window.open(url);};
    }
  };

  w.GemaPush=GemaPush;
})(window);
