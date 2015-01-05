(function() {
  var HELPTEXT, VERSION, perfNow, r, _;

  _ = require('lodash');

  r = require('rethinkdb');

  perfNow = require("performance-now");

  VERSION = "0.1.0";

  HELPTEXT = "\nThinker " + VERSION + "\n==============================\n\nA RethinkDB command line tool.\n\nCommands:\n  thinker clone           Clone a database locally or between remote hosts.\n  thinker -h | --help     Show this screen.\n";

  exports.run = function(argv) {
    var command;
    command = _.first(argv['_']);
    argv['_'] = argv['_'].slice(1);
    switch (command) {
      case "clone":
        return require('./clone').run(argv, function() {
          return process.exit();
        });
      default:
        return console.log(HELPTEXT);
    }
  };

}).call(this);
