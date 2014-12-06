var config = require('./config');
var should = require('should');
var restParse = require('../lib/rest-parse');

var parse = new restParse(config.PARSE_APP_ID, config.PARSE_REST_API_KEY);
var analytic = parse.analytic();

describe('analytics', function() {
  it('can update app opened', function(done) {
    analytic.sendAnalyticsEvent('AppOpened', function(err, res, body, success) {
      success.should.be.true;
      should.not.exist(err);
      should.exist(res);
      should.exist(body);
      done();
    });
  });

  it('can track custom analytic named search', function(done) {
    analytic.sendAnalyticsEvent('Search', {
      'priceRange': '1000-1500',
      'source': 'craigslist',
      'dayType': 'weekday'
    }, function(err, res, body, success) {
      success.should.be.true;
      should.not.exist(err);
      should.exist(res);
      should.exist(body);
      done();
    });
  });

  it('can track custom analytic named search empty params', function(done) {
    analytic.sendAnalyticsEvent('Search', {}, function(err, res, body, success) {
      success.should.be.true;
      should.not.exist(err);
      should.exist(res);
      should.exist(body);
      done();
    });
  });

  it('can update error', function(done) {
    analytic.sendAnalyticsEvent('Error', {'code' : '404'}, function(err, res, body, success) {
      success.should.be.true;
      should.not.exist(err);
      should.exist(res);
      should.exist(body);
      done();
    });
  });
});
