/* eslint-env browser */
/* global Vue, S2 */

var s2url = 'https://s2.unlessquit.com'
var s2 = new S2(s2url)

var app = new Vue({
  el: '#app',
  data: {
    imageId: null
  },
  render: function (h) {
    return h(
      'div', {attrs: {id: 'app'}},
      [this.imageId
       ? h('div', {attrs: {id: 'image'}}, [
         h('img', {attrs: {src: this.imageUrl}}),
         h('br'),
         h('a', {attrs: {href: this.imageUrl}}, this.imageUrl)])
       : h('div', {attrs: {id: 'paste'}}, 'Paste Image')
      ])
  },
  computed: {
    imageUrl: function () {
      if (!this.imageId) return null

      return s2url + '/o/' + this.imageId
    }
  }
})

function onPaste (e) {
  Array.from(e.clipboardData.items).find(item => {
    var isSupported = (item.type === 'image/png')
    console.log('Item type:', item.type, 'Supported:', isSupported)

    if (!isSupported) return false

    var dst = '/examples/paste-image?as=inbox'
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
        document.location.hash = id
      }
    )

    return true
  })
}

document.onpaste = onPaste

if (document.location.hash) {
  app.imageId = document.location.hash.substr(1)
}

window.onhashchange = function () {
  app.imageId = document.location.hash.substr(1)
}
