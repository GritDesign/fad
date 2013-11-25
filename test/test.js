var Context = require("../lib/fad").Context;

var ctx = new Context();

ctx.set("projectId", "11111");

ctx.addRule(function anotherKey(cb) {
    cb(null, "another");
});

ctx.addRule(function rootKey(cb) {
    console.log("!!!! " + cb);
    cb(null, "/this/is/a/test");
});

ctx.get(function(rootKey, anotherKey, projectId) {
    console.log("rootKey is " + rootKey);
    console.log("another key  is " + anotherKey);
    console.log("projectId" + projectId);

    ctx.get(["rootKey", "anotherKey", "projectId"], function(err, results) {
    console.log("\nwas that  quick?");
    console.log("rootKey is " + results[0]);
    console.log("another key  is " + results[1]);
    console.log("projectId" + results[2]);
    });

    console.log("THIS SHOULD BE BEFORE the end");

});

ctx.get(function(rootKey, anotherKey, projectId) {
    console.log("rootKey is " + rootKey);
    console.log("another key  is " + anotherKey);
    console.log("projectId" + projectId);

    ctx.get(function(rootKey, anotherKey, projectId) {
    console.log("\nwas that  quick?");
    console.log("rootKey is " + rootKey);
    console.log("another key  is " + anotherKey);
    console.log("projectId" + projectId);
    });

    console.log("THIS SHOULD BE BEFORE the end");

});

