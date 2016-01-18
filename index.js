var operation = require('plumber').operation;
var Supervisor = require('plumber').Supervisor;
var Rx = require('plumber').Rx;

var Minimatch = require('minimatch').Minimatch;
var flatten = require('flatten');
var path = require('path');
var fsWatch = require('chokidar');


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

function asAbsolutePath(relativePath) {
    return path.resolve(relativePath);
}


// Returns an Observable of events for the gazed patterns
function gazeObservable(patterns) {
    var gazer = fsWatch.watch(patterns);
    var gazeObs = Rx.Observable.create(function(observer) {
        gazer.on('all', function(event, path) {
            observer.onNext(path);
            console.log(path);
        });

        gazer.on('end', function() {
            console.log('Watch ended');
            observer.onCompleted();
        });

        // Don't pass any arguments to close() as it has undocumented
        // broken behaviours if you do
        return function(){ gazer.close(); };
    });

    /* Gazing multiple patterns is actually completely broken in Gaze
     * 0.6 as all gazes fire if any of the watched patterns match:
     *
     *   https://github.com/shama/gaze/issues/104
     *
     * The workaround is to check whether the event is for a file that
     * matches our pattern here.  Tedious, but necessary.
     */
    var patternMatchers = patterns.map(asAbsolutePath).map(asMinimatch);
    return gazeObs.filter(function(file) {
        return patternMatchers.some(function(mm) {
            return mm.match(file);
        });
    });
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
        var patterns = flatten([].slice.call(arguments)).map(mapper);
        // FIXME: do we really need the supervisor then?
        var supervisor = new Supervisor();
        // TODO: glob here, though how to make Resource from data?
        var glob = supervisor.glob.bind(supervisor);

        function globResources() {
            return Rx.Observable.fromArray(patterns).
                map(glob).
                mergeAll().
                filter(uniqueByPath()).
                filter(excludeMatching(excludedPatterns));
        }

        // TODO: or new upstream operation? merge instead of concat?
        return operation.concatExecutions(function() {
            // TODO: gaze in supervisor
            var changes = gazeObservable(patterns);
            var gazedResources = changes.map(globResources);

            return Rx.Observable.return(globResources()).concat(gazedResources);
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
