(function() {
  var HELPTEXT, iced, perfNow, r, _, __iced_k, __iced_k_noop;

  iced = require('iced-runtime');
  __iced_k = __iced_k_noop = function() {};

  _ = require('lodash');

  r = require('rethinkdb');

  perfNow = require("performance-now");

  HELPTEXT = "\nThinker " + VERSION + "\n==============================\n\nA RethinkDB command line tool.\n\nCommands:\n  thinker clone           Clone a database locally or between remote hosts.\n  thinker -h | --help     Show this screen.\n";

  exports.run = function(argv) {
    var command, ___iced_passed_deferral, __iced_deferrals, __iced_k;
    __iced_k = __iced_k_noop;
    ___iced_passed_deferral = iced.findDeferral(arguments);
    command = _.first(argv['_']);
    argv['_'] = argv['_'].slice(1);
    (function(_this) {
      return (function(__iced_k) {
        switch (command) {
          case "clone":
            (function(__iced_k) {
              __iced_deferrals = new iced.Deferrals(__iced_k, {
                parent: ___iced_passed_deferral,
                filename: "./lib/main.iced",
                funcname: "run"
              });
              require('./clone').run(argv, __iced_deferrals.defer({
                lineno: 25
              }));
              __iced_deferrals._fulfill();
            })(__iced_k);
            break;
          default:
            return __iced_k(console.log(HELPTEXT));
        }
      });
    })(this)((function(_this) {
      return function() {
        return process.exit();
      };
    })(this));
  };

}).call(this);
