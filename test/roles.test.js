var config = require('./config');
var should = require('should');
var async = require('async');
var restParse = require('../lib/rest-parse');
var request = require('request');
var _ = require('underscore');

var parse = new restParse(config.PARSE_APP_ID, config.PARSE_REST_API_KEY);
var parseRole = parse.role();
var parseUser = parse.user();

parse.masterKey = config.PARSE_MASTER_KEY;

var dummyUser = { username: 'shiki', password: 'whew' };

var deleteRoles = function(callback) {
    parseRole.getAll(function(err, res, body, success) {
        async.forEach(body, function(item, callback) {
            parseRole.delete(item.objectId, function(err, res, body, success) {
                callback(err);
            });
        }, function(err, results) {
            callback(err);
        });
    });
};

// delete dummy user
var deleteUsers = function(callback) {
    async.waterfall([
        function(callback) {
            parseUser.logIn(dummyUser.username, dummyUser.password, function(err, res, body, success) {
                callback(err, success ? body : null);
            });
        },
        function(user, callback) {
            if (!user) { // user does not exist
                callback();
                return;
            }
            parse.sessionToken = user.sessionToken;
            parseUser.delete(user.objectId, function(err, res, body, success) {
                success.should.be.true;
                callback(err);
            });
        }
    ], function(err, resulsts) {
        callback(err);
    });
};

describe('roles', function() {

    var role = null; // instance used between tests

    before(deleteRoles);
    before(deleteUsers);
    after(deleteUsers);

    it('can create', function(done) {
        async.series([
            function(done) {
                var data = {
                    ACL: {
                        '*': { 'read': true }
                    }
                };
                parseRole.create(data, function(err, res, body, success) {
                    success.should.be.false;
                    should.not.exist(body.ACL);

                    body.code.should.eql(135);
                    body.error.should.eql('Role names must be specified.');

                    done(err);
                });
            },
            function(done) {
                var data = {
                    name: 'Moderators',
                    ACL: {
                        '*': { 'read': true }
                    }
                };
                parseRole.create(data, function(err, res, body, success) {
                    success.should.be.true;
                    should.exist(body.createdAt);
                    should.exist(body.objectId);
                    should.exist(body.ACL);
                    body.name.should.eql(data.name);

                    role = body;
                    done(err);
                });
            }
        ], function(err) {
            done(err);
        });
    });

    it('can get', function(done) {
        parseRole.get(role.objectId, function(err, res, body, success) {
            success.should.be.true;
            body.createdAt.should.eql(role.createdAt);
            body.name.should.eql(role.name);
            should.exist(body.updatedAt);

            done();
        });
    });

    it('can update', function(done) {

        async.waterfall([
            // create a dummy user
            function(callback) {
                parseUser.signUp(dummyUser, function(err, res, body, success) {
                    success.should.be.true;
                    callback(err, body);
                });
            },
            // link the user to the previously created role
            function(user, callback) {
                async.series([
                    // Add a user to the role
                    function(callback) {
                        var data = {
                            users: {
                                '__op': 'AddRelation',
                                objects: [
                                    { '__type': 'Pointer', 'className': '_User', 'objectId': user.objectId }
                                ]
                            }
                        };
                        parseRole.update(role.objectId, data, function(err, res, body, success) {
                            success.should.be.true;
                            callback(err);
                        });
                    },
                    // Verify that the user was added to the role
                    function(callback) {
                        var params = {
                            where: {
                                '$relatedTo': {
                                    object: { '__type': 'Pointer', className: '_Role', objectId: role.objectId },
                                    key: 'users'
                                }
                            }
                        };
                        parseUser.getAll(params, function(err, res, body, success) {
                            success.should.be.true;
                            body.length.should.eql(1);
                            var userInRole = body[0];
                            userInRole.username.should.eql(user.username);
                            userInRole.objectId.should.eql(user.objectId);
                            callback(err);
                        });
                    }
                ], function(err) {
                    callback(err);
                });
            }
        ], function(err) {
            done(err);
        });
    });

    it('can delete', function(done) {
        async.series([
            function(callback) {
                parseRole.delete(role.objectId, function(err, res, body, success) {
                    success.should.be.true;
                    callback()
                });
            },
            function(callback) {
                parseRole.get(role.objectId, function(err, res, body, success) {
                    success.should.be.false; // false because it should no longer exist
                    callback(err);
                });
            }
        ], function(err) {
            done();
        });
    });
});
