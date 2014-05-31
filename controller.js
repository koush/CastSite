var host;
var hostPlayer;
var hostProtocol;

function Controller(w) {
  this.window = w;
  this.document = this.window.document;
}

Controller.prototype.getVideoElement = function() {
  return $(this.document).find('video')[0];
}

Controller.prototype.toggleCaptions = function() {
  var video = this.getVideoElement();
  $.each(video.textTracks, function(i, t) {
    if (t.mode != 'showing')
      t.mode = 'showing';
    else
      t.mode = 'hidden';
  });
}

Controller.prototype.stopVideo = function() {
  var v = getVideoElement();
  if (v) {
    v.src = ''
  }
}

Controller.prototype.stop = function() {
  this.window.close();
}

Controller.prototype.seek = function(position) {
  var v = this.getVideoElement();
  v.currentTime = position / 1000;
}

Controller.prototype.pause = function() {
  var v = this.getVideoElement();
  v.pause();
}

Controller.prototype.resume = function() {
  var v = this.getVideoElement();
  v.play();
}

Controller.prototype.mirror = function(sessionUrl) {
  $(this.document).find('#splash').hide();
  $(this.document).find('#player').show();
  var video = this.getVideoElement();
  $(video).show();
  connectMirrorSession(sessionUrl, video);
}

Controller.prototype.play = function(info) {
  var thisDocument = this.document;
  var thisWindow = this.window;
  var url = info.url;
  var mime = info.mime.toLowerCase();

  $(thisDocument).find('#splash').hide();
  $(thisDocument).find('#audio').hide();
  $(thisDocument).find('#player').show();

  if (hostPlayer) {
    hostPlayer.unload();
    hostPlayer = null;
  }
  host = null;
  hostProtocol = null;
  this.stopVideo();

  if (mime.indexOf('video/') != -1) {
    $(thisDocument).find('#crossfade img').hide();
    var video = $(thisDocument).find('video');
    video.show();
    $('track').remove();
    if (!info.subtitles) {
      $(video).attr('src', url);
      return;
    }

    var track = $('<track default>');
    $(track).attr('kind', 'subtitles');
    $(track).attr('src', info.subtitles);
    $(track).attr('srclang', 'English');
    $(video).attr('crossorigin', 'anonymous');
    $(video).append(track);
    $(track).load(function() {
      $(video).removeAttr('crossorigin');
      $(video).attr('src', url);
      $.each(video[0].textTracks, function(i, t) {
        t.mode = 'hidden';
      });
    })
  }
  else if (mime.indexOf('application/x-mpegurl') === 0) {
    if (true) return;

    $(thisDocument).find('#crossfade img').hide();
    var video = $(thisDocument).find('video');
    video.show();
    $('track').remove();
    
    var loadSrc = function() {
      host = new cast.player.api.Host({'mediaElement': video[0], 'url': url});
      host.onError = function(errorCode) {
        console.log("Fatal Error - "+errorCode);
        if (hostPlayer) {
          hostPlayer.unload();
          hostPlayer = null;
        }
      };

      hostProtocol = cast.player.api.CreateHlsStreamingProtocol(host);
      hostPlayer = new cast.player.api.Player(host);
      hostPlayer.load(hostProtocol, 0);
    }

    if (!info.subtitles) {
      loadSrc();
      return;
    }
    
    var track = $('<track default>');
    $(track).attr('kind', 'subtitles');
    $(track).attr('src', info.subtitles);
    $(track).attr('srclang', 'English');
    $(video).attr('crossorigin', 'anonymous');
    $(video).append(track);
    $(track).load(function() {
      $(video).removeAttr('crossorigin');
      loadSrc();
      $.each(video[0].textTracks, function(i, t) {
        t.mode = 'hidden';
      });
    })
  }
  else if (mime.indexOf('image/') != -1) {
    $(thisDocument).find('video').hide();
    $(thisDocument).find('#audio').hide();
    var imgs = $(thisDocument).find('#crossfade img');
    var visibleImage;
    var otherImage;
    var topImage = imgs[1];
    var bottomImage = imgs[0];
    if ($(topImage).hasClass('transparent')) {
      visibleImage = bottomImage;
      otherImage = topImage;
      $(bottomImage).removeClass("transparent");
    }
    else {
      visibleImage = topImage;
      otherImage = bottomImage;
      $(bottomImage).addClass("transparent");
    }
    imgs.unbind('load');
    otherImage.src = '';
    $(otherImage).load(function() {
      var player = $(thisDocument).find('#player');
      var clampWidth = player.innerWidth();
      var clampHeight = player.innerHeight();
      var xratio = this.naturalWidth / clampWidth;
      var yratio = this.naturalHeight / clampHeight;
      var ratio = Math.max(xratio, yratio);
      var w = this.naturalWidth / ratio;
      var h = this.naturalHeight / ratio;
      var ml = (clampWidth - w) / 2;
      var mt = (clampHeight - h) / 2;
      $(this).css('margin-left', ml);
      $(this).css('margin-top', mt);
      $(this).width(w);
      $(this).height(h);
      $(this).show();
      // player.append(topImage);
      $(topImage).toggleClass("transparent");
      $(bottomImage).toggleClass("transparent");
    }); 
   
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';
    xhr.onload = function(e) {
      otherImage.src = thisWindow.URL.createObjectURL(this.response);
    };

    xhr.send();
  }
  else if (mime.indexOf('audio/') != -1) {
    $(receiverWindow.contentWindow.document).find('video').remove();
    $(receiverWindow.contentWindow.document).find('#crossfade img').hide();
    $(receiverWindow.contentWindow.document).find('#audio').show();
    $(receiverWindow.contentWindow.document).find('.media').append($('<video id="video" autoplay></video>'));
    var video = getVideoElement();
    video.src = url;
    video.onloadeddata = function() {
      thisDocument.doMusicWithVideoObject();
    };
    $(thisDocument).find('#album').text(info.album);
    $(thisDocument).find('#song').text(info.title);
    $(thisDocument).find('#albumArt').attr('src', 'icon.png');
    if (info.albumArt) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', info.albumArt, true);
      xhr.responseType = 'blob';
      xhr.onload = function(e) {
        $(thisDocument).find('#albumArt').attr('src',
          thisWindow.URL.createObjectURL(this.response));
      };
      xhr.send();
    }
  }
}