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
  var v = this.getVideoElement();
  v.src = ''
  $(this.document).find('.progress').hide();
}

Controller.prototype.stop = function() {
  this.window.close();
}

Controller.prototype.seek = function(position) {
  var v = this.getVideoElement();
  v.currentTime = position / 1000;
  this.showProgressBriefly();
}

Controller.prototype.pause = function() {
  var v = this.getVideoElement();
  v.pause();
  $(this.document).find('.progress').show();
}

Controller.prototype.resume = function() {
  var v = this.getVideoElement();
  v.play();
  this.showProgressBriefly();
}

Controller.prototype.mirror = function(sessionUrl) {
  $(this.document).find('#splash').hide();
  $(this.document).find('#player').show();
  var video = this.getVideoElement();
  $(video).show();
  connectMirrorSession(sessionUrl, video);
}

Controller.prototype.hookVideo = function() {
  this.getVideoElement().ontimeupdate = function() {
    var curTime = this.getVideoElement().currentTime;
    var totalTime = this.getVideoElement().duration;
    if (!isNaN(curTime) && !isNaN(totalTime)) {
      var pct = 100 * (curTime / totalTime);
      $(this.document).find('#progress')[0].style.width = pct + '%';
    }
  }.bind(this);
  
  this.getVideoElement().onplaying = function() {
    this.showProgressBriefly();
  }.bind(this);

  this.getVideoElement().onseeking = function() {
    this.showProgressBriefly();
  }.bind(this);

  this.getVideoElement().onended = function() {
    $(this.document).find('.progress').hide();
  }.bind(this);

  this.getVideoElement().onpause = function() {
    this.showProgress();
  }.bind(this);
}

Controller.prototype.showProgressBriefly = function() {
  $(this.document).find('.progress').show();
  $(this.document).find('.progress').delay(3000).fadeOut();
}

Controller.prototype.showProgress = function() {
  $(this.document).find('.progress').show();
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

  if (mime.indexOf('video/') != -1) {
    this.hookVideo();
    this.showProgressBriefly();
    
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
    this.hookVideo();
    this.showProgressBriefly();

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
    this.stopVideo();
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
    this.hookVideo();
    this.showProgressBriefly();

    this.stopVideo();
    $(thisDocument).find('#crossfade img').hide();
    $(thisDocument).find('#audio').show();
    if (!info.disableVisualizations) {
      $(thisDocument).find('video').remove();
      $(thisDocument).find('.media').append($('<video id="video" autoplay></video>'));
      this.hookVideo();
    }
    var video = this.getVideoElement();
    video.src = url;
    if (!info.disableVisualizations) {
      thisWindow.doMusicWithVideoObject();
    }
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