/**
 * Copyright 2014 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
 
/**
 * @fileoverview Receiver / Player sample
 * <p>
 * This sample demonstrates how to build your own Receiver for use with Google
 * Cast. One of the goals of this sample is to be fully UX compliant.
 * </p>
 * <p>
 * A receiver is typically an HTML5 application with a html, css, and JavaScript
 * components. It demonstrates the following Cast Receiver API's:
 * </p>
 * <ul>
 * <li>CastReceiverManager</li>
 * <li>MediaManager</li>
 *   <ul>
 *   <li>onLoad</li>
 *   <li>onStop</li>
 *   </ul>
 * </ul>
 * <p>
 * It also demonstrates the following player functions:
 * </p>
 * <ul>
 * <li>Branding Screen</li>
 * <li>Playback Complete image</li>
 * <li>Limited Animation</li>
 * <li>Buffering Indicator</li>
 * <li>Seeking</li>
 * <li>Pause indicator</li>
 * <li>Loading Indicator</li>
 * </ul>
 *
 */

'use strict';

// Create the namespace
 
window.sampleplayer = window.sampleplayer || {};

/**
 * The amount of time in a given state before the player goes idle.
 */
sampleplayer.IDLE_TIMEOUT = {
  LAUNCHING: 30 * 1000,    // 30 seconds
  LOADING: 3000 * 1000,    // 50 minutes
  PAUSED: 30 * 1000,       // 10 minutes normally, use 30 seconds for demo
  STALLED: 30 * 1000,      // 30 seconds
  DONE: 30 * 1000,         // 5 minutes normally, use 30 seconds for demo
  IDLE: 30 * 1000          // 5 minutes normally, use 30 seconds for demo
};

/**
 * Describes the type of media being played
 *
 * @enum {string}
 */
sampleplayer.Type = {
  IMAGE: 'image',
  VIDEO: 'video'
};

/**
 * Describes the state of the player
 *
 * @enum {string}
 */
sampleplayer.State = {
  LAUNCHING: 'launching',
  LOADING: 'loading',
  BUFFERING: 'buffering',
  PLAYING: 'playing',
  PAUSED: 'paused',
  STALLED: 'stalled',
  DONE: 'done',
  IDLE: 'idle'
};

/**
 * <p>
 * If we are running only in Chrome, then run with only the player - let's us
 * test things. If on a Chromecast then we get everything and remote control
 * should work.
 * </p>
 * <p>
 * In the Chromecast case, we:
 * </p>
 * <ol>
 * <li>Get and start the CastReceiver</li>
 * <li>Setup the slideshow channel</li>
 * <li>Start the player (this)</li>
 * </ol>
 *
 * @param {Element} element the element to attach the player
 * @constructor
 * @export
 */
window.onload = function() {
  var userAgent = window.navigator.userAgent;
  var playerDiv = document.getElementById('player');
// If you want to do some development using the Chrome browser, and then run on
// a Chromecast you can check the userAgent to see what your running on, then
// you would only initialize the receiver code when you are actually on a
// Chromecast device.
  if (!((userAgent.indexOf('CrKey') > -1) || (userAgent.indexOf('TV') > -1))) {
	  window.player = new sampleplayer.CastPlayer(playerDiv);
  } else {
	  window.castreceiver = cast.receiver.CastReceiverManager.getInstance();
	  window.player = new sampleplayer.CastPlayer(playerDiv);
	  window.castreceiver.start(window.castreceiver);
  }
}

/**
 * <p>
 * Cast player constructor - This does the following:
 * </p>
 * <ol>
 * <li>Bind a listener to visibilitychange</li>
 * <li>Set the default state</li>
 * <li>Bind event listeners for img & video tags<br />
 *  error, stalled, waiting, playing, pause, ended, timeupdate, seeking, &
 *  seeked</li>
 * <li>Find and remember the various elements</li>
 * <li>Create the MediaManager and bind to onLoad & onStop</li>
 * </ol>
 *
 * @param {Element} element the element to attach the player
 * @constructor
 * @export
 */
sampleplayer.CastPlayer = function(element) {

  /**
   * The DOM element the player is attached.
   * @private {Element}
   */
  this.element_ = element;
// We want to know when the user changes from watching our content to watching
// another element, such as broadcast TV, or another HDMI port.  This will only
// fire when CEC supports it in the TV.
  this.element_.ownerDocument.addEventListener(
      'webkitvisibilitychange', this.onVisibilityChange_.bind(this), false);

  /**
   * The current state of the player
   * @private {sampleplayer.State}
   */
  this.state_;
  this.setState_(sampleplayer.State.LAUNCHING);

  /**
   * The image element.
   * @private {HTMLImageElement}
   */
  this.imageElement_ = /** @type {HTMLImageElement} */
      (this.element_.querySelector('img'));
  this.imageElement_.addEventListener('error', this.onError_.bind(this), false);

  /**
   * The media element
   * @private {HTMLMediaElement}
   */
  this.mediaElement_ = /** @type {HTMLMediaElement} */
      (this.element_.querySelector('video'));
  this.mediaElement_.addEventListener('error', this.onError_.bind(this), false);
  this.mediaElement_.addEventListener('stalled', this.onStalled_.bind(this),
      false);
  this.mediaElement_.addEventListener('waiting', this.onBuffering_.bind(this),
      false);
  this.mediaElement_.addEventListener('playing', this.onPlaying_.bind(this),
      false);
  this.mediaElement_.addEventListener('pause', this.onPause_.bind(this), false);
  this.mediaElement_.addEventListener('ended', this.onEnded_.bind(this), false);
  this.mediaElement_.addEventListener('timeupdate', this.onProgress_.bind(this),
      false);
  this.mediaElement_.addEventListener('seeking', this.onSeekStart_.bind(this),
      false);
  this.mediaElement_.addEventListener('seeked', this.onSeekEnd_.bind(this),
      false);

  this.progressBarInnerElement_ = this.element_.querySelector(
      '.controls-progress-inner');
  this.progressBarThumbElement_ = this.element_.querySelector(
      '.controls-progress-thumb');
  this.curTimeElement_ = this.element_.querySelector('.controls-cur-time');
  this.totalTimeElement_ = this.element_.querySelector('.controls-total-time');

  /**
   * The remote media object
   * @private {cast.receiver.MediaManager}
   */
  this.mediaManager_ = new cast.receiver.MediaManager(this.mediaElement_);
  this.mediaManager_.onLoad = this.onLoad_.bind(this);
  this.mediaManager_.onStop = this.onStop_.bind(this);

};

/**
 * Sets the amount of time before the player is considered idle.
 *
 * @param {number} t the time in milliseconds before the player goes idle
 * @private
 */
sampleplayer.CastPlayer.prototype.setIdleTimeout_ = function(t) {
  clearTimeout(this.idle_);
  if (t) {
    this.idle_ = setTimeout(this.onIdle_.bind(this), t);
  }
};


/**
 * Sets the type of player
 *
 * @param {string} mimeType the mime type of the content
 * @private
 */
sampleplayer.CastPlayer.prototype.setContentType_ = function(mimeType) {
  if (mimeType.indexOf('image/') == 0) {
    this.type_ = sampleplayer.Type.IMAGE;
  } else if (mimeType.indexOf('video/') == 0) {
    this.type_ = sampleplayer.Type.VIDEO;
  }
};


/**
 * Sets the state of the player
 *
 * @param {sampleplayer.State} state the new state of the player
 * @param {boolean=} crossfade true if should cross fade between states
 * @param {number=} delay the amount of time (in ms) to wait
 */
sampleplayer.CastPlayer.prototype.setState_ = function(state, crossfade, delay){
  var self = this;
  clearTimeout(self.delay_);
  if (delay) {
    var func = function() { self.setState_(state, crossfade); };
    self.delay_ = setTimeout(func, delay);
  } else {
    if (!crossfade) {
      self.state_ = state;
      self.element_.className = 'player ' + (self.type_ || '') + ' ' + state;
      self.setIdleTimeout_(sampleplayer.IDLE_TIMEOUT[state.toUpperCase()]);
      console.log('setState(%o)', state);
    } else {
      sampleplayer.fadeOut_(self.element_, 0.75, function() {
        self.setState_(state, false);
        sampleplayer.fadeIn_(self.element_, 0.75);
      });
    }
  }
};

/**
 * Callback called when media has stalled
 *
 */
sampleplayer.CastPlayer.prototype.onStalled_ = function() {
  console.log('onStalled');
  this.setState_(sampleplayer.State.BUFFERING, false);
  if (this.mediaElement_.currentTime) {
    this.mediaElement_.load();  // see if we can restart the process
  }
};

/**
 * Callback called when media is buffering
 *
 */
sampleplayer.CastPlayer.prototype.onBuffering_ = function() {
  console.log('onBuffering');
  if (this.state_ != sampleplayer.State.LOADING) {
    this.setState_(sampleplayer.State.BUFFERING, false);
  }
};

/**
 * Callback called when media has started playing
 *
 */
sampleplayer.CastPlayer.prototype.onPlaying_ = function() {
  console.log('onPlaying');
  var isLoading = this.state_ == sampleplayer.State.LOADING;
  var xfade = isLoading;
  var delay = !isLoading ? 0 : 3000;      // 3 seconds
  this.setState_(sampleplayer.State.PLAYING, xfade, delay);
};

/**
 * Callback called when media has been paused
 *
 */
sampleplayer.CastPlayer.prototype.onPause_ = function() {
  console.log('onPause');
  if (this.state_ != sampleplayer.State.DONE) {
    this.setState_(sampleplayer.State.PAUSED, false);
  }
};


/**
 * Callback called when media has been stopped
 *
 */
sampleplayer.CastPlayer.prototype.onStop_ = function() {
  console.log('onStop');
  var self = this;
  sampleplayer.fadeOut_(self.element_, 0.75, function() {
    self.mediaElement_.pause();
    self.mediaElement_.removeAttribute('src');
    self.imageElement_.removeAttribute('src');
    self.setState_(sampleplayer.State.DONE, false);
    sampleplayer.fadeIn_(self.element_, 0.75);
  });
};


/**
 * Callback called when media has ended
 *
 */
sampleplayer.CastPlayer.prototype.onEnded_ = function() {
  console.log('onEnded');
  this.setState_(sampleplayer.State.DONE, true);
};

/**
 * Callback called when media position has changed
 *
 */
sampleplayer.CastPlayer.prototype.onProgress_ = function() {
  var curTime = this.mediaElement_.currentTime;
  var totalTime = this.mediaElement_.duration;
  if (!isNaN(curTime) && !isNaN(totalTime)) {
    var pct = 100 * (curTime / totalTime);
    this.curTimeElement_.innerText = sampleplayer.formatDuration_(curTime);
    this.totalTimeElement_.innerText = sampleplayer.formatDuration_(totalTime);
    this.progressBarInnerElement_.style.width = pct + '%';
    this.progressBarThumbElement_.style.left = pct + '%';
  }
};

/**
 * Callback called when user starts seeking
 *
 */
sampleplayer.CastPlayer.prototype.onSeekStart_ = function() {
  console.log('onSeekStart');
  clearTimeout(this.seekingTimeout_);
  this.element_.classList.add('seeking');
};

/**
 * Callback called when user stops seeking
 *
 */
sampleplayer.CastPlayer.prototype.onSeekEnd_ = function() {
  console.log('onSeekEnd');
  clearTimeout(this.seekingTimeout_);
  this.seekingTimeout_ = sampleplayer.addClassWithTimeout_(this.element_,
      'seeking', 3000);
};

/**
 * Callback called when media volume has changed - we rely on the pause timer
 * to get us to the right state.  If we are paused for too long, things will
 * close. Otherwise, we can come back, and we start again.
 *
 */
sampleplayer.CastPlayer.prototype.onVisibilityChange_ = function() {
  console.log('onVisibilityChange');
  if (document.webkitHidden) {
    this.mediaElement_.pause();
  } else {
    this.mediaElement_.play();
  }
};

/**
 * Callback called when player enters idle state 
 *
 */
sampleplayer.CastPlayer.prototype.onIdle_ = function() {
  console.log('onIdle');
  if (this.state_ != sampleplayer.State.IDLE) {
    this.setState_(sampleplayer.State.IDLE, true);
  } else {
    window.close();
  }
};

/**
 * Called to handle an error when the media could not be loaded.
 * cast.MediaManager in the Receiver also listens for this event, and it will
 * notify any senders. We choose to just enter the done state, bring up the
 * finished image and let the user either choose to do something else.  We are
 * trying not to put up errors on the second screen.
 *
 */
sampleplayer.CastPlayer.prototype.onError_ = function() {
  console.log('onError');
  this.setState_(sampleplayer.State.DONE, true);
};

/**
 * Called to handle a load request
 * TODO() handle errors better here (i.e. missing contentId, contentType, etc)
 *
 * @param {cast.receiver.MediaManager.Event} event the load event
 */
sampleplayer.CastPlayer.prototype.onLoad_ = function(event) {
  var self = this;

  var title = sampleplayer.getValue_(event.data, ['media', 'metadata', 'title']
      );
  var titleElement = self.element_.querySelector('.media-title');
  sampleplayer.setInnerText_(titleElement, title);

  var subtitle = sampleplayer.getValue_(event.data, ['media', 'metadata',
      'subtitle']);
  var subtitleElement = self.element_.querySelector('.media-subtitle');
  sampleplayer.setInnerText_(subtitleElement, subtitle);

  var artwork = sampleplayer.getValue_(event.data, ['media', 'metadata',
      'images', 0, 'url']);
  var artworkElement = self.element_.querySelector('.media-artwork');
  sampleplayer.setBackgroundImage_(artworkElement, artwork);

  var autoplay = sampleplayer.getValue_(event.data, ['autoplay']);
  var contentId = sampleplayer.getValue_(event.data, ['media', 'contentId']);
  var contentType = sampleplayer.getValue_(event.data, ['media', 'contentType']
      );
  self.setContentType_(contentType);
  self.setState_(sampleplayer.State.LOADING, false);
  switch (self.type_) {
    case sampleplayer.Type.IMAGE:
      self.imageElement_.onload = function() {
        self.setState_(sampleplayer.State.PAUSED, false);
      };
      self.imageElement_.src = contentId || '';
      self.mediaElement_.removeAttribute('src');
      break;
    case sampleplayer.Type.VIDEO:
      self.imageElement_.onload = null;
      self.imageElement_.removeAttribute('src');
      self.mediaElement_.autoplay = autoplay || true;
      self.mediaElement_.src = contentId || '';
      break;
  }
};

/**
 * Get a value from an object multiple levels deep.
 *
 * @param {Object} obj The object.
 * @param {Array} keys The keys keys.
 * @returns {R} the value of the property with the given keys
 * @template R
 */
sampleplayer.getValue_ = function(obj, keys) {
  for (var i = 0; i < keys.length; i++) {
    if (obj === null || obj === undefined) {
      return '';                    // default to an empty string
    } else {
      obj = obj[keys[i]];
    }
  }
  return obj;
};

/**
 * Sets the inner text for the given element.
 *
 * @param {Element} element The element.
 * @param {string} text The text.
 */
sampleplayer.setInnerText_ = function(element, text) {
  element.innerText = text || '';
};

/**
 * Sets the background image for the given element.
 *
 * @param {Element} element The element.
 * @param {string} url The image url.
 */
sampleplayer.setBackgroundImage_ = function(element, url) {
  element.style.backgroundImage = (url ? 'url("' + url + '")' : 'none');
  element.style.display = (url ? '' : 'none');
};

/**
 * Formats the given duration
 *
 * @param {number} dur the duration (in seconds)
 * @return {string} the time (in HH:MM:SS)
 */
sampleplayer.formatDuration_ = function(dur) {
  function digit(n) { return ('00' + Math.floor(n)).slice(-2); }
  var hr = Math.floor(dur / 3600);
  var min = Math.floor(dur / 60) % 60;
  var sec = dur % 60;
  if (!hr) {
    return digit(min) + ':' + digit(sec);
  } else {
    return digit(hr) + ':' + digit(min) + ':' + digit(sec);
  }
};

/**
 * Adds the given className to the given element for the specified amount of
 * time
 *
 * @param {Element} element the element to add the given class
 * @param {string} className the class name to add to the given element
 * @param {number} timeout the amount of time (in ms) the class should be
 *                 added to the given element
 * @return {number} returns a numerical id, which can be used later with
 *                  window.clearTimeout()
 */
sampleplayer.addClassWithTimeout_ = function(element, className, timeout) {
  element.classList.add(className);
  return setTimeout(function() {
    element.classList.remove(className);
  }, timeout);
};

/**
 * Causes the given element to fade in
 *
 * @param {Element} element the element to fade in
 * @param {number} time the amount of time (in seconds) to transition
 * @param {function()=} doneFunc the function to call when complete
 */
sampleplayer.fadeIn_ = function(element, time, doneFunc) {
  sampleplayer.fadeTo_(element, '', time, doneFunc);
};

/**
 * Causes the given element to fade out
 *
 * @param {Element} element the element to fade out
 * @param {number} time the amount of time (in seconds) to transition
 * @param {function()=} doneFunc the function to call when complete
 */
sampleplayer.fadeOut_ = function(element, time, doneFunc) {
  sampleplayer.fadeTo_(element, 0, time, doneFunc);
};

/**
 * Causes the given element to fade to the given opacity
 *
 * @param {Element} element the element to fade in/out
 * @param {string|number} opacity the opacity to transition to
 * @param {number} time the amount of time (in seconds) to transition
 * @param {function()=} doneFunc the function to call when complete
 */
sampleplayer.fadeTo_ = function(element, opacity, time, doneFunc) {
  var listener = null;
  listener = function() {
    element.style.webkitTransition = '';
    element.removeEventListener('webkitTransitionEnd', listener, false);
    if (doneFunc) {
      doneFunc();
    }
  };
  element.addEventListener('webkitTransitionEnd', listener, false);
  element.style.webkitTransition = 'opacity ' + time + 's';
  element.style.opacity = opacity;
};
