var chai = require('chai');
var should = chai.should();

var runAndCompleteWith = require('plumber-util-test').runAndCompleteWith;

var Resource = require('plumber').Resource;
var Supervisor = require('plumber/lib/util/supervisor');

var glob = require('..');


describe('glob', function() {
  var supervisor;

  beforeEach(function() {
    supervisor = new Supervisor();
  });

  function resourcesError() {
    chai.assert(false, "error in resources observable");
  }

  describe('#pattern', function() {

    it('should be a function', function() {
      glob.pattern.should.be.a('function');
    });

    it('should return a function', function() {
      glob.pattern('files/*.js').should.be.a('function');
    });

    it('should return all matched resources', function(done) {
      runAndCompleteWith(glob.pattern('test/files/file-*.js'), [], function(resources) {
        resources.length.should.equal(2);
        resources[0].filename().should.equal('file-1.js');
        resources[0].data().should.equal('var x = 42;\n');
        resources[0].type().should.equal('javascript');
        should.not.exist(resources[0].sourceMap());
        resources[1].filename().should.equal('file-2.js');
        resources[1].data().should.equal('function nothing() {\n}\n');
        resources[1].type().should.equal('javascript');
        should.not.exist(resources[1].sourceMap());
      }, resourcesError, done);
    });

    it('should return all matched resources with their source map', function(done) {
      runAndCompleteWith(glob.pattern('test/files/concatenated.js'), [], function(resources) {
        resources.length.should.equal(1);
        resources[0].filename().should.equal('concatenated.js');
        resources[0].data().should.equal('/* source */\nvar answer = 42;\nvar added = addOne(answer);\nfunction addOne(number) {\n  return number + 1;\n}\n');
        resources[0].type().should.equal('javascript');
        resources[0].sourceMap().should.be.an('object');
        resources[0].sourceMap().toString().should.deep.equal('{"version":3,"file":"concatenated.js","mappings":"AAAA;AACA;ACDA;AACA;AACA;AACA;AACA","sources":["../1.js","../2.js"],"sourcesContent":["/* source */\\nvar answer = 42;","var added = addOne(answer);\\nfunction addOne(number) {\\n  return number + 1;\\n}\\n"],"names":[]}');
      }, resourcesError, done);
    });

    it('should pass through any input resources and append the globbed resources', function(done) {
      var inputRes = new Resource();
      runAndCompleteWith(glob.pattern('test/files/file-*.js'), [inputRes], function(resources) {
        resources.length.should.equal(3);
        resources[0].should.equal(inputRes);
      }, resourcesError, done);
    });

    it('should return resources matching all arguments', function(done) {
      runAndCompleteWith(glob.pattern('test/files/file-1.js', 'test/files/file-2.js'),
                         [],
                         function(resources) {
        resources.length.should.equal(2);
      }, resourcesError, done);
    });

    it('should return resources matching array arguments', function(done) {
      runAndCompleteWith(glob.pattern(['test/files/file-1.js', 'test/files/file-2.js']),
                         [],
                         function(resources) {
        resources.length.should.equal(2);
      }, resourcesError, done);
    });

    it('should return each matched resource only once', function(done) {
      runAndCompleteWith(glob.pattern(['test/files/file-1.js', 'test/files/file-1.js']),
                         [],
                         function(resources) {
        resources.length.should.equal(1);
      }, resourcesError, done);
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
      runAndCompleteWith(glob('test/files/file-*.js'), [], function(resources) {
        resources.length.should.equal(2);
        resources[0].filename().should.equal('file-1.js');
        resources[0].data().should.equal('var x = 42;\n');
        resources[0].type().should.equal('javascript');
        should.not.exist(resources[0].sourceMap());
        resources[1].filename().should.equal('file-2.js');
        resources[1].data().should.equal('function nothing() {\n}\n');
        resources[1].type().should.equal('javascript');
        should.not.exist(resources[1].sourceMap());
      }, resourcesError, done);
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
      runAndCompleteWith(globWithin('file-*.js'), [], function(resources) {
        resources.length.should.equal(2);
      }, resourcesError, done);
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
      runAndCompleteWith(excludeGlob('test/files/*.js'), [], function(resources) {
        resources.length.should.equal(1);
        resources[0].filename().should.equal('concatenated.js');
      }, resourcesError, done);
    });

    it('should return a glob that excludes paths based on given pattern arguments', function(done) {
      var excludeGlob = glob.exclude('test/files/file-1.js', 'test/files/file-2.js');
      runAndCompleteWith(excludeGlob('test/files/*.js'), [], function(resources) {
        resources.length.should.equal(1);
        resources[0].filename().should.equal('concatenated.js');
      }, resourcesError, done);
    });

    it('should return a glob that excludes paths based on given pattern array', function(done) {
      var excludeGlob = glob.exclude(['test/files/file-1.js', 'test/files/file-2.js']);
      runAndCompleteWith(excludeGlob('test/files/*.js'), [], function(resources) {
        resources.length.should.equal(1);
        resources[0].filename().should.equal('concatenated.js');
      }, resourcesError, done);
    });

    it('should return a glob that excludes paths based on sequenced exclusion pattern', function(done) {
      var excludeGlob = glob.
          exclude('test/files/file-1.js').
          exclude('test/files/file-2.js');
      runAndCompleteWith(excludeGlob('test/files/*.js'), [], function(resources) {
        resources.length.should.equal(1);
        resources[0].filename().should.equal('concatenated.js');
      }, resourcesError, done);
    });

    it('should return a glob that excludes paths from the current within context', function(done) {
      var excludeGlob = glob.
          within('test').
          exclude('files/file-1.js').
          within('files').
          exclude('file-2.js');

      runAndCompleteWith(excludeGlob('*.js'), [], function(resources) {
        resources.length.should.equal(1);
        resources[0].filename().should.equal('concatenated.js');
      }, resourcesError, done);
    });
  });

});
