function getValue(obj, keys) {
  for (var i = 0; i < keys.length; i++) {
    if (obj === null || obj === undefined) {
      return '';                    // default to an empty string
    } else {
      obj = obj[keys[i]];
    }
  }
  return obj;
}

window.onload = function() {
  window.controller = new Controller(window);

  window.castReceiverManager = cast.receiver.CastReceiverManager.getInstance();
  window.castReceiverManager.getCastMessageBus('urn:x-cast:com.koushikdutta.cast').onMessage = function(e) {
    window.controller.toggleCaptions();
  }
  
  window.mediaManager = new cast.receiver.MediaManager(document.getElementById('video'));
  var origPause = window.mediaManager.onPause;
  window.mediaManager.onPause = function(event) {
    origPause(event);
    window.controller.showProgress();
  }
  var origPlay = window.mediaManager.onPlay;
  window.mediaManager.onPlay = function(event) {
    origPlay(event);
    window.controller.showProgressBriefly();
  }
  var origSeek = window.mediaManager.onSeek;
  window.mediaManager.onSeek = function(event) {
    origSeek(event);
    window.controller.showProgressBriefly();
  }
  var origStop = window.mediaManager.onStop;
  window.mediaManager.onStop = function(event) {
    origStop(event);
    window.controller.hideProgress();
  }
  window.mediaManager.onLoad = function(event) {
    var autoplay = getValue(event.data, ['autoplay']);
    window.controller.getVideoElement().autoplay = autoplay || true;

    var info = {
      disableVisualizations: true,
      url: getValue(event.data, ['media', 'contentId']),
      album: getValue(event.data, ['media', 'metadata', 'subtitle']),
      title: getValue(event.data, ['media', 'metadata', 'title']),
      subtitles: getValue(event.data, ['media', 'customData', 'subtitles']),
      albumArt: getValue(event.data, ['media', 'metadata', 'images', 0, 'url']),
      mime: getValue(event.data, ['media', 'contentType']),
    }
    
    window.controller.play(info);
  }

  window.castReceiverManager.start(window.castReceiverManager);
  cast.receiver.logger.setLevelValue(cast.receiver.LoggerLevel.DEBUG);
  cast.player.api.setLoggerLevel(cast.player.api.LoggerLevel.DEBUG);
}
