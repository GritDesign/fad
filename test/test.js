var Context = require("../lib/fad").Context;

var ctx = new Context();

/*
ctx.set("projectId", "11111");

ctx.add([
function anotherKey(cb) {
    setTimeout(function() {
	cb(null, "another");
    }, 1000); 
},
function rootKey(cb) {
    setTimeout(function() {
	cb(null, "/this/is/a/test");
    }, 1000); 
}
]);

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

*/
