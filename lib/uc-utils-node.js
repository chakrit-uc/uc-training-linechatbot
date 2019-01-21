/* global Promise, Function */

/**
 * uc-utils-node.js
 * UC Utils for Node.JS Library
 * Copyright (c) 2016 UC Connect co., ltd.
 * http://www.ucconnect.co.th
 *
 * @version 1.0.0
 * @author Chakrit W.
 *
 * CHANGE LOGS:
 * * v1.0.0: First release
 *
 */

// Namespace definitions

var UCConnect = UCConnect || {};
UCConnect.Utils = UCConnect.Utils || {};
UCConnect.Utils._namespace = 'UCConnect.Utils';

//Q:20180305 {
//const moment = require('moment');
// }

//Functions

/**
 * Utility function: now()
 * @return {string} current date/time formatted as YYYY-MM-DD hh:mm:ss
 */
//Q:20180220: AXA Lint {
UCConnect.Utils.now = function() {
  //Q:20180305 {
  var moment = require('moment');
  // }
  return moment().format('YYYY-MM-DD HH:mm:ss');
};

UCConnect.Utils.check = function() {
  //TODO:
  return true;
};
// }

/**
 * Utility function: formatDuration(msecs)
 * @param {Number} msecs
 * @param {boolean} appendMillis whether to append .msecs remainder to format
 * @return {string} duration formatted as hhh:mm:ss[.msecs]
 */
UCConnect.Utils.formatDuration = function(msecs,appendMillis) {
  var durationStr = '';

  var x = msecs;
  var msr = x % 1000;
  x = Math.floor(x / 1000);
  var ss = x % 60;
  x = Math.floor(x / 60);
  var mm = x % 60;
  x = Math.floor(x / 60);
  var hhh = x;
  if (appendMillis) {
    ss = (ss + msr / 1000).toFixed(3);
  }
  durationStr = ((hhh < 10) ? '0' : '') + hhh
			+ ':' + ((mm < 10) ? '0' : '') + mm
			+ ':' + ((ss < 10) ? '0' : '') + ss;

  return durationStr;
};

UCConnect.Utils.formatPercent = function(a, b, pos) {
  var ps = '';
  if (!pos) {
	    pos = 0;
  }
  if (b > 0) {
	     var pct = a * 100 / b;
	     ps = pct.toFixed(pos) + '%';
  }
  return ps;
};

/**
 * Minimal template rendering function
 * @param {string} tmpl
 * @param {string} data
 * @returns {string} rendered template
 */
UCConnect.Utils.renderTemplate = function(tmpl, data) {
  var result = '';
  ((tmpl) || (tmpl === 0)) && (result = tmpl.replace(/\$\{(.+?)\}/g, function(match, contents, s, offset) {
    var x = ((data) && ((contents) || (contents === 0))) ? UCConnect.Utils.getPropByPath(data,contents) : null;
    return ((x) || (x === 0) || (x === false)) ? x : '';
  }));

  return result;
};

//Q:20180327 {
UCConnect.Utils.TemplateFieldsParser = function(tmpl) {
  var fldKeys = [];
  var n = tmpl.length;
  var pStr = [ '^' ];
  var fldKeyBuf = [];
  var esc = false;
  var inExpr = false;
  var lastCh = '';
  for (var i = 0;i < n;i++) {
    var ch = tmpl[i];
    if (esc) {
      pStr.push('\\' + ch);
      esc = false;
    } else {
      if (ch === '\\') {
        esc = true;
      } else if (ch === '$') {
      } else if ((lastCh === '$') && (ch === '{')) {
        inExpr = true;
      } else if (inExpr) {
        if (ch === '}') {
          inExpr = false;
          //Q:20180402 {
          pStr.push('(.*?)');
          // }
          fldKeys.push(fldKeyBuf.join(''));
          fldKeyBuf = [];
        } else {
          fldKeyBuf.push(ch);
        }
      } else {
        pStr.push('\\' + ch);
      }
      lastCh = ch;
    }
  }
  pStr.push('$');
  var regexp = new RegExp(pStr.join(''));

  return {
    parse: function(text) {
      var flds = {};
      var matches = text.match(regexp);
      var n = (matches) ? matches.length : 0;
      for (var i = 1;i < n;i++) {
        var key = fldKeys[i - 1];
        (key) && (flds[key] = matches[i]);
      }

      return flds;

    },
    format: function(flds) {
      return UCConnect.Utils.renderTemplate(tmpl, flds);
    }
  };
};
UCConnect.Utils.parseFieldsFromTemplate = function(tmpl, text) {
  var parser = UCConnect.Utils.templateFieldsParser(tmpl);

  return parser.parse(text);
};
// }

UCConnect.Utils.getPropByPath = function(obj,path) {
  var val;
  var temp = obj;
  var parts = path.split('.');
  var n = (parts) ? parts.length : 0;
  for (var i = 0;i < n;i++) {
    if ((typeof temp === 'undefined') || (temp === null)) {
      break;
    }
    temp = temp[parts[i]];
    if (i + 1 >= n) {
      val = temp;
    }
  }

  return val;
};
UCConnect.Utils.setPropByPath = function(obj,path,val,autoCreate) {
  var temp = obj;
  var parts = path.split('.');
  var n = (parts) ? parts.length : 0;
  for (var i = 0;i < n;i++) {
    if ((typeof temp === 'undefined') || (temp === null)) {
      break;
    }
    if (i + 1 >= n) {
      temp[parts[i]] = val;
    } else {
      if ((!(parts[i] in temp)) && (autoCreate)) {
        temp[parts[i]] = {};
      }
      temp = temp[parts[i]];
    }
  }
};

//Q:20180224 {
UCConnect.Utils.mockup = function mockup(obj, fnName, opts) {
  if (Array.isArray(fnName)) {
    var fns = [];
    fnName.forEach(function(name) {
      fns.push(UCConnect.Utils.mockup(obj, name, opts));
    });
    return fns;
  }

  var _originalFn = obj[fnName];
  var fn;
  fn = function() {
    if ((fn.before) && (fn.before.apply)) {
      fn.before.apply(fn, arguments);
    }
    var err = fn.error;
    var result = (fn.usePromise)
      ? ((err) ? Promise.reject(err) : Promise.resolve(fn.result))
      : ((err) ? err : fn.result);
    if ((fn.after) && (fn.after.call)) {
      fn.after.call(fn,result);
    }
    //Q:20180224 {
    if (fn.useCallback) {
      var callback1 = (arguments.length >= 1) ? arguments[arguments.length - 1] : null;
      (callback1) && (callback1.call) && callback1.call(obj,fn.error,fn.result);
    }
    // }
    if ((fn.callback) && (fn.callback.call)) {
      fn.callback.call(obj,fn.error,fn.result);
    }

    return result;
  };
  fn.updateFrom({
    name: fnName,
    alias: fnName,
    //_original: _originalFn,
    result: null,
    error: null,
    callback: null,
    usePromise: false
  });
  (opts) && fn.updateFrom(opts, true);
  fn._original = _originalFn;
  obj[fnName] = fn;

  return fn;
};
// }

//Q:20180425: Fix clone & updateFrom functions {
UCConnect.Utils.updateFrom = function(dest,src, deep,lvl,path) {
  if (deep) {
    lvl = lvl || 0;
    path = path || [];
  }
  for (var k in src) {
    if (!src.hasOwnProperty(k)) {
      continue;
    }
    let val = src[k];
    //Prevent cyclic dependency
    if ((deep) && (val) && (typeof val === 'object') && (val !== src) && (path.indexOf(val) < 0)) {
      if (val instanceof Date) {
        dest[k] = new Date();
        dest[k].setTime(val.getTime());
      } else if (Array.isArray(val)) {
        if (Array.isArray(dest[k])) {
          //Compatible: array <= array
          dest[k] = dest[k].concat(val);
        } else {
          //Incompatible: others <= array
          dest[k] = val.slice();
        }
        //console.log('Result array:', dest[k]);
        //console.log('.indexOf = ', dest[k].indexOf);
      } else {
        if ((!dest[k]) || (typeof dest[k] !== 'object')) {
          dest[k] = ((val.constructor) && (typeof val.constructor === 'function') && (val.constructor.length <= 0))
            ? new val.constructor()
            : {}; //Object.create(val);
        }
        let path2 = path.slice();
        path2.push(src);
        UCConnect.Utils.updateFrom(dest[k], val, deep, lvl + 1, path2);
      }
    } else {
      dest[k] = src[k];
    }
  }
};
UCConnect.Utils.clone = function(obj) {
  //TEST {
  //console.log('Original: ', obj);
  // }
  const obj2 = ((obj.constructor) && (typeof obj.constructor === 'function') && (obj.constructor.length <= 0))
    ? new obj.constructor()
    : {};
  //TEST {
  //console.log('New Clone: ', obj2);
  // }
  UCConnect.Utils.updateFrom(obj2, obj, true);

  return obj2;
};
// }

// Objects & Prototypes

//Q:20180425 {
Object.prototype.clone = function() {
  return UCConnect.Utils.clone(this);
};
Object.prototype.updateFrom = function(src,deep) {
  return UCConnect.Utils.updateFrom(this,src,deep);
};
// }

Function.prototype.extendFrom = function(parent,childPrototype,childStatic) {
  this.prototype = Object.create(parent.prototype);
  this.prototype._class = this;
  //this.prototype._super=parent;
  this._super = parent;
  if (childPrototype) {
    this.prototype.updateFrom(childPrototype);
  }
  if (childStatic) {
    this.updateFrom(childStatic);
  }
};

Function.prototype.mapFactory = function(factory) {
  factory.prototype = this.prototype;
  factory.updateFrom(this);
  return factory;
};

//TODO: Revise this later
//Q:20180220: AXA Lint {
/*
UCConnect.Utils.InterfaceAdapterFactory=function(context,name,implFld) {
    this.implContext=context;
    this.fldName=name;
    this.implFld=implFld;
};
UCConnect.Utils.InterfaceAdapterFactory.name="UCConnect.Utils.InterfaceAdapterFactory";
UCConnect.Utils.InterfaceAdapterFactory.prototype={
    constructor: UCConnect.Utils.InterfaceAdapterFactory,
    _class: UCConnect.Utils.InterfaceAdapterFactory,

    implContext: null,
    fldName: null,
    implFld: null,

    getAdapter: function() {
        var context=this.implContext;
        var implFld=this.implFld;
        return function() {
            if ((implFld) && (implFld.apply)) {
                return implFld.apply(context,arguments);
            } else {
                return implFld;
            }
        };
    }
};

Object.prototype.implements=function(intf, adapter) {
    if (!adapter) {
        adapter={};
    }
    var context=this;
    for (var k in intf) {
        /*if (!intf.hasOwnProperty(k)) {
            continue;
        }* /
        var fld=intf[k];
        if ((fld) && (fld.public)) {
            var implFld=context[k];
            if (!implFld) {
                var intfName=(intf._class)
                    ? ((intf._class.name) ? intf._class.name : intf._class )
                    : ((intf._namespace) ? intf._namespace : intf);
                var implName=(this._class)
                    ? ((this._class.name) ? this._class.name : this._class)
                    : ((this._namespace) ? this._namespace : this);
                throw new Error("Field/function: "+intfName+"."+k+" is not implemented in "+implName);
            }
            var af=new UCConnect.Utils.InterfaceAdapterFactory(context,k,implFld);
            adapter[k]=af.getAdapter();
        }
    }

    return adapter;
};

Object.prototype.extendInterface=function(childPrototype) {
    var child=Object.create(this);
    for (var k in childPrototype) {
        if (childPrototype.hasOwnProperty(k)) {
            child[k]=childPrototype[k];
        }
    }

    return child;
};
Object.prototype.toPublic=function(fldKeys) {
    for (var k in fldKeys) {
        if (fldKeys.hasOwnProperty(k)) {
            this[k].public=true;
        }
    }
};
Function.prototype.isPublic=function() {
    return this.public;
};
Function.prototype.setPublic=function(value) {
    this.public=value;
};
*/
// }

/*
Function.prototype.promise=function(processor) {
    var context=this;
    var doneFuncs=[];
    var errFuncs=[];

    return {
        process: function(async) {
            try {
                if (async) {
                    arguments.push(this.callback);
                }
                processor.apply(context,arguments);
                if (!async) {
                    this.callback(null);
                }
            } catch (err) {
                var args=[ err ];
                var n=errFuncs.length;
                for (var i=0;i < n;i++) {
                    errFuncs[i].apply(context,args);
                }
            }
        },
        callback: function() {
            var n=doneFuncs.length;
            for (var i=0;i < n;i++) {
                doneFuncs[i].apply(context,arguments);
            }
        },
        done: function(doneFn) {
            doneFuncs.push(doneFn);
        },
        error: function(errFn) {
            errFuncs.push(errFn);
        }
    };
};
 */

/**
 * EventListener interface/prototype
 * @author Chakrit W.
 * @param {Object} context the context for callback function
 * @param {Function} func the callback function
 */
UCConnect.Utils.EventListener = function(context,func) {
  this.context = context;
  if (func) {
    this.func = func;
  }
};
UCConnect.Utils.EventListener.name = 'UCConnect.Utils.EventListener';
UCConnect.Utils.EventListener.prototype = {
  constructor: UCConnect.Utils.EventListener,
  _class: UCConnect.Utils.EventListener,

  context: null,
  func: null,
  event: function(evt) {
    this.func.call(this.context,evt);
  }
};

//DEPRECATED: Use node's EventEmitter module instead {
UCConnect.Utils.EventDispatcher = function(context,func) {
  UCConnect.Utils.EventDispatcher._super.call(this,context,null);
  this.callbackList = [];
  (func) && this.callbackList.push(func);
};
UCConnect.Utils.EventDispatcher.name = 'UCConnect.Utils.EventDispatcher';
UCConnect.Utils.EventDispatcher.extendFrom(UCConnect.Utils.EventListener, {
  constructor: UCConnect.Utils.EventDispatcher,
  callbackList: null,

  add: function(callback) {
    this.callbackList.push(callback);
  },
  remove: function(callback) {
    var k = this.callbackList.indexOf(callback);
    if (k >= 0) {
	    this.callbackList.splice(k,1);
    }
  },
  event: function(evt) {
    var n = this.callbackList.length;
    for (var i = 0;i < n;i++) {
	    var callback = this.callbackList[i];
	    (callback) && callback.call(this.context || this,evt);
    }
  }
});
// }

// Error classes

UCConnect.Utils.WebError = function(status,message) {
  UCConnect.Utils.WebError._super.call(this,message);
  this.status = status;
};
UCConnect.Utils.WebError.name = 'UCConnect.Utils.WebError';
UCConnect.Utils.WebError.extendFrom(Error, {
  status: null
});

UCConnect.Utils.ResourceError = function(resID,message) {
  UCConnect.Utils.ResourceError._super.call(this,message);
  this.resourceID = resID;
};
UCConnect.Utils.ResourceError.name = 'UCConnect.Utils.ResourceError';
UCConnect.Utils.ResourceError.extendFrom(Error, {
  resourceID: null
});
UCConnect.Utils.ResourceNotFoundError = function(resID,message) {
  UCConnect.Utils.ResourceNotFoundError._super.call(this,resID,message);
};
UCConnect.Utils.ResourceNotFoundError.name = 'UCConnect.Utils.ResourceNotFoundError';
UCConnect.Utils.ResourceNotFoundError.extendFrom(UCConnect.Utils.ResourceError, {
});
UCConnect.Utils.ResourceConflictError = function(resID,message) {
  UCConnect.Utils.ResourceConflictError._super.call(this,resID,message);
};
UCConnect.Utils.ResourceConflictError.name = 'UCConnect.Utils.ResourceConflictError';
UCConnect.Utils.ResourceConflictError.extendFrom(UCConnect.Utils.ResourceError, {
});

/*
UCConnect.Utils.GenericDao=function() {
};
UCConnect.Utils.GenericDao.name="UCConnect.Utils.GenericDao";
UCConnect.Utils.GenericDao.prototype={
    _class: UCConnect.Utils.GenericDao,

    getItems: { public: true },
    getItem: { public: true },
    addItem: { public: true },
    updateItem: { public: true },
    deleteItem: { public: true }
};
*/
UCConnect.Utils.GenericDao = {
  getItemsCount: { public: true },
  getItems: { public: true },
  getItem: { public: true },
  addItem: { public: true },
  updateItem: { public: true },
  deleteItem: { public: true }
};


module.exports = UCConnect.Utils;

/*.implements({
    //toString: function() { return "UCConnect.Utils"; },
    now: { public: true },
    formatDuration: { public: true },
    formatPercent: { public: true },
    getPropByPath: { public: true },
    setPropByPath: { public: true },
    EventListener: { public: true },
    EventDispatcher: { public: true },
    GenericDao: { public: true },
    WebError: { public: true },
    ResourceError: { public: true },
    ResourceNotFoundError: { public: true },
    ResourceConflictError: { public: true }
});*/
