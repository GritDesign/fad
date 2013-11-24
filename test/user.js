var Context = require("../lib/factr.js").Context;
var util = require("util");

function User(userId, ctx) {
	Context.call(this, ctx);

	this.userId = userId;
}

util.inherits(User, Context);

User.prototype.rules = [

/**
 *	User's full name
 *	@returns {string}
 */
function fullName(firstName, lastName, cb) {
	cb(null, firstName + " " + lastName);
}

];

exports.User = User;