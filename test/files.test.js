var config = require('./config');
var should = require('should');
var async = require('async');
var restParse = require('../lib/rest-parse');
var request = require('request');
var _ = require('underscore');

var parse = new restParse(config.PARSE_APP_ID, config.PARSE_REST_API_KEY);
var file = parse.file();

describe('file', function() {
  var imageFilePath = __dirname + '/fixtures/apple.jpg';

  it('can upload a file', function(done) {
    var fileName = 'orange.jpg';
    file.upload(imageFilePath, fileName, function(err, res, body, success) {
      success.should.be.true;
      should.exist(body.url);
      should.exist(body.name);
      body.url.should.containEql(fileName);
      body.name.should.containEql(fileName);

      request.get(body.url, function(err, res, body) {
        res.statusCode.should.eql(200);
        res.headers['content-type'].should.eql('image/jpeg');
        done();
      });
    });
  });

  it('can upload a file without specifying the filename', function(done) {
    file.upload(imageFilePath, function(err, res, body, success) {
      var fileName = 'apple.jpg'; // expected

      success.should.be.true;
      should.exist(body.url);
      should.exist(body.name);
      body.url.should.containEql(fileName);
      body.name.should.containEql(fileName);

      request.get(body.url, function(err, res, body) {
        res.statusCode.should.eql(200);
        res.headers['content-type'].should.eql('image/jpeg');
        done();
      });
    });
  });

  it('can upload a file buffer', function(done) {
    var buffer = require('fs').readFileSync(imageFilePath),
        fileName = 'orange.jpg',
        contentType = 'image/jpeg';
    file.uploadBuffer(buffer, contentType, fileName, function(err, res, body, success) {
      success.should.be.true;
      should.exist(body.url);
      should.exist(body.name);
      body.url.should.containEql(fileName);
      body.name.should.containEql(fileName);

      request.get(body.url, function(err, res, body) {
        res.statusCode.should.eql(200);
        res.headers['content-type'].should.eql(contentType);
        done();
      });
    });
  });

  it('can upload simple text as a file', function(done) {
    var data = 'my text file contents',
        contentType = 'text/plain',
        fileName = 'text.txt';
    file.uploadBuffer(data, contentType, fileName, function(err, res, body, success) {
      success.should.be.true;
      should.exist(body.url);
      should.exist(body.name);
      body.url.should.containEql(fileName);
      body.name.should.containEql(fileName);

      request.get(body.url, function(err, res, body) {
        body.should.eql(data);
        res.statusCode.should.eql(200);
        res.headers['content-type'].should.eql(contentType);
        done();
      });
    });
  });

  it('can delete a file (using API masterkey)', function(done) {
    async.waterfall([
      function(callback) {
        file.upload(imageFilePath, function(err, res, body, success) {
          request.get(body.url, function(err, res, data) {
            res.statusCode.should.eql(200);
            res.headers['content-type'].should.eql('image/jpeg');
            callback(err, body.url, body.name);
          });
        });
      },
      function(url, fileName, callback) {
        parse.masterKey = config.PARSE_MASTER_KEY;
        file.delete(fileName, function(err, res, body, success) {
          res.statusCode.should.eql(200);
          request.get(url, function(err, res, data) {
            res.statusCode.should.eql(403);
            callback(err);
          });
        });
      }
    ], function(err, result) {
      done(err);
    });
  });

  it('can associate a file to a new object', function(done) {
    var className = 'Dogs';
    var object = new parse.object(className);
    file.upload(imageFilePath, function(err, res, uploadBody, success) {
      success.should.be.true;

      var dog = {
        name: 'Paaka',
        breed: 'Rottweiler',
        photo: {
          name: uploadBody.name,
          __type: 'File'
        }
      };
      object.create(dog, function(err, res, body, success) {
        success.should.be.true;
        object.get(body.objectId, function(err, res, body, success) {
          success.should.be.true;
          should.exist(body.photo);
          body.photo.name.should.eql(uploadBody.name);
          body.photo.url.should.eql(uploadBody.url);
          done(err);
        });
      });
    });
  });

  it('can associate a file to an existing object', function(done) {
    var className = 'Dogs';
    var dog = {
      name: 'Waku Waku',
      breed: 'Pomeranian/Maltese'
    };
    var object = new parse.object(className);
    async.waterfall([
      function(callback) {
        object.create(dog, function(err, res, body, success) {
          success.should.be.true;
          object.get(body.objectId, function(err, res, body, success) {
            success.should.be.true;
            should.not.exist(body.photo);
            callback(err, body.objectId);
          });
        });
      },
      function(objectId, callback) {
        file.upload(imageFilePath, function(err, res, uploadBody, success) {
          success.should.be.true;
          // attach
          var data = {
            photo: {
              name: uploadBody.name,
              __type: 'File'
            }
          };
          object.update(objectId, data, function(err, res, body, success) {
            success.should.be.true;
            callback(err, objectId, uploadBody);
          });
        });
      },
      function(objectId, uploadBody, callback) {
        // get and verify
        object.get(objectId, function(err, res, body, success) {
          success.should.be.true;
          body.photo.name.should.eql(uploadBody.name);
          body.photo.url.should.eql(uploadBody.url);
          callback(err);
        });
      }
    ], function(err, results) {
      done();
    });

  });
});
