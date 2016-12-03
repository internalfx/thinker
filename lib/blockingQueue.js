const co = require('co')
const Promise = require('bluebird')

module.exports = function (spec) {
  spec = Object.assign({
    concurrency: 100
  }, spec)

  let queue = {
    active: 0,
    concurrency: spec.concurrency
  }

  queue.push = function (task) {
    queue.active += 1
    return new Promise(function (resolve, reject) {
      if (queue.active < queue.concurrency) {
        resolve()
        co(task).then(function () {
          queue.active -= 1
        }).catch(function (err) {
          console.log(err)
        })
      } else {
        co(task).then(function () {
          resolve()
          queue.active -= 1
        }).catch(function (err) {
          console.log(err)
        })
      }
    })
  }

  return queue
}
