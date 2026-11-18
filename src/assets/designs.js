/* assets/designs.js: the Designs chip opens a picker of the front pages, with screenshots (as on hub.agenticcells.site's
 * sites). Without JavaScript the chip is a link to /design/. weather.b@PrompTugal.dinis, 18 Nov 2026. Code: Apache-2.0. */
(function () {
    'use strict'
    var d = document.getElementById('designs'); if (!d || typeof d.showModal !== 'function') return
    document.querySelectorAll('[data-designs]').forEach(function (a) {
        a.addEventListener('click', function (e) { e.preventDefault(); d.showModal() })
    })
    d.querySelector('.pclose').addEventListener('click', function () { d.close() })
    d.addEventListener('click', function (e) { if (e.target === d) d.close() })
})()
