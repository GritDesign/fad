var fad = require("..");

var rules = [
    function async10(cb) {
        setTimeout(function () {
            cb(null, 10);
        }, 20);
    },
    function addResult(a, b, async10, cb) {
        cb(null, a + b + async10);
    }
];

var ctx = fad.create(rules);
ctx.set("a", 10);
ctx.set("b", 20);


ctx.get(function (a, b) {
    console.log("--> ", [a, b]);
});

/*
ctx.get(function (addResult) {
    console.log(addResult);
});
*/
