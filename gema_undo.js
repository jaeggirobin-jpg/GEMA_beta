/**
 * gema_undo.js — Wiederverwendbares Undo/Redo-Modul (#41)
 *
 * Bietet Eingabe-History und Rückgängig-Funktion für beliebige Module.
 * In-Memory-Stack pro Modul-Key, Keyboard-Shortcuts (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z),
 * optional automatisches Beobachten von Input-Feldern via attachTo().
 *
 * Nutzung — manuell:
 *   GemaUndo.init('sb_lu_zusammenstellung', { max: 50 });
 *   // Vor der Änderung den alten Zustand aufnehmen:
 *   GemaUndo.record('verbraucherListe', oldSnapshot, newSnapshot, applyFn);
 *   // applyFn(value) wird bei Undo/Redo aufgerufen mit dem alten bzw. neuen Wert.
 *
 * Nutzung — auto-attach an Input-Felder:
 *   GemaUndo.attachTo(document.getElementById('myInput'));
 *   GemaUndo.attachTo(document.querySelectorAll('.berech-input'));
 *
 * API:
 *   init(moduleKey, opts)     — initialisiert den Stack und globale Shortcuts
 *   record(label, oldV, newV, applyFn)
 *   attachTo(el|NodeList)     — hängt sich per focus/change an Inputs
 *   undo() / redo()           — manuell aufrufen
 *   canUndo() / canRedo()
 *   clear()                   — Stack leeren
 *   getHistory()              — aktuelle History als Array (für UI-Anzeige)
 *   onChange(cb)              — Callback bei Stack-Änderung
 *   showPanel(opts)           — zeigt ein kleines History-Panel unten rechts
 *   hidePanel()
 *
 * Persistenz: Der Stack ist in-memory und geht bei Seitenwechsel verloren —
 * das ist bewusst so (Undo ist ein Session-Feature). Für persistente Versions-
 * historie wäre ein anderes Pattern nötig.
 */
(function(w){
  'use strict';

  var Z = 8400;
  var _moduleKey = null;
  var _stack = [];      // [{label, oldValue, newValue, applyFn, time}]
  var _pos   = -1;      // Index des zuletzt angewendeten Eintrags
  var _max   = 50;
  var _listeners = [];
  var _keyHandler = null;
  var _panel = null;

  function init(moduleKey, opts){
    _moduleKey = moduleKey || 'default';
    _stack = [];
    _pos = -1;
    if (opts && typeof opts.max === 'number') _max = opts.max;
    _attachKeys();
    _notify();
  }

  function _notify(){
    _listeners.forEach(function(fn){ try { fn(); } catch(e) {} });
    if (_panel) _renderPanel();
  }

  function record(label, oldValue, newValue, applyFn){
    if (!_moduleKey) return;
    // Bei Overwrites (nach Undo neue Änderung) die Redo-Kette abschneiden
    if (_pos < _stack.length - 1) {
      _stack = _stack.slice(0, _pos + 1);
    }
    _stack.push({
      label: label || 'Änderung',
      oldValue: oldValue,
      newValue: newValue,
      applyFn: typeof applyFn === 'function' ? applyFn : null,
      time: Date.now()
    });
    if (_stack.length > _max) {
      _stack.shift();
    }
    _pos = _stack.length - 1;
    _notify();
  }

  function canUndo(){ return _pos >= 0; }
  function canRedo(){ return _pos < _stack.length - 1; }

  function undo(){
    if (!canUndo()) return false;
    var entry = _stack[_pos];
    try {
      if (entry.applyFn) entry.applyFn(entry.oldValue);
    } catch(e) { console.warn('[GemaUndo] undo apply failed', e); }
    _pos--;
    _toast('↶ Rückgängig: ' + entry.label);
    _notify();
    return true;
  }
  function redo(){
    if (!canRedo()) return false;
    _pos++;
    var entry = _stack[_pos];
    try {
      if (entry.applyFn) entry.applyFn(entry.newValue);
    } catch(e) { console.warn('[GemaUndo] redo apply failed', e); }
    _toast('↷ Wiederhergestellt: ' + entry.label);
    _notify();
    return true;
  }
  function clear(){
    _stack = [];
    _pos = -1;
    _notify();
  }
  function getHistory(){
    return _stack.slice();
  }
  function onChange(cb){
    if (typeof cb === 'function') _listeners.push(cb);
  }

  // ── Auto-Attach an Input-Felder ──
  // Speichert bei focus den aktuellen Wert und vergleicht bei change/blur.
  // Bei Unterschied wird automatisch ein Undo-Eintrag erstellt.
  function attachTo(target){
    if (!target) return;
    var els;
    if (target.nodeType === 1) els = [target];
    else if (target.length != null) els = Array.prototype.slice.call(target);
    else return;

    els.forEach(function(el){
      if (el._gemaUndoAttached) return;
      el._gemaUndoAttached = true;
      var focusVal = null;
      el.addEventListener('focus', function(){
        focusVal = el.value;
      });
      var onCommit = function(){
        var newVal = el.value;
        if (focusVal == null || newVal === focusVal) return;
        var label = (el.getAttribute('data-undo-label') || el.name || el.id || 'Eingabe') + ': ' + _shortStr(focusVal) + ' → ' + _shortStr(newVal);
        (function(elRef, ov){
          record(label, ov, newVal, function(v){
            elRef.value = v;
            try {
              elRef.dispatchEvent(new Event('input',  { bubbles: true }));
              elRef.dispatchEvent(new Event('change', { bubbles: true }));
            } catch(e) {}
          });
        })(el, focusVal);
        focusVal = newVal;
      };
      el.addEventListener('change', onCommit);
      el.addEventListener('blur',   onCommit);
    });
  }
  function _shortStr(v){
    var s = String(v == null ? '' : v);
    if (s.length > 18) s = s.slice(0, 15) + '…';
    return s || '∅';
  }

  // ── Keyboard Shortcuts ──
  function _attachKeys(){
    if (_keyHandler) return;
    _keyHandler = function(e){
      if (!_moduleKey) return;
      var meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      // In editierbaren Elementen darf der Browser sein eigenes Undo machen —
      // nur wenn das Element KEIN Input/Textarea ist, greifen wir zu.
      var tag = (e.target && e.target.tagName || '').toUpperCase();
      var isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable);
      if (e.key === 'z' || e.key === 'Z'){
        if (e.shiftKey){
          if (!isEditable && canRedo()){ e.preventDefault(); redo(); }
        } else {
          if (!isEditable && canUndo()){ e.preventDefault(); undo(); }
        }
      } else if (e.key === 'y' || e.key === 'Y'){
        if (!isEditable && canRedo()){ e.preventDefault(); redo(); }
      }
    };
    document.addEventListener('keydown', _keyHandler);
  }

  // ── History-Panel (optional UI) ──
  function _ensurePanelStyles(){
    if (document.getElementById('gema-undo-styles')) return;
    var css = [
      '.gu-panel{position:fixed;bottom:24px;left:24px;z-index:' + Z + ';background:#fff;border:1.5px solid #cdd4e4;border-radius:12px;box-shadow:0 12px 32px rgba(0,0,0,.15);font-family:"DM Sans",ui-sans-serif,system-ui,sans-serif;color:#111827;min-width:260px;max-width:320px;overflow:hidden}',
      '.gu-panel-hd{padding:8px 12px;border-bottom:1px solid #e2e7f0;background:#f8faff;display:flex;align-items:center;gap:8px;font-size:12px;font-weight:800}',
      '.gu-panel-hd .gu-title{flex:1}',
      '.gu-panel-hd button{border:1px solid #cdd4e4;background:#fff;border-radius:6px;width:24px;height:24px;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0}',
      '.gu-panel-hd button:hover{background:#eff6ff;border-color:#bfdbfe;color:#2563eb}',
      '.gu-panel-hd button:disabled{opacity:.35;cursor:not-allowed}',
      '.gu-panel-bd{max-height:220px;overflow-y:auto;padding:4px 0}',
      '.gu-entry{padding:5px 12px;font-size:11px;border-left:3px solid transparent;color:#6b7280;cursor:default}',
      '.gu-entry.current{background:#eff6ff;border-left-color:#2563eb;color:#111827;font-weight:600}',
      '.gu-entry-label{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.gu-entry-time{font-size:10px;opacity:.6}',
      '.gu-empty{padding:14px;text-align:center;color:#9ca3af;font-size:11px}',
      '@media(max-width:700px){.gu-panel{left:12px;bottom:12px;min-width:220px;max-width:calc(100vw - 24px)}}'
    ].join('\n');
    var s = document.createElement('style');
    s.id = 'gema-undo-styles';
    s.textContent = css;
    document.head.appendChild(s);
  }

  function showPanel(){
    _ensurePanelStyles();
    if (_panel) { _renderPanel(); return; }
    _panel = document.createElement('div');
    _panel.className = 'gu-panel';
    document.body.appendChild(_panel);
    _renderPanel();
  }
  function hidePanel(){
    if (_panel && _panel.parentNode) _panel.parentNode.removeChild(_panel);
    _panel = null;
  }
  function _renderPanel(){
    if (!_panel) return;
    var n = _stack.length;
    var body = '';
    if (!n) {
      body = '<div class="gu-empty">Noch keine Änderungen protokolliert.</div>';
    } else {
      // Neueste zuoberst
      for (var i = n - 1; i >= 0; i--){
        var e = _stack[i];
        var isCurrent = i === _pos;
        var t = new Date(e.time);
        var hh = ('0' + t.getHours()).slice(-2), mm = ('0' + t.getMinutes()).slice(-2), ss = ('0' + t.getSeconds()).slice(-2);
        body += '<div class="gu-entry' + (isCurrent ? ' current' : '') + '">'
          + '<span class="gu-entry-label">' + (isCurrent ? '● ' : '○ ') + _escapeHtml(e.label) + '</span>'
          + '<span class="gu-entry-time">' + hh + ':' + mm + ':' + ss + '</span>'
          + '</div>';
      }
    }
    _panel.innerHTML =
      '<div class="gu-panel-hd">'
    +   '<span class="gu-title">↶ Eingabe-History</span>'
    +   '<button data-act="undo" ' + (canUndo() ? '' : 'disabled') + ' title="Rückgängig (Cmd/Ctrl+Z)">↶</button>'
    +   '<button data-act="redo" ' + (canRedo() ? '' : 'disabled') + ' title="Wiederherstellen (Cmd/Ctrl+Shift+Z)">↷</button>'
    +   '<button data-act="clear" title="Verlauf leeren">✕</button>'
    +   '<button data-act="hide" title="Panel schliessen">⊙</button>'
    + '</div>'
    + '<div class="gu-panel-bd">' + body + '</div>';
    _panel.querySelectorAll('[data-act]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var act = btn.getAttribute('data-act');
        if (act === 'undo') undo();
        else if (act === 'redo') redo();
        else if (act === 'clear') clear();
        else if (act === 'hide') hidePanel();
      });
    });
  }

  function _escapeHtml(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(m){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]);
    });
  }

  // Mini-Toast unten rechts (falls das Modul keinen eigenen toast() hat)
  var _toastTimer = null;
  function _toast(msg){
    if (typeof window.toast === 'function') { try { window.toast(msg); return; } catch(e) {} }
    var el = document.getElementById('gemaUndoToast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'gemaUndoToast';
      el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:9px 18px;border-radius:10px;font-family:"DM Sans",system-ui,sans-serif;font-size:12px;font-weight:600;z-index:' + (Z + 10) + ';box-shadow:0 8px 24px rgba(0,0,0,.3);pointer-events:none;opacity:0;transition:opacity .2s';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = '1';
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(function(){ el.style.opacity = '0'; }, 1800);
  }

  // ── Public API ──
  w.GemaUndo = {
    init: init,
    record: record,
    attachTo: attachTo,
    undo: undo,
    redo: redo,
    canUndo: canUndo,
    canRedo: canRedo,
    clear: clear,
    getHistory: getHistory,
    onChange: onChange,
    showPanel: showPanel,
    hidePanel: hidePanel
  };
})(window);
