;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var process=require("__browserify_process");"use strict";

var immediate = typeof setImmediate !== "undefined" ?
	setImmediate : process.nextTick;

function Context(name, rules, parents) {
	var rulesMap = {};

	for (var i = 0; i < rules.length; i++) {
		var rule = rules[i];
		var sig = signature(rule);
		if (!sig.name) {
			throw new Error("All functions must have names");
		}
		if (!HOP(rulesMap, sig.name)) {
			rulesMap[sig.name] = [];
		}

		var last = sig.args.pop();
		if (last !== "cb") {
			sig.args.push(last);
			var sigString = sig.name + "(" + sig.args.join(", ") + ")";
			throw new Error("Rule '" + sigString +
				"' does not have cb as final argument.");
		}

		rulesMap[sig.name].push({
			fn: rule,
			deps: sig.args
		});
	}

	this._rules = rulesMap;
	this._parents = parents;
	this._resolved = {};
	this._values = {};
	this._resolving = {};
}

Context.prototype.get = function (key, cb) {
	var self = this;
	var arrayResult = false;
	var params;
	var done = false;
	var error = null;
	var errorIndex = -1;
	var count = 0;
	var wasImmediate = true;
	var results = [];

	if (typeof key === "function") {
		cb = key;
		params = signature(cb).args;
	} else if (typeof key === "string") {
		params = ["err", key];
	} else if (Object.prototype.toString.call(key) === "[object Array]") {
		arrayResult = true;
		params = key;
	} else {
		error = new Error("invalid arguments to get()");
		checkDone();
		return;
	}

	count = params.length;

	// check that we have rules or values for each parameter
	params.forEach(function (param) {
		if (!error && !HOP(self._values, param) && !self._rules[param] &&
			param !== "err") {
			error = new Error("Cannot resolve context parameter '" + param +
				"'");
			checkDone();
			return;
		}
	});

	params.forEach(function (param, index) {
		if (param === "err") {
			count--;
			errorIndex = index;
			checkDone();
			return;
		}
		if (HOP(self._values, param)) {
			count--;
			results[index] = self._values[param];
			checkDone();
			return;
		}
		if (HOP(self._resolved, param)) {
			count--;
			results[index] = self._resolved[param];
			checkDone();
			return;
		}

		if (HOP(self._resolving, param)) {
			self._resolving[param].push(resolved);
			return;
		} else {
			self._resolving[param] = [];
			self._resolving[param].push(resolved);

			var rules = self._rules[param] || [];
			var rule = null;

			for (var i = 0; i < rules.length; i++) {
				var hasDeps = true;
				for (var j = 0; j < rules[i].deps.length; j++) {
					if (!self.contains(rules[i].deps[j])) {
						hasDeps = false;
						console.log("can't find " + rules[i].deps[j]);
					}
				}
				if (hasDeps) {
					rule = rules[i];
					break;
				}
			}

			if (!rule) {
				// this message could be better
				// depends on params (x,y) which are not available
				count--;
				if (!error) {
					error = new Error("Cannot resolve context parameter '" +
						param + "'");
				}
				checkDone();
				return;
			}

			self.get(rule.deps, function (err, results) {
				if (err) {
					self._resolving[param].forEach(function (fn) {
						fn(err);
					});
					return;
				}

				results.push(function (err, value) {
					if (!err) {
						self._resolved[param] = value;
					}
					self._resolving[param].forEach(function (fn) {
						fn(err, value);
					});
					delete self._resolving[param];
				});

				rule.fn.apply(null, results);
			});
		}

		function resolved(err, value) {
			count--;
			if (!err) {
				results[index] = value;
			} else if (!error) {
				results[index] = null;
				error = err;
			}
			checkDone();
		}
	});

	wasImmediate = false;

	function checkDone() {
		if (count === 0) {
			done = true;
			// set the err parameter
			if (arrayResult) {
				results = [error, results];
			} else {
				if (errorIndex !== -1) {
					results[errorIndex] = error;
				} else if (error) {
					// there was an error and no err parameter was set
					throw error;
				}
			}

			if (wasImmediate) {
				immediate(function () {
					cb.apply(null, results);
				});
			} else {
				cb.apply(null, results);
			}
		}
	}

	if (!done) {
		checkDone();
	}
};

Context.prototype.set = function (name, value) {
	this._values[name] = value;
};

Context.prototype.contains = function (name) {
	return HOP(this._values, name) || HOP(this._rules, name);
};

Context.prototype.keys = function () {
	var keys = [];
	var key;

	for (key in this._values) {
		if (HOP(this._values, key)) {
			keys.push(key);
		}
	}

	for (key in this._rules) {
		if (!HOP(this._values, key) && HOP(this._rules, key)) {
			keys.push(key);
		}
	}

	return keys;
};

/*
function parameter name extraction from stackoverflow:
http://stackoverflow.com/questions/1007981/
how-to-get-function-parameter-names-values-dynamically-from-javascript
*/
var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
var NAME_MATCH = /function\s+([^\(\s]+)/;

function signature(func) {
	var stripped = func.toString().replace(STRIP_COMMENTS, "");
	var args = stripped
		.slice(stripped.indexOf("(") + 1, stripped.indexOf(")"))
		.match(/([^\s,]+)/g);

	if (!args) {
		args = [];
	}

	var nameMatches = NAME_MATCH.exec(stripped);
	var name = nameMatches ? nameMatches[1] : null;

	return {
		name: name,
		args: args
	};
}

function HOP(obj, prop) {
	return Object.prototype.hasOwnProperty.call(obj, prop);
}

exports.Context = Context;

},{"__browserify_process":3}],2:[function(require,module,exports){
"use strict";
var Context = require("./context.js").Context;

function isArray(val) {
	return Object.prototype.toString.call(val) ===
		"[object Array]";
}

/**
 *
 *
 */



function create() {
	var args = Array.prototype.slice.call(arguments);

	var parents = [];
	var rules = [];
	var name = "";
	var objects = [];

	args.forEach(function (arg, i) {
		if (isArray(arg)) {
			arg.forEach(function (rule) {
				rules.push(rule);
			});
		} else if (arg instanceof Context) {
			parents.push(arg);
		} else if (typeof arg === "object") {
			objects.push(arg);
		} else if (typeof arg === "string" && i === 0) {
			name = arg;
		} else {
			throw new Error("Argument " + i + " to fad.create() is invalid.");
		}
	});

	var ctx = new Context(name, rules, parents);

	objects.forEach(function (obj) {
		for (var prop in obj) {
			if (Object.prototype.hasOwnProperty.call(obj, prop)) {
				if (!Object.prototype.hasOwnProperty.call(ctx._values, prop)) {
					ctx.set(prop, obj[prop]);
				}
			}
		}
	});

	return ctx;
}

exports.create = create;

},{"./context.js":1}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}]},{},[2])
;