/* eslint-env browser */
/* global auth0, Auth0Lock, Vue, S2 */

function uuid () {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    var r = Math.random() * 16 | 0
    var v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function noteUrl (user) {
  return '/notes/' + user.user_metadata.uid + '/0';
}

var s2 = new S2('https://s2.unlessquit.com')
var lock = new Auth0Lock(
  'yY3cBoq73t9ob0ntbBYU0c5L0GkGP93G', 'unlessquit.eu.auth0.com')

Vue.component('sign-in', {
  props: ['user'],
  render: function (h) {
    return h('button', {on: {click: () => lock.show()}}, 'Sign In')
  }
})

Vue.component('greet', {
  props: ['user'],
  render: function (h) {
    return h('h1', ['Hello ', this.user.name])
  }
})

Vue.component('note', {
  props: ['note'],
  render: function (h) {
    return h(
      'textarea',
      {
        attrs: {cols: 80, rows: 20},
        on: {
          input: (e) => this.$emit('change', e.target.value)
        }
      },
      this.note.content
    )
  }
})

Vue.component('modified', {
  props: ['isModified'],
  render: function (h) {
    return h('span', this.isModified ? 'Saving...' : 'Saved')
  },
  updated: function () {
    if (!this.isModified) return
    if (this._timeout) clearTimeout(this._timeout)

    this._timeout = setTimeout(() => {
      this.$emit('save')
    }, 2000)
  }
})

var app = new Vue({
  el: '#app',
  data: {
    user: null,
    note: null,
    error: null,
    isModified: false
  },
  created: function () {
    this._updateTimeout = null
  },
  render: function (h) {
    if (this.user) {
      return h('div', [
        h('greet', {props: {user: this.user}}),
        this.error &&
          h('div', ['Failed to fetch note from the server. HTTP status: ',
                    this.error]),
        this.note &&
          h('div', [
            h('modified', {
              props: {note: this.note, isModified: this.isModified},
              on: {
                save: () => {
                  var url = noteUrl(this.user)
                  console.debug('Storing note to', url)

                  s2.storeJson(url, this.note, (err, id) => {
                    if (err) {
                      console.error('Failed to store note', err)
                      return
                    }

                    console.log('Stored', id)
                    this.isModified = false
                  })
                }
              }
            }),
            h('br'),
            h('note', {
              props: {note: this.note},
              on: {change: (e) => this.updateNote(e)}
            })
          ])
      ])
    }
    return h('div', [h('sign-in')])
  },
  methods: {
    updateNote: function (newContent) {
      this.note.content = newContent
      this.isModified = true
    }
  }
})

lock.on('authenticated', function (authResult) {
  lock.getUserInfo(authResult.accessToken, function (error, profile) {
    if (error) {
      alert(error)
      return
    }

    localStorage.setItem('id_token', authResult.idToken)

    if (!profile.user_metadata || !profile.user_metadata.uid) {
      var uid = uuid()

      var auth0Manage = new auth0.Management({
        token: authResult.idToken,
        domain: 'unlessquit.eu.auth0.com'
      })

      profile.user_metadata = profile.user_metadata || {}
      profile.user_metadata.uid = uid
      auth0Manage.patchUserMetadata(profile.user_id, {uid: uid}, function () {
        console.log('Set UID')
      })
    }

    console.log(profile)
    app.user = profile
    fetchUserNote(profile)
  })
})

function fetchUserNote (user) {
    var url = noteUrl(user)
    console.debug('Fetching note from', url)

    s2.fetchJson(url, function (err, note) {
      if (err) {
        if (err.status === 404) {
          console.log('Note not found - using blank one')
          app.note = {content: ''}
          return
        }

        console.error('Failed to fetch note', err)
        app.error = err.status
        return
      }

      app.note = note
    })
}

function demo () {
  app.user = {name: 'demo', user_metadata: {uid: 'demo'}}
  fetchUserNote(app.user)
}
