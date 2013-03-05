var system = require("system");
var assert = require("assert");
var fs = require("fs");
var tmpDir = java.lang.System.getProperty("java.io.tmpdir");

var {FtpServer} = require("../lib/ftpserver");
var {UserManager} = require("../lib/usermanager");
var {JsonUserManager} = require("../lib/jsonusermanager");

var USERS_FILE = fs.join(tmpDir, "ringo-ftpserver.users.json");

var USERS = {
    "test": {
        "name": "test",
        "homeDirectory": tmpDir
    }
};

var saveUsersFile = function(data) {
    if (fs.exists(USERS_FILE)) {
        fs.remove(USERS_FILE);
    }
    fs.write(USERS_FILE, JSON.stringify(data, null, 4));
};

exports.setUp = function() {
    saveUsersFile(USERS);
    assert.isTrue(fs.exists(USERS_FILE));
};

exports.tearDown = function() {
    if (fs.exists(USERS_FILE)) {
        fs.remove(USERS_FILE);
    }
    assert.isFalse(fs.exists(USERS_FILE));
};

exports.testCreateUserManager = function() {
    assert.throws(function() {
        FtpServer.createUserManager();
    });
    var mgr = FtpServer.createUserManager({});
    assert.isTrue(mgr instanceof UserManager);
    mgr = FtpServer.createUserManager(USERS_FILE);
    assert.isTrue(mgr instanceof JsonUserManager);
};

if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
            [exports].concat(system.args.slice(1))));
}