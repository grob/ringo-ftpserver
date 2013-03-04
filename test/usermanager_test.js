var assert = require("assert");
var system = require("system");
var fs = require("fs");
var objects = require("ringo/utils/objects");
var tmpDir = java.lang.System.getProperty("java.io.tmpdir");

var {UserManager} = require("../lib/usermanager");
var {BaseUser, WritePermission, ConcurrentLoginPermission,
        TransferRatePermission} = org.apache.ftpserver.usermanager.impl;
var {UsernamePasswordAuthentication, AnonymousAuthentication} =
        org.apache.ftpserver.usermanager;
var {AuthenticationFailedException} = org.apache.ftpserver.ftplet;
var {IllegalArgumentException} = java.lang;

var USERS = {
    "test": {
        "name": "test",
        "password": "4221747:D40D331DC793710D56B5ED167F5F3B1A", // "test"
        "homeDirectory": tmpDir
    }
};

exports.testConstructor = function() {
    // no args
    var usermgr = new UserManager();
    assert.isNotNull(usermgr);
    assert.isNotNull(usermgr.users);
    assert.isNotUndefined(usermgr.users);
    assert.isNotNull(usermgr.users);

    usermgr = new UserManager(USERS);
    assert.strictEqual(usermgr.users, USERS);
    assert.deepEqual(usermgr.users, USERS);
};

exports.testDeleteUser = function() {
    var usermgr = new UserManager(objects.clone(USERS, {}, true));
    usermgr.delete("test");
    assert.isFalse(usermgr.users.hasOwnProperty("test"));
};

exports.testDoesExist = function() {
    var usermgr = new UserManager(USERS);
    assert.isTrue(usermgr.doesExist("test"));
    assert.isFalse(usermgr.doesExist("nonexisting"));
};

exports.testGetAllUserNames = function() {
    var usermgr = new UserManager(USERS);
    var usernames = usermgr.getAllUserNames();
    assert.strictEqual(usernames.length, 1);
    assert.strictEqual(usernames[0], "test");
};

exports.testGetUserByName = function() {
    // minimal props for a user account
    var usermgr = new UserManager(USERS);
    var user = usermgr.getUserByName("test");
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
    var authorities = user.getAuthorities();
    var cnt = authorities.size();
    assert.strictEqual(cnt, 3);
    // write permission defaults to false
    assert.strictEqual(user.getAuthorities(WritePermission).size(), 1);
    // concurrent login and transfer rate permissions are unrestricted by default
    assert.strictEqual(user.getAuthorities(ConcurrentLoginPermission).size(), 1);
    assert.strictEqual(user.getAuthorities(TransferRatePermission).size(), 1);
};

exports.testGetSetAdminName = function() {
    var usermgr = new UserManager(USERS);
    assert.strictEqual(usermgr.getAdminName(), "admin");
    usermgr.setAdminName("ringojs");
    assert.strictEqual(usermgr.getAdminName(), "ringojs");
};

exports.testIsAdmin = function() {
    var usermgr = new UserManager(USERS);
    assert.isFalse(usermgr.isAdmin("test"));
    assert.isTrue(usermgr.isAdmin("admin"));
};

exports.testLoadUsers = function() {
    var usermgr = new UserManager(USERS);
    var gotEvent = false;
    usermgr.on("reloaded", function() {
        gotEvent = true;
    });
    usermgr.loadUsers({
        "ringojs": {
            "name": "ringojs",
            "password": "4221747:D40D331DC793710D56B5ED167F5F3B1A", // "test"
            "homeDirectory": tmpDir
        }
    });
    assert.isTrue(usermgr.users.hasOwnProperty("ringojs"));
    assert.isFalse(usermgr.users.hasOwnProperty("test"));
    assert.isTrue(gotEvent);
};

exports.testSave = function() {
    var usermgr = new UserManager(USERS);
    var user = new BaseUser();
    user.setName("ringojs");
    usermgr.save(user);
    assert.isTrue(usermgr.users.hasOwnProperty("ringojs"));
};

exports.testAuthenticate = function() {
    var usermgr = new UserManager(USERS);

    assert.throws(function() {
        usermgr.authenticate();
    }, IllegalArgumentException);

    var authentication = new UsernamePasswordAuthentication(USERS.test.name, "test");
    var user = usermgr.authenticate(authentication);
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
    var usermgr = new UserManager(USERS);
    var authentication = new AnonymousAuthentication();

    // user "anonymous" doesn't exist
    assert.throws(function() {
        usermgr.authenticate(authentication);
    }, AuthenticationFailedException)

    usermgr.save({
        "name": "anonymous"
    });

    var user = usermgr.authenticate(authentication);
    assert.isNotNull(user);
    assert.isTrue(user instanceof BaseUser);
    assert.strictEqual(user.getName(), "anonymous");
};

if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
            [exports].concat(system.args.slice(1))));
}
