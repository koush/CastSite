/*

  Music is by The XX
  @see http://thexx.info

  This is best viewed in Chrome since there is a bug in Safari
  when using getByteFrequencyData with MediaElementAudioSource

  @see http://goo.gl/6WLx1
 */
function doMusicWithVideoObject(url) {
  $('canvas').remove();
  var v = $('video')[0];
  doMusic(v);
  v.play();
}

function doMusic(AUDIO_PATH_OR_OBJECT) {
(function() {
  var ALPHA, AudioAnalyser, COLORS, NUM_BANDS, NUM_PARTICLES, Particle, SCALE, SIZE, SMOOTHING, SPEED, SPIN;

  NUM_PARTICLES = 150;

  NUM_BANDS = 128;

  SMOOTHING = 0.5;

  SCALE = {
    MIN: 5.0,
    MAX: 80.0
  };

  SPEED = {
    MIN: 0.2,
    MAX: 1.0
  };

  ALPHA = {
    MIN: 0.8,
    MAX: 0.9
  };

  SPIN = {
    MIN: 0.001,
    MAX: 0.005
  };

  SIZE = {
    MIN: 0.5,
    MAX: 1.25
  };

  COLORS = ['#69D2E7', '#1B676B', '#BEF202', '#EBE54D', '#00CDAC', '#1693A5', '#F9D423', '#FF4E50', '#E7204E', '#0CCABA', '#FF006F'];

  AudioAnalyser = (function() {
    AudioAnalyser.AudioContext = self.AudioContext || self.webkitAudioContext;

    AudioAnalyser.enabled = AudioAnalyser.AudioContext != null;

    function AudioAnalyser(audio, numBands, smoothing) {
      var src;
      this.audio = audio != null ? audio : new Audio();
      this.numBands = numBands != null ? numBands : 256;
      this.smoothing = smoothing != null ? smoothing : 0.3;
      if (typeof this.audio === 'string') {
        src = this.audio;
        this.audio = new Audio();
        this.audio.controls = true;
        this.audio.src = src;
      }
      this.context = new AudioAnalyser.AudioContext();
      this.jsNode = this.context.createJavaScriptNode(2048, 1, 1);
      this.analyser = this.context.createAnalyser();
      this.analyser.smoothingTimeConstant = this.smoothing;
      this.analyser.fftSize = this.numBands * 2;
      this.bands = new Uint8Array(this.analyser.frequencyBinCount);
      this.audio.addEventListener('canplay', (function(_this) {
        return function() {
          _this.source = _this.context.createMediaElementSource(_this.audio);
          _this.source.connect(_this.analyser);
          _this.analyser.connect(_this.jsNode);
          _this.jsNode.connect(_this.context.destination);
          _this.source.connect(_this.context.destination);
          return _this.jsNode.onaudioprocess = function() {
            _this.analyser.getByteFrequencyData(_this.bands);
            if (!_this.audio.paused) {
              return typeof _this.onUpdate === "function" ? _this.onUpdate(_this.bands) : void 0;
            }
          };
        };
      })(this));
    }

    AudioAnalyser.prototype.start = function() {
      return this.audio.play();
    };

    AudioAnalyser.prototype.stop = function() {
      return this.audio.pause();
    };

    return AudioAnalyser;

  })();

  Particle = (function() {
    function Particle(x, y) {
      this.x = x != null ? x : 0;
      this.y = y != null ? y : 0;
      this.reset();
    }

    Particle.prototype.reset = function() {
      this.level = 1 + floor(random(4));
      this.scale = random(SCALE.MIN, SCALE.MAX);
      this.alpha = random(ALPHA.MIN, ALPHA.MAX);
      this.speed = random(SPEED.MIN, SPEED.MAX);
      this.color = random(COLORS);
      this.size = random(SIZE.MIN, SIZE.MAX);
      this.spin = random(SPIN.MAX, SPIN.MAX);
      this.band = floor(random(NUM_BANDS));
      if (random() < 0.5) {
        this.spin = -this.spin;
      }
      this.smoothedScale = 0.0;
      this.smoothedAlpha = 0.0;
      this.decayScale = 0.0;
      this.decayAlpha = 0.0;
      this.rotation = random(TWO_PI);
      return this.energy = 0.0;
    };

    Particle.prototype.move = function() {
      this.rotation += this.spin;
      return this.y -= this.speed * this.level;
    };

    Particle.prototype.draw = function(ctx) {
      var alpha, power, scale;
      power = exp(this.energy);
      scale = this.scale * power;
      alpha = this.alpha * this.energy * 1.5;
      this.decayScale = max(this.decayScale, scale);
      this.decayAlpha = max(this.decayAlpha, alpha);
      this.smoothedScale += (this.decayScale - this.smoothedScale) * 0.3;
      this.smoothedAlpha += (this.decayAlpha - this.smoothedAlpha) * 0.3;
      this.decayScale *= 0.985;
      this.decayAlpha *= 0.975;
      ctx.save();
      ctx.beginPath();
      ctx.translate(this.x + cos(this.rotation * this.speed) * 250, this.y);
      ctx.rotate(this.rotation);
      ctx.scale(this.smoothedScale * this.level, this.smoothedScale * this.level);
      ctx.moveTo(this.size * 0.5, 0);
      ctx.lineTo(this.size * -0.5, 0);
      ctx.lineWidth = 1;
      ctx.lineCap = 'round';
      ctx.globalAlpha = this.smoothedAlpha / this.level;
      ctx.strokeStyle = this.color;
      ctx.stroke();
      return ctx.restore();
    };

    return Particle;

  })();

  Sketch.create({
    container: document.getElementById( 'audio' ),
    particles: [],
    setup: function() {
      var analyser, error, i, intro, particle, warning, x, y, _i, _ref;
      for (i = _i = 0, _ref = NUM_PARTICLES - 1; _i <= _ref; i = _i += 1) {
        x = random(this.width);
        y = random(this.height * 2);
        particle = new Particle(x, y);
        particle.energy = random(particle.band / 256);
        this.particles.push(particle);
      }
      if (AudioAnalyser.enabled) {
        try {
          analyser = new AudioAnalyser(AUDIO_PATH_OR_OBJECT, NUM_BANDS, SMOOTHING);
          analyser.onUpdate = (function(_this) {
            return function(bands) {
              var _j, _len, _ref1, _results;
              _ref1 = _this.particles;
              _results = [];
              for (_j = 0, _len = _ref1.length; _j < _len; _j++) {
                particle = _ref1[_j];
                _results.push(particle.energy = bands[particle.band] / 256);
              }
              return _results;
            };
          })(this);
          analyser.start();
          document.body.appendChild(analyser.audio);
          intro = document.getElementById('intro');
          intro.style.display = 'none';
          if (/Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent)) {
            warning = document.getElementById('warning2');
            return warning.style.display = 'block';
          }
        } catch (_error) {
          error = _error;
        }
      } else {
        warning = document.getElementById('warning1');
        return warning.style.display = 'block';
      }
    },
    draw: function() {
      var particle, _i, _len, _ref, _results;
      this.globalCompositeOperation = 'lighter';
      _ref = this.particles;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        particle = _ref[_i];
        if (particle.y < -particle.size * particle.level * particle.scale * 2) {
          particle.reset();
          particle.x = random(this.width);
          particle.y = this.height + particle.size * particle.scale * particle.level;
        }
        particle.move();
        _results.push(particle.draw(this));
      }
      return _results;
    }
  });

}).call(this);

}