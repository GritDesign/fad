"use strict";
var Context = require("./context.js").Context;

function isArray(val) {
	return Object.prototype.toString.call(val) ===
		"[object Array]";
}

function create() {
	var args = Array.prototype.slice.call(arguments);

	var parents = [];
	var rules = [];
	var name = "";

	args.forEach(function (arg, i) {
		if (isArray(arg)) {
			arg.forEach(function (rule) {
				rules.push(rule);
			});
		} else if (arg instanceof Context) {
			parents.push({
				type: "context",
				name: name || arg.name,
				value: arg
			});
		} else if (typeof arg === "object") {
			parents.push({
				type: "object",
				name: name,
				value: arg
			});
		} else if (typeof arg === "string") {
			name = arg;
		} else {
			throw new Error("Argument " + i + " is invalid.");
		}

		// clear name so it doesn't get reused
		if (typeof arg !== "string") {
			name = "";
		}
	});

	parents.reverse();

	var ctx = new Context(name, rules, parents);
	return ctx;
}

exports.create = create;
