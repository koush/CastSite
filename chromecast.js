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
  window.mediaElement = document.getElementById('video');
  window.mediaManager = new cast.receiver.MediaManager(window.mediaElement);
  window.castReceiverManager = cast.receiver.CastReceiverManager.getInstance();
  window.castReceiverManager.start();
  window.controller = new Controller(window);
  
  window.mediaManager.onLoad = function(event) {
    var info = {
      url: getValue(event.data, ['media', 'contentId']),
      album: getValue(event.data, ['media', 'metadata', 'subtitle']),
      subtitles: getValue(event.data, ['media', 'customData', 'subtitles']),
      albumArt: getValue(event.data, ['media', 'metadata', 'images', 0, 'url']),
      mime: getValue(event.data, ['media', 'contentType']),
    }
    
    window.controller.play(info);
  }
}
