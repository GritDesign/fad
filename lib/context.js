"use strict";

var immediate = typeof setImmediate !== "undefined" ?
	setImmediate : process.nextTick;

function Context(name, rules, parents) {
	var rulesMap = {};

	function addRule(rule) {
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

	rules.forEach(addRule);

	var contextCount = 1;
	for (var i = 0; i < parents.length; i++) {
		contextCount += parents[i]._contextCount;
	}

	this._parents = parents;
	this._rules = rulesMap;
	this._resolved = {};
	this._values = {};
	this._resolving = {};
	this._contextCount = contextCount;
	this.name = name;
}

Context.prototype.eachContext = function (cb) {
	var index = 0;

	var cont = cb(this, index++);

	function eachCallback(ctx) {
		cont = cb(ctx, index++);
		return cont;
	}

	for (var i = 0; cont && i < this._parents.length; i++) {
		this._parents[i].eachContext(eachCallback);
	}
};

Context.prototype.getContext = function (index) {
	if (index === 0) {
		return this;
	}

	index -= 1;

	for (var i = 0; i < this._parents.length; i++) {
		if (index < this._parents[i]._contextCount) {
			return this._parents[i].getContext(index);
		}

		index -= this._parents[i]._contextCount;
	}

	throw new Error("Can't get context " + index +
		". Index out of range.");
};

Context.prototype.smallestEnclosingContext = function (minCtx, maxCtx) {
	if (minCtx === 0) {
		return this;
	}

	var ctxCount = 1;

	for (var i = 0; i < this._parents.length; i++) {
		var parent = this._parents[i];
		var min = ctxCount;
		var max = ctxCount + parent._contextCount;

		if (minCtx >= min && maxCtx < max) {
			return parent.smallestEnclosingContext(min - ctxCount,
				max - ctxCount);
		}

		ctxCount += parent._contextCount;
	}

	return this;
};

Context.prototype.eachRule = function (name, cb) {
	var cont = true;

	this.eachContext(function (ctx, index) {
		if (HOP(ctx._rules, name)) {
			for (var i = 0; cont && i < ctx._rules[name].length; i++) {
				cont = cb(ctx._rules[name][i], index, i);
			}
		}
		return cont;
	});
};

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

	params.forEach(function (param, index) {
		if (param === "err") {
			count--;
			errorIndex = index;
			checkDone();
			return;
		}

		var deps = self.deps(param);

		if (deps.type === "undefined") {
			count--;
			if (!error) {
				error = new Error("Cannot resolve context parameter '" +
					param + "'");
			}
			checkDone();
			return;
		}

		if (deps.type === "value") {
			count--;
			results[index] = self.getContext(deps.ctxIndex)._values[param];
			checkDone();
			return;
		}

		if (deps.type === "rule") {
			if (!deps.hasDeps) {
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

			// find smallest enclosing context of value dependencies
			var ctx = self.smallestEnclosingContext(deps.minCtx,
				deps.maxCtx);

			if (HOP(ctx._resolved, param)) {
				count--;
				results[index] = ctx._resolved[param];
				checkDone();
				return;
			}

			if (HOP(ctx._resolving, param)) {
				ctx._resolving[param].push(resolved);
				return;
			} else {
				ctx._resolving[param] = [];
				ctx._resolving[param].push(resolved);

				var rule = self.getContext(deps.ctxIndex)
							._rules[param][deps.ruleIndex];

				ctx.get(rule.deps, function (err, results) {
					if (err) {
						ctx._resolving[param].forEach(function (fn) {
							fn(err);
						});
						return;
					}

					results.push(function (err, value) {
						if (!err) {
							ctx._resolved[param] = value;
						}
						ctx._resolving[param].forEach(function (fn) {
							fn(err, value);
						});
						delete ctx._resolving[param];
					});

					rule.fn.apply(null, results);
				});
			}
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

Context.prototype.deps = function (name, seen) {
	var self = this;
	seen = seen ? Array.prototype.slice.call(seen) : [];
	var result;

	if (inArray(seen, name)) {
		seen.push(name);
		throw new Error("Cycle detected: " + seen.join("->"));
	}

	self.eachContext(function (ctx, index) {
		if (HOP(ctx._values, name)) {
			result = {
				type: "value",
				name: name,
				ctxIndex: index,
				minCtx: index,
				maxCtx: index,
				hasDeps: true,
				deps: []
			};
			return false;
		} else {
			return true;
		}
	});

	if (result) {
		return result;
	}

	seen.push(name);
	self.eachRule(name, function (rule, ctxIndex, ruleIndex) {
		var hasDeps = true;
		var deps = [];
		var minCtx = ctxIndex;
		var maxCtx = ctxIndex;
		rule.deps.forEach(function (arg) {
			var dep = self.deps(arg, seen);
			if (!dep.hasDeps) {
				hasDeps = false;
			}
			minCtx = Math.min(minCtx, dep.minCtx);
			maxCtx = Math.max(maxCtx, dep.maxCtx);
			deps.push(dep);
		});

		if (hasDeps) {
			result = {
				type: "rule",
				name: name,
				ctxIndex: ctxIndex,
				minCtx: minCtx,
				maxCtx: maxCtx,
				ruleIndex: ruleIndex,
				hasDeps: true,
				deps: deps
			};
			return false;
		} else {
			return true;
		}
	});

	if (result) {
		return result;
	}

	return {
		type: "undefined",
		name: name,
		hasDeps: false
	};
};

Context.prototype.set = function (name, value) {
	this._values[name] = value;
};

Context.prototype.keys = function () {
	var map = {};

	this.eachContext(function (ctx) {
		for (var key in ctx._values) {
			if (HOP(ctx._values, key)) {
				map[key] = true;
			}
		}

		for (key in ctx._rules) {
			if (HOP(ctx._rules, key)) {
				map[key] = true;
			}
		}
	});

	return Object.keys(map);
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

function inArray(array, e) {
	for (var i = 0; i < array.length; i++) {
		if (array[i] === e) {
			return true;
		}
	}
	return false;
}

function HOP(obj, prop) {
	return Object.prototype.hasOwnProperty.call(obj, prop);
}

exports.Context = Context;
