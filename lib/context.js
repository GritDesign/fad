"use strict";

var immediate;

if (typeof setImmediate !== "undefined") {
	immediate = setImmediate;
} else if (typeof process !== "undefined" &&
	process.nextTick) {
	immediate = process.nextTick;
} else {
	immediate = function (cb) {
		setTimeout(cb, 0);
	};
}

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

	if (typeof key === "function") {
		cb = key;
		params = signature(cb).args;
	} else if (typeof key === "string") {
		params = ["err", key];
	} else if (Object.prototype.toString.call(key) === "[object Array]") {
		arrayResult = true;
		params = key;
	} else {
		throw new Error("invalid arguments to get()");
	}

	// check that we have rules or values for each parameter
	params.forEach(function (param) {
		if (!HOP(self._values, param) && !self._rules[param] && param !==
			"err") {
			throw new Error("Cannot resolve context parameter '" + param +
				"'");
		}
	});

	var count = params.length;
	var results = [];
	var error = null;
	var errorIndex = -1;
	var wasImmediate = true;

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

			var rules = self._rules[param];
			var rule = null;

			for (var i = 0; i < rules.length; i++) {
				var hasDeps = true;
				for (var j = 0; j < rules[i].deps.length; j++) {
					if (!self.contains(rules[i].deps[j])) {
						hasDeps = false;
					}
				}
				if (hasDeps) {
					rule = rules[i];
					break;
				}
			}

			if (!rule) {
				// this message could be better
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
					self._resolved[param] = value;
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