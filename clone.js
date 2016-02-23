(function() {
  var HELPTEXT, async, colors, iced, inquirer, _, __iced_k, __iced_k_noop;

  iced = require('iced-runtime');
  __iced_k = __iced_k_noop = function() {};

  _ = require('lodash');

  async = require('async');

  inquirer = require("inquirer");

  colors = require('colors');

  HELPTEXT = "\nThinker Clone\n==============================\n\nClone a RethinkDB database on the same host or between remote hosts.\n\nUsage:\n  thinker clone [options]\n  thinker clone --sh host[:port] --th host[:port] --sd dbName --td newDbName\n  thinker clone -h | --help\n\nOptions:\n  --sh, --sourceHost=<host[:port]>    Source host, defaults to 'localhost:21015'\n  --th, --targetHost=<host[:port]>    Target host, defaults to 'localhost:21015'\n  --sd, --sourceDB=<dbName>           Source database\n  --td, --targetDB=<dbName>           Target database\n\n  --pt, --pickTables=<table1,table2>  Comma separated list of tables to copy (whitelist)\n  --ot, --omitTables=<table1,table2>  Comma separated list of tables to ignore (blacklist)\n                                      Note: '--pt' and '--ot' are mutually exclusive options.\n";

  exports.run = function(argv, done) {
    var answer, check_queue, completed_tables, concurrency, confMessage, cursors, dbList, directClone, err, insert_queue, isDone, last_records_processed, omitTables, perf_stat, pickTables, queue_ready, r, records_processed, result, sHost, sourceDB, sourceHost, sourcePort, sourceTableList, sr, status_interval, tHost, tableConns, tablesToCopyList, targetDB, targetHost, targetPort, tname, total_records, tr, ___iced_passed_deferral, __iced_deferrals, __iced_k;
    __iced_k = __iced_k_noop;
    ___iced_passed_deferral = iced.findDeferral(arguments);
    sHost = argv.sh != null ? argv.sh : argv.sh = argv.sourceHost ? argv.sourceHost : 'localhost:28015';
    tHost = argv.th != null ? argv.th : argv.th = argv.targetHost ? argv.targetHost : 'localhost:28015';
    sourceHost = _.first(sHost.split(':'));
    targetHost = _.first(tHost.split(':'));
    sourcePort = Number(_.last(sHost.split(':'))) || 28015;
    targetPort = Number(_.last(tHost.split(':'))) || 28015;
    sourceDB = argv.sd != null ? argv.sd : argv.sd = argv.sourceDB ? argv.sourceDB : null;
    targetDB = argv.td != null ? argv.td : argv.td = argv.targetDB ? argv.targetDB : null;
    pickTables = argv.pt != null ? argv.pt : argv.pt = argv.pickTables ? argv.pickTables : null;
    omitTables = argv.ot != null ? argv.ot : argv.ot = argv.omitTables ? argv.omitTables : null;
    if (pickTables != null) {
      pickTables = pickTables.split(',');
    }
    if (omitTables != null) {
      omitTables = omitTables.split(',');
    }
    if (argv.h || argv.help) {
      console.log(HELPTEXT);
      return done();
    }
    if ((pickTables != null) && (omitTables != null)) {
      console.log("pickTables and omitTables are mutually exclusive options.");
      return done();
    }
    if (!((sourceDB != null) && (targetDB != null))) {
      console.log("Source and target databases are required!");
      console.log(HELPTEXT);
      return done();
    }
    if (("" + sourceHost + ":" + sourcePort) === ("" + targetHost + ":" + targetPort) && sourceDB === targetDB) {
      console.log("Source and target databases must be different if cloning on same server!");
      return done();
    }
    r = require('rethinkdbdash')({
      host: sourceHost,
      port: sourcePort
    });
    (function(_this) {
      return (function(__iced_k) {
        __iced_deferrals = new iced.Deferrals(__iced_k, {
          parent: ___iced_passed_deferral,
          filename: "./lib/clone.iced",
          funcname: "run"
        });
        r.dbList().run(__iced_deferrals.defer({
          assign_fn: (function() {
            return function() {
              err = arguments[0];
              return dbList = arguments[1];
            };
          })(),
          lineno: 65
        }));
        __iced_deferrals._fulfill();
      });
    })(this)((function(_this) {
      return function() {
        (function(__iced_k) {
          __iced_deferrals = new iced.Deferrals(__iced_k, {
            parent: ___iced_passed_deferral,
            filename: "./lib/clone.iced",
            funcname: "run"
          });
          r.db(sourceDB).tableList().run(__iced_deferrals.defer({
            assign_fn: (function() {
              return function() {
                err = arguments[0];
                return sourceTableList = arguments[1];
              };
            })(),
            lineno: 67
          }));
          __iced_deferrals._fulfill();
        })(function() {
          if (!_.contains(dbList, sourceDB)) {
            console.log("Source DB does not exist!");
            return done();
          }
          if ((pickTables != null) && !_.every(pickTables, function(table) {
            return _.contains(sourceTableList, table);
          })) {
            console.log(colors.red("Not all the tables specified in --pickTables exist!"));
            return done();
          }
          if ((omitTables != null) && !_.every(omitTables, function(table) {
            return _.contains(sourceTableList, table);
          })) {
            console.log(colors.red("Not all the tables specified in --omitTables exist!"));
            return done();
          }
          directClone = ("" + sourceHost + ":" + sourcePort) === ("" + targetHost + ":" + targetPort);
          (function(__iced_k) {
            __iced_deferrals = new iced.Deferrals(__iced_k, {
              parent: ___iced_passed_deferral,
              filename: "./lib/clone.iced",
              funcname: "run"
            });
            confMessage = "" + (colors.green("Ready to clone!")) + "\nThe database '" + (colors.yellow("" + sourceDB)) + "' on '" + (colors.yellow("" + sourceHost)) + ":" + (colors.yellow("" + sourcePort)) + "' will be cloned to the '" + (colors.yellow("" + targetDB)) + "' database on '" + (colors.yellow("" + targetHost)) + ":" + (colors.yellow("" + targetPort)) + "'\nThis will destroy(drop & create) the '" + (colors.yellow("" + targetDB)) + "' database on '" + (colors.yellow("" + targetHost)) + ":" + (colors.yellow("" + targetPort)) + "' if it exists!\n";
            if (pickTables != null) {
              confMessage += "ONLY the following tables will be copied: " + (colors.yellow("" + (pickTables.join(',')))) + "\n";
            }
            if (omitTables != null) {
              confMessage += "The following tables will NOT be copied: " + (colors.yellow("" + (omitTables.join(',')))) + "\n";
            }
            if (directClone) {
              confMessage += "Source RethinkDB Server is same as target. Cloning locally on server(this is faster).";
            } else {
              confMessage += "Source and target databases are on different servers. Cloning over network.";
            }
            console.log(confMessage);
            inquirer.prompt([
              {
                type: 'confirm',
                name: 'confirmed',
                message: "Proceed?",
                "default": false
              }
            ], __iced_deferrals.defer({
              assign_fn: (function() {
                return function() {
                  return answer = arguments[0];
                };
              })(),
              lineno: 101
            }));
            __iced_deferrals._fulfill();
          })(function() {
            if (!answer.confirmed) {
              console.log(colors.red("ABORT!"));
              return done();
            }
            if (pickTables != null) {
              tablesToCopyList = pickTables;
            } else if (omitTables != null) {
              tablesToCopyList = _.difference(sourceTableList, omitTables);
            } else {
              tablesToCopyList = sourceTableList;
            }
            if (directClone) {
              (function(__iced_k) {
                __iced_deferrals = new iced.Deferrals(__iced_k, {
                  parent: ___iced_passed_deferral,
                  filename: "./lib/clone.iced",
                  funcname: "run"
                });
                r.dbDrop(targetDB).run(__iced_deferrals.defer({
                  assign_fn: (function() {
                    return function() {
                      err = arguments[0];
                      return result = arguments[1];
                    };
                  })(),
                  lineno: 117
                }));
                __iced_deferrals._fulfill();
              })(function() {
                (function(__iced_k) {
                  __iced_deferrals = new iced.Deferrals(__iced_k, {
                    parent: ___iced_passed_deferral,
                    filename: "./lib/clone.iced",
                    funcname: "run"
                  });
                  r.dbCreate(targetDB).run(__iced_deferrals.defer({
                    assign_fn: (function() {
                      return function() {
                        err = arguments[0];
                        return result = arguments[1];
                      };
                    })(),
                    lineno: 118
                  }));
                  __iced_deferrals._fulfill();
                })(function() {
                  console.log("===== CREATE TABLES...");
                  (function(__iced_k) {
                    var _fn, _i, _len;
                    __iced_deferrals = new iced.Deferrals(__iced_k, {
                      parent: ___iced_passed_deferral,
                      filename: "./lib/clone.iced",
                      funcname: "run"
                    });
                    _fn = function(cb) {
                      var err, primaryKey, result, table, ___iced_passed_deferral1, __iced_deferrals, __iced_k;
                      __iced_k = __iced_k_noop;
                      ___iced_passed_deferral1 = iced.findDeferral(arguments);
                      table = tname;
                      (function(_this) {
                        return (function(__iced_k) {
                          __iced_deferrals = new iced.Deferrals(__iced_k, {
                            parent: ___iced_passed_deferral1,
                            filename: "./lib/clone.iced"
                          });
                          r.db(sourceDB).table(table).info()('primary_key').run(__iced_deferrals.defer({
                            assign_fn: (function() {
                              return function() {
                                err = arguments[0];
                                return primaryKey = arguments[1];
                              };
                            })(),
                            lineno: 125
                          }));
                          __iced_deferrals._fulfill();
                        });
                      })(this)((function(_this) {
                        return function() {
                          (function(__iced_k) {
                            __iced_deferrals = new iced.Deferrals(__iced_k, {
                              parent: ___iced_passed_deferral1,
                              filename: "./lib/clone.iced"
                            });
                            r.db(targetDB).tableCreate(table, {
                              primaryKey: primaryKey
                            }).run(__iced_deferrals.defer({
                              assign_fn: (function() {
                                return function() {
                                  err = arguments[0];
                                  return result = arguments[1];
                                };
                              })(),
                              lineno: 126
                            }));
                            __iced_deferrals._fulfill();
                          })(function() {
                            console.log("CREATED " + table);
                            return cb();
                          });
                        };
                      })(this));
                    };
                    for (_i = 0, _len = tablesToCopyList.length; _i < _len; _i++) {
                      tname = tablesToCopyList[_i];
                      _fn(__iced_deferrals.defer({
                        lineno: 129
                      }));
                    }
                    __iced_deferrals._fulfill();
                  })(function() {
                    console.log("===== SYNC SECONDARY INDEXES...");
                    (function(__iced_k) {
                      var _fn, _i, _len;
                      __iced_deferrals = new iced.Deferrals(__iced_k, {
                        parent: ___iced_passed_deferral,
                        filename: "./lib/clone.iced",
                        funcname: "run"
                      });
                      _fn = function(cb) {
                        var err, index, index_obj, result, sourceIndexes, table, ___iced_passed_deferral1, __iced_deferrals, __iced_k;
                        __iced_k = __iced_k_noop;
                        ___iced_passed_deferral1 = iced.findDeferral(arguments);
                        table = tname;
                        (function(_this) {
                          return (function(__iced_k) {
                            __iced_deferrals = new iced.Deferrals(__iced_k, {
                              parent: ___iced_passed_deferral1,
                              filename: "./lib/clone.iced"
                            });
                            r.db(sourceDB).table(table).indexList().run(__iced_deferrals.defer({
                              assign_fn: (function() {
                                return function() {
                                  err = arguments[0];
                                  return sourceIndexes = arguments[1];
                                };
                              })(),
                              lineno: 136
                            }));
                            __iced_deferrals._fulfill();
                          });
                        })(this)((function(_this) {
                          return function() {
                            (function(__iced_k) {
                              var _j, _len1, _ref, _results, _while;
                              _ref = sourceIndexes;
                              _len1 = _ref.length;
                              _j = 0;
                              _while = function(__iced_k) {
                                var _break, _continue, _next;
                                _break = __iced_k;
                                _continue = function() {
                                  return iced.trampoline(function() {
                                    ++_j;
                                    return _while(__iced_k);
                                  });
                                };
                                _next = _continue;
                                if (!(_j < _len1)) {
                                  return _break();
                                } else {
                                  index = _ref[_j];
                                  (function(__iced_k) {
                                    __iced_deferrals = new iced.Deferrals(__iced_k, {
                                      parent: ___iced_passed_deferral1,
                                      filename: "./lib/clone.iced"
                                    });
                                    r.db(sourceDB).table(table).indexStatus(index).run(__iced_deferrals.defer({
                                      assign_fn: (function() {
                                        return function() {
                                          err = arguments[0];
                                          return index_obj = arguments[1];
                                        };
                                      })(),
                                      lineno: 139
                                    }));
                                    __iced_deferrals._fulfill();
                                  })(function() {
                                    index_obj = _.first(index_obj);
                                    (function(__iced_k) {
                                      __iced_deferrals = new iced.Deferrals(__iced_k, {
                                        parent: ___iced_passed_deferral1,
                                        filename: "./lib/clone.iced"
                                      });
                                      r.db(targetDB).table(table).indexCreate(index_obj.index, index_obj["function"], {
                                        geo: index_obj.geo,
                                        multi: index_obj.multi
                                      }).run(__iced_deferrals.defer({
                                        assign_fn: (function() {
                                          return function() {
                                            err = arguments[0];
                                            return result = arguments[1];
                                          };
                                        })(),
                                        lineno: 144
                                      }));
                                      __iced_deferrals._fulfill();
                                    })(function() {
                                      (function(__iced_k) {
                                        __iced_deferrals = new iced.Deferrals(__iced_k, {
                                          parent: ___iced_passed_deferral1,
                                          filename: "./lib/clone.iced"
                                        });
                                        r.db(targetDB).table(table).indexWait().run(__iced_deferrals.defer({
                                          assign_fn: (function() {
                                            return function() {
                                              return err = arguments[0];
                                            };
                                          })(),
                                          lineno: 145
                                        }));
                                        __iced_deferrals._fulfill();
                                      })(_next);
                                    });
                                  });
                                }
                              };
                              _while(__iced_k);
                            })(function() {
                              console.log("INDEXES SYNCED " + table);
                              return cb();
                            });
                          };
                        })(this));
                      };
                      for (_i = 0, _len = tablesToCopyList.length; _i < _len; _i++) {
                        tname = tablesToCopyList[_i];
                        _fn(__iced_deferrals.defer({
                          lineno: 149
                        }));
                      }
                      __iced_deferrals._fulfill();
                    })(function() {
                      console.log("===== CLONE DATA...");
                      (function(__iced_k) {
                        var _fn, _i, _len;
                        __iced_deferrals = new iced.Deferrals(__iced_k, {
                          parent: ___iced_passed_deferral,
                          filename: "./lib/clone.iced",
                          funcname: "run"
                        });
                        _fn = function(cb) {
                          var err, sourceIndexes, table, ___iced_passed_deferral1, __iced_deferrals, __iced_k;
                          __iced_k = __iced_k_noop;
                          ___iced_passed_deferral1 = iced.findDeferral(arguments);
                          table = tname;
                          (function(_this) {
                            return (function(__iced_k) {
                              __iced_deferrals = new iced.Deferrals(__iced_k, {
                                parent: ___iced_passed_deferral1,
                                filename: "./lib/clone.iced"
                              });
                              r.db(targetDB).table(table).insert(r.db(sourceDB).table(table)).run(__iced_deferrals.defer({
                                assign_fn: (function() {
                                  return function() {
                                    err = arguments[0];
                                    return sourceIndexes = arguments[1];
                                  };
                                })(),
                                lineno: 159
                              }));
                              __iced_deferrals._fulfill();
                            });
                          })(this)((function(_this) {
                            return function() {
                              console.log("DATA CLONED " + table);
                              return cb();
                            };
                          })(this));
                        };
                        for (_i = 0, _len = tablesToCopyList.length; _i < _len; _i++) {
                          tname = tablesToCopyList[_i];
                          _fn(__iced_deferrals.defer({
                            lineno: 163
                          }));
                        }
                        __iced_deferrals._fulfill();
                      })(function() {
                        console.log("DONE!");
                        return done();
                        return __iced_k();
                      });
                    });
                  });
                });
              });
            } else {
              sr = require('rethinkdbdash')({
                host: sourceHost,
                port: sourcePort
              });
              tr = require('rethinkdbdash')({
                host: targetHost,
                port: targetPort
              });
              (function(__iced_k) {
                __iced_deferrals = new iced.Deferrals(__iced_k, {
                  parent: ___iced_passed_deferral,
                  filename: "./lib/clone.iced",
                  funcname: "run"
                });
                tr.dbDrop(targetDB).run(__iced_deferrals.defer({
                  assign_fn: (function() {
                    return function() {
                      err = arguments[0];
                      return result = arguments[1];
                    };
                  })(),
                  lineno: 174
                }));
                __iced_deferrals._fulfill();
              })(function() {
                (function(__iced_k) {
                  __iced_deferrals = new iced.Deferrals(__iced_k, {
                    parent: ___iced_passed_deferral,
                    filename: "./lib/clone.iced",
                    funcname: "run"
                  });
                  tr.dbCreate(targetDB).run(__iced_deferrals.defer({
                    assign_fn: (function() {
                      return function() {
                        err = arguments[0];
                        return result = arguments[1];
                      };
                    })(),
                    lineno: 175
                  }));
                  __iced_deferrals._fulfill();
                })(function() {
                  console.log("===== CREATE TABLES...");
                  (function(__iced_k) {
                    var _fn, _i, _len;
                    __iced_deferrals = new iced.Deferrals(__iced_k, {
                      parent: ___iced_passed_deferral,
                      filename: "./lib/clone.iced",
                      funcname: "run"
                    });
                    _fn = function(cb) {
                      var primaryKey, table, ___iced_passed_deferral1, __iced_deferrals, __iced_k;
                      __iced_k = __iced_k_noop;
                      ___iced_passed_deferral1 = iced.findDeferral(arguments);
                      table = tname;
                      (function(_this) {
                        return (function(__iced_k) {
                          __iced_deferrals = new iced.Deferrals(__iced_k, {
                            parent: ___iced_passed_deferral1,
                            filename: "./lib/clone.iced"
                          });
                          sr.db(sourceDB).table(table).info()('primary_key').run(__iced_deferrals.defer({
                            assign_fn: (function() {
                              return function() {
                                err = arguments[0];
                                return primaryKey = arguments[1];
                              };
                            })(),
                            lineno: 183
                          }));
                          __iced_deferrals._fulfill();
                        });
                      })(this)((function(_this) {
                        return function() {
                          (function(__iced_k) {
                            __iced_deferrals = new iced.Deferrals(__iced_k, {
                              parent: ___iced_passed_deferral1,
                              filename: "./lib/clone.iced"
                            });
                            tr.db(targetDB).tableCreate(table, {
                              primaryKey: primaryKey
                            }).run(__iced_deferrals.defer({
                              assign_fn: (function() {
                                return function() {
                                  err = arguments[0];
                                  return result = arguments[1];
                                };
                              })(),
                              lineno: 184
                            }));
                            __iced_deferrals._fulfill();
                          })(function() {
                            console.log("CREATED " + table);
                            return cb();
                          });
                        };
                      })(this));
                    };
                    for (_i = 0, _len = tablesToCopyList.length; _i < _len; _i++) {
                      tname = tablesToCopyList[_i];
                      _fn(__iced_deferrals.defer({
                        lineno: 188
                      }));
                    }
                    __iced_deferrals._fulfill();
                  })(function() {
                    console.log("===== SYNC SECONDARY INDEXES...");
                    (function(__iced_k) {
                      var _fn, _i, _len;
                      __iced_deferrals = new iced.Deferrals(__iced_k, {
                        parent: ___iced_passed_deferral,
                        filename: "./lib/clone.iced",
                        funcname: "run"
                      });
                      _fn = function(cb) {
                        var index, index_obj, sourceIndexes, table, ___iced_passed_deferral1, __iced_deferrals, __iced_k;
                        __iced_k = __iced_k_noop;
                        ___iced_passed_deferral1 = iced.findDeferral(arguments);
                        table = tname;
                        (function(_this) {
                          return (function(__iced_k) {
                            __iced_deferrals = new iced.Deferrals(__iced_k, {
                              parent: ___iced_passed_deferral1,
                              filename: "./lib/clone.iced"
                            });
                            sr.db(sourceDB).table(table).indexList().run(__iced_deferrals.defer({
                              assign_fn: (function() {
                                return function() {
                                  err = arguments[0];
                                  return sourceIndexes = arguments[1];
                                };
                              })(),
                              lineno: 195
                            }));
                            __iced_deferrals._fulfill();
                          });
                        })(this)((function(_this) {
                          return function() {
                            (function(__iced_k) {
                              var _j, _len1, _ref, _results, _while;
                              _ref = sourceIndexes;
                              _len1 = _ref.length;
                              _j = 0;
                              _while = function(__iced_k) {
                                var _break, _continue, _next;
                                _break = __iced_k;
                                _continue = function() {
                                  return iced.trampoline(function() {
                                    ++_j;
                                    return _while(__iced_k);
                                  });
                                };
                                _next = _continue;
                                if (!(_j < _len1)) {
                                  return _break();
                                } else {
                                  index = _ref[_j];
                                  (function(__iced_k) {
                                    __iced_deferrals = new iced.Deferrals(__iced_k, {
                                      parent: ___iced_passed_deferral1,
                                      filename: "./lib/clone.iced"
                                    });
                                    sr.db(sourceDB).table(table).indexStatus(index).run(__iced_deferrals.defer({
                                      assign_fn: (function() {
                                        return function() {
                                          err = arguments[0];
                                          return index_obj = arguments[1];
                                        };
                                      })(),
                                      lineno: 198
                                    }));
                                    __iced_deferrals._fulfill();
                                  })(function() {
                                    index_obj = _.first(index_obj);
                                    (function(__iced_k) {
                                      __iced_deferrals = new iced.Deferrals(__iced_k, {
                                        parent: ___iced_passed_deferral1,
                                        filename: "./lib/clone.iced"
                                      });
                                      tr.db(targetDB).table(table).indexCreate(index_obj.index, index_obj["function"], {
                                        geo: index_obj.geo,
                                        multi: index_obj.multi
                                      }).run(__iced_deferrals.defer({
                                        assign_fn: (function() {
                                          return function() {
                                            err = arguments[0];
                                            return result = arguments[1];
                                          };
                                        })(),
                                        lineno: 203
                                      }));
                                      __iced_deferrals._fulfill();
                                    })(function() {
                                      (function(__iced_k) {
                                        __iced_deferrals = new iced.Deferrals(__iced_k, {
                                          parent: ___iced_passed_deferral1,
                                          filename: "./lib/clone.iced"
                                        });
                                        r.db(targetDB).table(table).indexWait().run(__iced_deferrals.defer({
                                          assign_fn: (function() {
                                            return function() {
                                              return err = arguments[0];
                                            };
                                          })(),
                                          lineno: 204
                                        }));
                                        __iced_deferrals._fulfill();
                                      })(_next);
                                    });
                                  });
                                }
                              };
                              _while(__iced_k);
                            })(function() {
                              console.log("INDEXES SYNCED " + table);
                              return cb();
                            });
                          };
                        })(this));
                      };
                      for (_i = 0, _len = tablesToCopyList.length; _i < _len; _i++) {
                        tname = tablesToCopyList[_i];
                        _fn(__iced_deferrals.defer({
                          lineno: 208
                        }));
                      }
                      __iced_deferrals._fulfill();
                    })(function() {
                      concurrency = 50;
                      queue_ready = true;
                      records_processed = 0;
                      last_records_processed = 0;
                      completed_tables = [];
                      tableConns = {};
                      cursors = {};
                      total_records = 0;
                      perf_stat = [0];
                      status_interval = 500;
                      console.log("===== INSPECT SOURCE DATABASE...");
                      (function(__iced_k) {
                        var _fn, _i, _len;
                        __iced_deferrals = new iced.Deferrals(__iced_k, {
                          parent: ___iced_passed_deferral,
                          filename: "./lib/clone.iced",
                          funcname: "run"
                        });
                        _fn = function(cb) {
                          var size, table, ___iced_passed_deferral1, __iced_deferrals, __iced_k;
                          __iced_k = __iced_k_noop;
                          ___iced_passed_deferral1 = iced.findDeferral(arguments);
                          table = tname;
                          (function(_this) {
                            return (function(__iced_k) {
                              __iced_deferrals = new iced.Deferrals(__iced_k, {
                                parent: ___iced_passed_deferral1,
                                filename: "./lib/clone.iced"
                              });
                              sr.db(sourceDB).table(table).count().run(__iced_deferrals.defer({
                                assign_fn: (function() {
                                  return function() {
                                    err = arguments[0];
                                    return size = arguments[1];
                                  };
                                })(),
                                lineno: 227
                              }));
                              __iced_deferrals._fulfill();
                            });
                          })(this)((function(_this) {
                            return function() {
                              total_records += size;
                              return cb();
                            };
                          })(this));
                        };
                        for (_i = 0, _len = tablesToCopyList.length; _i < _len; _i++) {
                          tname = tablesToCopyList[_i];
                          _fn(__iced_deferrals.defer({
                            lineno: 230
                          }));
                        }
                        __iced_deferrals._fulfill();
                      })(function() {
                        console.log("" + total_records + " records to copy....");
                        insert_queue = async.queue((function(obj, cb) {
                          var ___iced_passed_deferral1, __iced_deferrals, __iced_k;
                          __iced_k = __iced_k_noop;
                          ___iced_passed_deferral1 = iced.findDeferral(arguments);
                          (function(_this) {
                            return (function(__iced_k) {
                              __iced_deferrals = new iced.Deferrals(__iced_k, {
                                parent: ___iced_passed_deferral1,
                                filename: "./lib/clone.iced"
                              });
                              tr.db(targetDB).table(obj.table).insert(obj.data).run({
                                durability: 'soft'
                              }, __iced_deferrals.defer({
                                assign_fn: (function() {
                                  return function() {
                                    err = arguments[0];
                                    return result = arguments[1];
                                  };
                                })(),
                                lineno: 237
                              }));
                              __iced_deferrals._fulfill();
                            });
                          })(this)((function(_this) {
                            return function() {
                              records_processed += obj.data.length;
                              return cb();
                            };
                          })(this));
                        }), concurrency);
                        isDone = function() {
                          return completed_tables.length >= tablesToCopyList.length;
                        };
                        insert_queue.drain = function() {
                          completed_tables = _.uniq(completed_tables);
                          if (isDone()) {
                            check_queue();
                            console.log("\n");
                            console.log("DONE!");
                            return done();
                          }
                        };
                        insert_queue.suturate = function() {
                          return console.log("SATURATED");
                        };
                        console.log("===== OPEN CURSORS");
                        (function(__iced_k) {
                          var _fn, _i, _len;
                          __iced_deferrals = new iced.Deferrals(__iced_k, {
                            parent: ___iced_passed_deferral,
                            filename: "./lib/clone.iced",
                            funcname: "run"
                          });
                          _fn = function(cb) {
                            var table, ___iced_passed_deferral1, __iced_deferrals, __iced_k;
                            __iced_k = __iced_k_noop;
                            ___iced_passed_deferral1 = iced.findDeferral(arguments);
                            table = tname;
                            (function(_this) {
                              return (function(__iced_k) {
                                __iced_deferrals = new iced.Deferrals(__iced_k, {
                                  parent: ___iced_passed_deferral1,
                                  filename: "./lib/clone.iced"
                                });
                                sr.db(sourceDB).table(table).run({
                                  cursor: true
                                }, __iced_deferrals.defer({
                                  assign_fn: (function(__slot_1, __slot_2) {
                                    return function() {
                                      err = arguments[0];
                                      return __slot_1[__slot_2] = arguments[1];
                                    };
                                  })(cursors, table),
                                  lineno: 262
                                }));
                                __iced_deferrals._fulfill();
                              });
                            })(this)((function(_this) {
                              return function() {
                                return cb();
                              };
                            })(this));
                          };
                          for (_i = 0, _len = tablesToCopyList.length; _i < _len; _i++) {
                            tname = tablesToCopyList[_i];
                            _fn(__iced_deferrals.defer({
                              lineno: 264
                            }));
                          }
                          __iced_deferrals._fulfill();
                        })(function() {
                          check_queue = function() {
                            var pc, rps;
                            perf_stat.unshift(records_processed - last_records_processed);
                            while (perf_stat.length > 40) {
                              perf_stat.pop();
                            }
                            rps = (_.reduce(perf_stat, function(a, b) {
                              return a + b;
                            }) / (perf_stat.length * (status_interval / 1000))).toFixed(1);
                            pc = ((records_processed / total_records) * 100).toFixed(1);
                            process.stdout.write(" RECORDS INSERTED: Total = " + records_processed + " | Per Second = " + rps + " | Percent Complete = %" + pc + "          \r");
                            last_records_processed = records_processed;
                            if (!isDone()) {
                              return setTimeout(check_queue, status_interval);
                            }
                          };
                          console.log("===== CLONE DATA...");
                          check_queue();
                          (function(__iced_k) {
                            var _fn, _i, _len;
                            __iced_deferrals = new iced.Deferrals(__iced_k, {
                              parent: ___iced_passed_deferral,
                              filename: "./lib/clone.iced",
                              funcname: "run"
                            });
                            _fn = function(cb) {
                              var buffer, row, start, table, table_done, ___iced_passed_deferral1, __iced_deferrals, __iced_k;
                              __iced_k = __iced_k_noop;
                              ___iced_passed_deferral1 = iced.findDeferral(arguments);
                              table = tname;
                              table_done = false;
                              (function(_this) {
                                return (function(__iced_k) {
                                  var _while;
                                  _while = function(__iced_k) {
                                    var _break, _continue, _next;
                                    _break = __iced_k;
                                    _continue = function() {
                                      return iced.trampoline(function() {
                                        return _while(__iced_k);
                                      });
                                    };
                                    _next = _continue;
                                    if (!!table_done) {
                                      return _break();
                                    } else {
                                      start = Date.now();
                                      buffer = [];
                                      (function(__iced_k) {
                                        var _while;
                                        _while = function(__iced_k) {
                                          var _break, _continue, _next;
                                          _break = __iced_k;
                                          _continue = function() {
                                            return iced.trampoline(function() {
                                              return _while(__iced_k);
                                            });
                                          };
                                          _next = _continue;
                                          if (!(buffer.length < 200 && (Date.now() - start) < 1000)) {
                                            return _break();
                                          } else {
                                            (function(__iced_k) {
                                              __iced_deferrals = new iced.Deferrals(__iced_k, {
                                                parent: ___iced_passed_deferral1,
                                                filename: "./lib/clone.iced"
                                              });
                                              cursors[table].next(__iced_deferrals.defer({
                                                assign_fn: (function() {
                                                  return function() {
                                                    err = arguments[0];
                                                    return row = arguments[1];
                                                  };
                                                })(),
                                                lineno: 287
                                              }));
                                              __iced_deferrals._fulfill();
                                            })(function() {
                                              (function(__iced_k) {
                                                if (err) {
                                                  table_done = true;
                                                  completed_tables.push(table);
                                                  (function(__iced_k) {
_break()
                                                  })(__iced_k);
                                                } else {
                                                  return __iced_k(buffer.push(row));
                                                }
                                              })(_next);
                                            });
                                          }
                                        };
                                        _while(__iced_k);
                                      })(function() {
                                        return _next(insert_queue.push({
                                          table: table,
                                          data: _.clone(buffer)
                                        }));
                                      });
                                    }
                                  };
                                  _while(__iced_k);
                                });
                              })(this)((function(_this) {
                                return function() {
                                  return cb();
                                };
                              })(this));
                            };
                            for (_i = 0, _len = tablesToCopyList.length; _i < _len; _i++) {
                              tname = tablesToCopyList[_i];
                              _fn(__iced_deferrals.defer({
                                lineno: 298
                              }));
                            }
                            __iced_deferrals._fulfill();
                          })(__iced_k);
                        });
                      });
                    });
                  });
                });
              });
            }
          });
        });
      };
    })(this));
  };

}).call(this);
