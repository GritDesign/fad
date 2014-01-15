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
		var async = true;
		if (last !== "cb") {
			async = false;
			if (last) {
				sig.args.push(last);
			}
		}

		var filter = false;
		sig.args.forEach(function (arg) {
			if (arg === "cb") {
				throw new Error("Error in rule " + sig.name +
					"(" + sig.args.join(", ") +
					") 'cb' should be last argument.");
			}
			if (arg === sig.name) {
				filter = true;
			}
		});

		rulesMap[sig.name].push({
			fn: rule,
			deps: sig.args,
			async: async,
			filter: filter
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
	this._rdeps = {};
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

Context.prototype.get = function (key, skipRules, cb) {
	var self = this;
	var arrayResult = false;
	var params;
	var done = false;
	var error = null;
	var errorIndex = -1;
	var count = 0;
	var wasImmediate = true;
	var results = [];

	if (typeof skipRules === "function") {
		cb = skipRules;
		skipRules = {};
	}

	if (typeof key === "function") {
		cb = key;
		skipRules = {};
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

		var deps = self.deps(param, [], skipRules);
		if (deps.type === "undefined") {
			count--;
			results[index] = undefined;
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
				count--;
				results[index] = undefined;
				checkDone();
				return;
			}

			var noSkip = !skipRules[param];

			// find smallest enclosing context of value dependencies
			var ctx = self.smallestEnclosingContext(deps.minCtx,
				deps.maxCtx);

			if (HOP(ctx._resolved, param)) {
				count--;
				results[index] = ctx._resolved[param];
				checkDone();
				return;
			}

			if (HOP(ctx._resolving, param) && noSkip) {
				ctx._resolving[param].push(resolved);
				return;
			} else {
				if (noSkip) {
					ctx._resolving[param] = [];
				}

				var rule = self.getContext(deps.ctxIndex)
					._rules[param][deps.ruleIndex];

				//clone skipRules
				var skipClone = {};
				for (var key in skipRules) {
					if (HOP(skipRules, key)) {
						skipClone[key] = skipRules[key];
					}
				}
				if (rule.filter) {
					if (!HOP(skipClone, param)) {
						skipClone[param] = 0;
					}
					skipClone[param]++;
				}

				if (noSkip) {
					ctx._resolving[param].push(resolved);
				}

				ctx.get(rule.deps, skipClone, function (err, results) {
					if (err) {
						if (noSkip) {
							var resolving = ctx._resolving[param];
							delete ctx._resolving[param];
							resolving.forEach(function (fn) {
								fn(err);
							});
						} else {
							resolved(err);
						}

						return;
					}

					results.push(function (err, value) {
						if (!err) {
							ctx._resolved[param] = value;
						}
						var resolving = ctx._resolving[param];
						delete ctx._resolving[param];

						if (noSkip) {
							resolving.forEach(function (fn) {
								fn(err, value);
							});
						} else {
							resolved(err, value);
						}
					});

					if (rule.async) {
						rule.fn.apply(null, results);
					} else {
						var value = null;
						var err2 = null;
						try {
							value = rule.fn.apply(null, results);
						} catch (e) {
							err2 = e;
						}

						delete ctx._resolving[param];
						resolved(err2, value);
					}
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

Context.prototype.rdeps = function (name, collect) {
	var self = this;
	var returnArray = false;

	if (!collect) {
		collect = {};
		returnArray = true;
	}

	if (self._rdeps[name]) {
		var rdeps = self._rdeps[name];
		for (var key in rdeps) {
			if (HOP(rdeps, key)) {
				self.rdeps(key, collect);
				collect[key] = true;
			}

		}
	}

	if (returnArray) {
		return Object.keys(collect);
	}
};

Context.prototype.deps = function (name, seen, skipRules) {
	var self = this;
	seen = seen ? Array.prototype.slice.call(seen) : [];
	var result;

	if (inArray(seen, name)) {
		seen.push(name);
		throw new Error("Cycle detected: " + seen.join("->"));
	}

	if (!skipRules) {
		skipRules = {};
	}

	var skippedRules = 0;

	self.eachContext(function (ctx, ctxIndex) {
		if (HOP(ctx._values, name)) {
			result = {
				type: "value",
				name: name,
				ctxIndex: ctxIndex,
				minCtx: ctxIndex,
				maxCtx: ctxIndex,
				hasDeps: true,
				deps: []
			};
			return false;
		}

		if (HOP(ctx._rules, name)) {
			for (var ri = 0; ri < ctx._rules[name].length; ri++) {
				if (HOP(skipRules, name) && skipRules[name] > skippedRules) {
					skippedRules++;
					continue;
				}
				var rule = ctx._rules[name][ri];
				var hasDeps = true;
				var deps = [];
				var minCtx = ctxIndex;
				var maxCtx = ctxIndex;
				for (var di = 0; di < rule.deps.length; di++) {
					var param = rule.deps[di];
					//clone skipRules
					var skipClone = {};
					for (var key in skipClone) {
						if (HOP(skipRules, key)) {
							skipClone[key] = skipRules[key];
						}
					}
					if (rule.filter) {
						if (!HOP(skipClone, param)) {
							skipClone[param] = 0;
						}
						skipClone[param]++;
					}

					var newSeen = seen.slice();
					if (!rule.filter) {
						newSeen.push(name);
					}

					var dep = self.deps(param, newSeen, skipClone);
					if (!dep.hasDeps) {
						hasDeps = false;
					}
					minCtx = Math.min(minCtx, dep.minCtx);
					maxCtx = Math.max(maxCtx, dep.maxCtx);
					deps.push(dep);

					if (!HOP(self._rdeps, dep.name)) {
						self._rdeps[dep.name] = {};
					}
					self._rdeps[dep.name][name] = true;
				}

				if (hasDeps) {
					result = {
						type: "rule",
						name: name,
						ctxIndex: ctxIndex,
						minCtx: minCtx,
						maxCtx: maxCtx,
						ruleIndex: ri,
						hasDeps: true,
						deps: deps
					};
					return false;
				}
			}
		}

		return true;
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
	var self = this;
	self._values[name] = value;

	var rdeps = self.rdeps(name);
	rdeps.forEach(function (rdep) {
		if (HOP(self._resolved, rdep)) {
			delete self._resolved[rdep];
		}
	});
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
