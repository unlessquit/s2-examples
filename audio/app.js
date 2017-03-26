/* eslint-env browser */
/* global Vue, S2 */

var s2 = new S2('https://s2.unlessquit.com')

var audioPath = '/examples/audio'
var audioUrl = 'https://s2.unlessquit.com' + audioPath

// TODO: Move to s2.js
S2.prototype.store = function (key, value, options, callback) {
  var req = new XMLHttpRequest()
  req.addEventListener('load', function () {
    if (this.status !== 200) {
      callback(req, null)
      return
    }

    if (callback) {
      callback(null, this.responseText.trim())
    }
  })
  req.open('PUT', this.serverUrl + key)
  if (options['content-type']) {
    req.setRequestHeader('Content-Type', options['content-type'])
  }
  req.send(value)
}

Vue.component('server-audio', {
  render: function (h) {
    return this.$audio = h('audio')
  },
  mounted: function () {
    this.$audio.elm.oncanplaythrough = () => this.$audio.elm.play()
    this.$audio.elm.onended = () => this.$emit('ended')
    this.$audio.elm.onerror = () => this.$emit('ended')
    this.$audio.elm.src = audioUrl
  }
})

Vue.component('my-audio', {
  props: ['recordedAudio', 'src'],
  render: function (h) {
    this.$audio = h('audio')
    return this.$audio
  },
  mounted: function () {
    this.$audio.elm.src = window.URL.createObjectURL(this.recordedAudio)
    this.$audio.elm.play()
  }
})

var app = new Vue({
  el: '#app',
  data: {
    notSupported: false,
    mediaRecorder: null,
    isPlaying: true,
    isRecording: false,
    chunks: [],
    audioType: null
  },
  render: function (h) {
    return h(
      'div', {attrs: {id: 'app'}},
      this.notSupported
        ? [h('div', {attrs: {id: 'record'}}, ':/')]
        : [h('server-audio', {on: {ended: this.onEndedPlaying}}),
           this.recordedAudio && h('my-audio', {props: {recordedAudio: this.recordedAudio}}),
           h('div', {attrs: {id: 'button'},
                     on: {mousedown: this.startRecording,
                          mouseup: this.stopRecording,
                          mouseout: this.stopRecording}},
             this.buttonMessage),
           h('span', 'Record message which will be played to others when they visit this page.')
          ])
  },
  computed: {
    buttonMessage: function () {
      if (this.isPlaying) return 'Playing...'
      if (this.isRecording) return 'Recording...'
      return 'Push to record'
    },
    recordedAudio: function () {
      if (this.isRecording) return null
      if (this.chunks.length === 0) return null

      return new Blob(this.chunks, {type: this.recordedAudioType})
    }
  },
  methods: {
    startRecording: function (e) {
      // 150ms delay so that we don't record mouse click
      setTimeout(() => this.mediaRecorder.start(), 150)
      this.chunks = []
      this.isRecording = true
      this.mediaRecorder.ondataavailable = this.onAudioChunk
    },
    stopRecording: function (e) {
      if (!this.isRecording) return

      this.mediaRecorder.stop()
      this.isRecording = false
    },
    onEndedPlaying: function (e) {
      this.isPlaying = false
    },
    onAudioChunk: function (e) {
      console.log('Recording: ', e.type)
      this.recordedAudioType = e.type
      this.chunks.push(e.data)

      if (!this.isRecording) {
        s2.store(
          audioPath,
          this.recordedAudio,
          {'content-type': this.recordedAudioType},
          (err, id) => {
            if (err) {
              console.error('Failed to upload audio', err);
              return
            }

            console.log('Stored as', id)
          }
        )
      }
    }
  }
})

function init() {
  if (!navigator.getUserMedia) {
    alert('Your browser doesn\'t support getUserMedia')
    app.notSupported = true
    return
  }

  navigator.getUserMedia(
    {audio: true},
    function (stream) {
      app.mediaRecorder = new MediaRecorder(stream)
    },
    function (err) {
      console.log('Failed to initialize MediaRecorder');
    }
  )
}

init()
