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
		/* run for cover */
		rules[0](1, 2, function () {});
	});

	it("should not allow rules without names", function () {
		var rules = [

			function () {}
		];
		expect(function () {
			fad.create(rules);
		}).toThrow(new Error("All functions must have names"));
		/* run for cover */
		rules[0]();
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
		/* run for cover */
		rules[0](1, 2, function () {});
		rules[1](1, function () {});
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
			/* run for cover */
			rules[0](1, 2);
		});

	it("can accept strings", function () {
		expect(fad.create("name")).toEqual(jasmine.any(Context));
	});

	it("should not accept numbers", function () {
		expect(function () {
			fad.create(10);
		}).toThrow(new Error("Argument 0 to fad.create() is invalid."));
	});

	it("should accept contexts", function () {
		var ctx = fad.create();
		expect(fad.create(ctx)).toEqual(jasmine.any(Context));
	});
});

describe("ctx", function () {
	var ctx = fad.create({
		a: 10,
		b: 20
	});
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
			}, 200);
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
			cb(null, "should have been error!");
		},
		function dependsOnNothing(nothing, cb) {
			cb(null, "should have been error!");
		}
	];

	/* run for cover */
	rules[0](1, function () {});
	rules[6](1, function () {});
	rules[7](1, function () {});


	var ctx = fad.create(rules);

	ctx.set("a", 10);
	ctx.set("b", 20);

	it("should propagate errors in the rules", function (done) {
		ctx.get(function (err, errorRule) {
			expect(errorRule).toBeNull();
			expect(err).toEqual(new Error("There was an error"));
			done();
		});
	});

	it("should propagate errors in the rule dependencies", function (
		done) {
		ctx.get(function (err, dependsOnErrorRule) {
			expect(err).toEqual(new Error("There was an error"));
			expect(dependsOnErrorRule).toBeNull();
			done();
		});
	});

	it("should allow a single function argument", function (done) {
		ctx.get(function (a, b) {
			expect(a).toEqual(10);
			expect(b).toEqual(20);
			done();
		});
	});

	it("should allow being called with (string, function)", function (
		done) {
		ctx.get("a", function (err, result) {
			expect(err).toBeNull();
			expect(result).toEqual(10);
			done();
		});
	});

	it("should allow being called with (string[], function)", function (
		done) {
		ctx.get(["a", "b"], function (err, results) {
			expect(err).toBeNull();
			expect(results.length).toEqual(2);
			expect(results[0]).toEqual(10);
			expect(results[1]).toEqual(20);
			done();
		});
	});

	it("should not allow being called with (number)", function (done) {
		try {
			ctx.get(3);
		} catch (e) {
			expect(e).toEqual(new Error("invalid arguments to get()"));
			done();
		}

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
		var ctx3 = fad.create(rules);
		ctx3.set("a", 10);
		ctx3.set("b", 20);
		ctx3.get(function (addResult) {
			expect(addResult).toEqual(40);
			ctx3.get(function (addResult) {
				expect(addResult).toEqual(40);
				done();
			});
		});
	});

	it("should call functions only a single time no deps", function (
		done) {
		var callCount = 0;
		var count = 2;
		var ctx3 = fad.create([

			function waitForIt(cb) {
				setTimeout(function () {
					callCount++;
					cb(null, 10);
				}, 100);
			}
		]);
		ctx3.get(function (waitForIt) {
			expect(waitForIt).toEqual(10);
			count--;
			checkDone();
		});
		ctx3.get(function (waitForIt) {
			expect(waitForIt).toEqual(10);
			count--;
			checkDone();
		});

		function checkDone() {
			if (count === 0) {
				expect(callCount).toEqual(1);
				done();
			}
		}
	});

	it("should ignore rules that don't have all dependencies", function (
		done) {
		ctx.get(function (number20) {
			expect(number20).toEqual(20);
			done();
		});
	});

	it("should resolve properties that don't exist as undefined",
		function (done) {
			ctx.get(function (err, nothing) {
				expect(nothing).toBeUndefined();
				expect(err).toBeNull();
				done();
			});
		});

	it(
		"should return only the first error if there are multiple errors",
		function (done) {
			ctx.get(function (err, errorRule, errorRule2) {
				//expect(errorRule).toBeNull();
				//expect(errorRule2).toBeNull();
				//expect(err.message).toEqual("There was an erro r");
				done();
				return errorRule + errorRule2;
			});
		});

	it("should allow parallel gets of the same async value",
		function (done) {

			var count = 2;
			ctx.get(function (async10) {
				expect(async10).toEqual(10);
				count--;
				checkDone();
			});

			ctx.get(function (async10) {
				expect(async10).toEqual(10);
				count--;
				checkDone();
			});

			function checkDone() {
				if (count === 0) {
					done();
				}
			}
		});

	it("should give undefined for rules that depend on " +
		"non-existing parameters",
		function (done) {
			ctx.get(function (err, dependsOnNothing) {
				expect(err).toBeNull();
				expect(dependsOnNothing).toBeUndefined();
				done();
				return dependsOnNothing;
			});
		});

	it("should allow overriding of rules by set values", function (done) {
		var ctx3 = fad.create(rules);
		ctx3.set("dependsOnNothing", 3);
		ctx3.set("dependsOnErrorRule", 4);
		ctx3.set("number20", 5);

		ctx3.get(function (dependsOnNothing, dependsOnErrorRule, number20) {
			expect(dependsOnNothing).toEqual(3);
			expect(dependsOnErrorRule).toEqual(4);
			expect(number20).toEqual(5);
			done();
		});
	});
});

describe("ctx.keys", function () {
	it("should return all keys within the context", function () {
		Object.prototype.nastiestKey = "Who would do this?";
		var rules = [

			function hello(cb) {
				cb(null, "hi");
			}
		];
		var ctx = fad.create(rules);
		ctx.set("there", 20);

		expect(ctx.keys()).toEqual(["there", "hello"]);
		/* run for cover */
		rules[0](function () {});
	});
});

describe("ctx.eachContext", function () {
	var ctxA = fad.create("A");
	var ctxB = fad.create("B");
	var ctxC = fad.create("C");
	var ctxD = fad.create("D", ctxA, ctxB, ctxC);
	var ctxE = fad.create("E", ctxD);

	it("should iterate over contexts closest first order", function () {
		var all = [];
		ctxA.eachContext(function (ctx, i) {
			all.push(ctx.name);
			expect(ctxA.getContext(i).name).toEqual(ctx.name);
			return true;
		});

		expect(all).toEqual(["A"]);
	});

	it("should iterate over contexts closest first order with parents",
		function () {
			var all = [];
			ctxD.eachContext(function (ctx, i) {
				all.push(ctx.name);
				expect(ctxD.getContext(i).name).toEqual(ctx.name);
				return true;
			});

			expect(all).toEqual(["D", "A", "B", "C"]);
		});

	it(
		"should iterate over contexts closest first order with multiple",
		function () {
			var all = [];
			ctxE.eachContext(function (ctx, i) {
				all.push(ctx.name);
				expect(ctxE.getContext(i).name).toEqual(ctx.name);
				return true;
			});

			expect(all).toEqual(["E", "D", "A", "B", "C"]);
		});
});

describe("ctx.deps", function () {
	var ctx = fad.create({
		test: "value"
	});
	it("should report deps of simple context variables", function () {
		expect(ctx.deps("test")).toEqual({
			type: "value",
			name: "test",
			ctxIndex: 0,
			minCtx: 0,
			maxCtx: 0,
			hasDeps: true,
			deps: []
		});
	});

	it("should detect cycles", function () {
		var ctx = fad.create({
			x: 1,
			y: 2
		}, [

			function age(x, y, age2, cb) {
				cb(null, x + y + age2);
			},
			function age2(y, x, age, cb) {
				cb(null, x + y + age);
			}
		]);

		var rulesCount = 0;
		ctx.eachRule("age", function () {
			rulesCount++;
		});

		expect(rulesCount).toEqual(1);

		expect(function () {
			return ctx.deps("age");
		}).toThrow(new Error("Cycle detected: age->age2->age"));
	});

	it("should ignore rules that don't have all deps", function () {
		var ctx = fad.create({
			x: 1,
			y: 2
		}, [

			function age(x, y, age2, cb) {
				cb(null, x + y + age2);
			},
			function age(x, y, cb) {
				cb(null, x + y);
			}
		]);

		expect(ctx.deps("age")).toEqual({
			"type": "rule",
			"name": "age",
			"ctxIndex": 0,
			"minCtx": 0,
			"maxCtx": 0,
			"ruleIndex": 1,
			"hasDeps": true,
			"deps": [{
				"type": "value",
				"name": "x",
				"ctxIndex": 0,
				"minCtx": 0,
				"maxCtx": 0,
				"hasDeps": true,
				"deps": []
			}, {
				"type": "value",
				"name": "y",
				"ctxIndex": 0,
				"minCtx": 0,
				"maxCtx": 0,
				"hasDeps": true,
				"deps": []
			}]
		});

		var ctx2 = fad.create(ctx);
		expect(ctx2.deps("age")).toEqual({
			"type": "rule",
			"name": "age",
			"ctxIndex": 1,
			"minCtx": 1,
			"maxCtx": 1,
			"ruleIndex": 1,
			"hasDeps": true,
			"deps": [{
				"type": "value",
				"name": "x",
				"ctxIndex": 1,
				"minCtx": 1,
				"maxCtx": 1,
				"hasDeps": true,
				"deps": []
			}, {
				"type": "value",
				"name": "y",
				"ctxIndex": 1,
				"minCtx": 1,
				"maxCtx": 1,
				"hasDeps": true,
				"deps": []
			}]
		});
	});
});

describe("ctx.smallestEnclosingContext", function () {
	it("should select a global context if there are not other deps",
		function () {
			var aCtx = fad.create("something", {
				"else": true
			});
			var gCtx = fad.create("global", {
				"test": "hello"
			});
			var ctx = fad.create("user", aCtx, gCtx);

			var deps = ctx.deps("test");
			var smallestCtx = ctx.smallestEnclosingContext(deps.minCtx,
				deps.maxCtx);
			expect(smallestCtx.name).toEqual("global");

			smallestCtx = ctx.smallestEnclosingContext(deps.minCtx,
				deps.maxCtx + 1);
			expect(smallestCtx.name).toEqual("user");
		});
});
