const assert = require("assert");
const system = require("system");
const fs = require("fs");
const objects = require("ringo/utils/objects");
const tmpDir = java.lang.System.getProperty("java.io.tmpdir");

const {JsonUserManager} = require("../lib/jsonusermanager");
const {BaseUser, WritePermission, ConcurrentLoginPermission,
        TransferRatePermission} = org.apache.ftpserver.usermanager.impl;
const {UsernamePasswordAuthentication, AnonymousAuthentication} =
        org.apache.ftpserver.usermanager;
const {AuthenticationFailedException} = org.apache.ftpserver.ftplet;
const {IllegalArgumentException} = java.lang;

const USERS = {
    "test": {
        "name": "test",
        "password": "4221747:D40D331DC793710D56B5ED167F5F3B1A", // "test"
        "homeDirectory": tmpDir
    }
};

const USERS_FILE = fs.join(tmpDir, "ringo-ftpserver.users.json");

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

exports.testConstructor = function() {
    // no args - throws error
    assert.throws(function() {
        new JsonUserManager();
    });
    // object arg - throws error
    assert.throws(function() {
        new JsonUserManager({});
    });

    const usermgr = new JsonUserManager(USERS_FILE);
    assert.isNotNull(usermgr);
    assert.isNotNull(usermgr.users);
    assert.isNotUndefined(usermgr.users);
    assert.isNotNull(usermgr.users);
    assert.deepEqual(usermgr.users, USERS);
};

exports.testDeleteUser = function() {
    const usermgr = new JsonUserManager(USERS_FILE);
    usermgr.delete("test");
    assert.isFalse(usermgr.users.hasOwnProperty("test"));
    const users = JSON.parse(fs.read(USERS_FILE));
    assert.isFalse(users.hasOwnProperty("test"));
};

exports.testDoesExist = function() {
    const usermgr = new JsonUserManager(USERS_FILE);
    assert.isTrue(usermgr.doesExist("test"));
    assert.isFalse(usermgr.doesExist("nonexisting"));
};

exports.testGetAllUserNames = function() {
    const usermgr = new JsonUserManager(USERS_FILE);
    const usernames = usermgr.getAllUserNames();
    assert.strictEqual(usernames.length, 1);
    assert.strictEqual(usernames[0], "test");
};

exports.testGetUserByName = function() {
    const usermgr = new JsonUserManager(USERS_FILE);
    const user = usermgr.getUserByName("test");
    assert.isNotNull(user);
    assert.isNotUndefined(user);
    assert.isTrue(user instanceof BaseUser);
    assert.strictEqual(user.getName(), USERS.test.name);
    assert.strictEqual(user.getPassword(), USERS.test.password);
    assert.strictEqual(user.getHomeDirectory(), USERS.test.homeDirectory);
    // maxIdleTime defaults to zero
    assert.strictEqual(user.getMaxIdleTime(), 0);
    // isEnabled defaults to false
    assert.strictEqual(user.getEnabled(), false);
    const authorities = user.getAuthorities();
    const cnt = authorities.size();
    assert.strictEqual(cnt, 3);
    assert.strictEqual(user.getAuthorities(WritePermission).size(), 1);
    assert.strictEqual(user.getAuthorities(ConcurrentLoginPermission).size(), 1);
    assert.strictEqual(user.getAuthorities(TransferRatePermission).size(), 1);
};

exports.testGetSetAdminName = function() {
    const usermgr = new JsonUserManager(USERS_FILE);
    assert.strictEqual(usermgr.getAdminName(), "admin");
    usermgr.setAdminName("ringojs");
    assert.strictEqual(usermgr.getAdminName(), "ringojs");
};

exports.testIsAdmin = function() {
    const usermgr = new JsonUserManager(USERS_FILE);
    assert.isFalse(usermgr.isAdmin("test"));
    assert.isTrue(usermgr.isAdmin("admin"));
};

exports.testLoadUsers = function() {
    const usermgr = new JsonUserManager(USERS_FILE);
    let gotEvent = false;
    usermgr.on("reloaded", function() {
        gotEvent = true;
    });
    saveUsersFile({
        "ringojs": {
            "name": "ringojs",
            "password": "4221747:D40D331DC793710D56B5ED167F5F3B1A", // "test"
            "homeDirectory": tmpDir
        }
    });
    usermgr.loadUsers(USERS_FILE);
    assert.isTrue(usermgr.users.hasOwnProperty("ringojs"));
    assert.isFalse(usermgr.users.hasOwnProperty("test"));
    assert.isTrue(gotEvent);
    gotEvent = false;
    saveUsersFile(USERS);
    // call loadUsers without argument
    usermgr.loadUsers();
    assert.isFalse(usermgr.users.hasOwnProperty("ringojs"));
    assert.isTrue(usermgr.users.hasOwnProperty("test"));
    assert.isTrue(gotEvent);
};

exports.testSave = function() {
    const usermgr = new JsonUserManager(USERS_FILE);
    usermgr.save({
        "name": "ringojs"
    });
    assert.isTrue(usermgr.users.hasOwnProperty("ringojs"));
};

exports.testAuthenticate = function() {
    const usermgr = new JsonUserManager(USERS_FILE);

    assert.throws(function() {
        usermgr.authenticate();
    }, IllegalArgumentException);

    let authentication = new UsernamePasswordAuthentication(USERS.test.name, "test");
    const user = usermgr.authenticate(authentication);
    assert.isNotNull(user);
    assert.isTrue(user instanceof BaseUser);

    // wrong password
    authentication = new UsernamePasswordAuthentication("test", "wrong");
    assert.throws(function() {
        usermgr.authenticate(authentication);
    }, AuthenticationFailedException);

    // non-existing user
    authentication = new UsernamePasswordAuthentication("nonexisting", "test");
    assert.throws(function() {
        usermgr.authenticate(authentication);
    }, AuthenticationFailedException);
};

exports.testAuthenticateAnonymous = function() {
    const usermgr = new JsonUserManager(USERS_FILE);
    const authentication = new AnonymousAuthentication();

    // user "anonymous" doesn't exist
    assert.throws(function() {
        usermgr.authenticate(authentication);
    }, AuthenticationFailedException)

    usermgr.save({
        "name": "anonymous"
    });

    const user = usermgr.authenticate(authentication);
    assert.isNotNull(user);
    assert.isTrue(user instanceof BaseUser);
    assert.strictEqual(user.getName(), "anonymous");
};

exports.testCheckFile = function()  {
    const usermgr = new JsonUserManager(USERS_FILE);
    assert.isTrue(usermgr.doesExist(USERS.test.name));
    // necessary because lastModified has only seconds granularity (at least ext4):
    java.lang.Thread.sleep(1000);
    fs.write(USERS_FILE, JSON.stringify(objects.merge(objects.clone(USERS, false, true), {
        "ringojs": {
            "name": "ringojs",
            "password": USERS.test.password,
            "homeDirectory": USERS.test.homeDirectory
        }
    })), null, 4);
    assert.isTrue(usermgr.doesExist("ringojs"));
};

if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
            [exports].concat(system.args.slice(1))));
}
