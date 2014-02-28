var operation = require('plumber').operation;
var Supervisor = require('plumber').Supervisor;

var highland = require('highland');
var path = require('path');
var flatten = require('flatten');


function identity(x){ return x; }

// FIXME: native helper?
// compose(f, g)(x) == f(g(x))
function compose(f, g) {
    return function() {
        return f(g.apply(null, arguments));
    };
}

function globOperation(mapper) {
    function glob(/* files... */) {
        var fileList = flatten([].slice.call(arguments)).map(mapper);
        // FIXME: do we really need the supervisor then?
        var supervisor = new Supervisor();
        return operation(function(resources) {
            var glob = supervisor.glob.bind(supervisor);
            var globbedResources = highland(fileList).flatMap(glob);
            return resources.concat(globbedResources);
        });
    };

    // recursively compose mappers
    glob.within = function(directory) {
        return globOperation(compose(mapper, function(file) {
            return path.join(directory, file);
        }));
    };

    return glob;
};

module.exports = globOperation(identity);
