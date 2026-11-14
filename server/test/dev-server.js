// Local dev/E2E server on in-memory Postgres: node test/dev-server.js [port]
import http from 'node:http'
import { createApp } from '../src/app.js'
import { memDb } from './helpers.js'
import webpush from 'web-push'
import { createPush } from '../src/push.js'
const port = Number(process.argv[2] ?? 8787)
const db = await memDb()
http.createServer(createApp(db, { createLimit: 1000, pairLimit: 1000, openLimit: 1000, accessLog: false, sharedKey: process.env.SHARED_KEY, push: createPush(db, { generateVAPIDKeys: webpush.generateVAPIDKeys, sendNotification: async () => ({}) }) })).listen(port, '127.0.0.1', () => console.log('dev server on', port))
