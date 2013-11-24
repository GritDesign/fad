var nextTick = process.nextTick || setImmediate;

function Context() {
    this._resolved = {};
    this._values = {};
    this._resolvers = {};
    this._resolving = {};
    this._initialized = false;
}

Context.prototype.get = function (cb) {
    var self = this;
    var signature = getSignature(cb);
    var params = signature.args;

    console.log(signature);

    if (!params.length) {
		throw new Error("get must have arguments");
    }
    // check that we have resolvers for each parameter
    params.forEach(function (param) {
		if (!HOP(self._values, param) &&
		    !self._resolvers[param] && param !== "err") {
		    throw new Error("Cannot resolve context parameter '" + param + "'");
		}
    });

    var count = params.length;
    var results = [];
    var error = null;
    var errorIndex = -1;
    var immediate = true;

    params.forEach(function(param, index) {
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
		    self._resolvers[param](self, function(err, value) {
				self._resolved[param] = value;
				self._resolving[param].forEach(function(fn) {
				    fn(err, value);
				});
				delete self._resolving[param];
		    });
		}

		function resolved (err, value) {
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

    immediate = false;

    function checkDone () {
		if (count === 0) {
		    // set the err parameter
		    if (errorIndex !== -1) {
				results[errorIndex] = error;
		    } else if (error) {
				// there was an error and no err parameter was set
				throw error;
		    }

		    if (immediate) {
				nextTick(function() {
				    cb.apply(null, results);
				});
		    } else {
				cb.apply(null, results);
		    }
		}
    }
};

Context.prototype.add = function (name, resolver) {
    if (this._resolvers[name]) {
		throw new Error("Resolver for '" + name + "' already exists." );
    }

    this._resolvers[name] = resolver;
};

Context.prototype.set = function (name, value) {
    this._values[name] = value;
};

Context.prototype.clear = function (name) {
    delete this._resolved[name];
};

Context.prototype.contains = function (name) {
    return HOP(this._values, name) || HOP(this._resolvers, name);
};

Context.prototype.keys = function () {
    var keys = [];
    var key;

    for (key in this._values) {
		keys.push(key);
    }

    for (key in this._resolvers) {
		if (!HOP(this._values, key)) {
		    keys.push(key);
		}
    }
    
    return keys;
};

/*
function parameter name extraction from stackoverflow:
http://stackoverflow.com/questions/1007981/how-to-get-function-parameter-names-values-dynamically-from-javascript
*/
var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
var NAME_MATCH = /function\s+([^\s]+)/;
function getSignature(func) {
    var stripped = func.toString().replace(STRIP_COMMENTS, '');
    var args = stripped
	    .slice(stripped.indexOf('(')+1, stripped.indexOf(')'))
	    .match(/([^\s,]+)/g);

    if(!args) {
		args = [];
    }

    var nameMatches = NAME_MATCH.exec(stripped);
    var name = nameMatches ? nameMatches[1] : null;
    
    return {name: name, args: args};
}

function HOP(obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
}

exports.Context = Context;
