/* assets/reading.js: what you have read on weather.promptugal.news, and your reading graph.
 * weather.b@PrompTugal.dinis, 18 November 2026. Code: Apache-2.0.
 *
 * This site carries no billing: only promptugal.news bills (Dinis, 18 Nov 2026, about 23:45 UTC, kept in the Website repo's
 * board/guidance/2026-11-18-billing-only-on-the-main-site.md). This script only keeps a list of the pages
 * opened, in this browser's localStorage, and draws it on /account/ as a graph. Nothing is sent anywhere.
 *
 * The graph is promptugal.news's (Website repo assets/meter/meter.js, readingGraph, Apache-2.0; Dinis, 17 November
 * 2026: "the graph is so powerful of what the person has been reading"), adapted to this site's sections and colours.
 * Data from pages and readers is only ever set with textContent.
 */
(function () {
    'use strict'
    var KEY = 'pt.weather.reads', MAX = 200
    // only entries whose path is site-relative are kept (the list feeds hrefs on /account/)
    function load() { try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter(function (e) { return e && typeof e.path === 'string' && /^\/(?!\/)/.test(e.path) }) : [] } catch (e) { return [] } }
    function save(log) { try { localStorage.setItem(KEY, JSON.stringify(log.slice(-MAX))); return true } catch (e) { return false } }

    var path = location.pathname.replace(/index\.html$/, '')
    var h1 = document.querySelector('main h1')
    var log = load()
    if (path !== '/account/') {
        var last = log[log.length - 1]
        if (!last || last.path !== path) { log.push({ path: path, title: ((h1 && h1.textContent) || document.title).slice(0, 120), at: new Date().toISOString() }); save(log) }
    }

    function h(tag, attrs) {
        var el = document.createElement(tag)
        for (var k in (attrs || {})) { if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), attrs[k]); else el.setAttribute(k, attrs[k]) }
        var put = function (c) { if (c == null || c === false) return; if (Array.isArray(c)) { c.forEach(put); return } el.append(c instanceof Node ? c : String(c)) }
        for (var i = 2; i < arguments.length; i++) put(arguments[i])
        return el
    }
    var SECTION_COLOUR = { places: '#006600', map: '#1a4fa0', storms: '#c52830', 'what-to-do': '#9a6700', about: '#3f424a', design: '#5b2ca0', home: '#121317' }
    function readingGraph(log) {
        var NS = 'http://www.w3.org/2000/svg', W = 760, H = 440
        var sv = function (tag, attrs, kids) { var e = document.createElementNS(NS, tag); for (var k in attrs || {}) e.setAttribute(k, attrs[k]); (kids || []).forEach(function (c) { if (c) e.append(c) }); return e }
        var seen = {}, pages = []
        log.slice().reverse().forEach(function (e) { if (!e.path || seen[e.path]) return; seen[e.path] = 1; pages.unshift(e) })
        pages = pages.slice(-60)
        if (pages.length < 2) return null
        var nodes = [], byId = {}, links = []
        var node = function (id, o) { if (!byId[id]) { o.id = id; o.x = W / 2 + (Math.random() - .5) * W * .6; o.y = H / 2 + (Math.random() - .5) * H * .6; o.vx = 0; o.vy = 0; byId[id] = o; nodes.push(o) } return byId[id] }
        var label = function (seg) { try { return decodeURIComponent(seg).replace(/\.html$/, '').replace(/-/g, ' ') } catch (e) { return seg } }
        pages.forEach(function (e, i) {
            var segs = String(e.path).replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
            var sec = segs[0] || 'home'
            var pn = node('p:' + e.path, { type: 'page', title: e.title || e.path, href: e.path, sec: sec })
            var sn = node('s:' + sec, { type: 'concept', title: sec === 'home' ? 'front page' : label(sec) }); links.push([pn, sn, 'c'])
            if ((sec === 'places' || sec === 'storms') && segs[1]) { var sub = node('t:' + segs[1], { type: 'concept', title: label(segs[1]) }); links.push([pn, sub, 'c']); links.push([sub, sn, 'c']) }
            if (i > 0) links.push([byId['p:' + pages[i - 1].path], pn, 'r'])
        })
        for (var it = 0; it < 400; it++) {                                   // a small force layout, run once
            var cool = 1 - it / 400
            for (var a = 0; a < nodes.length; a++) for (var b = a + 1; b < nodes.length; b++) {
                var A = nodes[a], B = nodes[b], dx = A.x - B.x, dy = A.y - B.y, d = Math.sqrt(dx * dx + dy * dy) + .1, f = Math.min(8, 2400 / (d * d))
                A.vx += dx / d * f; A.vy += dy / d * f; B.vx -= dx / d * f; B.vy -= dy / d * f
            }
            links.forEach(function (l) { var A = l[0], B = l[1], dx = B.x - A.x, dy = B.y - A.y, d = Math.sqrt(dx * dx + dy * dy) + .1, f = (d - (l[2] === 'r' ? 90 : 60)) * (l[2] === 'r' ? .02 : .06); A.vx += dx / d * f; A.vy += dy / d * f; B.vx -= dx / d * f; B.vy -= dy / d * f })
            nodes.forEach(function (n) { n.vx += (W / 2 - n.x) * .01; n.vy += (H / 2 - n.y) * .01; n.x += Math.max(-10, Math.min(10, n.vx)) * cool; n.y += Math.max(-10, Math.min(10, n.vy)) * cool; n.vx *= .5; n.vy *= .5; n.x = Math.max(40, Math.min(W - 40, n.x)); n.y = Math.max(24, Math.min(H - 28, n.y)) })
        }
        var g = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'nr-graph', role: 'img', 'aria-label': 'Your reading graph: ' + pages.length + ' pages and what they are about' })
        links.forEach(function (l) { g.append(sv('line', { x1: l[0].x.toFixed(1), y1: l[0].y.toFixed(1), x2: l[1].x.toFixed(1), y2: l[1].y.toFixed(1), stroke: l[2] === 'r' ? '#c52830' : '#b9b3a6', 'stroke-width': l[2] === 'r' ? 1.2 : 1, 'stroke-dasharray': l[2] === 'r' ? '3 3' : '', opacity: l[2] === 'r' ? .55 : .8 })) })
        nodes.forEach(function (n) {
            if (n.type === 'concept') {
                var t = sv('text', { x: n.x.toFixed(1), y: (n.y + 20).toFixed(1), 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600 }); t.textContent = n.title
                g.append(sv('g', {}, [sv('circle', { cx: n.x.toFixed(1), cy: n.y.toFixed(1), r: 7, fill: '#f6f3ec', stroke: '#121317', 'stroke-width': 1.5 }), t]))
            } else {
                var tt = sv('title', {}); tt.textContent = n.title
                g.append(sv('a', { href: n.href }, [sv('circle', { cx: n.x.toFixed(1), cy: n.y.toFixed(1), r: 5, fill: SECTION_COLOUR[n.sec] || '#3f424a' }), tt]))
            }
        })
        return h('figure', { class: 'nr-graph-fig' }, g, h('figcaption', {}, pages.length + ' pages read on this site, linked to their sections and places; dashed: the order read. Made in this browser.'))
    }
    function when(iso) { try { return new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch (e) { return String(iso || '').slice(0, 16) } }

    function account() {
        var el = document.getElementById('nr-account'); if (!el) return
        var out = h('p', { class: 'src', 'aria-live': 'polite' })
        var recent = log.slice(-30).reverse().map(function (e) { return h('li', {}, h('a', { href: e.path }, e.title || e.path), ' ', h('span', { class: 'src' }, when(e.at))) })
        el.replaceChildren(
            h('p', {}, log.length + ' page' + (log.length === 1 ? '' : 's') + ' opened on this site in this browser · £0.00 charged (free: built on IPMA data).'),
            h('h2', { id: 'graph' }, 'Your reading graph'),
            readingGraph(log) || h('p', { class: 'na' }, 'Read a few pages to see it.'),
            h('h2', { id: 'history' }, 'What you have read here'),
            recent.length ? h('ol', { class: 'reads-list' }, recent) : h('p', { class: 'na' }, 'Nothing yet.'),
            h('p', {}, h('button', { type: 'button', class: 'chip', onclick: function () { if (!confirm('Forget the pages read on this site in this browser?')) return; log = []; save(log); account(); out.textContent = 'Forgotten.' } }, 'Forget this list')),
            out)
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', account); else account()
})()
