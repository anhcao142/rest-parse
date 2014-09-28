
var config = require('./config');
var should = require('should');
var async = require('async');
var Kaiseki = require('../lib/kaiseki');
var _ = require('underscore');

var className = 'Dogs';
var parse = new Kaiseki(config.PARSE_APP_ID, config.PARSE_REST_API_KEY);
var object = parse.object;

describe('object', function() {
  var dog = {
    name: 'Prince',
    breed: 'Pomeranian',
    age: 2,
  };

  var owner = {
    name: 'Frank'
  };
  var testParseDog = null; // the Parse object we'll be passing along
  var testParseOwner;
  object.className = 'Dogs';
  it('can create', function(done) {
    async.parallel([
      function(done) {
        object.className = 'Owners';
        object.create(owner, function(err, res, parseOwner, success) {
          success.should.be.true;
          should.not.exist(err);
          testParseOwner = parseOwner;

          testParseOwner.name.should.eql(owner.name);
          should.exist(testParseOwner.createdAt);
          should.exist(testParseOwner.objectId);
          done(err);
        });
      },
      function(done) {
        object.className = 'Dogs';
        object.create(dog, function(err, res, parseDog, success) {
          success.should.be.true;
          should.not.exist(err);
          testParseDog = parseDog;

          testParseDog.name.should.eql(dog.name);
          testParseDog.breed.should.eql(dog.breed);
          should.exist(testParseDog.createdAt);
          should.exist(testParseDog.objectId);

          done(err);
        });
      },
      function(done) {
        object.className = 'Dogs';
        var invalid = {
          name: 'Woof',
          owner: {
            __type: 'InvalidName'
          }
        };
        object.create(invalid, function(err, res, parseDog, success) {
          success.should.be.false;
          should.not.exist(err);
          should.not.exist(parseDog.name);
          should.not.exist(parseDog.owner);

          parseDog.code.should.eql(111);

          done(err);
        });
      }
    ], function(err) {
      object.className = 'Dogs';
      done(err);
    });
  });

  it('can get', function(done) {
    object.get(testParseDog.objectId, function(err, res, parseDog, success) {
      success.should.be.true;
      should.not.exist(err);
      // object from .createObject does not have updatedAt
      testParseDog.updatedAt = parseDog.updatedAt;
      delete parseDog.owner;
      parseDog.should.eql(testParseDog);

      done();
    });
  });

  it('can update', function(done) {
    var newName = 'Princess';
    async.series([
      // update the object
      function(callback) {
        object.update(testParseDog.objectId, { name: newName }, function(err, res, parseDog, success) {
          success.should.be.true;
          should.not.exist(err);
          should.exist(parseDog.updatedAt);
          callback(null, parseDog);
        });
      },
      function(callback) {
        object.update(testParseDog.objectId, { ads: {__type: 'Pointer', className: 'Owners', objectId: testParseOwner.objectId}}, function(err, res, parseDog, success) {
          success.should.be.true;
          should.not.exist(err);
          should.exist(parseDog.updatedAt);
          callback(null, parseDog);
        });
      },
      // get the object and test that it has really changed
      function(callback) {
        object.get(testParseDog.objectId, function(err, res, parseDog, success) {
          success.should.be.true;
          should.not.exist(err);
          parseDog.objectId.should.eql(testParseDog.objectId);
          parseDog.should.not.eql(testParseDog);
          parseDog.name.should.eql(newName);

          callback(null, parseDog);
        });
      }
    ], function(err, results) {
      done();
    });
  });

  it('can add array', function(done) {
    object.className = 'Dogs';
    var fieldName = 'foods';
    var foods = ['dry', 'wet', 'raw'];

    async.series([
      // update the object
      function(callback) {
        object.addArray(testParseDog.objectId, fieldName, foods, function(err, res, parseDog, success) {
          success.should.be.true;
          should.not.exist(err);
          should.exist(parseDog.updatedAt);

          callback(err, parseDog);
        })
      },
      // get the object and test that it has really changed
      function(callback) {
        object.get(testParseDog.objectId, function(err, res, parseDog, success) {
          success.should.be.true;
          should.not.exist(err);
          parseDog.objectId.should.eql(testParseDog.objectId);
          parseDog.should.not.eql(testParseDog);

          parseDog.foods.should.have.length(3);
          parseDog.foods[0].should.eql(foods[0]);
          parseDog.foods[1].should.eql(foods[1]);
          parseDog.foods[2].should.eql(foods[2]);
          callback(null, parseDog);
        });
      }
    ], function(err, results) {
      done(err);
    });
    
  });

  it('can add unique object into array', function(done) {
    var fieldName = 'foods';
    var foods = ['raw', 'left-over'];
    async.series([
      // update the object
      function(callback) {
        object.addUniqueArray(testParseDog.objectId, fieldName, foods, function(err, res, parseDog, success) {
          success.should.be.true;
          should.not.exist(err);
          should.exist(parseDog.updatedAt);

          callback(err, parseDog);
        })
      },
      // get the object and test that it has really changed
      function(callback) {
        object.get(testParseDog.objectId, function(err, res, parseDog, success) {
          success.should.be.true;
          should.not.exist(err);
          parseDog.objectId.should.eql(testParseDog.objectId);
          parseDog.should.not.eql(testParseDog);

          parseDog.foods.should.have.length(4);
          parseDog.foods.should.containEql(foods[1]);
          callback(null, parseDog);
        });
      }
    ], function(err, results) {
      done(err);
    });
  });

  it('can remove objects from array', function(done) {
    var fieldName = 'foods';
    var foods = ['raw', 'dry'];
    async.series([
      // update the object
      function(callback) {
        object.removeArray(testParseDog.objectId, fieldName, foods, function(err, res, parseDog, success) {
          success.should.be.true;
          should.not.exist(err);
          should.exist(parseDog.updatedAt);

          callback(err, parseDog);
        })
      },
      // get the object and test that it has really changed
      function(callback) {
        object.get(testParseDog.objectId, function(err, res, parseDog, success) {
          success.should.be.true;
          should.not.exist(err);
          parseDog.objectId.should.eql(testParseDog.objectId);
          parseDog.should.not.eql(testParseDog);

          parseDog.foods.should.have.length(2);
          parseDog.foods.should.not.containEql(foods[0]);
          parseDog.foods.should.not.containEql(foods[1]);
          callback(null, parseDog);
        });
      }
    ], function(err, results) {
      done(err);
    });
  });

  it('can add relation object', function(done) {
    var fieldName = 'owner';
    var owner = {
        className: 'Owners',
        objectId: testParseOwner.objectId
    }
    async.series([
      // update the object
      function(callback) {
        object.addRelation(testParseDog.objectId, fieldName, owner, function(err, res, parseDog, success) {
          success.should.be.true;
          should.not.exist(err);
          should.exist(parseDog.updatedAt);

          callback(err, parseDog);
        })
      },
      // get the object and test that it has really changed
      function(callback) {
        object.get(testParseDog.objectId, function(err, res, parseDog, success) {
          success.should.be.true;
          should.not.exist(err);
          parseDog.objectId.should.eql(testParseDog.objectId);
          parseDog.should.not.eql(testParseDog);

          callback(null, parseDog);
        });
      }
    ], function(err, results) {
      done(err);
    });
  });

  it('can delete', function(done) {
    async.series([
      // delete the object
      function(callback) {
        object.delete(testParseDog.objectId, function(err, res, parseDog, success) {
          success.should.be.true;
          should.not.exist(err);
          res.statusCode.should.eql(200);

          callback(null);
        });
      },
      function(callback) {
        object.className = 'Owners';
        object.delete(testParseOwner.objectId, function(err, res, parseOwner, success) {
          success.should.be.true;
          should.not.exist(err);
          res.statusCode.should.eql(200);

          callback(null);
        });
      },
      // query again to make sure that it was deleted
      function(callback) {
        object.className = 'Dogs';
        object.get(testParseDog.objectId, function(err, res, parseDog, success) {
          success.should.be.false;
          should.not.exist(err);
          res.statusCode.should.eql(404);
          should.exist(parseDog.error);
          callback(null);
        });
      }
    ], function(err, results) {
      done();
    });
  });
});


// describe('objects', function() {
//   var dogs = [
//     {name: 'Prince', breed: 'Pomeranian'},
//     {name: 'Princess', breed: 'Maltese'},
//     {name: 'Keiko', breed: 'Chow Chow'},
//     {name: 'Buddy', breed: 'Maltese'}
//   ];
//   var objects = []; // objects for queries
//   var objectIds = null;

//   // create objects for testing
//   before(function(done) {
//     async.series([
//       // just to be sure, delete all data in the table
//       function(callback) {
//         // query all
//         parse.getObjects(className, function(err, res, body, success) {
//           success.should.be.true;
//           var fetchedIds = _(body).pluck('objectId').sort();
//           // delete all
//           async.forEach(fetchedIds, function(item, callback) {
//             parse.deleteObject(className, item, function(err, res, body, success) {
//               success.should.be.true;
//               callback(err);
//             });
//           }, function(err, results) {
//             callback(err);
//           });
//         });
//       },

//       function(callback) {
//         async.forEach(dogs,
//           function(item, callback) {
//             parse.createObject(className, item, function(err, res, body, success) {
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

//   // delete objects after testing
//   after(function(done) {
//     async.forEach(objects,
//       function(item, callback) {
//         parse.deleteObject(className, item.objectId, function(err, res, body, success) {
//           success.should.be.true;
//           callback(err);
//         });
//       },
//       function(err) {
//         done();
//       }
//     );
//   });

//   it('supports basic queries', function(done) {
//     // check data first
//     objects.should.have.length(dogs.length);
//     objectIds = _(objects).pluck('objectId').sort();

//     // query all
//     parse.getObjects(className, function(err, res, body, success) {
//       success.should.be.true;
//       body.should.have.length(dogs.length);

//       var fetchedIds = _(body).pluck('objectId').sort();
//       objectIds.should.eql(fetchedIds);

//       body = _(body).sortBy('objectId');
//       // copy updatedAt for easy comparision later
//       _(objects).each(function(item, index) { item.updatedAt = body[index].updatedAt; });
//       objects.should.eql(body);

//       //console.log(fetchedIds, objectIds);
//       done();
//     });
//   });

//   it('supports query constraints', function(done) {
//     var params = { where: {breed: "Maltese"} };
//     parse.getObjects(className, params, function(err, res, body, success) {
//       success.should.be.true;
//       body.length.should.eql(2);
//       var names = _(body).pluck('name').sort();
//       names.should.eql(['Buddy', 'Princess']);

//       done(err);
//     });
//   });

//   it('supports multiple query constraints', function(done) {
//     async.series([
//       // order
//       function(callback) {
//         var expected = _(objects).pluck('name').sort();
//         var params = { order: 'name' };
//         parse.getObjects(className, params, function(err, res, body, success) {
//           success.should.be.true;
//           body.length.should.eql(expected.length);
//           var names = _(body).pluck('name');
//           names.should.eql(expected);

//           callback();
//         });
//       },

//       // where and order
//       function(callback) {
//         var expected = ['Princess', 'Buddy'];
//         var params = { where: {breed: "Maltese"}, order: '-name' };
//         parse.getObjects(className, params, function(err, res, body, success) {
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

//   it('returns correct results on 404', function(done) {
//     var params = { where: { name: 'Dragon' } };
//     parse.getObjects(className, params, function(err, res, body, success) {
//       success.should.be.true;
//       body.length.should.eql(0);

//       done();
//     });
//   });

//   it('can count', function(done) {
//     async.parallel([
//       function(done) {
//         var params = { count: true };
//         parse.getObjects(className, params, function(err, res, body, success) {
//           success.should.be.true;
//           body.results.length.should.eql(dogs.length);
//           body.count.should.eql(dogs.length);
//           done();
//         });
//       },
//       function(done) {
//         var params = {
//           where: { breed: 'Maltese' },
//           count: true
//         };
//         parse.getObjects(className, params, function(err, res, body, success) {
//           success.should.be.true;
//           body.results.length.should.eql(2);
//           body.count.should.eql(2);
//           done();
//         });
//       }
//     ], function(err, results) {
//       should.not.exist(err);
//       done();
//     });

//   });

//   it('can count using countObjects', function(done) {
//     async.parallel([
//       function(done) {
//         parse.countObjects(className, function(err, res, body, success) {
//           success.should.be.true;
//           body.count.should.eql(dogs.length);
//           done();
//         });
//       },
//       function(done) {
//         var params = {
//           where: { breed: 'Maltese' }
//         };
//         parse.countObjects(className, params, function(err, res, body, success) {
//           success.should.be.true;
//           body.count.should.eql(2);
//           done();
//         });
//       }
//     ], function(err, results) {
//       should.not.exist(err);
//       done();
//     });
//   });

//   it('can create in batch', function(done) {
//     async.parallel([
//       function(done) {
//         parse.createObjects(className, dogs, function(err, res, body, success) {
//           success.should.be.true;
//           should.not.exist(err);

//           done(err);
//         });
//       }
//     ], function(err) {
//       done(err);
//     });
//   });

//   it('can update in batch', function(done) {

//     var updates = [],
//         // dictionary for testing
//         map = {},
//         newBreed = "",
//         objectId = "";

//     async.series([

//       // prepare updates array
//       function(callback) {

//         for (var i = 0; i < objectIds.length; i++) {

//           newBreed += i;
//           objectId = objectIds[i];

//           updates.push({
//             objectId: objectId,
//             data: {
//               breed: newBreed
//             }
//           });

//           map[objectId] = newBreed;

//         }

//         callback(null);

//       },
//       // update the objects
//       function(callback) {
//         parse.updateObjects(className, updates, function(err, res, body, success) {
//           success.should.be.true;
//           should.not.exist(err);
//           callback(null, body);
//         });
//       },

//       // retrieve objects and make sure that updates are reflected
//       function(callback) {

//         parse.getObjects(className,{
//           where: {
//             objectId: {$in: objectIds}
//           }
//         }, function(err, res, body, success) {

//           success.should.be.true;
//           should.not.exist(err);

//           var dog = null,
//               newBreed = "";

//           for (var i = 0; i < body.length; i++) {
//             dog = body[i];
//             newBreed = map[dog.objectId];
//             dog.breed.should.eql(newBreed);
//             should.exist(dog.updatedAt);
//           }

//           callback(null, body);
//         });
//       }
//     ], function(err, results) {
//       done();
//     });

//   });

// });


