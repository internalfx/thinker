(function() {
  var HELPTEXT, VERSION, async, iced, inquirer, perfNow, r, _, __iced_k, __iced_k_noop;

  iced = require('iced-runtime');
  __iced_k = __iced_k_noop = function() {};

  _ = require('lodash');

  r = require('rethinkdb');

  async = require('async');

  perfNow = require("performance-now");

  inquirer = require("inquirer");

  VERSION = "0.1.0";

  HELPTEXT = "\nThinker Clone\n==============================\n\nClone a RethinkDB database on the same host or between remote hosts.\n\nUsage:\n  thinker [options]\n  thinker --sh host[:port] --th host[:port] --sd dbName --td newDbName\n  thinker -h | --help\n\nOptions:\n  --sh, --sHost=<host[:port]>     Source host, defaults to 'localhost:21015'\n  --th, --tHost=<host[:port]>     Target host, defaults to 'localhost:21015'\n  --sd, --sourceDB=<dbName>       Source database\n  --td, --targetDB=<dbName>       Target database\n";

  exports.run = function(argv, done) {
    var answer, check_queue, completed_tables, concurrency, conn, cursors, dbList, directClone, err, insert_queue, last_records_processed, perf_stat, queue_ready, records_processed, result, sHost, sourceConn, sourceDB, sourceHost, sourcePort, sourceTableList, status_interval, tHost, tableConns, targetConn, targetDB, targetHost, targetPort, tname, total_records, ___iced_passed_deferral, __iced_deferrals, __iced_k;
    __iced_k = __iced_k_noop;
    ___iced_passed_deferral = iced.findDeferral(arguments);
    sHost = argv.sh != null ? argv.sh : argv.sh = argv.sHost ? argv.sHost : 'localhost:28015';
    tHost = argv.th != null ? argv.th : argv.th = argv.tHost ? argv.tHost : 'localhost:28015';
    sourceHost = _.first(sHost.split(':'));
    targetHost = _.first(tHost.split(':'));
    sourcePort = Number(_.last(sHost.split(':'))) || 28015;
    targetPort = Number(_.last(tHost.split(':'))) || 28015;
    sourceDB = argv.sd != null ? argv.sd : argv.sd = argv.sourceDB ? argv.sourceDB : null;
    targetDB = argv.td != null ? argv.td : argv.td = argv.targetDB ? argv.targetDB : null;
    if (argv.h || argv.help) {
      console.log(HELPTEXT);
      return null;
    }
    if (!((sourceDB != null) && (targetDB != null))) {
      console.log("Source and target databases are required!");
      return null;
    }
    if (("" + sourceHost + ":" + sourcePort) === ("" + targetHost + ":" + targetPort) && sourceDB === targetDB) {
      console.log("Source and target databases must be different if cloning on same server!");
      return null;
    }
    (function(_this) {
      return (function(__iced_k) {
        __iced_deferrals = new iced.Deferrals(__iced_k, {
          parent: ___iced_passed_deferral,
          filename: "./lib/clone.iced",
          funcname: "run"
        });
        inquirer.prompt([
          {
            type: 'confirm',
            name: 'confirmed',
            message: "Ready to clone!\nThe database '" + sourceDB + "' on '" + sourceHost + ":" + sourcePort + "' will be cloned to the '" + targetDB + "' database on '" + targetHost + ":" + targetPort + "'\nThis will destroy all data in the '" + targetDB + "' database on '" + targetHost + ":" + targetPort + "' if it exists!\nProceed?",
            "default": false
          }
        ], __iced_deferrals.defer({
          assign_fn: (function() {
            return function() {
              return answer = arguments[0];
            };
          })(),
          lineno: 63
        }));
        __iced_deferrals._fulfill();
      });
    })(this)((function(_this) {
      return function() {
        if (!answer.confirmed) {
          console.log("ABORT!");
          return null;
        }
        directClone = ("" + sourceHost + ":" + sourcePort) === ("" + targetHost + ":" + targetPort);
        if (directClone) {
          console.log("Source RethinkDB Server is same as target. Cloning locally on server(this is faster).");
          (function(__iced_k) {
            __iced_deferrals = new iced.Deferrals(__iced_k, {
              parent: ___iced_passed_deferral,
              filename: "./lib/clone.iced",
              funcname: "run"
            });
            r.connect({
              host: sourceHost,
              port: sourcePort
            }, __iced_deferrals.defer({
              assign_fn: (function() {
                return function() {
                  err = arguments[0];
                  return conn = arguments[1];
                };
              })(),
              lineno: 73
            }));
            __iced_deferrals._fulfill();
          })(function() {
            (function(__iced_k) {
              __iced_deferrals = new iced.Deferrals(__iced_k, {
                parent: ___iced_passed_deferral,
                filename: "./lib/clone.iced",
                funcname: "run"
              });
              r.dbList().run(conn, __iced_deferrals.defer({
                assign_fn: (function() {
                  return function() {
                    err = arguments[0];
                    return dbList = arguments[1];
                  };
                })(),
                lineno: 76
              }));
              __iced_deferrals._fulfill();
            })(function() {
              (function(__iced_k) {
                if (!_.contains(dbList, sourceDB)) {
                  console.log("Source DB does not exist!");
                  (function(__iced_k) {
                    __iced_deferrals = new iced.Deferrals(__iced_k, {
                      parent: ___iced_passed_deferral,
                      filename: "./lib/clone.iced",
                      funcname: "run"
                    });
                    conn.close(__iced_deferrals.defer({
                      assign_fn: (function() {
                        return function() {
                          err = arguments[0];
                          return result = arguments[1];
                        };
                      })(),
                      lineno: 79
                    }));
                    __iced_deferrals._fulfill();
                  })(function() {
                    return null;
                    return __iced_k();
                  });
                } else {
                  return __iced_k();
                }
              })(function() {
                (function(__iced_k) {
                  __iced_deferrals = new iced.Deferrals(__iced_k, {
                    parent: ___iced_passed_deferral,
                    filename: "./lib/clone.iced",
                    funcname: "run"
                  });
                  r.dbDrop(targetDB).run(conn, __iced_deferrals.defer({
                    assign_fn: (function() {
                      return function() {
                        err = arguments[0];
                        return result = arguments[1];
                      };
                    })(),
                    lineno: 82
                  }));
                  __iced_deferrals._fulfill();
                })(function() {
                  (function(__iced_k) {
                    __iced_deferrals = new iced.Deferrals(__iced_k, {
                      parent: ___iced_passed_deferral,
                      filename: "./lib/clone.iced",
                      funcname: "run"
                    });
                    r.dbCreate(targetDB).run(conn, __iced_deferrals.defer({
                      assign_fn: (function() {
                        return function() {
                          err = arguments[0];
                          return result = arguments[1];
                        };
                      })(),
                      lineno: 83
                    }));
                    __iced_deferrals._fulfill();
                  })(function() {
                    (function(__iced_k) {
                      __iced_deferrals = new iced.Deferrals(__iced_k, {
                        parent: ___iced_passed_deferral,
                        filename: "./lib/clone.iced",
                        funcname: "run"
                      });
                      r.db(sourceDB).tableList().run(conn, __iced_deferrals.defer({
                        assign_fn: (function() {
                          return function() {
                            err = arguments[0];
                            return sourceTableList = arguments[1];
                          };
                        })(),
                        lineno: 85
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
                          var err, localconn, result, table, ___iced_passed_deferral1, __iced_deferrals, __iced_k;
                          __iced_k = __iced_k_noop;
                          ___iced_passed_deferral1 = iced.findDeferral(arguments);
                          table = tname;
                          (function(_this) {
                            return (function(__iced_k) {
                              __iced_deferrals = new iced.Deferrals(__iced_k, {
                                parent: ___iced_passed_deferral1,
                                filename: "./lib/clone.iced"
                              });
                              r.connect({
                                host: sourceHost,
                                port: sourcePort
                              }, __iced_deferrals.defer({
                                assign_fn: (function() {
                                  return function() {
                                    err = arguments[0];
                                    return localconn = arguments[1];
                                  };
                                })(),
                                lineno: 91
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
                                r.db(targetDB).tableCreate(table).run(localconn, __iced_deferrals.defer({
                                  assign_fn: (function() {
                                    return function() {
                                      err = arguments[0];
                                      return result = arguments[1];
                                    };
                                  })(),
                                  lineno: 92
                                }));
                                __iced_deferrals._fulfill();
                              })(function() {
                                (function(__iced_k) {
                                  __iced_deferrals = new iced.Deferrals(__iced_k, {
                                    parent: ___iced_passed_deferral1,
                                    filename: "./lib/clone.iced"
                                  });
                                  localconn.close(__iced_deferrals.defer({
                                    assign_fn: (function() {
                                      return function() {
                                        err = arguments[0];
                                        return result = arguments[1];
                                      };
                                    })(),
                                    lineno: 93
                                  }));
                                  __iced_deferrals._fulfill();
                                })(function() {
                                  console.log("CREATED " + table);
                                  return cb();
                                });
                              });
                            };
                          })(this));
                        };
                        for (_i = 0, _len = sourceTableList.length; _i < _len; _i++) {
                          tname = sourceTableList[_i];
                          _fn(__iced_deferrals.defer({
                            lineno: 96
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
                            var err, index, index_obj, localconn, result, sourceIndexes, table, ___iced_passed_deferral1, __iced_deferrals, __iced_k;
                            __iced_k = __iced_k_noop;
                            ___iced_passed_deferral1 = iced.findDeferral(arguments);
                            table = tname;
                            (function(_this) {
                              return (function(__iced_k) {
                                __iced_deferrals = new iced.Deferrals(__iced_k, {
                                  parent: ___iced_passed_deferral1,
                                  filename: "./lib/clone.iced"
                                });
                                r.connect({
                                  host: sourceHost,
                                  port: sourcePort
                                }, __iced_deferrals.defer({
                                  assign_fn: (function() {
                                    return function() {
                                      err = arguments[0];
                                      return localconn = arguments[1];
                                    };
                                  })(),
                                  lineno: 103
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
                                  r.db(sourceDB).table(table).indexList().run(localconn, __iced_deferrals.defer({
                                    assign_fn: (function() {
                                      return function() {
                                        err = arguments[0];
                                        return sourceIndexes = arguments[1];
                                      };
                                    })(),
                                    lineno: 104
                                  }));
                                  __iced_deferrals._fulfill();
                                })(function() {
                                  (function(__iced_k) {
                                    var _j, _len1, _ref, _results, _while;
                                    _ref = sourceIndexes;
                                    _len1 = _ref.length;
                                    _j = 0;
                                    _results = [];
                                    _while = function(__iced_k) {
                                      var _break, _continue, _next;
                                      _break = function() {
                                        return __iced_k(_results);
                                      };
                                      _continue = function() {
                                        return iced.trampoline(function() {
                                          ++_j;
                                          return _while(__iced_k);
                                        });
                                      };
                                      _next = function(__iced_next_arg) {
                                        _results.push(__iced_next_arg);
                                        return _continue();
                                      };
                                      if (!(_j < _len1)) {
                                        return _break();
                                      } else {
                                        index = _ref[_j];
                                        (function(__iced_k) {
                                          __iced_deferrals = new iced.Deferrals(__iced_k, {
                                            parent: ___iced_passed_deferral1,
                                            filename: "./lib/clone.iced"
                                          });
                                          r.db(sourceDB).table(table).indexStatus(index).run(localconn, __iced_deferrals.defer({
                                            assign_fn: (function() {
                                              return function() {
                                                err = arguments[0];
                                                return index_obj = arguments[1];
                                              };
                                            })(),
                                            lineno: 107
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
                                            }).run(localconn, __iced_deferrals.defer({
                                              assign_fn: (function() {
                                                return function() {
                                                  err = arguments[0];
                                                  return result = arguments[1];
                                                };
                                              })(),
                                              lineno: 112
                                            }));
                                            __iced_deferrals._fulfill();
                                          })(_next);
                                        });
                                      }
                                    };
                                    _while(__iced_k);
                                  })(function() {
                                    (function(__iced_k) {
                                      __iced_deferrals = new iced.Deferrals(__iced_k, {
                                        parent: ___iced_passed_deferral1,
                                        filename: "./lib/clone.iced"
                                      });
                                      localconn.close(__iced_deferrals.defer({
                                        assign_fn: (function() {
                                          return function() {
                                            err = arguments[0];
                                            return result = arguments[1];
                                          };
                                        })(),
                                        lineno: 114
                                      }));
                                      __iced_deferrals._fulfill();
                                    })(function() {
                                      console.log("INDEXES SYNCED " + table);
                                      return cb();
                                    });
                                  });
                                });
                              };
                            })(this));
                          };
                          for (_i = 0, _len = sourceTableList.length; _i < _len; _i++) {
                            tname = sourceTableList[_i];
                            _fn(__iced_deferrals.defer({
                              lineno: 117
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
                              var err, localconn, result, sourceIndexes, table, ___iced_passed_deferral1, __iced_deferrals, __iced_k;
                              __iced_k = __iced_k_noop;
                              ___iced_passed_deferral1 = iced.findDeferral(arguments);
                              table = tname;
                              (function(_this) {
                                return (function(__iced_k) {
                                  __iced_deferrals = new iced.Deferrals(__iced_k, {
                                    parent: ___iced_passed_deferral1,
                                    filename: "./lib/clone.iced"
                                  });
                                  r.connect({
                                    host: sourceHost,
                                    port: sourcePort
                                  }, __iced_deferrals.defer({
                                    assign_fn: (function() {
                                      return function() {
                                        err = arguments[0];
                                        return localconn = arguments[1];
                                      };
                                    })(),
                                    lineno: 124
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
                                    r.db(targetDB).table(table).insert(r.db(sourceDB).table(table)).run(localconn, __iced_deferrals.defer({
                                      assign_fn: (function() {
                                        return function() {
                                          err = arguments[0];
                                          return sourceIndexes = arguments[1];
                                        };
                                      })(),
                                      lineno: 128
                                    }));
                                    __iced_deferrals._fulfill();
                                  })(function() {
                                    (function(__iced_k) {
                                      __iced_deferrals = new iced.Deferrals(__iced_k, {
                                        parent: ___iced_passed_deferral1,
                                        filename: "./lib/clone.iced"
                                      });
                                      localconn.close(__iced_deferrals.defer({
                                        assign_fn: (function() {
                                          return function() {
                                            err = arguments[0];
                                            return result = arguments[1];
                                          };
                                        })(),
                                        lineno: 130
                                      }));
                                      __iced_deferrals._fulfill();
                                    })(function() {
                                      console.log("DATA CLONED " + table);
                                      return cb();
                                    });
                                  });
                                };
                              })(this));
                            };
                            for (_i = 0, _len = sourceTableList.length; _i < _len; _i++) {
                              tname = sourceTableList[_i];
                              _fn(__iced_deferrals.defer({
                                lineno: 133
                              }));
                            }
                            __iced_deferrals._fulfill();
                          })(function() {
                            console.log("DONE!");
                            (function(__iced_k) {
                              __iced_deferrals = new iced.Deferrals(__iced_k, {
                                parent: ___iced_passed_deferral,
                                filename: "./lib/clone.iced",
                                funcname: "run"
                              });
                              conn.close(__iced_deferrals.defer({
                                assign_fn: (function() {
                                  return function() {
                                    err = arguments[0];
                                    return result = arguments[1];
                                  };
                                })(),
                                lineno: 136
                              }));
                              __iced_deferrals._fulfill();
                            })(__iced_k);
                          });
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        } else {
          console.log("Source and target databases are on different servers. Cloning over network.");
          (function(__iced_k) {
            __iced_deferrals = new iced.Deferrals(__iced_k, {
              parent: ___iced_passed_deferral,
              filename: "./lib/clone.iced",
              funcname: "run"
            });
            r.connect({
              host: sourceHost,
              port: sourcePort
            }, __iced_deferrals.defer({
              assign_fn: (function() {
                return function() {
                  err = arguments[0];
                  return sourceConn = arguments[1];
                };
              })(),
              lineno: 141
            }));
            r.connect({
              host: targetHost,
              port: targetPort
            }, __iced_deferrals.defer({
              assign_fn: (function() {
                return function() {
                  err = arguments[0];
                  return targetConn = arguments[1];
                };
              })(),
              lineno: 142
            }));
            __iced_deferrals._fulfill();
          })(function() {
            (function(__iced_k) {
              __iced_deferrals = new iced.Deferrals(__iced_k, {
                parent: ___iced_passed_deferral,
                filename: "./lib/clone.iced",
                funcname: "run"
              });
              r.dbList().run(sourceConn, __iced_deferrals.defer({
                assign_fn: (function() {
                  return function() {
                    err = arguments[0];
                    return dbList = arguments[1];
                  };
                })(),
                lineno: 145
              }));
              __iced_deferrals._fulfill();
            })(function() {
              (function(__iced_k) {
                if (!_.contains(dbList, sourceDB)) {
                  console.log("Source DB does not exist!");
                  (function(__iced_k) {
                    __iced_deferrals = new iced.Deferrals(__iced_k, {
                      parent: ___iced_passed_deferral,
                      filename: "./lib/clone.iced",
                      funcname: "run"
                    });
                    sourceConn.close(__iced_deferrals.defer({
                      assign_fn: (function() {
                        return function() {
                          err = arguments[0];
                          return result = arguments[1];
                        };
                      })(),
                      lineno: 149
                    }));
                    targetConn.close(__iced_deferrals.defer({
                      assign_fn: (function() {
                        return function() {
                          err = arguments[0];
                          return result = arguments[1];
                        };
                      })(),
                      lineno: 150
                    }));
                    __iced_deferrals._fulfill();
                  })(function() {
                    return null;
                    return __iced_k();
                  });
                } else {
                  return __iced_k();
                }
              })(function() {
                (function(__iced_k) {
                  __iced_deferrals = new iced.Deferrals(__iced_k, {
                    parent: ___iced_passed_deferral,
                    filename: "./lib/clone.iced",
                    funcname: "run"
                  });
                  r.dbDrop(targetDB).run(targetConn, __iced_deferrals.defer({
                    assign_fn: (function() {
                      return function() {
                        err = arguments[0];
                        return result = arguments[1];
                      };
                    })(),
                    lineno: 153
                  }));
                  __iced_deferrals._fulfill();
                })(function() {
                  (function(__iced_k) {
                    __iced_deferrals = new iced.Deferrals(__iced_k, {
                      parent: ___iced_passed_deferral,
                      filename: "./lib/clone.iced",
                      funcname: "run"
                    });
                    r.dbCreate(targetDB).run(targetConn, __iced_deferrals.defer({
                      assign_fn: (function() {
                        return function() {
                          err = arguments[0];
                          return result = arguments[1];
                        };
                      })(),
                      lineno: 154
                    }));
                    __iced_deferrals._fulfill();
                  })(function() {
                    (function(__iced_k) {
                      __iced_deferrals = new iced.Deferrals(__iced_k, {
                        parent: ___iced_passed_deferral,
                        filename: "./lib/clone.iced",
                        funcname: "run"
                      });
                      r.db(sourceDB).tableList().run(sourceConn, __iced_deferrals.defer({
                        assign_fn: (function() {
                          return function() {
                            err = arguments[0];
                            return sourceTableList = arguments[1];
                          };
                        })(),
                        lineno: 156
                      }));
                      __iced_deferrals._fulfill();
                    })(function() {
                      (function(__iced_k) {
                        __iced_deferrals = new iced.Deferrals(__iced_k, {
                          parent: ___iced_passed_deferral,
                          filename: "./lib/clone.iced",
                          funcname: "run"
                        });
                        sourceConn.close(__iced_deferrals.defer({
                          assign_fn: (function() {
                            return function() {
                              err = arguments[0];
                              return result = arguments[1];
                            };
                          })(),
                          lineno: 159
                        }));
                        targetConn.close(__iced_deferrals.defer({
                          assign_fn: (function() {
                            return function() {
                              err = arguments[0];
                              return result = arguments[1];
                            };
                          })(),
                          lineno: 160
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
                            var err, localconn, result, table, ___iced_passed_deferral1, __iced_deferrals, __iced_k;
                            __iced_k = __iced_k_noop;
                            ___iced_passed_deferral1 = iced.findDeferral(arguments);
                            table = tname;
                            (function(_this) {
                              return (function(__iced_k) {
                                __iced_deferrals = new iced.Deferrals(__iced_k, {
                                  parent: ___iced_passed_deferral1,
                                  filename: "./lib/clone.iced"
                                });
                                r.connect({
                                  host: targetHost,
                                  port: targetPort
                                }, __iced_deferrals.defer({
                                  assign_fn: (function() {
                                    return function() {
                                      err = arguments[0];
                                      return localconn = arguments[1];
                                    };
                                  })(),
                                  lineno: 167
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
                                  r.db(targetDB).tableCreate(table).run(localconn, __iced_deferrals.defer({
                                    assign_fn: (function() {
                                      return function() {
                                        err = arguments[0];
                                        return result = arguments[1];
                                      };
                                    })(),
                                    lineno: 168
                                  }));
                                  __iced_deferrals._fulfill();
                                })(function() {
                                  (function(__iced_k) {
                                    __iced_deferrals = new iced.Deferrals(__iced_k, {
                                      parent: ___iced_passed_deferral1,
                                      filename: "./lib/clone.iced"
                                    });
                                    localconn.close(__iced_deferrals.defer({
                                      assign_fn: (function() {
                                        return function() {
                                          err = arguments[0];
                                          return result = arguments[1];
                                        };
                                      })(),
                                      lineno: 169
                                    }));
                                    __iced_deferrals._fulfill();
                                  })(function() {
                                    console.log("CREATED " + table);
                                    return cb();
                                  });
                                });
                              };
                            })(this));
                          };
                          for (_i = 0, _len = sourceTableList.length; _i < _len; _i++) {
                            tname = sourceTableList[_i];
                            _fn(__iced_deferrals.defer({
                              lineno: 172
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
                              var err, index, index_obj, result, sourceIndexes, sourcelocalconn, table, targetlocalconn, ___iced_passed_deferral1, __iced_deferrals, __iced_k;
                              __iced_k = __iced_k_noop;
                              ___iced_passed_deferral1 = iced.findDeferral(arguments);
                              table = tname;
                              (function(_this) {
                                return (function(__iced_k) {
                                  __iced_deferrals = new iced.Deferrals(__iced_k, {
                                    parent: ___iced_passed_deferral1,
                                    filename: "./lib/clone.iced"
                                  });
                                  r.connect({
                                    host: sourceHost,
                                    port: sourcePort
                                  }, __iced_deferrals.defer({
                                    assign_fn: (function() {
                                      return function() {
                                        err = arguments[0];
                                        return sourcelocalconn = arguments[1];
                                      };
                                    })(),
                                    lineno: 179
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
                                    r.connect({
                                      host: targetHost,
                                      port: targetPort
                                    }, __iced_deferrals.defer({
                                      assign_fn: (function() {
                                        return function() {
                                          err = arguments[0];
                                          return targetlocalconn = arguments[1];
                                        };
                                      })(),
                                      lineno: 180
                                    }));
                                    __iced_deferrals._fulfill();
                                  })(function() {
                                    (function(__iced_k) {
                                      __iced_deferrals = new iced.Deferrals(__iced_k, {
                                        parent: ___iced_passed_deferral1,
                                        filename: "./lib/clone.iced"
                                      });
                                      r.db(sourceDB).table(table).indexList().run(sourcelocalconn, __iced_deferrals.defer({
                                        assign_fn: (function() {
                                          return function() {
                                            err = arguments[0];
                                            return sourceIndexes = arguments[1];
                                          };
                                        })(),
                                        lineno: 181
                                      }));
                                      __iced_deferrals._fulfill();
                                    })(function() {
                                      (function(__iced_k) {
                                        var _j, _len1, _ref, _results, _while;
                                        _ref = sourceIndexes;
                                        _len1 = _ref.length;
                                        _j = 0;
                                        _results = [];
                                        _while = function(__iced_k) {
                                          var _break, _continue, _next;
                                          _break = function() {
                                            return __iced_k(_results);
                                          };
                                          _continue = function() {
                                            return iced.trampoline(function() {
                                              ++_j;
                                              return _while(__iced_k);
                                            });
                                          };
                                          _next = function(__iced_next_arg) {
                                            _results.push(__iced_next_arg);
                                            return _continue();
                                          };
                                          if (!(_j < _len1)) {
                                            return _break();
                                          } else {
                                            index = _ref[_j];
                                            (function(__iced_k) {
                                              __iced_deferrals = new iced.Deferrals(__iced_k, {
                                                parent: ___iced_passed_deferral1,
                                                filename: "./lib/clone.iced"
                                              });
                                              r.db(sourceDB).table(table).indexStatus(index).run(sourcelocalconn, __iced_deferrals.defer({
                                                assign_fn: (function() {
                                                  return function() {
                                                    err = arguments[0];
                                                    return index_obj = arguments[1];
                                                  };
                                                })(),
                                                lineno: 184
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
                                                }).run(targetlocalconn, __iced_deferrals.defer({
                                                  assign_fn: (function() {
                                                    return function() {
                                                      err = arguments[0];
                                                      return result = arguments[1];
                                                    };
                                                  })(),
                                                  lineno: 189
                                                }));
                                                __iced_deferrals._fulfill();
                                              })(_next);
                                            });
                                          }
                                        };
                                        _while(__iced_k);
                                      })(function() {
                                        (function(__iced_k) {
                                          __iced_deferrals = new iced.Deferrals(__iced_k, {
                                            parent: ___iced_passed_deferral1,
                                            filename: "./lib/clone.iced"
                                          });
                                          sourcelocalconn.close(__iced_deferrals.defer({
                                            assign_fn: (function() {
                                              return function() {
                                                err = arguments[0];
                                                return result = arguments[1];
                                              };
                                            })(),
                                            lineno: 192
                                          }));
                                          targetlocalconn.close(__iced_deferrals.defer({
                                            assign_fn: (function() {
                                              return function() {
                                                err = arguments[0];
                                                return result = arguments[1];
                                              };
                                            })(),
                                            lineno: 193
                                          }));
                                          __iced_deferrals._fulfill();
                                        })(function() {
                                          console.log("INDEXES SYNCED " + table);
                                          return cb();
                                        });
                                      });
                                    });
                                  });
                                };
                              })(this));
                            };
                            for (_i = 0, _len = sourceTableList.length; _i < _len; _i++) {
                              tname = sourceTableList[_i];
                              _fn(__iced_deferrals.defer({
                                lineno: 196
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
                                var err, localconn, result, size, table, ___iced_passed_deferral1, __iced_deferrals, __iced_k;
                                __iced_k = __iced_k_noop;
                                ___iced_passed_deferral1 = iced.findDeferral(arguments);
                                table = tname;
                                (function(_this) {
                                  return (function(__iced_k) {
                                    __iced_deferrals = new iced.Deferrals(__iced_k, {
                                      parent: ___iced_passed_deferral1,
                                      filename: "./lib/clone.iced"
                                    });
                                    r.connect({
                                      host: sourceHost,
                                      port: sourcePort
                                    }, __iced_deferrals.defer({
                                      assign_fn: (function() {
                                        return function() {
                                          err = arguments[0];
                                          return localconn = arguments[1];
                                        };
                                      })(),
                                      lineno: 215
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
                                      r.db(sourceDB).table(table).count().run(localconn, __iced_deferrals.defer({
                                        assign_fn: (function() {
                                          return function() {
                                            err = arguments[0];
                                            return size = arguments[1];
                                          };
                                        })(),
                                        lineno: 216
                                      }));
                                      __iced_deferrals._fulfill();
                                    })(function() {
                                      total_records += size;
                                      (function(__iced_k) {
                                        __iced_deferrals = new iced.Deferrals(__iced_k, {
                                          parent: ___iced_passed_deferral1,
                                          filename: "./lib/clone.iced"
                                        });
                                        localconn.close(__iced_deferrals.defer({
                                          assign_fn: (function() {
                                            return function() {
                                              err = arguments[0];
                                              return result = arguments[1];
                                            };
                                          })(),
                                          lineno: 218
                                        }));
                                        __iced_deferrals._fulfill();
                                      })(function() {
                                        return cb();
                                      });
                                    });
                                  };
                                })(this));
                              };
                              for (_i = 0, _len = sourceTableList.length; _i < _len; _i++) {
                                tname = sourceTableList[_i];
                                _fn(__iced_deferrals.defer({
                                  lineno: 220
                                }));
                              }
                              __iced_deferrals._fulfill();
                            })(function() {
                              console.log("" + total_records + " records to copy....");
                              insert_queue = async.queue((function(obj, cb) {
                                var err, localconn, result, ___iced_passed_deferral1, __iced_deferrals, __iced_k;
                                __iced_k = __iced_k_noop;
                                ___iced_passed_deferral1 = iced.findDeferral(arguments);
                                (function(_this) {
                                  return (function(__iced_k) {
                                    __iced_deferrals = new iced.Deferrals(__iced_k, {
                                      parent: ___iced_passed_deferral1,
                                      filename: "./lib/clone.iced"
                                    });
                                    r.connect({
                                      host: targetHost,
                                      port: targetPort
                                    }, __iced_deferrals.defer({
                                      assign_fn: (function() {
                                        return function() {
                                          err = arguments[0];
                                          return localconn = arguments[1];
                                        };
                                      })(),
                                      lineno: 227
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
                                      r.db(targetDB).table(obj.table).insert(obj.data).run(localconn, {
                                        durability: 'soft'
                                      }, __iced_deferrals.defer({
                                        assign_fn: (function() {
                                          return function() {
                                            err = arguments[0];
                                            return result = arguments[1];
                                          };
                                        })(),
                                        lineno: 228
                                      }));
                                      __iced_deferrals._fulfill();
                                    })(function() {
                                      (function(__iced_k) {
                                        __iced_deferrals = new iced.Deferrals(__iced_k, {
                                          parent: ___iced_passed_deferral1,
                                          filename: "./lib/clone.iced"
                                        });
                                        localconn.close(__iced_deferrals.defer({
                                          assign_fn: (function() {
                                            return function() {
                                              err = arguments[0];
                                              return result = arguments[1];
                                            };
                                          })(),
                                          lineno: 229
                                        }));
                                        __iced_deferrals._fulfill();
                                      })(function() {
                                        records_processed += obj.data.length;
                                        return cb();
                                      });
                                    });
                                  };
                                })(this));
                              }), concurrency);
                              check_queue = function() {
                                var pc, rps;
                                perf_stat.unshift(records_processed - last_records_processed);
                                while (perf_stat.length > 25) {
                                  perf_stat.pop();
                                }
                                rps = (_.reduce(perf_stat, function(a, b) {
                                  return a + b;
                                }) / (perf_stat.length * (status_interval / 1000))).toFixed(1);
                                pc = ((records_processed / total_records) * 100).toFixed(1);
                                process.stdout.write(" RECORDS INSERTED: Total = " + records_processed + " | Per Second = " + rps + " | Percent Complete = %" + pc + "          \r");
                                last_records_processed = records_processed;
                                return setTimeout(check_queue, status_interval);
                              };
                              setTimeout(check_queue, status_interval);
                              insert_queue.drain = function() {
                                sourceTableList = _.uniq(sourceTableList);
                                if (completed_tables.length >= sourceTableList.length) {
                                  console.log(_.keys(tableConns));
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
                                  var err, table, ___iced_passed_deferral1, __iced_deferrals, __iced_k;
                                  __iced_k = __iced_k_noop;
                                  ___iced_passed_deferral1 = iced.findDeferral(arguments);
                                  table = tname;
                                  (function(_this) {
                                    return (function(__iced_k) {
                                      __iced_deferrals = new iced.Deferrals(__iced_k, {
                                        parent: ___iced_passed_deferral1,
                                        filename: "./lib/clone.iced"
                                      });
                                      r.connect({
                                        host: sourceHost,
                                        port: sourcePort
                                      }, __iced_deferrals.defer({
                                        assign_fn: (function(__slot_1, __slot_2) {
                                          return function() {
                                            err = arguments[0];
                                            return __slot_1[__slot_2] = arguments[1];
                                          };
                                        })(tableConns, table),
                                        lineno: 260
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
                                        r.db(sourceDB).table(table).run(tableConns[table], __iced_deferrals.defer({
                                          assign_fn: (function(__slot_1, __slot_2) {
                                            return function() {
                                              err = arguments[0];
                                              return __slot_1[__slot_2] = arguments[1];
                                            };
                                          })(cursors, table),
                                          lineno: 261
                                        }));
                                        __iced_deferrals._fulfill();
                                      })(function() {
                                        return cb();
                                      });
                                    };
                                  })(this));
                                };
                                for (_i = 0, _len = sourceTableList.length; _i < _len; _i++) {
                                  tname = sourceTableList[_i];
                                  _fn(__iced_deferrals.defer({
                                    lineno: 263
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
                                    var buffer, err, row, table, table_done, ___iced_passed_deferral1, __iced_deferrals, __iced_k;
                                    __iced_k = __iced_k_noop;
                                    ___iced_passed_deferral1 = iced.findDeferral(arguments);
                                    table = tname;
                                    table_done = false;
                                    (function(_this) {
                                      return (function(__iced_k) {
                                        var _results, _while;
                                        _results = [];
                                        _while = function(__iced_k) {
                                          var _break, _continue, _next;
                                          _break = function() {
                                            return __iced_k(_results);
                                          };
                                          _continue = function() {
                                            return iced.trampoline(function() {
                                              return _while(__iced_k);
                                            });
                                          };
                                          _next = function(__iced_next_arg) {
                                            _results.push(__iced_next_arg);
                                            return _continue();
                                          };
                                          if (!!table_done) {
                                            return _break();
                                          } else {
                                            buffer = [];
                                            (function(__iced_k) {
                                              var _results1, _while;
                                              _results1 = [];
                                              _while = function(__iced_k) {
                                                var _break, _continue, _next;
                                                _break = function() {
                                                  return __iced_k(_results1);
                                                };
                                                _continue = function() {
                                                  return iced.trampoline(function() {
                                                    return _while(__iced_k);
                                                  });
                                                };
                                                _next = function(__iced_next_arg) {
                                                  _results1.push(__iced_next_arg);
                                                  return _continue();
                                                };
                                                if (!(buffer.length < 200)) {
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
                                                      lineno: 275
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
                                  for (_i = 0, _len = sourceTableList.length; _i < _len; _i++) {
                                    tname = sourceTableList[_i];
                                    _fn(__iced_deferrals.defer({
                                      lineno: 286
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
                  });
                });
              });
            });
          });
        }
      };
    })(this));
  };

}).call(this);
