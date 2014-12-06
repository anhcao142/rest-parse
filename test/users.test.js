
var config = require('./config');
var should = require('should');
var async = require('async');
var restParse = require('../lib/rest-parse');
var _ = require('underscore');

var parse = new restParse(config.PARSE_APP_ID, config.PARSE_REST_API_KEY);
var user = new parse.user();

var users = {
  'Zennia': {
    name: 'Zennia',
    gender: 'female',
    nickname: 'Zen',
    username: 'zennia',
    password: 'password'
  },
  'Maricris': {
    name: 'Maricris',
    gender: 'female',
    nickname: 'Kit',
    username: 'maricris',
    password: 'whew'
  },
  'Joel': {
    name: 'Joel',
    gender: 'male',
    nickname: 'JB1',
    username: 'joel',
    password: 'monkayo'
  }
};
// users as an array
var userValues = _(users).values();

// for "before" hook
var deleteUsers = function(callback) {
  // query all
  parse.masterKey = config.PARSE_MASTER_KEY;
  user.getAll(function(err, res, parseUsers) {
    // delete all
    async.forEach(parseUsers, function(parseUser, callback) {
      user.delete(parseUser.objectId, function(err, res, deletedParseUser, success) {
        success.should.be.true;
        callback(err);
      });
    }, function(err, results) {
      parse.masterKey = null;
      callback(err);
    });
  });
};

describe('user', function() {
  var testParseUser = null; // the Parse user object
  var testUser = users['Zennia'];

  before(deleteUsers);

  it('can sign up', function(done) {
    async.parallel([
      function(callback) {
        user.signUp(testUser, function(err, res, parseUser, success) {
          success.should.be.true;
          should.not.exist(err);
          should.exist(parseUser.createdAt);
          should.exist(parseUser.objectId);
          should.exist(parseUser.sessionToken);
          testUser.gender.should.eql(parseUser.gender);
          testParseUser = parseUser;
          callback(err);
        });
      },
      // Test a failure
      function(callback) {
        var incompleteUserInfo = {name: 'Ling'};
        user.signUp(incompleteUserInfo, function(err, res, parseUser, success) {
          success.should.be.false;
          should.not.exist(parseUser.name);
          parseUser.code.should.eql(201);
          parseUser.error.should.eql('missing user password');

          callback(err);
        });
      }
    ], function(err, results) {
      done(err);
    });
  });

  it('can get', function(done) {
    user.get(testParseUser.objectId, function(err, res, parseUser, success) {
      success.should.be.true;
      should.exist(parseUser.updatedAt);
      var compare = _.pick(testParseUser, 'name', 'gender', 'username', 'nickname', 'createdAt', 'objectId');
      compare.updatedAt = parseUser.updatedAt;
      compare.should.eql(parseUser);
      done();
    });
  });

  it('can login', function(done) {
    user.logIn(testParseUser.username, testParseUser.password, function(err, res, loggedInParseUser, success) {
      success.should.be.true;
      loggedInParseUser.sessionToken.should.eql(testParseUser.sessionToken);
      done();
    });
  });

  it('can get current', function(done) {
    parse.sessionToken = testParseUser.sessionToken;
    user.getCurrent(function(err, res, parseUser, success) {
      success.should.be.true;
      parseUser.nickname.should.eql(testParseUser.nickname);
      parseUser.objectId.should.eql(testParseUser.objectId);
      done(err);
    });
  });

  it('can update', function(done) {
    var newNick = 'Inday';
    async.series([
      // update
      function(callback) {
        parse.sessionToken = testParseUser.sessionToken;
        user.update(testParseUser.objectId, {nickname: newNick}, function(err, res, updatedParseUser, success) {
          success.should.be.true;
          should.exist(updatedParseUser.updatedAt);
          callback(err);
        });
      },
      // test updated data
      function(callback) {
        user.get(testParseUser.objectId, function(err, res, parseUser, success) {
          success.should.be.true;
          parseUser.nickname.should.not.eql(testParseUser.nickname);
          parseUser.nickname.should.eql(newNick);
          callback(err);
        });
      }
    ], function(err, results) {
      done();
    });
  });

  it('can delete', function(done) {
    parse.sessionToken = testParseUser.sessionToken;
    async.series([
      // delete
      function(callback) {
        user.delete(testParseUser.objectId, function(err, res, deletedParseUser, success) {
          success.should.be.true;
          should.not.exist(err);
          res.statusCode.should.eql(200);
          callback(err);
        });
      },

      // test with GET
      function(callback) {
        user.get(testParseUser.objectId, function(err, res, parseUser, success) {
          success.should.be.false;
          res.statusCode.should.eql(404);
          callback(err);
        });
      }
    ], function(err, results) {
      done(err);
    });
  });

  it('can request reset password', function(done) {
    async.parallel([
      // Test that we can successfully request a reset.
      function(callback) {
        var joel = _.clone(users['Joel']);
        joel.email = 'joelemail@parse.com';
        user.signUp(joel, function(err, res, signedUpParseUser, success) {
          success.should.be.true;
          user.requestResetPassword(joel.email, function(err, res, body, success) {
            success.should.be.true;
            should.exist(body);
            _.isObject(body).should.be.true;
            should.not.exist(err);
            res.statusCode.should.eql(200);

            callback(err);
          });
        });
      },
      // Test that using a non-existent email will result in an error.
      function(callback) {
        var email = 'probablyandunknownuser@parse.com';
        user.requestResetPassword(email, function(err, res, body, success) {
          success.should.be.false;
          body.code.should.eql(205);
          body.error.should.eql('no user found with email ' + email);

          callback(err);
        });
      }
    ], function(err, results) {
      done(err);
    });
  });

  it('can login with facebook', function(done) {
    var testFacebookUser = { facebook: config.facebook };

    async.series([
      //first time - sign up
      function(callback) {
        user.logInSocial(testFacebookUser, function(err, res, loggedInParseUser, success) {
          success.should.be.true;
          res.statusCode.should.eql(201);
          callback(err);
        });
      },
      //second time - login
      function(callback) {
        user.logInSocial(testFacebookUser, function(err, res, loggedInParseUser, success) {
          success.should.be.true;
          res.statusCode.should.eql(200);
          loggedInParseUser.authData.facebook.id.should.eql(testFacebookUser.facebook.id);
          loggedInParseUser.authData.facebook.access_token.should.eql(testFacebookUser.facebook.access_token);
          callback(err, loggedInParseUser);
        });
      }], function(err, results) {
        var parseUser = results[1];
        parse.sessionToken = parseUser.sessionToken;
        user.delete(parseUser.objectId, function(err, res, deletedUser, success) {
          success.should.be.true;
          done(err);
        })
    });
  });

  it('can login with twitter', function(done) {
    var testTwitterUser = { twitter: config.twitter };

    async.series([
      function(callback) {
        user.logInSocial(testTwitterUser, function(err, res, loggedInParseUser, success) {
          success.should.be.true;
          res.statusCode.should.eql(201);
          callback(err);
        })
      },
      function(callback) {
        user.logInSocial(testTwitterUser, function(err, res, loggedInParseUser, success) {
          success.should.be.true;
          res.statusCode.should.eql(200);
          loggedInParseUser.authData.twitter.id.should.eql(testTwitterUser.twitter.id);
          loggedInParseUser.authData.twitter.screen_name.should.eql(testTwitterUser.twitter.screen_name);
          loggedInParseUser.authData.twitter.consumer_key.should.eql(testTwitterUser.twitter.consumer_key);
          loggedInParseUser.authData.twitter.consumer_secret.should.eql(testTwitterUser.twitter.consumer_secret);
          loggedInParseUser.authData.twitter.auth_token.should.eql(testTwitterUser.twitter.auth_token);
          loggedInParseUser.authData.twitter.auth_token_secret.should.eql(testTwitterUser.twitter.auth_token_secret);
          callback(err, loggedInParseUser);
        })
      }], function(err, results) {
        var parseUser = results[1];
        parse.sessionToken = parseUser.sessionToken;
        user.delete(parseUser.objectId, function(err, res, deletedUser, success) {
          success.should.be.true;
          done(err);
        })
    });
  });

  it('can link Facebook account with existed account', function(done) {
    var testFacebookUser = { facebook: config.facebook };
    var joel = _.clone(users['Joel']);

    async.waterfall([
      function(callback) {
        user.logIn(joel.username, joel.password, function(err, res, loggedInParseUser, success) {
          success.should.be.true;
          callback(err, loggedInParseUser);
        })
      },
      function(joelParse, callback) {
        parse.sessionToken = joelParse.sessionToken;
        user.linkWithSocial(joelParse.objectId, testFacebookUser, function(err, res, linkedUser, success) {
          success.should.be.true;
          callback(err);
        });
      }], function (err) {
        user.logInSocial(testFacebookUser, function(err, res, loggedInParseUser, success) {
          success.should.be.true;
          loggedInParseUser.username.should.eql(joel.username);
          loggedInParseUser.name.should.eql(joel.name);
          done(err);
        })
      });
  });

  it('can unlink Facebook account with existed account', function(done) {
    var testFacebookUser = { facebook: null };
    var joel = _.clone(users['Joel']);

    async.waterfall([
      function(callback) {
        user.logIn(joel.username, joel.password, function(err, res, loggedInParseUser, success) {
          success.should.be.true;
          callback(err, loggedInParseUser);
        })
      },
      function(joelParse, callback) {
        parse.sessionToken = joelParse.sessionToken;
        user.unlinkWithSocial(joelParse.objectId, testFacebookUser, function(err, res, linkedUser, success) {
          success.should.be.true;
          callback(err);
        });
      }], function (err) {
        done(err);
      });
  })
});


// describe('users', function() {
//   var objects = []; // objects for queries
//   var objectIds = null;

//   // create objects for testing
//   before(function(done) {
//     async.series([
//       deleteUsers, // just to be sure

//       function(callback) {
//         async.forEach(userValues,
//           function(item, callback) {
//             parse.createUser(item, function(err, res, body, success) {
//               success.should.be.true;
//               objects.push(body);
//               callback(err);
//             });
//           },
//           function(err) {
//             objects = _(objects).sortBy('objectId');
//             callback(err);
//           }
//         );
//       }
//     ], function(err, results) {
//       done(err);
//     });
//   });

//   // delete users after testing
//   after(deleteUsers);

//   it('supports basic queries', function(done) {
//     // check data first
//     objects.should.have.length(userValues.length);
//     objectIds = _(objects).pluck('objectId').sort();

//     var objectsToCompare = _(objects).map(function(item) {
//       return _.pick(item, 'name', 'gender', 'username', 'nickname', 'createdAt', 'updatedAt', 'objectId');
//     });

//     // query all
//     parse.getUsers(function(err, res, body, success) {
//       success.should.be.true;
//       body.should.have.length(userValues.length);

//       var fetchedIds = _(body).pluck('objectId').sort();
//       objectIds.should.eql(fetchedIds);

//       body = _(body).sortBy('objectId');
//       // copy updatedAt for easy comparision
//       _(objectsToCompare).each(function(item, index) { item.updatedAt = body[index].updatedAt; });
//       objectsToCompare.should.eql(body);

//       done();
//     });
//   });

//   it('supports query constraints', function(done) {
//     var params = { where: {gender: "female"} };
//     parse.getUsers(params, function(err, res, body, success) {
//       success.should.be.true;
//       body.length.should.eql(2);
//       var names = _(body).pluck('name').sort();
//       names.should.eql(['Maricris', 'Zennia']);

//       done(err);
//     });
//   });

//   it('supports multiple query constraints', function(done) {
//     async.series([
//       // order
//       function(callback) {
//         var expected = _(objects).pluck('name').sort();
//         var params = { order: 'name' };
//         parse.getUsers(params, function(err, res, body, success) {
//           success.should.be.true;
//           body.length.should.eql(expected.length);
//           var names = _(body).pluck('name');
//           names.should.eql(expected);

//           callback();
//         });
//       },

//       // where and order
//       function(callback) {
//         var expected = ['Zennia', 'Maricris'];
//         var params = { where: {gender: "female"}, order: '-name' };
//         parse.getUsers(params, function(err, res, body, success) {
//           success.should.be.true;
//           body.length.should.eql(expected.length);
//           var names = _(body).pluck('name');
//           names.should.eql(expected);

//           callback();
//         });
//       }

//     ], function(err, results) {
//       done(err);
//     });
//   });

// });