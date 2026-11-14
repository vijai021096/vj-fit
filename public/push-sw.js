/* Reminder notifications. Loaded into the app's service worker via workbox importScripts. */
self.addEventListener('push', (event) => {
  let d = {}
  try { d = event.data ? event.data.json() : {} } catch { d = { title: 'V² Fit', body: event.data ? event.data.text() : '' } }
  event.waitUntil(self.registration.showNotification(d.title || 'V² Fit', {
    body: d.body || '', icon: '/icons/icon-192.png', badge: '/icons/icon-192.png', tag: d.tag || undefined,
    ...(d.image ? { image: d.image } : {}), ...(d.actions ? { actions: d.actions } : {}), ...(d.data ? { data: d.data } : {}),
  }))
})

/* "Ate it" with the app closed: write the tick straight into the app's own database. Returns false if that isn't possible. */
async function tickMeal({ person, date, slot }) {
  try {
    if (indexedDB.databases && !(await indexedDB.databases()).some((x) => x.name === 'v2fit')) return false
    const db = await new Promise((res, rej) => { const q = indexedDB.open('v2fit'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error) })
    if (!db.objectStoreNames.contains('days')) { db.close(); return false }
    await new Promise((res, rej) => {
      const tx = db.transaction('days', 'readwrite'); const st = tx.objectStore('days'); const id = person + '|' + date
      const g = st.get(id)
      g.onsuccess = () => {
        const cur = g.result || { id, person, date, eaten: {}, swaps: {}, water: 0, steps: 0 }
        cur.eaten = Object.assign({}, cur.eaten, { [slot]: true }); cur.updatedAt = Date.now()
        st.put(cur)
      }
      tx.oncomplete = res; tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error)
    })
    db.close()
    return true
  } catch { return false }
}

self.addEventListener('notificationclick', (event) => {
  const n = event.notification, d = n.data || {}
  n.close()
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const meal = d.slot && d.date && d.person
    if (meal && event.action === 'skip') return
    if (meal && event.action === 'ate') {
      // App open: let it log the meal so the screen updates. Otherwise write it ourselves.
      if (list.length) { list[0].postMessage({ type: 'v2fit-ate', ...d }); return }
      if (await tickMeal(d)) {
        await self.registration.showNotification('Logged ✓', { body: 'Marked as eaten.', icon: '/icons/icon-192.png', tag: n.tag || 'logged', silent: true })
        await new Promise((r) => setTimeout(r, 3500))
        for (const x of await self.registration.getNotifications({ tag: n.tag || 'logged' })) x.close()
        return
      }
    }
    // Tapping the notification itself (the only thing iPhone offers): open the app and ask.
    const url = meal ? '/?meal=' + encodeURIComponent(d.slot) + '&date=' + d.date + '&p=' + d.person : '/'
    for (const c of list) if ('focus' in c) { if (meal) c.postMessage({ type: 'v2fit-meal', ...d }); return c.focus() }
    return self.clients.openWindow(url)
  })())
})
