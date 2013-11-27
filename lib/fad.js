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
