/* global Promise */

const EventEmitter = require("events");
const firebaseAdmin = require("firebase-admin");
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
    */
    let _db = null;
  
    function connect() {
        if (_db) {
            return Promise.reject(new Error('DB Already Connected'));
        }
        
        debug(`DEBUG: Opening DB connection to Firestore: ${util.inspect(serviceAccount)}`);
        console.info("Opening DB connection to Firestore");
        
        _db = firebaseAdmin.firestore();
        
        debug(`DEBUG: Got DB instance: ${util.inspect(_db)}`);
        
        return Promise.resolve(_db);
    }
    function disconnect() {
        return Promise.resolve(false);
        
        if (!_db) {
            return Promise.resolve(false);
        }
        
        debug(`DEBUG: Closing DB connection: ${util.inspect(_db)}`);
        console.warn("Closing DB connection");
        _db = null;
        
        return Promise.resolve(true);
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
                console.warn("Firebase App already initialized");
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
        
        getItemKey: getItemKey.bind(svcImpl),
        getItemID: getItemID.bind(svcImpl),
        setItemID: setItemID.bind(svcImpl),
        
        getDB: function() {
            const svc = this;
            //TODO: Revise this later
            if (!_db) {
                if (opts2.autoConnect) {
                    debug(`DEBUG: getDB(): Auto-Connecting`);
                    
                    return connect()
                        .then((db2) => {
                            _db = db2;
                            return Promise.resolve(_db);
                        });
                } else {
                    console.warn("No DB connection");
                }
            }
            
            return Promise.resolve(_db);
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
            //let filters2;
            //let filters2 = filters || {};
            let opts2 = opts || {};
            
            //let items = [];

            return this.getDB()
                .then((db) => {
                    try {
                        let modelRef = db.collection(modelKey);
                        modelRef = svc.convertFiltersForFirestore(modelRef, filters, opts2);
                        debug(`DEBUG: Querying collection: ${modelKey} with filters: ${util.inspect(filters)}`
                          + ` =>\n${util.inspect(modelRef)}`);

                        return svc.getCollectionFromRef(modelKey, modelRef, opts);
                        //modelRef.get();
                    } catch (err) {
                        //TODO:
                        let err1 = new Error("ModelsSvcImpl_Firebase.getCollection()#getDB().then(...)");
                        console.error(err1);
                        
                        return Promise.reject(err);
                    }
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
            const svc = this;
            let stmtKey = "getItem";
            let item = null;
                    
            return this.getDB()
                .then((db) => {
                    try {
                        let modelRef = db.collection(modelKey).doc(itemKey);
                        return svc.getItemFromRef(modelKey, modelRef, opts);
                    } catch (err) {
                        return Promise.reject(err);
                    }
                })
                .catch((err) => {
                    debug(`ERROR: ${modelKey}.${stmtKey}(${itemKey}) => ${util.inspect(err)}`);
                    return Promise.reject(err);        
                });
        },
        convertFiltersForFirestore: function(modelRef, filters, opts) {
            const svc = this;
            let filters2 = filters || {};
            let opts2 = opts || {};
            
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
                modelRef = (opts2.orderDesc)
                    ? modelRef.orderBy(opts2.orderBy, "desc")
                    : modelRef.orderBy(opts2.orderBy);
            }
            
            debug(`DEBUG: convertFiltersForFirestore(..., ${util.inspect(filters)}, ${util.inspect(opts)}`
                + ` => ${util.inspect(modelRef, false, 4)}`);
            
            return modelRef;
        },
        getCollectionFromRef: function(modelKey, collectionRef, opts) {
            const svc = this;
            let opts2 = opts || {};
            let items = [];
            
            if ((!collectionRef) || (!collectionRef.get) || (typeof collectionRef.get !== "function")) {
                return Promise.resolve(false);
            }

            return collectionRef.get()
                .then((snapshot) => {
                    let docProms = [];
                    (snapshot) && snapshot.forEach((doc) => {
                        //debug(`DEBUG: document#${doc.id}: ${util.inspect(doc)}`);
                        let item = doc.data();
                        if ((item) && (doc.id)) {
                            svc.setItemID(modelKey, item, doc.id);
                        }
                        docProms.push(svc.checkIncludeRefs(modelKey, item, opts2.includeRefs));
                        items.push(item);
                    });
                    
                    return Promise.all(docProms);
                })
                .then(() => {
                    return Promise.resolve(items);
                }); 
        },
        getItemsFromRefs: function(modelKey, docRefs, opts) {
            const svc = this;
            
            let proms = [];
            (docRefs) && docRefs.forEach((docRef) => {
                if ((!docRef) || (!docRef.get) || (typeof docRef.get !== "function")) {
                    return false;
                }

                proms.push(svc.getItemFromRef(modelKey, docRef, opts)
                    .catch((err) => {
                        svc.emit("error", err);
                        return Promise.reject(err);
                    })
                );
            });
            
            return Promise.all(proms);
        },
        getItemFromRef: function(modelKey, docRef, opts) {
            const svc = this;
            let item;
            
            if ((!docRef) || (!docRef.get) || (typeof docRef.get !== "function")) {
                return Promise.resolve(false);
            }

            return docRef.get()
                .then((doc) => {
                    if ((doc) && (doc.exists)) {
                        item = doc.data();
                    }
                    return svc.checkIncludeRefs(modelKey, item, opts2.includeRefs);
                })
                .then(() => {
                    debug(`DEBUG: getItemFromRef() ${util.inspect(docRef)} => ${util.inspect(item)}`);
                    
                    return Promise.resolve(item);
                });
        },
        checkIncludeRefs: function(modelKey, item, includeRefs) {
            const svc = this;
            let modelDef = modelDefs[modelKey];
            let docProms = [];
            
            (includeRefs) && (includeRefs.length >= 1) && includeRefs.forEach((refPath) => {
                //TODO: Support nested include refs
                let refParts = refPath.split(".", 2);
                let k1 = refParts[0];
                let k2 = (refParts.length >= 2) ? refParts[1] : null;
                let fldDef = ((modelDef) && (modelDef.fields))
                    ? modelDef.fields[k1]
                    : null;
                let fldModelKey = (fldDef) ? fldDef.modelKey : null;
                let fldRef = item[k1];
                let fldVal2; 
                if (Array.isArray(fldRef)) {
                    fldVal2 = [];
                    let fldProms = [];
                    fldRef.forEach((subFldRef) => {
                        debug(`DEBUG: getItemFromRef(${fldModelKey}, ${util.inspect(subFldRef, false, 5)}, ${k2})`);
                        fldProms.push(
                            svc.getItemFromRef(fldModelKey, subFldRef, {
                                includeRefs: k2
                            })
                                .then((subFldItem) => {
                                    fldVal2.push(subFldItem);
                                    return Promise.resolve(true);
                                })
                                .catch((err) => {
                                    svc.emit("error", err);
                                    return Promise.resolve(false);
                                })
                        );
                    });
                    docProms.push(Promise.all(fldProms)
                        .then((results) => {
                            //Replace array field
                            item[k1] = fldVal2;
                            return Promise.resolve(results);
                        })
                    );
                } else if (fldRef) {
                    docProms.push(
                        svc.getItemFromRef(fldModelKey, fldRef, {
                            includeRefs: (refParts.length >= 2) ? refParts[1] : null
                        })
                            .then((fldItem) => {
                                //Replace single field
                                item[k1] = fldVal2;
                                fldVal2 = fldItem;
                                return Promise.resolve(true);
                            })
                    );
                }
            });
            
            return Promise.all(docProms)
                .then(() => {
                    return Promise.resolve(item);
                });
        },
    
        addItem: function(modelKey, itemKey, item) {
            const svc = this;
            let stmtKey = "add";
            let newID;
            
            return this.getDB()
                .then((db) => {
                    try {
                        if (!itemKey) {
                            itemKey = svc.getItemKey(modelKey, item);
                        }
                        let modelRef = db.collection(modelKey).doc(itemKey);
                        if (!itemKey) {
                            itemKey = newID = modelRef.id;
                            svc.setItemKey(modelKey, item, itemKey);
                            debug(`DEBUG: Got Auto-generated ID: ${newID} for Document Ref.: ${modelRef}`);
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
                    debug(`DEBUG: ${modelKey}.${stmtKey}(${itemKey}, ${util.inspect(item)}) => ${util.inspect(result)}`);
                    console.info(`Added ${modelKey}#${itemKey}; Auto Generated ID: ${newID}: `, item);
                })
                .catch((err) => {
                    debug(`ERROR: ${modelKey}.${stmtKey}(${itemKey}, ${util.inspect(item)}) => ${util.inspect(err)}`);
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
                    debug(`DEBUG: ${modelKey}.${stmtKey}(${itemKey}, ${util.inspect(item)}) => ${util.inspect(result)}`);
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
