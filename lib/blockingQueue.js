
const co = require('co')
const _ = require('lodash')
const Promise = require('bluebird')

module.exports = function (spec) {
  spec = Object.assign({
    targetTime: 3000
  }, spec)

  let queue = {
    tasks: [],
    targetTime: spec.targetTime,
    concurrency: 3,
    timeOut: null
  }

  queue.cron = function () {
    queue.timeOut = null

    if (queue.tasks[0]) {
      let maxTime = Date.now() - queue.tasks[0].start
      let target = Math.floor(5000 / maxTime)

      queue.concurrency += Math.round((target - queue.concurrency) / 10)

      if (queue.concurrency > 200) {
        queue.concurrency = 200
      } else if (queue.concurrency < 2) {
        queue.concurrency = 2
      }
    }
  }

  queue.push = function (task) {
    task.id = _.uniqueId('task_')
    task.start = Date.now()
    queue.tasks.push(task)
    if (queue.timeOut == null) {
      queue.timeOut = setTimeout(queue.cron, 500)
    }
    return new Promise(function (resolve, reject) {
      if (queue.tasks.length < queue.concurrency) {
        resolve()
      }

      co(task).then(function () {
        let idx = queue.tasks.indexOf(task)
        queue.tasks.splice(idx, 1)
        resolve()
      }).catch(function (err) {
        console.log(err)
      })
    })
  }

  return queue
}
