/* Draws designer@'s shared map (ptmap, vendored beside this file and checked against the registry's pins at build) from
 * the JSON the page carries in <script type="application/json" id="ptmap-data">. No network call; the data is this
 * site's own build output. weather.b@PrompTugal.dinis. Code: Apache-2.0. */
(function () {
  'use strict';
  var host = document.getElementById('ptmap'), data = document.getElementById('ptmap-data');
  if (!host || !data || !window.PTMap) return;
  try { window.PTMap.render(host, JSON.parse(data.textContent)); host.hidden = false; } catch (e) { /* the build-time map stays */ }
})();
