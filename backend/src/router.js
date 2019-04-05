const Router = require('koa-router')
const router = new Router()
const { genericResponse } = require('./responses')
function routing(app, rooms) {
  router.get('/inspect', (ctx, next) => {
    return genericResponse(ctx, rooms.report())
  })
  app.use(router.routes()).use(router.allowedMethods())
}

module.exports = routing
