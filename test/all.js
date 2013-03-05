var system = require("system");

exports.testUserManager = require("./usermanager_test");
exports.testJsonUserManager = require("./jsonusermanager_test");
exports.testFtpServer = require("./ftpserver_test");

if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
            [exports].concat(system.args.slice(1))));
}