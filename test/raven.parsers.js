var assert = require('assert');
var raven = require('../');
var client = new raven.Client();

raven.parsers = require('../lib/parsers');

describe('raven.parsers', function(){
  describe('#parseText()', function(){
    it('should parse some text without kwargs', function(){
      var parsed = raven.parsers.parseText('Howdy');
      parsed['message'].should.equal('Howdy');
    });

    it('should parse some text with kwargs', function(){
      var parsed = raven.parsers.parseText('Howdy', {'foo': 'bar'});
      parsed['message'].should.equal('Howdy');
      parsed['foo'].should.equal('bar');
    });
  });

  describe('#parseQuery()', function(){
    it('should parse a query', function(){
      var query = 'SELECT * FROM `something`';
      var engine = 'mysql';
      var parsed = raven.parsers.parseQuery(query, engine);
      parsed['message'].should.equal('SELECT * FROM `something`');
      parsed.should.have.property('query');
      parsed['query'].query.should.equal('SELECT * FROM `something`');
      parsed['query'].engine.should.equal('mysql');
    });
  });

  describe('#parseRequest()', function(){
    it('should parse a request object', function(){
      var mockReq = {
        method: 'GET',
        url: '/some/path?key=value',
        headers: {
          host: 'mattrobenolt.com'
        },
        body: '',
        cookies: {},
        socket: {
          encrypted: true
        },
        connection: {
          remoteAddress: '69.69.69.69'
        }
      };
      var parsed = raven.parsers.parseRequest(mockReq);
      parsed.should.have.property('request');
      parsed['request'].url.should.equal('https://mattrobenolt.com/some/path?key=value');
      parsed['request'].env.NODE_ENV.should.equal(process.env.NODE_ENV);
      parsed['request'].env.REMOTE_ADDR.should.equal('69.69.69.69');
    });

    describe('`headers` detection', function() {
      it('should detect headers via `req.headers`', function(){
        var mockReq = {
          method: 'GET',
          host: 'mattrobenolt.com',
          url: '/some/path?key=value',
          headers: {
            foo: 'bar'
          }
        };

        var parsed = raven.parsers.parseRequest(mockReq);

        parsed['request'].headers.should.eql({ foo: 'bar' });
      });

      it('should detect headers via `req.header`', function(){
        var mockReq = {
          method: 'GET',
          host: 'mattrobenolt.com',
          url: '/some/path?key=value',
          header: {
            foo: 'bar'
          }
        };

        var parsed = raven.parsers.parseRequest(mockReq);

        parsed['request'].headers.should.eql({ foo: 'bar' });
      });
    });

    describe('`method` detection', function() {
      it('should detect method via `req.method`', function(){
        var mockReq = {
          method: 'GET',
          host: 'mattrobenolt.com',
          url: '/some/path?key=value'
        };

        var parsed = raven.parsers.parseRequest(mockReq);

        parsed['request'].method.should.equal('GET');
      });
    });

    describe('`host` detection', function() {
      it('should detect host via `req.host`', function(){
        var mockReq = {
          method: 'GET',
          host: 'mattrobenolt.com',
          url: '/some/path?key=value'
        };

        var parsed = raven.parsers.parseRequest(mockReq);

        parsed['request'].url.should.equal('http://mattrobenolt.com/some/path?key=value');
      });

      it('should detect host via `req.header.host`', function(){
        var mockReq = {
          method: 'GET',
          header: {
            host: 'mattrobenolt.com',
          },
          url: '/some/path?key=value'
        };

        var parsed = raven.parsers.parseRequest(mockReq);

        parsed['request'].url.should.equal('http://mattrobenolt.com/some/path?key=value');
      });

      it('should detect host via `req.headers.host`', function(){
        var mockReq = {
          method: 'GET',
          headers: {
            host: 'mattrobenolt.com',
          },
          url: '/some/path?key=value'
        };

        var parsed = raven.parsers.parseRequest(mockReq);

        parsed['request'].url.should.equal('http://mattrobenolt.com/some/path?key=value');
      });

      it('should fallback to <no host> if host is not available', function(){
        var mockReq = {
          method: 'GET',
          url: '/some/path?key=value'
        };

        var parsed = raven.parsers.parseRequest(mockReq);

        parsed['request'].url.should.equal('http://<no host>/some/path?key=value');
      });
    });

    describe('`protocol` detection', function() {
      it('should detect protocol via `req.protocol`', function(){
        var mockReq = {
          method: 'GET',
          url: '/some/path?key=value',
          headers: {
            host: 'mattrobenolt.com',
          },
          protocol: 'https',
          socket: {
            encrypted: false
          }
        };

        var parsed = raven.parsers.parseRequest(mockReq);

        parsed['request'].url.should.equal('https://mattrobenolt.com/some/path?key=value');
      });

      it('should detect protocol via `req.secure`', function(){
        var mockReq = {
          method: 'GET',
          url: '/some/path?key=value',
          headers: {
            host: 'mattrobenolt.com',
          },
          secure: true,
          socket: {
            encrypted: false
          }
        };

        var parsed = raven.parsers.parseRequest(mockReq);

        parsed['request'].url.should.equal('https://mattrobenolt.com/some/path?key=value');
      });

      it('should detect protocol via `req.socket.encrypted`', function(){
        var mockReq = {
          method: 'GET',
          url: '/some/path?key=value',
          headers: {
            host: 'mattrobenolt.com',
          },
          socket: {
            encrypted: true
          }
        };

        var parsed = raven.parsers.parseRequest(mockReq);

        parsed['request'].url.should.equal('https://mattrobenolt.com/some/path?key=value');
      });
    });

    describe('`cookie` detection', function() {
      it('should parse `req.headers.cookie`', function(){
        var mockReq = {
          method: 'GET',
          url: '/some/path?key=value',
          headers: {
            host: 'mattrobenolt.com',
            cookie: 'foo=bar'
          }
        };

        var parsed = raven.parsers.parseRequest(mockReq);
        parsed['request'].cookies.should.eql({ foo: 'bar' });
      });

      it('should parse `req.header.cookie`', function(){
        var mockReq = {
          method: 'GET',
          url: '/some/path?key=value',
          header: {
            host: 'mattrobenolt.com',
            cookie: 'foo=bar'
          }
        };

        var parsed = raven.parsers.parseRequest(mockReq);
        parsed['request'].cookies.should.eql({ foo: 'bar' });
      });

    });

    describe('`query` detection', function() {
      it('should detect query via `req.query`', function(){
        var mockReq = {
          method: 'GET',
          host: 'mattrobenolt.com',
          url: '/some/path?key=value',
          query: { some: 'key' }
        };

        var parsed = raven.parsers.parseRequest(mockReq);

        parsed['request'].query_string.should.eql({ some: 'key' });
      });

      it('should detect query via `req.url`', function(){
        var mockReq = {
          method: 'GET',
          host: 'mattrobenolt.com',
          url: '/some/path?foo=bar',
        };

        var parsed = raven.parsers.parseRequest(mockReq);

        parsed['request'].query_string.should.eql({ foo: 'bar' });
      });
    });

    describe('`ip` detection', function() {
      it('should detect ip via `req.ip`', function(){
        var mockReq = {
          method: 'GET',
          url: '/some/path?key=value',
          headers: {
            host: 'mattrobenolt.com',
          },
          ip: '69.69.69.69'
        };

        var parsed = raven.parsers.parseRequest(mockReq);

        parsed['request'].env.REMOTE_ADDR.should.equal('69.69.69.69');
      });

      it('should detect ip via `req.connection.remoteAddress`', function(){
        var mockReq = {
          method: 'GET',
          url: '/some/path?key=value',
          headers: {
            host: 'mattrobenolt.com',
          },
          connection: {
            remoteAddress: '69.69.69.69'
          }
        };

        var parsed = raven.parsers.parseRequest(mockReq);

        parsed['request'].env.REMOTE_ADDR.should.equal('69.69.69.69');
      });
    });

    describe('`url` detection', function() {
      it('should detect url via `req.originalUrl`', function(){
        var mockReq = {
          method: 'GET',
          protocol: 'https',
          host: 'mattrobenolt.com',
          originalUrl: '/some/path?key=value'
        };

        var parsed = raven.parsers.parseRequest(mockReq);

        parsed['request'].url.should.equal('https://mattrobenolt.com/some/path?key=value');
      });

      it('should detect url via `req.url`', function(){
        var mockReq = {
          method: 'GET',
          protocol: 'https',
          host: 'mattrobenolt.com',
          url: '/some/path?key=value'
        };

        var parsed = raven.parsers.parseRequest(mockReq);

        parsed['request'].url.should.equal('https://mattrobenolt.com/some/path?key=value');
      });
    });

    describe('`body` detection', function() {
      it('should detect body via `req.body`', function(){
        var mockReq = {
          method: 'GET',
          host: 'mattrobenolt.com',
          url: '/some/path?key=value',
          body: 'foo=bar'
        };

        var parsed = raven.parsers.parseRequest(mockReq);

        parsed['request'].data.should.equal('foo=bar');
      });

      it('should fallback to <unavailable> if body is not available', function(){
        var mockReq = {
          method: 'GET',
          host: 'mattrobenolt.com',
          url: '/some/path?key=value',
          body: ''
        };

        var parsed = raven.parsers.parseRequest(mockReq);

        parsed['request'].data.should.equal('<unavailable>');
      });
    });
  });

  describe('#parseError()', function(){
    it('should parse plain Error object', function(done){
      raven.parsers.parseError(new Error(), {}, function(parsed){
        parsed['message'].should.equal('Error: <no message>');
        parsed.should.have.property('exception');
        parsed['exception'][0]['type'].should.equal('Error');
        parsed['exception'][0]['value'].should.equal('');
        parsed['exception'][0]['stacktrace'].should.have.property('frames');
        done();
      });
    });

    it('should parse Error with message', function(done){
      raven.parsers.parseError(new Error('Crap'), {}, function(parsed){
        parsed['message'].should.equal('Error: Crap');
        parsed.should.have.property('exception');
        parsed['exception'][0]['type'].should.equal('Error');
        parsed['exception'][0]['value'].should.equal('Crap');
        parsed['exception'][0]['stacktrace'].should.have.property('frames');
        done();
      });
    });

    it('should parse TypeError with message', function(done){
      raven.parsers.parseError(new TypeError('Crap'), {}, function(parsed){
        parsed['message'].should.equal('TypeError: Crap');
        parsed.should.have.property('exception');
        parsed['exception'][0]['type'].should.equal('TypeError');
        parsed['exception'][0]['value'].should.equal('Crap');
        parsed['exception'][0]['stacktrace'].should.have.property('frames');
        done();
      });
    });

    it('should parse thrown Error', function(done){
      try {
        throw new Error('Derp');
      } catch(e) {
        raven.parsers.parseError(e, {}, function(parsed){
          parsed['message'].should.equal('Error: Derp');
          parsed.should.have.property('exception');
          parsed['exception'][0]['type'].should.equal('Error');
          parsed['exception'][0]['value'].should.equal('Derp');
          parsed['exception'][0]['stacktrace'].should.have.property('frames');
          done();
        });
      }
    });

    it('should allow specifying a custom `culprit`', function(done){
      try {
        throw new Error('Foobar');
      } catch(e) {
        raven.parsers.parseError(e, { culprit:'foobar' }, function(parsed){
          parsed.culprit.should.equal('foobar');
          done();
        });
      }
    });

    it('should have a string stack after parsing', function(done){
      try {
        throw new Error('Derp');
      } catch(e) {
        raven.parsers.parseError(e, {}, function(parsed){
          e.stack.should.be.a.String;
          done();
        });
      }
    });

    it('should parse caught real error', function(done){
      try {
        var o = {};
        o['...']['Derp']();
      } catch(e) {
        raven.parsers.parseError(e, {}, function(parsed){
          parsed['message'].should.containEql('TypeError');
          parsed['message'].should.containEql('Derp');
          parsed.should.have.property('exception');
          parsed['exception'][0]['type'].should.equal('TypeError');
          parsed['exception'][0]['value'].should.containEql('Derp');
          parsed['exception'][0]['stacktrace'].should.have.property('frames');
          done();
        });
      }
    });

    it('should parse an error with additional information', function(done){
      try {
        assert.strictEqual(1, 2);
      } catch(e) {
        raven.parsers.parseError(e, {}, function(parsed){
          parsed.should.have.property('exception');
          parsed['exception'][0]['stacktrace'].should.have.property('frames');
          parsed.should.have.property('extra');
          parsed['extra'].should.have.property('AssertionError');
          parsed['extra']['AssertionError'].should.have.property('actual');
          parsed['extra']['AssertionError']['actual'].should.equal(1);
          parsed['extra']['AssertionError'].should.have.property('expected');
          parsed['extra']['AssertionError']['expected'].should.equal(2);
          parsed['extra']['AssertionError'].should.have.property('operator');
          parsed['extra']['AssertionError']['operator'].should.equal('===');
          done();
        });
      }
    });
  });
});
