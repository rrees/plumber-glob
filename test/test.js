var chai = require('chai');
var should = chai.should();

var runOperation = require('plumber-util-test').runOperation;

var Resource = require('plumber').Resource;
var Supervisor = require('plumber/lib/util/supervisor');

var glob = require('..');


describe('glob', function() {
  var supervisor;

  beforeEach(function() {
    supervisor = new Supervisor();
  });


  describe('#pattern', function() {

    it('should be a function', function() {
      glob.pattern.should.be.a('function');
    });

    it('should return a function', function() {
      glob.pattern('files/*.js').should.be.a('function');
    });

    it('should return all matched resources', function(done) {
      var globbedResources = runOperation(glob.pattern('test/files/file-*.js'), []).resources;
      return globbedResources.toArray(function(resources) {
        resources.length.should.equal(2);
        resources[0].filename().should.equal('file-1.js');
        resources[0].data().should.equal('var x = 42;\n');
        resources[0].type().should.equal('javascript');
        should.not.exist(resources[0].sourceMap());
        resources[1].filename().should.equal('file-2.js');
        resources[1].data().should.equal('function nothing() {\n}\n');
        resources[1].type().should.equal('javascript');
        should.not.exist(resources[1].sourceMap());
        done();
      });
    });

    it('should return all matched resources with their source map', function(done) {
      var globbedResources = runOperation(glob.pattern('test/files/concatenated.js'), []).resources;
      return globbedResources.toArray(function(resources) {
        resources.length.should.equal(1);
        resources[0].filename().should.equal('concatenated.js');
        resources[0].data().should.equal('/* source */\nvar answer = 42;\nvar added = addOne(answer);\nfunction addOne(number) {\n  return number + 1;\n}\n');
        resources[0].type().should.equal('javascript');
        resources[0].sourceMap().should.be.an('object');
        resources[0].sourceMap().toString().should.deep.equal('{"version":3,"file":"concatenated.js","mappings":"AAAA;AACA;ACDA;AACA;AACA;AACA;AACA","sources":["../1.js","../2.js"],"sourcesContent":["/* source */\\nvar answer = 42;","var added = addOne(answer);\\nfunction addOne(number) {\\n  return number + 1;\\n}\\n"],"names":[]}');
        done();
      });
    });

    it('should pass through any input resources and append the globbed resources', function(done) {
      var inputRes = new Resource();
      var globbedResources = runOperation(glob.pattern('test/files/file-*.js'), [inputRes]).resources;
      return globbedResources.toArray(function(resources) {
        resources.length.should.equal(3);
        resources[0].should.equal(inputRes);
        done();
      });
    });

    it('should return resources matching all arguments', function(done) {
      var globbedResources = runOperation(glob.pattern(
          'test/files/file-1.js',
          'test/files/file-2.js'
      ), []).resources;
      return globbedResources.toArray(function(resources) {
        resources.length.should.equal(2);
        done();
      });
    });

    it('should return resources matching array arguments', function(done) {
      var globbedResources = runOperation(glob.pattern([
          'test/files/file-1.js',
          'test/files/file-2.js'
      ]), []).resources;
      return globbedResources.toArray(function(resources) {
        resources.length.should.equal(2);
        done();
      });
    });

    it('should return each matched resource only once', function(done) {
      var globbedResources = runOperation(glob.pattern(
          'test/files/file-1.js',
          'test/files/file-1.js'
      ), []).resources;
      return globbedResources.toArray(function(resources) {
        resources.length.should.equal(1);
        done();
      });
    });

  });


  describe('#apply', function() {

    it('should be a function', function() {
      glob.should.be.a('function');
    });

    it('should return a function', function() {
      glob('files/*.js').should.be.a('function');
    });

    it('should return all matched resources like #pattern', function(done) {
      var globbedResources = runOperation(glob('test/files/file-*.js'), []).resources;
      return globbedResources.toArray(function(resources) {
        resources.length.should.equal(2);
        resources[0].filename().should.equal('file-1.js');
        resources[0].data().should.equal('var x = 42;\n');
        resources[0].type().should.equal('javascript');
        should.not.exist(resources[0].sourceMap());
        resources[1].filename().should.equal('file-2.js');
        resources[1].data().should.equal('function nothing() {\n}\n');
        resources[1].type().should.equal('javascript');
        should.not.exist(resources[1].sourceMap());
        done();
      });
    });
  });


  describe('#exclude', function() {
    it('should be a function', function() {
      glob.exclude.should.be.a('function');
    });

    it('should return a function', function() {
      glob.exclude('test/files/file-*.js').should.be.a('function');
    });

    it('should return a glob that excludes paths based on given pattern', function(done) {
      var excludeGlob = glob.exclude('test/files/file-*.js');
      var globbedResources = runOperation(excludeGlob('test/files/*.js'), []).resources;
      return globbedResources.toArray(function(resources) {
        resources.length.should.equal(1);
        resources[0].filename().should.equal('concatenated.js');
        done();
      });
    });

    it('should return a glob that excludes paths based on given pattern arguments', function(done) {
      var excludeGlob = glob.exclude('test/files/file-1.js', 'test/files/file-2.js');
      var globbedResources = runOperation(excludeGlob('test/files/*.js'), []).resources;
      return globbedResources.toArray(function(resources) {
        resources.length.should.equal(1);
        resources[0].filename().should.equal('concatenated.js');
        done();
      });
    });

    it('should return a glob that excludes paths based on given pattern array', function(done) {
      var excludeGlob = glob.exclude(['test/files/file-1.js', 'test/files/file-2.js']);
      var globbedResources = runOperation(excludeGlob('test/files/*.js'), []).resources;
      return globbedResources.toArray(function(resources) {
        resources.length.should.equal(1);
        resources[0].filename().should.equal('concatenated.js');
        done();
      });
    });

    it('should return a glob that excludes paths based on sequenced exclusion pattern', function(done) {
      var excludeGlob = glob.
          exclude('test/files/file-1.js').
          exclude('test/files/file-2.js');
      var globbedResources = runOperation(excludeGlob('test/files/*.js'), []).resources;
      return globbedResources.toArray(function(resources) {
        resources.length.should.equal(1);
        resources[0].filename().should.equal('concatenated.js');
        done();
      });
    });
  });


  describe('#within', function() {
    it('should be a function', function() {
      glob.within.should.be.a('function');
    });

    it('should return a glob function', function() {
      glob.within('test').should.be.a('function');
    });

    it('should return a glob function with a within function', function() {
      glob.within('test').within.should.be.a('function');
    });

    it('should match resources within the directories', function(done) {
      var globWithin = glob.within('test').within('files');
      var globbedResources = runOperation(globWithin('file-*.js'), []).resources;
      return globbedResources.toArray(function(resources) {
        resources.length.should.equal(2);
        done();
      });
    });
  });
});
