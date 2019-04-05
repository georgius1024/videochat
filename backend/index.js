require('dotenv').config()
const dns = require('dns')
const fs = require('fs')
const https = require('https')
const os = require('os')

const uuidv1 = require('uuid/v1')
const Koa = require('koa')
const cors = require('@koa/cors')
const serve = require('koa-static')
const bodyParser = require('koa-bodyparser')

const errorHandler = require('./src/error-handler')
const router = require('./src/router')
const RoomController = require('./src/classes/room-controller')
const RoomPool = require('./src/classes/room-pool')

const { getKurentoClient$ } = require('./src/kurento-calls')
const app = new Koa()
const ws = require('ws')
const pool = new RoomPool('1h')

app.use(serve('public'))
app.use(bodyParser())
app.use(cors())
errorHandler(app)
router(app, pool)

const port = process.env.APP_LISTEN_PORT || 5781

const options = {
    key: fs.readFileSync(process.env.SSL_KEY),
    cert: fs.readFileSync(process.env.SSL_CERT)
};

const server = https.createServer(options, app.callback()).listen(port)

dns.lookup(os.hostname(), function(error, addr) {
  if (error) {
    console.log('DNS lookup failed with error: ' + error)
  } else {
    console.log('Server running at https://' + addr + ':' + port)
  }
})

const socketServer = new ws.Server({
  server
})

socketServer.on('connection', function connection(socket, request) {
  const [, roomId] = request.url.split('/')
  if (roomId === 'chatroom') {
    console.log(`Accepted connection ${roomId}`)
    let room = pool.get(roomId)
    if (!room) {
      room = new RoomController(roomId)
      pool.attach(room, roomId)
    }
    room.join(socket, uuidv1())
  } else {
    console.log(`Rejected connection ${roomId}`)
    socket.send(`Wrong room id: ${roomId}`)
    socket.close()
  }
})

getKurentoClient$(process.env.MEDIA_API_URL)
  .then(() => {
    console.log('Media server connected')
  })
  .catch(console.error)

module.exports = server
