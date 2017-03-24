/* eslint-env browser */
/* global Vue, S2 */

var s2 = new S2('https://s2.unlessquit.com')

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

function uuid () {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0
    var v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

var app = new Vue({
  el: '#app',
  data: {
    imageId: null
  },
  render: function (h) {
    return h(
      'div', {attrs: {id: 'app'},
              on: {paste: this.onPaste}},
      [
        this.imageId
          ? h('div', {attrs: {id: 'image'}}, [
            h('img', {attrs: {src: this.imageUrl}}),
            h('br'),
            h('a', {attrs: {href: this.imageUrl}}, this.imageUrl)
          ])
          : h('div', {attrs: {id: 'paste'}}, 'Paste Image')
      ])
  },
  computed: {
    imageUrl: function () {
      if (!this.imageId) return null

      return 'https://s2.unlessquit.com/o/' + this.imageId + '/image.png'
    }
  },
  methods: {
    onPaste: function (e) {
      Array.from(e.clipboardData.items).find(item => {
        var isSupported = (item.type === 'image/png')
        console.log('Item type:', item.type, 'Supported:', isSupported)

        if (!isSupported) return false

        var dst = '/examples/paste-image/' + uuid() + '.png'
        console.log('Going to upload', dst)
        s2.store(
          dst,
          item.getAsFile(),
          {'content-type': item.type},
          (err, id) => {
            if (err) {
              console.error('Failed to upload image', err);
              return
            }

            console.log('Stored as', id)
            this.imageId = id
            this.imageType = item.type
            document.location.hash = id
          }
        )

        return true
      })
    }
  }
})

if (document.location.hash) {
  app.imageId = document.location.hash.substr(1)
}

window.onhashchange = function () {
  app.imageId = document.location.hash.substr(1)
}
