const system = require("system");
const assert = require("assert");
const fs = require("fs");
const tmpDir = java.lang.System.getProperty("java.io.tmpdir");

const {FtpServer} = require("../lib/ftpserver");
const {UserManager} = require("../lib/usermanager");
const {JsonUserManager} = require("../lib/jsonusermanager");

const USERS_FILE = fs.join(tmpDir, "ringo-ftpserver.users.json");

const USERS = {
    "test": {
        "name": "test",
        "homeDirectory": tmpDir
    }
};

const saveUsersFile = function(data) {
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
    let mgr = FtpServer.createUserManager({});
    assert.isTrue(mgr instanceof UserManager);
    mgr = FtpServer.createUserManager(USERS_FILE);
    assert.isTrue(mgr instanceof JsonUserManager);
};

if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
            [exports].concat(system.args.slice(1))));
}