/* eslint-env browser */
/* global S2 */

var s2url = 'https://s2.unlessquit.com'
var s2 = new S2(s2url)

var map
var marker

function initMap() {
  var hawai = {lat: 20.4507556, lng: -159.7495604}
  map = new google.maps.Map(document.getElementById('map'), {
    center: hawai,
    zoom: 14
  });

  marker = new google.maps.Marker({
    position: hawai,
    map: map
  });

  var updateFn = () => {
    s2.fetchJson('/examples/location.json', (err, loc) => {
      if (err) {
        console.error(err)
        return
      }

      var pos = {lat: loc.lat, lng: loc.lon}
      marker.setPosition(pos)
      map.setCenter(pos)
    })
  }

  updateFn()
  setInterval(updateFn, 5000)
}
