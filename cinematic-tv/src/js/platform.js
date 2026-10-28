/* Cinematic TV: isolated public Tizen APIs. No Samsung Home/Settings key interception. */
(function (w) {
  'use strict';
  var t = w.tizen, isTV = !!(t && t.application), iconCache = {};
  function error(cb, e) { if (typeof cb === 'function') cb(e && e.message ? e.message : String(e || 'Unsupported on this TV')); }
  function sameSource(a, b) { return !!(a && b && a.type === b.type && Number(a.number) === Number(b.number)); }

  /* A single owner serialises TVWindow calls. HDMI video is a hardware plane, not an HTML
   * video element. Only an explicit press of OK may open a source full-screen. */
  function createVideoController(tv) {
    var generation = 0, tail = Promise.resolve(), owner = 'none', visible = false;
    var originalSource = null, previewSource = null, lastError = '', lastOperation = 'Idle';
    var timeoutMs = 2400;
    function enqueue(job) {
      var task = tail.catch(function () {}).then(job);
      tail = task.catch(function () {});
      return task;
    }
    function setSource(s) {
      return new Promise(function (resolve, reject) {
        var settled = false, timer = setTimeout(function () { if (!settled) { settled = true; reject(new Error('HDMI source change timed out')); } }, timeoutMs);
        function done() { if (settled) return; settled = true; clearTimeout(timer); resolve(); }
        function fail(e) { if (settled) return; settled = true; clearTimeout(timer); reject(e || new Error('HDMI source change failed')); }
        try { tv.setSource(s, done, fail, 'MAIN'); } catch (e) { fail(e); }
      });
    }
    function show(rect) {
      return new Promise(function (resolve, reject) {
        var settled = false, timer = setTimeout(function () { if (!settled) { settled = true; reject(new Error('Video window timed out')); } }, timeoutMs);
        function done() { if (settled) return; settled = true; clearTimeout(timer); resolve(); }
        function fail(e) { if (settled) return; settled = true; clearTimeout(timer); reject(e || new Error('Video window failed')); }
        try { tv.show(done, fail, rect, 'MAIN', 'FRONT'); } catch (e) { fail(e); }
      });
    }
    function hide() {
      return new Promise(function (resolve, reject) {
        var settled = false, timer = setTimeout(function () { if (!settled) { settled = true; reject(new Error('Hide video timed out')); } }, timeoutMs);
        function done() { if (settled) return; settled = true; clearTimeout(timer); resolve(); }
        function fail(e) { if (settled) return; settled = true; clearTimeout(timer); reject(e || new Error('Hide video failed')); }
        try { tv.hide(done, fail, 'MAIN'); } catch (e) { fail(e); }
      });
    }
    async function finishPreview() {
      if (owner !== 'preview' && !originalSource) return;
      var initial = originalSource, failure = null;
      // Always attempt both hide and restore, even if one operation fails.
      if (visible) { try { await hide(); } catch (e) { failure = e; } }
      visible = false;
      if (initial) {
        try {
          var current = tv.getSource('MAIN');
          // Do not undo a source change made outside this launcher, e.g. Samsung remote.
          if (sameSource(current, previewSource) && !sameSource(current, initial)) await setSource(initial);
        } catch (e) { failure = failure || e; }
      }
      owner = 'none'; originalSource = null; previewSource = null;
      if (failure) throw failure;
    }
    function preview(source, rect, ok, fail) {
      var token = ++generation;
      if (!tv || !source || !Array.isArray(rect) || rect.length !== 4) {
        error(fail, 'HDMI preview requires a connected TV source and a valid rectangle');
        return Promise.resolve(false);
      }
      return enqueue(async function () {
        if (token !== generation) return false;
        if (owner === 'fullscreen') { error(fail, 'Close fullscreen input first'); return false; }
        try {
          if (owner !== 'preview') {
            originalSource = tv.getSource('MAIN');
            if (!originalSource) throw new Error('Cannot establish original source; preview skipped');
            owner = 'preview';
          }
          if (visible) { await hide(); visible = false; }
          if (token !== generation) return false;
          lastOperation = 'Changing preview source';
          previewSource = source;
          await setSource(source);
          if (token !== generation) return false; // A queued cancellation restores the source.
          lastOperation = 'Displaying HDMI thumbnail';
          await show(rect);
          visible = true;
          if (token !== generation) return false;
          lastOperation = 'HDMI preview active'; lastError = '';
          if (ok) ok();
          return true;
        } catch (e) {
          lastError = e.message || String(e); lastOperation = 'Preview unavailable';
          if (token === generation) error(fail, e);
          try { await finishPreview(); } catch (ignored) {}
          return false;
        }
      });
    }
    function stopPreview() {
      ++generation;
      if (!tv) return Promise.resolve();
      return enqueue(async function () {
        if (owner === 'preview' || originalSource) {
          lastOperation = 'Restoring source';
          try { await finishPreview(); lastOperation = 'Preview stopped'; }
          catch (e) { lastError = e.message || String(e); lastOperation = 'Restore failed'; }
        }
      });
    }
    function openFullscreen(source, ok, fail) {
      var token = ++generation;
      if (!tv || !source) { error(fail, 'HDMI source unavailable'); return Promise.resolve(false); }
      return enqueue(async function () {
        if (token !== generation) return false;
        try {
          await finishPreview();
          if (visible && owner === 'fullscreen') { await hide(); visible = false; owner = 'none'; }
          if (token !== generation) return false;
          lastOperation = 'Opening HDMI input';
          await setSource(source);
          owner = 'fullscreen';
          if (token !== generation) return false;
          await show(['0px', '0px', '1920px', '1080px']);
          visible = true;
          if (token !== generation) return false;
          lastOperation = 'Fullscreen HDMI'; lastError = '';
          if (ok) ok();
          return true;
        } catch (e) {
          lastError = e.message || String(e); lastOperation = 'Fullscreen HDMI failed';
          if (token === generation) error(fail, e);
          return false;
        }
      });
    }
    function leaveFullscreen() {
      ++generation;
      if (!tv) return Promise.resolve();
      return enqueue(async function () {
        if (owner !== 'fullscreen') return;
        try { if (visible) await hide(); lastOperation = 'Fullscreen HDMI closed'; }
        catch (e) { lastError = e.message || String(e); lastOperation = 'Fullscreen exit failed'; }
        visible = false; owner = 'none';
        // Deliberate HDMI switch: do not silently return the input to the original source.
      });
    }
    function status() { return {owner:owner, visible:visible, operation:lastOperation, lastError:lastError, sourceSaved:!!originalSource}; }
    return {preview:preview, stopPreview:stopPreview, openFullscreen:openFullscreen, leaveFullscreen:leaveFullscreen, status:status};
  }

  var video = createVideoController(isTV && t.tvwindow ? t.tvwindow : null);
  var P = {
    isTV:isTV,
    currentId:function () { try { return t.application.getAppInfo().id; } catch (e) { return ''; } },
    getApps:function (ok, fail) { if (!isTV) { ok(P.demoApps()); return; }
      try { t.application.getAppsInfo(ok, function (e) { error(fail, e); }); } catch (e) { error(fail, e); } },
    launch:function (id, ok, fail) { if (!isTV) { error(fail, 'Apps only launch on the Samsung TV'); return; }
      try { t.application.launch(id, function () { if (ok) ok(); }, function (e) { error(fail, e); }); } catch (e) { error(fail, e); } },
    listInputs:function (ok, fail) { if (!isTV) { ok(P.demoInputs()); return; }
      try { t.systeminfo.getPropertyValue('VIDEOSOURCE', ok, function (e) { error(fail, e); }); } catch (e) { error(fail, e); } },
    watchInputs:function (cb) { if (!isTV) return function () {};
      try { var id = t.systeminfo.addPropertyValueChangeListener('VIDEOSOURCE', cb); return function () { try { t.systeminfo.removePropertyValueChangeListener(id); } catch (e) {} }; }
      catch (e) { return function () {}; } },
    resolveIcon:function (path, cb) { if (!path) { cb(''); return; } if (iconCache[path] !== undefined) { cb(iconCache[path]); return; }
      if (!isTV || /^(https?:|data:|file:|wgt:)/i.test(path)) { iconCache[path] = path; cb(path); return; }
      if (!t.filesystem || !t.filesystem.resolve) { cb(path); return; }
      var done = false, timer = setTimeout(function () { if (!done) { done = true; cb(path); } }, 1100);
      try { t.filesystem.resolve(path, function (f) { if (done) return; done = true; clearTimeout(timer); var value = f.toURI(); iconCache[path] = value; cb(value); },
        function () { if (done) return; done = true; clearTimeout(timer); cb(path); }, 'r'); }
      catch (e) { if (!done) { done = true; clearTimeout(timer); cb(path); } }
    },
    preview:function (source, rect, ok, fail) { return video.preview(source, rect, ok, fail); },
    stopPreview:function () { return video.stopPreview(); },
    showInputFullscreen:function (source, ok, fail) { return video.openFullscreen(source, ok, fail); },
    leaveFullscreen:function () { return video.leaveFullscreen(); },
    videoStatus:function () { return video.status(); },
    exit:function () { if (!isTV) return; try { t.application.getCurrentApplication().exit(); } catch (e) {} },
    demoApps:function () { return ['YouTube','Crunchyroll','Apple TV','Netflix','Paramount+','Disney+','Prime Video','Hue Sync','BBC iPlayer','ITVX','Channel 4','5','Spotify','Plex','Twitch','SmartThings','Samsung Health'].map(function (n,i) { return {id:'demo.' + i,name:n,show:true}; }); },
    demoInputs:function () { return {connected:[{type:'HDMI',number:1,editName:'PC'}],disconnected:[{type:'HDMI',number:2},{type:'HDMI',number:3},{type:'HDMI',number:4}]}; },
    diagnostics:function () { return {mode:isTV?'Tizen TV':'Browser demonstration',appDiscovery:!!(isTV&&t.application&&t.application.getAppsInfo),inputs:!!(isTV&&t.systeminfo),hdmiPreview:!!(isTV&&t.tvwindow),fileSystem:!!(isTV&&t.filesystem),video:video.status()}; }
  };
  w.LauncherPlatform = P;
})(window);
