/* global Promise */

const EventEmitter = require("events");
const firebaseAdmin = require('firebase-admin');
//const firebaseFunctions = require('firebase-functions');
//const firebase = require("firebase");
//const firebase = require("@firebase.app").default;
//require('@firebase/firestore');
const debug = require("debug")("NodeChatBot:models-svc-impl-firebase");
const util = require("util");
const UCUtils = require("../lib/uc-utils-node");

module.exports = function(opts) {
    let opts2 = opts || {};
    //let clientConfig = opts2.clientConfig;
    let serviceAccount = opts2.serviceAccount;
    //let databaseURL = opts2.databaseURL;
    let modelDefs = opts2.models || {};
    /*
    let autoConnect = true;
      (typeof opts2.autoConnect !== "undefined")
       ? opts2.autoConnect
        : true;
    let modelDefs = ((opts2) ? opts2.models : null) || {};
    let statementsCache = {};
    //let statementParamsDefs = {};
    let _db = null;
    */
  
    function connect() {
        return Promise.resolve(true);
        
        /*
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
        */
    }
    function disconnect() {
        return Promise.resolve(false);
        
        /*
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
        */
    }
    
    function getItemKey(modelKey, item) {
        let modelDef = modelDefs[modelKey];
        let itemKey = null;
        
        if (modelDef) {
            if ((modelDef.getKey) && (typeof modelDef.getKey === "function")) {
                itemKey = modelDef.getKey(item);
            } else if ((modelDef.keyField) || (modelDef.keyField === 0)) {
                itemKey = item[modelDef.keyField];
            }
        }
        
        return itemKey;
    }
    function getItemID(modelKey, item) {
        let modelDef = modelDefs[modelKey];
        let id = null;
        
        if (modelDef) {
            if ((modelDef.getID) && (typeof modelDef.getID === "function")) {
                id = modelDef.getID(item);
            } else if ((modelDef.idField) || (modelDef.idField === 0)) {
                id = item[modelDef.idField];
            }
        }
        
        return id;
    }
    function setItemID(modelKey, item, id) {
        let modelDef = modelDefs[modelKey];
        //debug(`DEBUG: setItemID(${modelKey}#${id}): ${util.inspect(modelDef)}`);
        if (modelDef) {
            if ((modelDef.setID) && (typeof modelDef.setID === "function")) {
                modelDef.setID(item, id);
            } else if ((modelDef.idField) || (modelDef.idField === 0)) {
                item[modelDef.idField] = id;
            }
        }
    }
    
    let svcImpl;
    svcImpl = {
        firebaseAppName: (opts2) ? opts2.firebaseAppName : null,
        firebaseApp: null,
        
        init: function() {
            const svc = this;
            let proms = [];
            
            if (!this.firebaseApp) {
                debug(`DEBUG: Initializing Firebase Firestore App [${svc.firebaseAppName}]`
                + `; Service Acct. ID: ${serviceAccount.client_id}@${serviceAccount.project_id}`
                + `; Model Defs: ${util.inspect(modelDefs)}`);
                //debug(`DEBUG: Initializing Firebase App [${svc.firebaseAppName}]; Client Config: ${clientConfig}`);
                console.info(`Initializing Firebase App [${svc.firebaseAppName}]`);

                try {
                    let app = firebaseAdmin.initializeApp({
                        credential: firebaseAdmin.credential.cert(serviceAccount)
                        //databaseURL: databaseURL
                    }, svc.firebaseAppName);
                      //firebase.initializeApp(clientConfig, svc.firebaseAppName);
                    if (!app) {
                        throw new Error(`Failed initializing Firebase App [${svc.firebaseAppName}]`);
                    }
                    debug(`DEBUG: Got Firebase App Instance: ${util.inspect(app)}`);
                    svc.firebaseApp = app;
                    
                    this.on("error", this.onError.bind(this));
            
                    //TEST {
                    /*
                    debug(`DEBUG: Testing read from Firestore DB`);
                    proms.push(this.getCollection("chatbot-stickers")
                        .then((snapshot) => {
                            let stickers = [];
                            (snapshot) && snapshot.forEach((doc) => {
                                if ((doc) && (doc.exists)) {
                                    stickers.push(doc.data());
                                }
                            });
                            debug(`DEBUG: Got stickers info: ${util.inspect(stickers)}`);

                            return Promise.resolve(stickers);
                        })
                        .catch((err) => {
                            svc.onError(err);
                            return Promise.reject(err);
                        })
                    );
                    */
                    // }
                    
                } catch (err) {
                    svc.onError(err);
                    return Promise.reject(err);
                }
                console.info(`Initialized Firebase App [${svc.firebaseAppName}]`);
            } else {
                debug(`WARN: Firebase App already initialized: ${util.inspect(svc.firebaseApp)}`);
                console.warn('Firebase App already initialized');
            }
            
            return Promise.all(proms)
              .then((results) => {
                  console.log("Init results: ", results);
                
                  return Promise.resolve(true);
              });
        }, 
        cleanup: function() {
            const svc = this;
            let proms = [];
            
            /*
            if (_db) {
                proms.push(disconnect());
            }
            */
            
            return Promise.all(proms)
              .then((results) => {
                  console.log("Cleanup results: ", results);
                
                  return Promise.resolve(null);
              });
        },
        
        defineModel: function(modelKey, modelDef) {
            modelDefs[modelKey] = modelDef;
        },
        
        getItemKey: getItemKey.bind(svcImpl),
        getItemID: getItemID.bind(svcImpl),
        setItemID: setItemID.bind(svcImpl),
        
        getDB: function() {
            const svc = this;
            //TODO: Revise this later
            let db = firebaseAdmin.firestore();
              /*(svc.firebaseApp)
                ? svc.firebaseApp.database()
                : firebase.database();*/
            debug(`DEBUG: Got DB instance: ${util.inspect(db)}`);
            
            return Promise.resolve(db);
        },
    
        // N/A
        initStore: function(modelKey, params) {
            const svc = this;
            let stmtKey = "initStore";
                    
            return Promise.resolve(false);
            /*
            return getDB()
              .then((db) => {
                return new Promise((resolve,reject) => {
                    debug(`DEBUG: ${modelKey}.${stmtKey}(${util.inspect(params)}) => ${util.inspect(this)}`);
                    //console.info(`Initialized DB Store for: ${modelKey} (${nObjs} objects affected)`);
                });
              })
              .catch((err) => {
                debug(`ERROR: ${modelKey}.${stmtKey}() => ${util.inspect(err)}`);
                return Promise.reject(err);        
              });
            */
        },
        // N/A
        destroyStore: function(modelKey, params) {
            const svc = this;
            let stmtKey = "destroyStore";
                    
            return Promise.resolve(false);
            /*
            return getDB()
              .then((db) => {
                return new Promise((resolve,reject) => {
                    //TODO:
                    debug(`DEBUG: ${modelKey}.${stmtKey}(${util.inspect(params2)}) => ${util.inspect(this)}`);
                    console.warn(`Destroyed DB Store for: ${modelKey} (${nObjs} objects affected)`);
                            
                });
              })
              .catch((err) => {
                debug(`ERROR: ${modelKey}.${stmtKey}() => ${util.inspect(err)}`);
                return Promise.reject(err);        
              });
            */
        },
        
        getCollection: function(modelKey, filters, opts) {
            const svc = this;
            let stmtKey = "getCollection";
            let filters2;
            //let filters2 = filters || {};
            let opts2 = opts || {};
            
            let items = [];

            return this.getDB()
                .then((db) => {
                    try {
                        let modelRef = db.collection(modelKey);
                        //TODO:
                        //filters2 = svc.convertFiltersForFirestore(modelRef, filters, opts);
                        /*debug(`DEBUG: Querying collection: ${modelKey} with filters: ${util.inspect(filters2)}`
                          + ` =>\n${util.inspect(modelRef)}`);*/

                        return modelRef.get();
                    } catch (err) {
                        //TODO:
                        let err1 = new Error("ModelsSvcImpl_Firebase.getCollection()#getDB().then(...)");
                        console.error(err1);
                        
                        return Promise.reject(err);
                    }
                })
                .then((snapshot) => {
                    (snapshot) && snapshot.forEach((doc) => {
                        //debug(`DEBUG: document#${doc.id}: ${util.inspect(doc)}`);
                        let item = doc.data();
                        if ((item) && (doc.id)) {
                            svc.setItemID(modelKey, item, doc.id);
                        }
                        items.push(item);
                    });
                    
                    return Promise.resolve(items);
                    /*
                    if (snapshot.exists()) {
                        items.push(snapshot.val());
                    } else {
                        resolve(items);
                    }
                    */
                })
                .then((items) => {
                    debug(`DEBUG: ${modelKey}.${stmtKey}(${util.inspect(filters)}) =>\n${util.inspect(items)}`);
                    return Promise.resolve(items);
                })
                .catch((err) => {
                    debug(`ERROR: ${modelKey}.${stmtKey}(${util.inspect(filters)}) => ${util.inspect(err)}`);
                    return Promise.reject(err);        
                });
        },
        getItem: function(modelKey, itemKey) {
            let stmtKey = "getItem";
            let item = null;
                    
            return this.getDB()
                .then((db) => {
                    try {
                        let modelRef = db.collection(modelKey).doc(itemKey);
                        return modelRef.get();
                    } catch (err) {
                        return Promise.reject(err);
                    }
                })
                .then((doc) => {
                    if ((doc) && (doc.exists)) {
                        item = doc.data();
                    }
                    
                    debug(`DEBUG: ${modelKey}.${stmtKey}(${itemKey}) => ${util.inspect(item)}`);
                    
                    return Promise.resolve(item);
                })
                .catch((err) => {
                    debug(`ERROR: ${modelKey}.${stmtKey}(${itemKey}) => ${util.inspect(err)}`);
                    return Promise.reject(err);        
                });
        },
        convertFiltersForFirestore: function(modelRef, filters, opts) {
            const svc = this;
            let filters2 = filters || {};
            
            if (typeof filters2 === "function") {
                modelRef = filters2(modelRef);
            } else {
                //TODO: Revise this later
                for (let k in filters2) {
                    if (!filters2.hasOwnProperty(k)) {
                        continue;
                    }
                    let fltVal = filters[k];
                    if ((Array.isArray(fltVal)) && (fltVal.length >= 1)) {
                        // Range filter
                        let fltValMin = fltVal[0];
                        let fltValMax = (fltVal.length >= 2) ? fltVal[1] : null;
                        (fltValMin) 
                            && (modelRef = modelRef.where(k, ">=", fltValMin));
                        (fltValMax) 
                            && (modelRef = modelRef.where(k, "<", fltValMax));
                    } else {
                        // Exact filter
                        modelRef = modelRef.where(k, "==", fltVal);
                    }
                }
            }

            if (opts2.orderBy) {
                modelRef = modelRef.orderBy(opts2.orderBy);
            }
            
            return filters2;
        },
    
        addItem: function(modelKey, itemKey, item) {
            const svc = this;
            let stmtKey = "add";
            let newID;
            
            return this.getDB()
                .then((db) => {
                    try {
                        let modelRef = db.collection(modelKey).doc(itemKey);
                        if (!itemKey) {
                            itemKey = newID = modelRef.id;
                            svc.setItemKey(modelKey, item, itemKey);
                        }
                        //let updates = {};
                        //updates[`/${modelKey}`] = item;

                        return modelRef.set(item);
                    } catch (err) {
                        return Promise.reject(err);
                    }
                })
                .then((result) => {
                    (newID) && svc.setItemID(modelKey, item, newID);
                    debug(`DEBUG: ${modelKey}.${stmtKey}(${util.inspect(item)}) => ${util.inspect(result)}`);
                    console.info(`Added ${modelKey}#${itemKey}; Auto Generated ID: ${newID}: `, item);
                })
                .catch((err) => {
                    debug(`ERROR: ${modelKey}.${stmtKey}(${util.inspect(item)}) => ${util.inspect(err)}`);
                    return Promise.reject(err);        
                });
        },
        updateItem: function(modelKey, itemKey, item) {
            let stmtKey = "update";
            let row;
            
            return this.getDB()
              .then((db) => {
                    try {
                        if (!itemKey) {
                            itemKey = getItemKey(modelKey, item);
                        }
                        let modelRef = db.collection(modelKey).doc(itemKey);
                        //let updates = {};
                        //updates[`/${modelKey}`] = item;

                        return modelRef.set(item);
                    } catch (err) {
                        return Promise.reject(err);
                    }
                })
                .then((result) => {
                    debug(`DEBUG: ${modelKey}.${stmtKey}(${util.inspect(item)}) => ${util.inspect(result)}`);
                    console.info(`Updated ${modelKey}#${itemKey}: `, 
                        item, `; Result: ${util.inspect(result)}`);
                })
                .catch((err) => {
                    debug(`ERROR: ${modelKey}.${stmtKey}(${itemKey}, ${util.inspect(item)}) => ${util.inspect(err)}`);
                    return Promise.reject(err);        
                });
        },
        deleteItem: function(modelKey, itemKey) {
            let stmtKey = "delete";
            
            return this.getDB()
              .then((db) => {
                    try {
                        let modelRef = db.collection(modelKey).doc(itemKey);
                        //let updates = {};
                        //updates[`/${modelKey}`] = item;

                        return modelRef.remove();
                    } catch (err) {
                        return Promise.reject(err);
                    }
                })
                .then((result) => {
                    debug(`DEBUG: ${modelKey}.${stmtKey}(${itemKey}) => ${util.inspect(result)}`);
                    console.info(`Deleted ${modelKey}#${itemKey}: `, result);
                })
              .catch((err) => {
                debug(`ERROR: ${modelKey}.${stmtKey}(${itemKey}) => ${util.inspect(err)}`);
                return Promise.reject(err);        
              });
        },
        exec: function(modelKey, stmtKey, params) {
            let params2;
            
            return this.getDB()
              .then((db) => {
                  //TODO:
              })
              .catch((err) => {
                debug(`ERROR: ${modelKey}.${stmtKey}(${util.inspect(params2)}) => ${util.inspect(err)}`);
                return Promise.reject(err);        
              });
        },
        
        onError: function(err) {
            let errMsg = err.message;
            debug(`ERROR: ${errMsg}\n${util.inspect(err)}`);
        }
    };
    UCUtils.updateFrom(svcImpl, EventEmitter.prototype);
    EventEmitter.call(svcImpl);
    
    return svcImpl;
};