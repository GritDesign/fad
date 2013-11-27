var fad = require("..");

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
