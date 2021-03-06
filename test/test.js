var fad = require("..");


var ctx = fad.create("context", [
    function a() {
	return 1;
    },
    function b(a) {
	return a * 2;
    },
    function c(b) {
	return b * 3;
    }
]);

/*
var ctx = fad.create("context", [
    function a(cb) {
       cb(null, 1);
    },
    function b(a, cb) {
       cb(null, a * 2);
    },
    function c(b, cb) {
       cb(null, b * 3);
    }
]);
*/

ctx.get(function (c) {
    ctx.set("a", 2);
    console.log("made it! c is " + c);
    ctx.get(function (c) {
        console.log(c);
    });
});


/*
var ctx = fad.create({
            x: 1,
            y: 2
        }, [
	    function hello(age) {
		return age + 1;
	    },
            function age(x, y, cb) {
                cb(null, x + y);
            },
            function age(x, y, age2, cb) {
                cb(null, x + y + age2);
            }
        ]);


ctx.get(function(hello, age) {
    console.log(ctx._rdeps);
    console.log(ctx.rdeps("x"));
});
*/

//var deps = ctx.deps("age");


/*
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
	}, 1);
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
    },
    function duplicate(cb) {
	cb(null, "good");
    },
    function duplicate(cb) {
	cb(null, "bad");
    },
    function sync40(number20) {
	return number20 * 2;
    },
    function filtered(number20, filtered) {
	return filtered + number20;
    },
    function filtered() {
	return 40;
    }
];
*/


/*
var ctx = fad.create([
    function x() {
	return 1;
    }
]);


ctx.get(function(x) {
    console.log(x);
});
*/


/*
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
*/

//console.log(JSON.stringify(ctx.deps("age")));

/*
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
            cb(null, "no problem");
        }
    ];

var ctx = fad.create(rules);
ctx.set("a", 10);
ctx.set("b", 20);
*/

/*
ctx.get(4, function(err, value) {
    console.log(err);
});
*/

/*
ctx.get(function (err, nothing) {
            expect(nothing).toBeNull();
            expect(err)
            .toEqual(new Error("Cannot resolve context parameter 'nothing'"));
            done();
        });
*/



/*
ctx.get(function (err, dependsOnErrorRule) {
   console.log([err, dependsOnErrorRule]);
});

ctx.get(function (err, dependsOnErrorRule) {
   console.log([err, dependsOnErrorRule]);
});



ctx.get(function (err, errorRule) {
    console.log([err, errorRule]);
});
*/

/*
var count = 2;
ctx.get(function (async10) {
    count--;
    checkDone();
});

ctx.get(function (async10) {
    count--;
    checkDone();
});

function checkDone() {
    if (count === 0) {
        console.log("done");
    }
}
*/


/*
ctx.get(function (a, b) {
    console.log("--> ", [a, b]);
});
*/

/*
ctx.get(function (addResult) {
    console.log(addResult);
});
*/
