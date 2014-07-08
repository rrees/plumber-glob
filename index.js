var operation = require('plumber').operation;
var Supervisor = require('plumber').Supervisor;
var Rx = require('plumber').Rx;

var Minimatch = require('minimatch').Minimatch;
var flatten = require('flatten');
var path = require('path');


function identity(x){ return x; }

// FIXME: native helper?
// compose(f, g)(x) == f(g(x))
function compose(f, g) {
    return function() {
        return f(g.apply(null, arguments));
    };
}

function uniqueByPath() {
    var memo = {};
    return function(resource) {
        var resPath = resource.path().absolute();
        var seen = memo[resPath];
        memo[resPath] = true;
        return ! seen;
    };
}

function asMinimatch(pattern) {
    return new Minimatch(pattern);
}

function excludeMatching(excludedPatterns) {
    var exclusionMatchers = excludedPatterns.map(asMinimatch);
    return function(resource) {
        var resPath = resource.path().absolute();
        return ! exclusionMatchers.some(function(mm) {
            return mm.match(resPath);
        });
    };
}

function globOperation(mapper, excludedPatterns) {
    // The glob function is an alias for glob.pattern
    function glob(/* patterns... */) {
        return glob.pattern.apply(null, arguments);
    };

    glob.pattern = function(/* patterns... */) {
        var patterns = flatten([].slice.call(arguments));
        var patternList = Rx.Observable.fromArray(patterns).map(mapper);
        // FIXME: do we really need the supervisor then?
        var supervisor = new Supervisor();
        return operation.concatExecutions(function() {
            var glob = supervisor.glob.bind(supervisor);
            var globbedResources = patternList.
                map(glob).
                mergeAll().
                filter(uniqueByPath()).
                filter(excludeMatching(excludedPatterns));
            return Rx.Observable.return(globbedResources);
        });
    };

    glob.exclude = function(/* patterns... */) {
        var excludeList = flatten([].slice.call(arguments)).map(mapper);
        return globOperation(mapper, excludedPatterns.concat(excludeList));
    };

    // recursively compose mappers
    glob.within = function(directory) {
        return globOperation(compose(mapper, function(file) {
            return path.join(directory, file);
        }), excludedPatterns);
    };

    return glob;
};

module.exports = globOperation(identity, []);
