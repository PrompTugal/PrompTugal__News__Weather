/* assets/live.js: reads data.promptugal.news in the browser, so a page is not left stale when a build is missed
 * (Dinis, 18 Nov 2026, about 14:55 UTC: "the data should be hopefully dynamically loaded"; conductor.b@'s report at
 * 17:51 UTC that the hourly rebuild had not run). weather.b@PrompTugal.dinis. Code: Apache-2.0.
 *
 * The built page stays the fallback. Only when the API's file is newer than the page's data are these updated:
 * place pages (the station reading, the warnings, the "read" line), capital pages (the same, from the Portugal-wide
 * files), the front page's "Now" cells and district warning chips. Fetched values are untrusted: each is checked for
 * type, numbers must be finite, a warning level must be one of four words, and everything is set with textContent.
 * No link is built from fetched data. Licence of the data: IPMA's terms (https://api.ipma.pt/), as on every page.
 *
 * Data in the browser (Dinis, 19 Nov 2026, about 01:13 UTC, Website repo board/guidance/2026-11-19-load-the-data-in-the-
 * browser.md): our own host only, no cookie, no referrer; re-read every five minutes while the page is in view; the page
 * always says whether it shows the live file or the built copy, when that was read, and marks it stale after 13 hours (data is collected twice a day: Dinis, 19 Nov 2026, about 16:30 UTC, Website repo board/guidance/2026-11-19-twice-a-day.md)
 * (the collection was hourly until 19 Nov 2026; it is now twice a day). */
var STALE_H = 13; // hours: twice-daily data is not stale (Dinis, 19 Nov 2026, about 16:30 UTC)
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
        return fetch(API + path, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: AbortSignal.timeout ? AbortSignal.timeout(20000) : undefined })
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

    // live: true when the figures above were just replaced from the live file; false when the built copy stays
    function fresh(box, readAt, live, unread) {
        if (!box || !sane(readAt)) return
        var hours = (Date.now() - new Date(readAt)) / 36e5, stale = hours > STALE_H
        var p = h('p', stale ? 'stale' : 'fresh')
        if (stale) p.setAttribute('role', 'status')
        p.textContent = (stale ? 'Stale: this data is ' + Math.round(hours) + ' hours old (read ' + whenUtc(readAt) + ')' : 'Read ' + whenUtc(readAt)) + '. ' +
            (unread ? (wasLive ? 'Shown: the live file loaded earlier; the latest check of data.promptugal.news failed.' : 'Built copy: the live file on data.promptugal.news could not be read just now.') : live ? 'Live file, loaded in your browser from data.promptugal.news.' : 'Built copy: the live file on data.promptugal.news is not newer.') +
            " IPMA's data, under IPMA's terms (api.ipma.pt)."
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
    function sane(readAt) { var t = Date.parse(str(readAt)); return !isNaN(t) && t <= Date.now() + 10 * 60 * 1000 }
    function newer(readAt, pageRead) { return typeof readAt === 'string' && sane(readAt) && (!pageRead || Date.parse(readAt) > Date.parse(pageRead)) }

    var cfg = document.getElementById('live'), shownRead = cfg && cfg.dataset.read, wasLive = false
    function run() {
    var box = document.querySelector('[data-live="fresh"]')
    if (cfg && cfg.dataset.kind === 'place') {
        get(cfg.dataset.src.replace(API, '')).then(function (j) {
            if (!newer(j.read_at, shownRead)) { fresh(box, shownRead, wasLive); return }
            shownRead = j.read_at; wasLive = true
            station(j.station && j.station.reading, j.station && j.station.reading && j.station.reading.at)
            if (j.warnings) warnings(document.querySelector('[data-live="warnings"]'), j.warnings.active, str(j.warnings.area))
            fresh(box, j.read_at, true)
        }).catch(function () { fresh(box, shownRead, false, true) })
    }
    if (cfg && cfg.dataset.kind === 'capital') {
        var area = cfg.dataset.area, sid = cfg.dataset.station
        Promise.all([get('ipma-warnings/latest.json'), sid ? get('ipma-observations/latest.json') : null]).then(function (r) {
            var w = r[0], o = r[1]
            if (!newer(w.read_at, shownRead)) { fresh(box, shownRead, wasLive); return }
            shownRead = w.read_at; wasLive = true
            warnings(document.querySelector('[data-live="warnings"]'), (w.active || []).filter(function (a) { return a && a.area === area }), area + ' (the ' + cfg.dataset.district + ' district)')
            if (o && Array.isArray(o.stations)) { var s = o.stations.filter(function (x) { return x && String(x.id) === sid })[0]; if (s && s.reading) station(s.reading, o.hour_utc) }
            fresh(box, w.read_at, true)
        }).catch(function () { fresh(box, shownRead, false, true) })
    }
    // the front page: the Algarve's "Now" cells (one file per place) and the capitals' cells and warning chips. A live
    // value replaces a built one only when its file is newer than the build's; each line under a table names the oldest
    // read time shown, live or built, and says which.
    var placeCells = document.querySelectorAll('[data-live-place]')
    var pLine = document.querySelector('[data-live-front="places"]'), cLine = document.querySelector('[data-live-front="capitals"]')
    function lineText(what, readAt, live, failed) {
        if (!sane(readAt)) return what + ': ' + (failed ? 'the live file could not be read; the built copy is shown.' : 'the built copy.')
        var hours = (Date.now() - Date.parse(readAt)) / 36e5
        return what + ': ' + (live ? 'live file from data.promptugal.news' : failed ? 'the built copy (the live file could not be read)' : 'the built copy (the live file is not newer)') + ', read ' + whenUtc(readAt) + (hours > STALE_H ? ' (stale: ' + Math.round(hours) + ' hours old)' : '')
    }
    if (placeCells.length && pLine) {
        var builtP = pLine.getAttribute('data-built-read') || ''
        Promise.all([].map.call(placeCells, function (td) {
            var id = td.getAttribute('data-live-place'); if (!/^[a-z-]+$/.test(id)) return Promise.resolve(null)
            return get('by-place/now/' + id + '.json').then(function (j) {
                if (!newer(j.read_at, builtP)) return { at: builtP, live: false }
                var r = j.station && j.station.reading; if (r && 'temp_c' in r) setNum(td, r.temp_c, '°')
                return { at: j.read_at, live: true }
            }).catch(function () { return { at: builtP, live: false, failed: true } })
        })).then(function (res) {
            res = res.filter(Boolean); if (!res.length) return
            var oldest = res.reduce(function (a, b) { return Date.parse(b.at) < Date.parse(a.at) ? b : a })
            pLine.textContent = lineText('The Now column', oldest.at, res.every(function (x) { return x.live }), res.some(function (x) { return x.failed })) + ". IPMA's data, under IPMA's terms (api.ipma.pt)."
            pLine.classList.toggle('stale', (Date.now() - Date.parse(oldest.at)) / 36e5 > STALE_H)
        })
    }
    var capCells = document.querySelectorAll('[data-live-station]'), chips = document.querySelectorAll('[data-live-area]')
    if (cLine && (capCells.length || chips.length)) {
        var builtO = cLine.getAttribute('data-built-obs') || '', builtW = cLine.getAttribute('data-built-warn') || ''
        var obsP = get('ipma-observations/latest.json').then(function (o) {
            if (!Array.isArray(o.stations) || !newer(o.read_at, builtO)) return { at: builtO, live: false }
            capCells.forEach(function (td) { var id = td.getAttribute('data-live-station'); if (!id) return; var s = o.stations.filter(function (x) { return x && String(x.id) === id })[0]; if (s && s.reading) setNum(td, s.reading.temp_c, '°') })
            return { at: o.read_at, live: true }
        }).catch(function () { return { at: builtO, live: false, failed: true } })
        var warnP = get('ipma-warnings/latest.json').then(function (w) {
            if (!Array.isArray(w.active) || !newer(w.read_at, builtW)) return { at: builtW, live: false }
            var rank = { green: 0, yellow: 1, orange: 2, red: 3 }
            chips.forEach(function (c) {
                var lv = 'green'
                w.active.forEach(function (a) { if (a && a.area === c.getAttribute('data-live-area') && level(a.level) && rank[a.level] > rank[lv]) lv = a.level })
                c.className = 'chip warn-' + lv; c.textContent = lv
            })
            return { at: w.read_at, live: true }
        }).catch(function () { return { at: builtW, live: false, failed: true } })
        Promise.all([obsP, warnP]).then(function (r) {
            cLine.textContent = lineText('The Now column', r[0].at, r[0].live, r[0].failed) + '. ' + lineText('The warnings', r[1].at, r[1].live, r[1].failed) + ". IPMA's data, under IPMA's terms (api.ipma.pt)."
            cLine.classList.toggle('stale', [r[0].at, r[1].at].some(function (t) { return sane(t) && (Date.now() - Date.parse(t)) / 36e5 > STALE_H }))
        })
    }
    }
    var last = 0
    function tick() { if (document.visibilityState !== 'visible' || Date.now() - last < 5 * 60 * 1000) return; last = Date.now(); run() }
    last = Date.now(); run()
    // every five minutes while the page is in view (the guidance's floor), and on return to the tab; never in a hidden tab,
    // never more often (each run's fetches time out after 20 s, so runs cannot pile up)
    setInterval(tick, 60 * 1000)
    document.addEventListener('visibilitychange', tick)
})()
