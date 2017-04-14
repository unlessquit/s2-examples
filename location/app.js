/* eslint-env browser */
/* global S2 */

var s2url = 'https://s2.unlessquit.com'
var s2 = new S2(s2url)

var hawai = {lat: 20.4507556, lng: -159.7495604}

var app = new Vue({
  el: '#app',
  data: {
    now: new Date().getTime(),
    position: hawai,
    ts: 0
  },
  computed: {
    secondsAgo: function () {
      return Math.floor(this.now - this.ts)
    },
    minutesAgo: function () {
      return Math.floor(this.secondsAgo / 60)
    },
    hoursAgo: function () {
      return Math.floor(this.minutesAgo / 60)
    },
    daysAgo: function () {
      return Math.floor(this.hoursAgo / 24)
    },
    message: function () {
      if (this.daysAgo) {
        return "" + this.daysAgo + " days ago"
      }

      if (this.hoursAgo) {
        return "" + this.hoursAgo + " hours ago"
      }

      return "" + this.minutesAgo + " minutes ago"
    }
  },
  render: function (h) {
    return h(
      'div', {attrs: {id: 'app'}},
      [h('div', {attrs: {'class': 'ts'}},
         this.message)])
  }
})

var map
var marker

function initMap() {
  map = new google.maps.Map(document.getElementById('map'), {
    center: hawai,
    zoom: 14
  })

  marker = new google.maps.Marker({
    position: hawai,
    map: map
  })

  var updateFn = () => {
    s2.fetchJson('/examples/location.json', (err, loc) => {
      if (err) {
        console.error(err)
        return
      }

      var pos = {lat: loc.lat, lng: loc.lon}
      app.position = pos
      app.ts = loc.ts
      app.now = new Date().getTime() / 1000
      marker.setPosition(pos)
      map.setCenter(pos)
    })
  }

  updateFn()
  setInterval(updateFn, 5000)
}
