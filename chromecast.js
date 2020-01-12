// fix for captioning or something
window['VTTCue'] = window['VTTCue'] || window['TextTrackCue'];

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
    try {
      var data = JSON.parse(e.data);
    }
    catch (e) {
      data = {};
    }
    window.controller.toggleCaptions(data);
  }

  window.mediaManager = new cast.receiver.MediaManager(document.getElementById('video'));
  
  window.mediaManager.addEventListener('setvolume', function(e) {
    window.controller.volumeChanged(e.data.volume.level * 100);
  });
  
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
      upsell: getValue(event.data, ['media', 'customData', 'upsell']),
    }
    
    window.controller.play(info);
  }

  window.castReceiverManager.start(window.castReceiverManager);
  cast.receiver.logger.setLevelValue(cast.receiver.LoggerLevel.DEBUG);
  cast.player.api.setLoggerLevel(cast.player.api.LoggerLevel.DEBUG);
}
