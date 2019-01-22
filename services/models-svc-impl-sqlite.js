/* global Promise */

const sqlite3 = require("sqlite3"); //.verbose();
const debug = require("debug")("HelloNodeJS:models-svc-impl-sqlite");
const util = require("util");


module.exports = function(opts) {
    let opts2 = opts || {};
    let autoConnect = (typeof opts2.autoConnect !== "undefined")
        ? opts2.autoConnect
        : true;
    let modelDefs = ((opts2) ? opts2.models : null) || {};
    let statementsCache = {};
    //let statementParamsDefs = {};
    let _db = null;
   
    function connect() {
        if (_db) {
            return Promise.reject(new Error('DB Already Connected'));
        }
        
        return new Promise((resolve,reject) => {
            let src = opts2.source || ':memory:';
            let mode = opts2.mode || sqlite3.OPEN_READWRITE;
            
            debug(`DEBUG: Opening DB connection: ${src}; Mode: ${mode}`);
            console.info(`Opening DB connection: ${src}`);
            let db = new sqlite3.Database(src,
                opts2.mode || sqlite3.OPEN_READWRITE,
                (err) => {
                    if (err) {
                        return reject(err);
                    }
                    _db = db;
                    resolve(db);
                }
            );
        });
    }
    function disconnect() {
        if (!_db) {
            return Promise.resolve(false);
        }
        let db = _db;
        
        return new Promise((resolve,reject) => {
            debug(`DEBUG: Closing DB connection: ${util.insepct(db)}`);
            console.warn("Closing DB connection");
            db.close((err) => {
                if (err) {
                    return reject(err);
                }
                _db = null;
                resolve(true);
            });
        });
    }
    function getDB() {
        let prom1;
        let db = _db;
        if ((!db) && (autoConnect)) {
            prom1 = connect();
        }
        prom1 = prom1 || Promise.resolve(db);
        
        return prom1
          .then((db2) => {
            db = db2;
            if (!db) {
                return Promise.reject(new Error("Failed to Open Database Connection"));
            }
            
            return Promise.resolve(db);
        });
    }
    function getStatement(db, modelKey, stmtKey, autoCreate) {
        let modelDef = modelDefs[modelKey];
        let stmt;
        
        let stmtsMap = statementsCache[modelKey];
        if (!stmtsMap) {
            if (!autoCreate) {
                return Promise.resolve(null);
            }
            statementsCache[modelKey] = stmtsMap = { };
        }
        
        let prom1;
        stmt = stmtsMap[stmtKey];
        if (stmt) {
          debug(`DEBUG: ${modelKey}.${stmtKey}: Found Cached Statement => ${util.inspect(stmt)}`);
        } else {
            if (!autoCreate) {
                return Promise.resolve(null);
            }
            if ((modelDef) && (modelDef.statements)) {
                let stmtQuery = modelDef.statements[stmtKey];
                if (stmtQuery) {
                    prom1 = (db) ? Promise.resolve(db) : getDB();
                    prom1 = prom1
                      .then((db2) => {
                        (db2) && (db = db2);
                        stmtsMap[stmtKey] = stmt = db.prepare(stmtQuery);
                        debug(`DEBUG: ${modelKey}.${stmtKey}: db.prepare(${stmtQuery}) => ${util.inspect(stmt)}`);
                      
                        return Promise.resolve(stmt);
                      });
                }
            }
        }
        prom1 = prom1 || Promise.resolve(stmt);
        
        return prom1;
    }
    
    function getItemKey(modelKey, item) {
        let modelDef = modelDefs[modelKey];

        return ((modelDef) && (modelDef.getKey))
            ? modelDef.getKey(item)
            : null;
    }
    function getItemID(modelKey, item) {
        let modelDef = modelDefs[modelKey];
        let id = null;
        if (modelDef) {
            if ((modelDef.getID) && (typeof modelDef.getID === "function")) {
                id = modelDef.getID(item);
            } else if ((modelDef.idColumn) || (modelDef.idColumn === 0)) {
                id = item[modelDef.idColumn];
            }
        }
        
        return id;
    }
    function setItemID(modelKey, item, id) {
        let modelDef = modelDefs[modelKey];
        if (modelDef) {
            if ((modelDef.setID) && (typeof modelDef.setID === "function")) {
                modelDef.setID(item, id);
            } else if ((modelDef.idColumn) || (modelDef.idColumn === 0)) {
                item[modelDef.idColumn] = id;
            }
        }
    }
    
    function preProcessQueryParams(modelKey, stmtKey, params) {
        if (Array.isArray(params)) {
            return params;
        }
        let modelDef = modelDefs[modelKey] || {};
        let prefix = modelDef.parameterPrefix || "$";
        let stmtQuery = (modelDef.statements)
            ? modelDef.statements[stmtKey]
            : null;
        let row = {};
        for (let key in params) {
            if (!params.hasOwnProperty(key)) {
                continue;
            }
            let fullKey = `${prefix}${key}`;
            if ((stmtQuery) || (stmtQuery === "")) {
                if (!stmtQuery.includes(fullKey)) {
                    //Ignore
                    continue;
                }
            }
            row[fullKey] = params[key];
        }
        
        return row;
    }
    
    let svc;
    svc = {
        init: function() {
            let proms = [];
            
            (opts2.verbose) && sqlite3.verbose();
            
            if (autoConnect) {
                proms.push(getDB()
                  .then((db) => {
                    let proms2 = [];
                    for (let modelKey in modelDefs) {
                        if (!modelDefs.hasOwnProperty(modelKey)) {
                            continue;
                        }
                        let modelDef = modelDefs[modelKey] || {};
                        let stmtsMap = {
                        };
                        if (modelDef.statements) {
                            for (let stmtKey in modelDef.statements) {
                                if (!modelDef.statements.hasOwnProperty(stmtKey)) {
                                    continue;
                                }
                                proms2.push(getStatement(db, modelKey, stmtKey, true));
                            }
                        }
                    }
                    return Promise.all(proms2)
                      .then((results) => {
                        for (let modelKey in modelDefs) {
                            if (!modelDefs.hasOwnProperty(modelKey)) {
                                continue;
                            }
                            let modelDef = modelDefs[modelKey] || {};
                            console.log(`Model[${modelKey}]: Prepared Statements: `, modelDef.statements);
                        }
                        return Promise.resolve((results) ? results.length : 0);
                      });
                  })
                );
            }
            
            return Promise.all(proms)
              .then((results) => {
                  console.log("Init results: ", results);
                
                  return Promise.resolve(true);
              });
        }, 
        cleanup: function() {
            let proms = [];
            
            if (_db) {
                proms.push(disconnect());
            }
            
            return Promise.all(proms)
              .then((results) => {
                  console.log("Cleanup results: ", results);
                
                  return Promise.resolve(null);
              });
        },
        
        defineModel: function(modelKey, modelDef) {
            modelDefs[modelKey] = modelDef;
        },
        
        getItemKey: getItemKey.bind(svc),
        getItemID: getItemID.bind(svc),
        setItemID: setItemID.bind(svc),
        
        initStore: function(modelKey, params) {
            let stmtKey = "initStore";
                    
            return getDB()
              .then((db) => {
                return new Promise((resolve,reject) => {
                  db.serialize(() => {
                    getStatement(db, modelKey, stmtKey, true)
                      .then((stmt) => {
                        if (!stmt) {
                            return reject(new Error(`Failed to prepare statement: ${modelKey}.${stmtKey}`));
                        }
                        let params2 = preProcessQueryParams(modelKey, stmtKey, params);
                        stmt.run(params2, function (err) {
                            if (err) {
                                return reject(err);
                            }
                            let nObjs = this.changes;
                            /*if (nRows < 1) {
                              return reject(new Error("No Row Updated"));
                            }*/
                            debug(`DEBUG: ${modelKey}.${stmtKey}(${util.inspect(params2)}) => ${util.inspect(this)}`);
                            console.info(`Initialized DB Store for: ${modelKey} (${nObjs} objects affected)`);
                            
                            return resolve(nObjs);
                        });
                      });
                  });
                });
              })
              .catch((err) => {
                debug(`ERROR: ${modelKey}.${stmtKey}() => ${util.inspect(err)}`);
                return Promise.reject(err);        
              });
        },
        destroyStore: function(modelKey, params) {
            let stmtKey = "destroyStore";
                    
            return getDB()
              .then((db) => {
                return new Promise((resolve,reject) => {
                  db.serialize(() => {
                    getStatement(db, modelKey, stmtKey, true)
                      .then((stmt) => {
                        if (!stmt) {
                            return reject(new Error(`Failed to prepare statement: ${modelKey}.${stmtKey}`));
                        }
                        let params2 = preProcessQueryParams(modelKey, stmtKey, params);
                        stmt.run(params2, function (err) {
                            if (err) {
                                return reject(err);
                            }
                            let nObjs = this.changes;
                            /*if (nRows < 1) {
                              return reject(new Error("No Row Updated"));
                            }*/
                            debug(`DEBUG: ${modelKey}.${stmtKey}(${util.inspect(params2)}) => ${util.inspect(this)}`);
                            console.warn(`Destroyed DB Store for: ${modelKey} (${nObjs} objects affected)`);
                            
                            return resolve(nObjs);
                        });
                      });
                  });
                });
              })
              .catch((err) => {
                debug(`ERROR: ${modelKey}.${stmtKey}() => ${util.inspect(err)}`);
                return Promise.reject(err);        
              });
        },
        
        getCollection: function(modelKey, filters) {
            let stmtKey = "getCollection";
            let filters2;
            
            return getDB()
              .then((db) => {
                return new Promise((resolve,reject) => {
                  db.serialize(() => {
                    getStatement(db, modelKey, stmtKey, true)
                      .then((stmt) => {
                        if (!stmt) {
                            return reject(new Error(`Failed to prepare statement: ${modelKey}.${stmtKey}`));
                        }
                        filters2 = preProcessQueryParams(modelKey, stmtKey, filters);
                        stmt.all(filters2, (err, rows) => {
                            if (err) {
                                return reject(err);
                            }
                            debug(`DEBUG: ${modelKey}.${stmtKey}(${util.inspect(filters2)}) =>\n${util.inspect(rows)}`);
                            
                            return resolve(rows);
                        });
                      });
                  });
                });
              })
              .catch((err) => {
                debug(`ERROR: ${modelKey}.${stmtKey}(${util.inspect(filters2)}) => ${util.inspect(err)}`);
                return Promise.reject(err);        
              });
        },
        getItem: function(modelKey, itemKey) {
            let stmtKey = "getItem";
                    
            return getDB()
              .then((db) => {
                return new Promise((resolve,reject) => {
                  db.serialize(() => {
                    getStatement(db, modelKey, stmtKey, true)
                      .then((stmt) => {
                        if (!stmt) {
                            return reject(new Error(`Failed to prepare statement: ${modelKey}.${stmtKey}`));
                        }
                        stmt.get([ itemKey ], (err, row) => {
                            if (err) {
                                return reject(err);
                            }
                            debug(`DEBUG: ${modelKey}.${stmtKey}(${itemKey}) => ${util.inspect(row)}`);
                            
                            return resolve(row);
                        });
                      });
                  });
                });
              })
              .catch((err) => {
                debug(`ERROR: ${modelKey}.${stmtKey}(${itemKey}) => ${util.inspect(err)}`);
                return Promise.reject(err);        
              });
        },
    
        addItem: function(modelKey, itemKey, item) {
            let stmtKey = "add";
            let row;
            
            return getDB()
              .then((db) => {
                return new Promise((resolve,reject) => {
                  db.serialize(() => {
                    getStatement(db, modelKey, stmtKey, true)
                      .then((stmt) => {
                        if (!stmt) {
                            return reject(new Error(`Failed to prepare statement: ${modelKey}.${stmtKey}`));
                        }
                        row = preProcessQueryParams(modelKey, stmtKey, item);
                        stmt.run(row, function (err) {
                            if (err) {
                                debug(`ERROR: ${modelKey}.${stmtKey}(${util.inspect(row)}) => ${util.inspect(err)}`);
                                return reject(err);
                            }
                            let nRows = this.changes;
                            if (nRows < 1) {
                              return reject(new Error("No Row Inserted"));
                            }
                            let id = this.lastID;
                            (id) && setItemID(modelKey, item, id);
                            debug(`DEBUG: ${modelKey}.${stmtKey}(${util.inspect(row)}) => ${util.inspect(this)}`);
                            console.info(`Added ${modelKey}#${itemKey}; Auto Generated ID: ${id}: `, item);
                            
                            return resolve(id);
                        });
                      })
                      .catch((err) => {
                        debug(`ERROR: ${modelKey}.${stmtKey}(${util.inspect(row)}) => ${util.inspect(err)}`);
                        return Promise.reject(err);        
                      });
                  });
                });
              });
        },
        updateItem: function(modelKey, itemKey, item) {
            let stmtKey = "update";
            let row;
            
            return getDB()
              .then((db) => {
                return new Promise((resolve,reject) => {
                  db.serialize(() => {
                    getStatement(db, modelKey, stmtKey, true)
                      .then((stmt) => {
                        if (!stmt) {
                            return reject(new Error(`Failed to prepare statement: ${modelKey}.${stmtKey}`));
                        }
                        row = preProcessQueryParams(modelKey, stmtKey, item);
                        stmt.run(row, function (err) {
                            if (err) {
                                return reject(err);
                            }
                            let nRows = this.changes;
                            /*if (nRows < 1) {
                              return reject(new Error("No Row Updated"));
                            }*/
                            debug(`DEBUG: ${modelKey}.${stmtKey}(${util.inspect(row)}) => ${util.inspect(this)}`);
                            console.info(`Updated ${modelKey}#${itemKey} (${nRows} rows): `, item);
                            
                            return resolve(nRows);
                        });
                      })
                  });
                });
              })
              .catch((err) => {
                debug(`ERROR: ${modelKey}.${stmtKey}(${util.inspect(row)}) => ${util.inspect(err)}`);
                return Promise.reject(err);        
              });
        },
        deleteItem: function(modelKey, itemKey) {
            let stmtKey = "delete";
            
            return getDB()
              .then((db) => {
                return new Promise((resolve,reject) => {
                  db.serialize(() => {
                    getStatement(db, modelKey, stmtKey, true)
                      .then((stmt) => {
                        if (!stmt) {
                            return reject(new Error(`Failed to prepare statement: ${modelKey}.${stmtKey}`));
                        }
                        stmt.run([ itemKey ], function (err) {
                            if (err) {
                                return reject(err);
                            }
                            let nRows = this.changes;
                            /*if (nRows < 1) {
                              return reject(new Error("No Row Updated"));
                            }*/
                            debug(`DEBUG: ${modelKey}.${stmtKey}(${itemKey}) => ${util.inspect(this)}`);
                            console.info(`Deleted ${modelKey}#${itemKey} (${nRows} rows)`);
                            
                            return resolve(nRows);
                        });
                      })
                  });
                });
              })
              .catch((err) => {
                debug(`ERROR: ${modelKey}.${stmtKey}(${itemKey}) => ${util.inspect(err)}`);
                return Promise.reject(err);        
              });
        },
        exec: function(modelKey, stmtKey, params) {
            let params2;
            
            return getDB()
              .then((db) => {
                return new Promise((resolve,reject) => {
                  db.serialize(() => {
                    getStatement(db, modelKey, stmtKey, true)
                      .then((stmt) => {
                        if (!stmt) {
                            return reject(new Error(`Failed to prepare statement: ${modelKey}.${stmtKey}`));
                        }
                        params2 = preProcessQueryParams(modelKey, stmtKey, params);
                        stmt.run(row, function (err) {
                            if (err) {
                                return reject(err);
                            }
                            let nRows = this.changes;
                            /*if (nRows < 1) {
                              return reject(new Error("No Row Updated"));
                            }*/
                            debug(`${modelKey}.${stmtKey}(${util.inspect(params2)}) => ${util.inspect(this)}`);
                            console.info(`DEBUG: ${modelKey}#${stmtKey}(...) => (${nRows} rows)`);
                            
                            return resolve(nRows);
                        });
                      })
                  });
                });
              })
              .catch((err) => {
                debug(`ERROR: ${modelKey}.${stmtKey}(${util.inspect(params2)}) => ${util.inspect(err)}`);
                return Promise.reject(err);        
              });
        }
    };
    
    return svc;
};