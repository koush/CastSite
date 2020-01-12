var host;
var hostPlayer;
var hostProtocol;

function Controller(w, useXhr) {
  this.window = w;
  this.document = this.window.document;
  this.hookVideo();
  this.useXhr = useXhr;
}

Controller.prototype.loadImage = function(img, url) {
  if (!this.useXhr) {
    img.src = url;
    return;
  }

  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  var thisWindow = this.window;
  xhr.responseType = 'blob';
  xhr.onload = function(e) {
    img.src = thisWindow.URL.createObjectURL(this.response);
  };

  xhr.send();
}

Controller.prototype.getVideoElement = function() {
  return $(this.document).find('video')[0];
}

Controller.prototype.toggleCaptions = function(data) {
  var video = this.getVideoElement();
  if (data.subtitles) {
    var thisDocument = this.document;
    var video = $(thisDocument).find('video');
    video.find('track').remove();
    var track = $('<track default>');
    $(track).attr('kind', 'subtitles');
    $(track).attr('src', data.subtitles);
    $(track).attr('srclang', 'English');
    $(video).attr('crossorigin', 'anonymous');
    $(video).append(track);
    $(track).load(function() {
      $(video).removeAttr('crossorigin');
      // $(video).attr('src', url);
      $.each(video[0].textTracks, function(i, t) {
        t.mode = 'showing';
      });
    })
  }
  else {
    $.each(video.textTracks, function(i, t) {
      if (t.mode != 'showing')
        t.mode = 'showing';
      else
        t.mode = 'hidden';
    });
  }
}

Controller.prototype.stopVideo = function() {
  var v = this.getVideoElement();
  v.src = ''
  this.hideProgress();
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
  this.showProgress();
}

Controller.prototype.resume = function() {
  var v = this.getVideoElement();
  v.play();
  this.showProgressBriefly();
}

Controller.prototype.h264 = function(width, height) {
  $(this.document).find('#splash').hide();
  $(this.document).find('#player').show();
  var video = this.getVideoElement();
  $(video).hide();
  var canvas = $(this.document).find('#mirror')[0];
  $(canvas).show();
  canvas.width = width;
  canvas.height = height;
  return canvas;  
}

Controller.prototype.video_decode = function(width, height) {
  $(this.document).find('#splash').hide();
  $(this.document).find('#player').show();
  var video = this.getVideoElement();
  $(video).hide();
  var canvas = $(this.document).find('#listener')[0];
  $(canvas).show();
  canvas.width = width;
  canvas.height = height;
  $(this.document).find('#mirror').hide();
  
  return new this.window.PepperDecoder(1280, 720)
}

Controller.prototype.webrtc = function(width, height) {
  $(this.document).find('#splash').hide();
  $(this.document).find('#player').show();
  var video = this.getVideoElement();
  $(video).show();
  $(this.document).find('#mirror').hide();
  connectWebRTCSession(sessionUrl, video);
}

Controller.prototype.hookVideo = function() {
  this.getVideoElement().addEventListener('timeupdate', function() {
    var curTime = this.getVideoElement().currentTime;
    var totalTime = this.getVideoElement().duration;
    if (!isNaN(curTime) && !isNaN(totalTime)) {
      var pct = 100 * (curTime / totalTime);
      $(this.document).find('#progress')[0].style.width = pct + '%';
    }
  }.bind(this));

  this.getVideoElement().addEventListener('playing', function() {
    this.showProgressBriefly();
    $(this.document).find('#progress-img').attr('src', 'common/ic_av_play_over_video.png');
    $(this.document).find('#play').attr('style', 'opacity: 100').attr('src', 'common/ic_av_play_over_video.png');
    $(this.document).find('#play').animate({width:'+=200', height: '+=200', opacity: '0'}, 500)
  }.bind(this));

  this.getVideoElement().addEventListener('seeking', function() {
    this.showProgressBriefly();
  }.bind(this));

  this.getVideoElement().addEventListener('ended', function() {
    this.hideProgress();
  }.bind(this));

  this.getVideoElement().addEventListener('pause', function() {
    this.showProgress();
    $(this.document).find('#progress-img').attr('src', 'common/ic_av_pause_over_video.png');
    $(this.document).find('#play').attr('style', 'opacity: 100').attr('src', 'common/ic_av_pause_over_video.png');
    $(this.document).find('#play').animate({width:'+=200', height: '+=200', opacity: '0'}, 500)
  }.bind(this));
}

Controller.prototype.showProgressBriefly = function() {
  $(this.document).find('.progress').stop(true);
  $(this.document).find('.progress').show();
  $(this.document).find('.progress').delay(3000).fadeOut();
}

Controller.prototype.showProgress = function() {
  $(this.document).find('.progress').stop(true);
  $(this.document).find('.progress').show();
}

Controller.prototype.hideProgress = function() {
  $(this.document).find('.progress').stop(true);
  $(this.document).find('.progress').hide();
}

Controller.prototype.volumeChanged = function(newVolume) {
  var bars = $(this.document).find('#volume td div');
  var step = 100 / bars.length;
  
  var tot = 0;
  for (var i = 0; i < step; i++) {
    if (newVolume > tot) {
      $(bars[i]).removeClass('volume-bar-transparent');
    }
    else {
      $(bars[i]).addClass('volume-bar-transparent');
    }
    tot += step;
  }

  $(this.document).find('#volume').stop(true);
  $(this.document).find('#volume').show();
  $(this.document).find('#volume').delay(3000).fadeOut();
}

Controller.prototype.play = function(info) {
  var thisDocument = this.document;
  var thisWindow = this.window;
  var url = info.url;
  var mime = info.mime.toLowerCase();

  if (info.upsell) {
    $(this.document).find('.watermark').show();
  }
  else {
    $(this.document).find('.watermark').hide();
  }

  $(thisDocument).find('#splash').hide();
  $(thisDocument).find('#audio').hide();
  $(thisDocument).find('#player').show();
  $(thisDocument).find('#mirror').hide();

  if (hostPlayer) {
    hostPlayer.unload();
    hostPlayer = null;
  }
  host = null;
  hostProtocol = null;


  if (mime.indexOf('video/') != -1) {
    this.showProgressBriefly();
    
    $(thisDocument).find('#crossfade img').hide();
    var video = $(thisDocument).find('video');
    video.find('track').remove();
    video.show();
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
        t.mode = 'showing';
      });
    })
  }
  else if (mime.indexOf('application/x-mpegurl') === 0) {
    this.showProgressBriefly();

    $(thisDocument).find('#crossfade img').hide();
    var video = $(thisDocument).find('video');
    video.find('track').remove();
    video.show();
    
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
        t.mode = 'showing';
      });
    })
  }
  else if (mime.indexOf('image/') != -1) {
    this.hideProgress();

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
    $(otherImage).hide();
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
      setTimeout(function() {
        $(topImage).toggleClass("transparent");
        $(bottomImage).toggleClass("transparent");
      }, 0);
    }); 

    this.loadImage(otherImage, url);
  }
  else if (mime.indexOf('audio/') != -1) {
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
    $(thisDocument).find('#albumArt').attr('src', 'common/icon.png');
    if (info.albumArt) {
      this.loadImage($(thisDocument).find('#albumArt')[0], info.albumArt);
    }
  }
}