/* eslint-env browser */
/* global Vue, S2 */

var $player = document.getElementById('player')
var s2 = new S2('https://s2.unlessquit.com')

var audioPath = '/examples/audio'
var audioUrl = 'https://s2.unlessquit.com' + audioPath

Vue.component('audio-player', {
  props: ['element', 'src'],
  render: function (h) {
    this.element.src = this.src
    return h('div')
  },
  mounted: function () { this.bind() },
  updated: function () { this.bind() },
  methods: {
    bind: function () {
      this.element.src = this.src
      this.element.onplaying = () => this.$emit('started')
      this.element.onended = () => this.$emit('ended')
      this.element.onerror = () => this.$emit('ended')
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
      h('div', {attrs: {'class': 'button'},
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

Vue.component('play-button', {
  render: function (h) {
    return h('div', {attrs: {'class': 'button play'},
                     on: {click: this.onClick}},
             'Click to play')
  },
  methods: {
    onClick: function () {
      this.$emit('click')
    }
  }
})

var app = new Vue({
  el: '#app',
  data: {
    notSupported: false,
    mediaRecorder: null,
    isFirstPlay: true,
    isPlaying: false,
    recordedAudio: null,
    playUrl: audioUrl
  },
  render: function (h) {
    return h(
      'div', {attrs: {id: 'app'}},
      (this.notSupported
       ? [h('div', {attrs: {id: 'record'}}, ':/')]
       : [h('audio-player', {props: {src: this.playUrl,
                                     element: $player},
                             on: {started: this.onStartedPlaying,
                                  ended: this.onEndedPlaying}}),
          (this.isFirstPlay
           ? h('play-button', {on: {click: this.onPlayClicked}})
           : this.isPlaying
           ? h('div', 'Playing...')
           : h('record-button', {props: {mediaRecorder: this.mediaRecorder},
                                 on: {recorded: this.onRecorded}}))]))
  },
  methods: {
    onRecorded: function (e) {
      this.recordedAudio = e
      $player.oncanplay = () => $player.play()
      this.playUrl = window.URL.createObjectURL(this.recordedAudio.data)
    },
    onPlayClicked: function () {
      console.log('click');
      $player.play()
    },
    onStartedPlaying: function (e) {
      this.isPlaying = true
      this.isFirstPlay = false
    },
    onEndedPlaying: function (e) {
      this.isPlaying = false
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
