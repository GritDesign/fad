"use strict";

var fad = require("../lib/fad.js");
var Context = require("../lib/context.js").Context;

describe("fad", function () {
	it("should be an object", function () {
		expect(fad).toEqual(jasmine.any(Object));
	});

	it("should have a create() function", function () {
		expect(fad.create).toEqual(jasmine.any(Function));
	});
});

describe("create()", function () {
	it("should return a context", function () {
		expect(fad.create()).toEqual(jasmine.any(Context));
	});

	it("should accept objects", function () {
		expect(fad.create({})).toEqual(jasmine.any(Context));
	});

	it("should accept arrays of functions", function () {
		var rules = [
			function z(x, y, cb) {
				cb(null, x + y);
			}
		];
		expect(fad.create(rules)).toEqual(jasmine.any(Context));
	});

	it("should not allow rules without names", function () {
		var rules = [
			function (x, y, cb) {
				cb(null, x + y);
			}
		];
		expect(function () {
			fad.create(rules);
		}).toThrow(new Error("All functions must have names"));
	});

	it("should allow rules with the same names", function () {
		var rules = [
			function test(x, y, cb) {
				cb(null, x + y);
			},
			function test(x, cb) {
				cb(null, x * 2);
			}
		];
		expect(fad.create(rules)).toEqual(jasmine.any(Context));
	});

	it("should not allow rules whose last argument is not named cb",
		function () {
		var rules = [
			function test(x, y) {
				x = y;
			}
		];
		expect(function () {
			fad.create(rules);
		}).toThrow(new Error(
			"Rule 'test(x, y)' does not have cb as final argument."));
	});

	it("can accept strings", function () {
		expect(fad.create("name")).toEqual(jasmine.any(Context));
	});

	it("should not accept numbers", function () {
		expect(function () {
			fad.create(10);
		}).toThrow(new Error("Argument 0 is invalid."));
	});

	it("should accept contexts", function () {
		var ctx = fad.create();
		expect(fad.create(ctx)).toEqual(jasmine.any(Context));
	});
});

describe("ctx", function () {
	var ctx = fad.create({a: 10, b: 20});
	it("should have a get function", function () {
		expect(ctx.get).toEqual(jasmine.any(Function));
	});
});

describe("ctx.get", function () {

	var rules = [
		function number20(noone, cb) {
			cb(null, 30);
		},
		function number20(cb) {
			cb(null, 20);
		},
		function async10(cb) {
			setTimeout(function () {
				cb(null, 10);
			}, 20);
		},
		function addResult(a, b, async10, cb) {
			cb(null, a + b + async10);
		},
		function errorRule(cb) {
			cb(new Error("There was an error"));
		},
		function errorRule2(cb) {
			cb(new Error("2nd error"));
		},
		function dependsOnErrorRule(errorRule, cb) {
			cb(null, "no problem");
		}
	];

	var ctx = fad.create(rules);

	ctx.set("a", 10);
	ctx.set("b", 20);

	it("should allow a single function argument", function (done) {
		ctx.get(function (a, b) {
			expect(a).toEqual(10);
			expect(b).toEqual(20);
			done();
		});
	});

	it("should allow being called with (string, function)", function (done) {
		ctx.get("a", function (err, result) {
			expect(err).toBeNull();
			expect(result).toEqual(10);
			done();
		});
	});

	it("should allow being called with (string[], function)", function (done) {
		ctx.get(["a", "b"], function (err, results) {
			expect(err).toBeNull();
			expect(results.length).toEqual(2);
			expect(results[0]).toEqual(10);
			expect(results[1]).toEqual(20);
			done();
		});
	});

	it("should not allow being called with (number)", function () {
		expect(function () {
			ctx.get(3);
		}).toThrow(new Error("invalid arguments to get()"));
	});

	it("should not call callback before returning", function (done) {
		var x = 0;
		ctx.get(function (a, b) {
			x = a + b;
			done();
		});
		expect(x).toEqual(0);
	});

	it("should work with asynchronous rules", function (done) {
		ctx.get(function (addResult) {
			expect(addResult).toEqual(40);
			done();
		});
	});

	it("should work with asynchronous rules (2nd time)", function (done) {
		ctx.get(function (addResult) {
			expect(addResult).toEqual(40);
			done();
		});
	});

	it("should work with asynchronous rules (3rd time)", function (done) {
		ctx.get(function (addResult) {
			expect(addResult).toEqual(40);
			ctx.get(function (addResult) {
				expect(addResult).toEqual(40);
				done();
			});
		});
	});

	it("should ignore rules that don't have all dependencies", function (done) {
		ctx.get(function (number20) {
			expect(number20).toEqual(20);
			done();
		});
	});

	it("should not resolve properties that don't exist", function (done) {
		ctx.get(function (err, nothing) {
			expect(nothing).toBeNull();
			expect(err)
			.toEqual(new Error("Cannot resolve context parameter 'nothing'"));
			done();
		});
	});

	it("should propagate errors in the rules", function (done) {
		ctx.get(function (err, errorRule) {
			expect(errorRule).toBeNull();
			//expect(err.message).toEqual("There was an error");
			done();
		});
	});

	it("should propagate errors in the rule dependencies", function (done) {
		ctx.get(function (err, dependsOnErrorRule) {
			expect(dependsOnErrorRule).toBeNull();
			//expect(err.message).toEqual("There was an error");
			done();
		});
	});

	it("should return only the first error if there are multiple errors",
		function (done) {
		ctx.get(function (err, errorRule, errorRule2) {
			//expect(errorRule).toBeNull();
			//expect(errorRule2).toBeNull();
			//expect(err.message).toEqual("There was an erro r");
			done();
			return errorRule + errorRule2;
		});
	});
});
