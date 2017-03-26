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
  data: () => {
    return {
      isLoaded: false,
      isPlaying: false
    }
  },
  render: function (h) {
    var content = this.isPlaying
        ? 'Playing...'
        : this.isLoaded
        ? h('div', {attrs: {id: 'button'},
                    on: {click: this.play}},
            'Click to play')
        : 'Loading...';

    return h('div', {}, [
      content,
      this.$audio = h('audio')
    ])
  },
  mounted: function () {
    this.$audio.elm.oncanplay = () => this.isLoaded = true
    this.$audio.elm.onended = () => this.$emit('ended')
    this.$audio.elm.onerror = () => this.$emit('ended')
    this.$audio.elm.src = audioUrl
  },
  methods: {
    play: function () {
      this.$audio.elm.play()
      this.isPlaying = true
    }
  }
})

Vue.component('local-audio', {
  props: ['recordedAudio'],
  render: function (h) {
    if (this.recordedAudio) {
      console.log('Going to play recorded audio');
    }
    return this.$audio = h('audio')
  },
  mounted: function () {
    this.play()
  },
  updated: function () {
    this.play()
  },
  methods: {
    play: function () {
      if (!this.recordedAudio) return
      this.$audio.elm.src = window.URL.createObjectURL(this.recordedAudio.data)
      this.$audio.elm.play()
    }
  }
})

Vue.component('record-button', {
  props: ['mediaRecorder'],
  data: () => {
    return {
      chunks: [],
      isRecording: false
    }
  },
  render: function (h) {
    return h('div', {attrs: {id: 'record'}}, [
      h('div', {attrs: {id: 'button'},
                on: {touchstart: this.startRecording,
                     touchend: this.stopRecording,
                     mousedown: this.startRecording,
                     mouseup: this.stopRecording,
                     mouseout: this.stopRecording}},
        this.buttonMessage),
      h('span', 'Record message which will be played to others when they visit this page.')
    ])
  },
  computed: {
    buttonMessage: function () {
      if (this.isRecording) return 'Recording...'

      return 'Push to record'
    }
  },
  methods: {
    startRecording: function (e) {
      e.preventDefault()
      // 150ms delay so that we don't record mouse click
      setTimeout(() => this.mediaRecorder.start(), 150)
      this.chunks = []
      this.isRecording = true
      this.mediaRecorder.ondataavailable = this.onAudioChunk
    },
    stopRecording: function (e) {
      e.preventDefault()
      if (!this.isRecording) return

      this.mediaRecorder.stop()
      this.isRecording = false
    },
    onAudioChunk: function (e) {
      console.log('Recording: ', e.data.type)
      this.chunks.push(e.data)

      if (!this.isRecording) {
        var recording = {
          type: e.data.type,
          data: new Blob(this.chunks, {type: e.data.type})
        }

        this.$emit('recorded', recording)

        s2.store(
          audioPath,
          recording.data,
          {'content-type': recording.type},
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

var app = new Vue({
  el: '#app',
  data: {
    notSupported: false,
    mediaRecorder: null,
    isPlayingServerAudio: true,
    recordedAudio: null
  },
  render: function (h) {
    return h(
      'div', {attrs: {id: 'app'}},
      this.notSupported
        ? [h('div', {attrs: {id: 'record'}}, ':/')]
        : [h('local-audio', {props: {recordedAudio: this.recordedAudio}}),
           this.isPlayingServerAudio
             ? [h('server-audio', {on: {ended: this.onEndedPlaying}})]
             : h('record-button', {props: {mediaRecorder: this.mediaRecorder},
                                   on: {recorded: this.onRecorded}})])
  },
  methods: {
    onRecorded: function (e) {
      this.recordedAudio = e
    },
    onEndedPlaying: function (e) {
      this.isPlayingServerAudio = false
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
