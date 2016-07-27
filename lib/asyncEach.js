let parallel = require('co-parallel')

module.exports = function *(list, fn, concurrency = 10) {
  var tasks = list.map(fn)
  var res = yield parallel(tasks, concurrency)
  return res
}
