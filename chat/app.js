/* eslint-env browser */
/* global Vue, S2 */

var s2 = new S2('https://s2.unlessquit.com')

Vue.component('message', {
  props: ['author', 'content'],
  render: function (h) {
    return h('li', [this.author, ': ', this.content])
  }
})

Vue.component('messages', {
  props: ['messages'],
  render: function (h) {
    return h('ul', this.messages.map(m => h('message', {props: m})))
  }
})

Vue.component('chat-input', {
  render: function (h) {
    return h('div', [
      this.$input = h('input', {attrs: {type: 'text', placeholder: 'Message'},
                                on: {keyup: (e) => this.onKeyup(e)}})])
  },
  mounted: function () {
    this.$input.elm.focus()
  },
  methods: {
    onKeyup: function (e) {
      if (e.key === 'Enter') {
        this.$emit('message', {content: this.$input.elm.value})
        this.$input.elm.value = ''
      }
    }
  }
})

Vue.component('chat', {
  props: ['channel', 'nick'],
  render: function (h) {
    return h('div', [
      h('h2', ['#', this.channel.name, ' - ', this.nick]),
      h('messages', {props: {messages: this.channel.messages}}),
      h('chat-input', {on: {message: (e) => this.$emit('message', e)}})
    ])
  }
})

Vue.component('welcome', {
  render: function (h) {
    var $input

    return h('div', [
      this.$input = h('input', {attrs: {type: 'text', placeholder: 'anonymous'},
                                on: {keyup: this.keyup}}),
      h('button', {on: {click: this.submit}}, 'Join')])
  },
  mounted: function () {
    this.$input.elm.focus()
  },
  methods: {
    keyup: function (e) {
      if (e.key === 'Enter') this.submit()
    },
    submit: function () {
      this.$emit('join', {nick: this.$input.elm.value || 'anonymous'})
    }
  }
})

var app = new Vue({
  el: '#app',
  data: {
    channel: null, // {name, messages}
    nick: null
  },
  render: function (h) {
    return h('div', [
      h('h1', 'Chat'),
      this.channel
        ? h('chat', {props: {channel: this.channel,
                             nick: this.nick},
                     on: {message: this.onMessage}})
        : h('welcome', {on: {join: this.onJoin}})
    ])
  },
  mounted: function () {
    this._updater = setInterval(() => {
      if (!this.channel) return

      console.debug('Updating channel data');
      this.fetchChannelData(this.channel.name)
    }, 2000)
  },
  beforeDestroy: function () {
    clearTimeout(this._updater)
  },
  methods: {
    fetchChannelData: function (channelName) {
      s2.fetchJson(this.channelUrl(channelName), (err, result) => {
        if (err && err.status == 404) {
          console.log('New channel');
          this.channel = {
            name: channelName,
            messages: []
          }
          return
        }

        if (err) {
          console.error('Failed to fetch channel data', err)
          return
        }

        this.channel = result
      })
    },
    onMessage: function (e) {
      if (!this.channel) return

      var message = {author: this.nick, content: e.content}
      this.channel.messages.push(message)

      console.log('Sending message:', JSON.stringify(message))
      s2.storeJson(this.channelUrl(this.channel.name), this.channel, (err, id) => {
        if (err) {
          console.error('Failed to store channel data', err)
          return
        }

        console.log('Saved channel data @', id)
      })
    },
    onJoin: function (e) {
      this.nick = e.nick
      this.fetchChannelData('general')
    },
    channelUrl: function (channelName) {
      return '/examples/chat/' + channelName + '.json'
    }
  }
})
