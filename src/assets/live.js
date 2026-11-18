/* assets/live.js: reads data.promptugal.news in the browser, so a page is not left stale when a build is missed
 * (Dinis, 18 Nov 2026, about 14:55 UTC: "the data should be hopefully dynamically loaded"; conductor.b@'s report at
 * 17:51 UTC that the hourly rebuild had not run). weather.b@PrompTugal.dinis. Code: Apache-2.0.
 *
 * The built page stays the fallback. Only when the API's file is newer than the page's data are these updated:
 * place pages (the station reading, the warnings, the "read" line), capital pages (the same, from the Portugal-wide
 * files), the front page's "Now" cells and district warning chips. Fetched values are untrusted: each is checked for
 * type, numbers must be finite, a warning level must be one of four words, and everything is set with textContent.
 * No link is built from fetched data. Licence of the data: IPMA's terms (https://api.ipma.pt/), as on every page. */
(function () {
    'use strict'
    var API = 'https://data.promptugal.news/api/v1/'
    var LEVELS = { green: 'Green', yellow: 'Yellow', orange: 'Orange', red: 'Red' }
    var DIR = ['calm', 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N']
    var level = function (v) { return typeof v === 'string' && Object.prototype.hasOwnProperty.call(LEVELS, v) ? v : null }
    var dir = function (v) { return Number.isInteger(v) && v >= 0 && v < DIR.length ? DIR[v] : '?' }
    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    var DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    function get(path) {
        return fetch(API + path, { credentials: 'omit', referrerPolicy: 'no-referrer' })
            .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json() })
            .then(function (j) { if (!j || typeof j !== 'object' || Array.isArray(j)) throw new Error('shape'); return j })
    }
    var isNum = function (v) { return typeof v === 'number' && isFinite(v) }
    var str = function (v) { return typeof v === 'string' ? v.slice(0, 300) : '' }
    function num(v, unit, d) { return isNum(v) ? Number(v).toFixed(d == null ? 1 : d).replace(/\.0$/, '') + (unit || '') : null }
    function setNum(el, v, unit, d) {
        if (!el) return
        var t = num(v, unit, d)
        el.textContent = t == null ? 'not reported' : t
        el.classList.toggle('na', t == null)
    }
    function whenUtc(iso) {
        var d = new Date(str(iso)); if (isNaN(+d)) return ''
        return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()] + ' ' + d.getUTCFullYear() + ', ' + String(d.getUTCHours()).padStart(2, '0') + ':' + String(d.getUTCMinutes()).padStart(2, '0') + ' UTC'
    }
    function localWhen(s) {
        var m = str(s).match(/^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/); if (!m) return ''
        var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
        return DAYS[d.getUTCDay()] + ' ' + (+m[3]) + ' ' + MONTHS[+m[2] - 1] + ', ' + m[4] + ':' + m[5]
    }
    function h(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e }

    function fresh(box, readAt) {
        if (!box) return
        var hours = (Date.now() - new Date(readAt)) / 36e5
        var p = h('p', hours <= 2 ? 'fresh' : 'stale')
        if (hours > 2) p.setAttribute('role', 'status')
        p.textContent = (hours <= 2 ? 'Read ' : 'This data is ' + Math.round(hours) + ' hours old (read ') + whenUtc(readAt) + (hours <= 2 ? '' : ')') + '. Updated in your browser from data.promptugal.news.'
        box.replaceChildren(p)
    }
    function station(reading, at) {
        if (!reading || typeof reading !== 'object') return
        setNum(document.querySelector('[data-live="temp"]'), reading.temp_c, '°C')
        setNum(document.querySelector('[data-live="humidity"]'), reading.humidity_pct, '%', 0)
        var w = document.querySelector('[data-live="wind"]')
        if (w) w.textContent = isNum(reading.wind_kmh) ? num(reading.wind_kmh, ' km/h') + ' from ' + dir(reading.wind_dir_id) : 'not reported'
        var a = document.querySelector('[data-live="at"]'); if (a && at) a.textContent = whenUtc(at)
    }
    function warnings(box, active, areaLabel) {
        if (!box || !Array.isArray(active)) return
        var old = box.querySelector('.warnings'), src = old && old.querySelector('p.src')
        var list = active.filter(function (a) { return a && level(a.level) && a.level !== 'green' })
        var div = h('div', list.length ? 'warnings' : 'warnings none')
        if (!list.length) {
            var p = h('p'); p.append(h('strong', null, 'No IPMA warning above green'), ' for ' + areaLabel + ' in the file read. No warning is not the same as no risk.'); div.append(p)
        } else {
            div.append(h('h3', null, 'IPMA warnings for ' + areaLabel))
            var ul = h('ul')
            list.forEach(function (a) {
                var li = h('li', 'warning warn-' + a.level)
                li.append(h('span', 'lvl', LEVELS[a.level]), ' ', h('strong', null, str(a.type)), ' ', (function () { var s = h('span', 'pt', '(' + str(a.type_pt) + ')'); s.lang = 'pt'; return s })(), h('br'),
                    h('span', 'when', localWhen(a.start) + ' to ' + localWhen(a.end) + ', Portugal time'))
                if (a.text) { li.append(h('br')); var t = h('span', 'text', str(a.text)); t.lang = 'pt'; li.append(t) }
                ul.append(li)
            })
            div.append(ul)
        }
        if (src) div.append(src)
        box.replaceChildren(div)
    }
    function newer(readAt, pageRead) { return typeof readAt === 'string' && !isNaN(Date.parse(readAt)) && (!pageRead || readAt > pageRead) }

    var cfg = document.getElementById('live')
    if (cfg && cfg.dataset.kind === 'place') {
        get(cfg.dataset.src.replace(API, '')).then(function (j) {
            if (!newer(j.read_at, cfg.dataset.read)) return
            station(j.station && j.station.reading, j.station && j.station.reading && j.station.reading.at)
            if (j.warnings) warnings(document.querySelector('[data-live="warnings"]'), j.warnings.active, str(j.warnings.area))
            fresh(document.querySelector('[data-live="fresh"]'), j.read_at)
        }).catch(function () { })
    }
    if (cfg && cfg.dataset.kind === 'capital') {
        var area = cfg.dataset.area, sid = cfg.dataset.station
        Promise.all([get('ipma-warnings/latest.json'), sid ? get('ipma-observations/latest.json') : null]).then(function (r) {
            var w = r[0], o = r[1]
            if (!newer(w.read_at, cfg.dataset.read)) return
            warnings(document.querySelector('[data-live="warnings"]'), (w.active || []).filter(function (a) { return a && a.area === area }), area + ' (the ' + cfg.dataset.district + ' district)')
            if (o && Array.isArray(o.stations)) { var s = o.stations.filter(function (x) { return x && String(x.id) === sid })[0]; if (s && s.reading) station(s.reading, o.hour_utc) }
            fresh(document.querySelector('[data-live="fresh"]'), w.read_at)
        }).catch(function () { })
    }
    // the front page: the Algarve's "Now" cells (one file per place) and the capitals' cells and warning chips
    document.querySelectorAll('[data-live-place]').forEach(function (td) {
        var id = td.getAttribute('data-live-place'); if (!/^[a-z-]+$/.test(id)) return
        get('by-place/now/' + id + '.json').then(function (j) { var r = j.station && j.station.reading; if (r && 'temp_c' in r) setNum(td, r.temp_c, '°') }).catch(function () { })
    })
    var capCells = document.querySelectorAll('[data-live-station]'), chips = document.querySelectorAll('[data-live-area]')
    if (capCells.length) get('ipma-observations/latest.json').then(function (o) {
        if (!Array.isArray(o.stations)) return
        capCells.forEach(function (td) { var id = td.getAttribute('data-live-station'); if (!id) return; var s = o.stations.filter(function (x) { return x && String(x.id) === id })[0]; if (s && s.reading) setNum(td, s.reading.temp_c, '°') })
    }).catch(function () { })
    if (chips.length) get('ipma-warnings/latest.json').then(function (w) {
        if (!Array.isArray(w.active)) return
        var rank = { green: 0, yellow: 1, orange: 2, red: 3 }
        chips.forEach(function (c) {
            var lv = 'green'
            w.active.forEach(function (a) { if (a && a.area === c.getAttribute('data-live-area') && level(a.level) && rank[a.level] > rank[lv]) lv = a.level })
            c.className = 'chip warn-' + lv; c.textContent = lv
        })
    }).catch(function () { })
})()
