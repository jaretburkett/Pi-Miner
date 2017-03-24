var exec = require('child_process').exec;
var terminate = require('terminate');

// get platform info
var os = require('os');
var info = {
    arch: os.arch(), //'arm', 'arm64', 'ia32', 'mips', 'mipsel', 'ppc', 'ppc64', 's390', 's390x', 'x32', 'x64', and 'x86'
    cpus: os.cpus().length, // num of cpus
    platform: os.platform() // darwin, linux, win32
};
console.log('Arch:', os.arch());
console.log('CPUs:', os.cpus().length);
console.log('Platform:', os.platform());

var child;
String.prototype.contains = function(it) { return this.indexOf(it) != -1; };

if(info.platform == 'linux'){
    // linux dependencys
    // apt-get install automake autoconf pkg-config libcurl4-openssl-dev libjansson-dev libssl-dev libgmp-dev make g++
    child = exec('apt-get install -y automake autoconf pkg-config libcurl4-openssl-dev libjansson-dev libssl-dev libgmp-dev make g++');
    console.log('Installing build requirements');
    child.stdout.on('data', function (data) {
        process.stdout.write(data);
    });
    child.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
        die();
    });
    child.on('close', function (code) {
        // console.log('closing code: ' + code);
        start();
    });
} else {
    start();
}


function start(){
    runAutogen(function () {
        if (info.platform == 'darwin') {
            runNoMacro(function () {
                configure();
            });
        } else {
            configure();
        }
    });
}
function runAutogen(callback) {
    child = exec('cd cpuminer-multi && ./autogen.sh');
    console.log('Running ./autogen.sh');
    child.stdout.on('data', function (data) {
        process.stdout.write(data);
        /*
         errors
         ./autogen.sh: line 8: aclocal: command not found  - mac - brew install automake
         */
    });
    child.stderr.on('data', function (data) {
        process.stderr.write('stderr: ' + data);
        // die();
    });
    child.on('close', function (code) {
        // console.log('closing code: ' + code);
        callback();
    });
}

function runNoMacro(callback) {
    child = exec('cd cpuminer-multi && ./nomacro.pl');
    console.log('Running ./nomacro.pl');
    child.stdout.on('data', function (data) {
        process.stdout.write(data);
        /*
         errors
         ./autogen.sh: line 8: aclocal: command not found  - mac - brew install automake
         */
    });
    child.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
        die();
    });
    child.on('close', function (code) {
        // console.log('closing code: ' + code);
        callback();
    });
}

function getFlags() {
    var flags = '-march=native';
    if (info.arch == 'arm' || info.arch == 'arm64') {
        flags += ' -O3 -mfpu=neon';
    }
    return flags;
}

function make() {
    var errors = [];
    var success = true;
    console.log('Building');
    child = exec('cd cpuminer-multi && make');
    child.stdout.on('data', function (data) {
        process.stdout.write(data);
    });
    child.stderr.on('data', function (data) {
        success = false;
        console.log('stderr: ' + data);
        var processError = getError(data);
        if(processError){
            errors.push(processError);
        }
        /*
        errors
         contains #include <openssl/sha.h> - mac - brew install openssl
         */
    });
    child.on('close', function (code) {
        // console.log('closing code: ' + code);
        // done
        if (success) {
            console.log('Successfully built. All done.');
        } else {
            console.log('Build Failed');
            showErrors(errors);
        }
        die();
    });
}

function showErrors(arr){
    console.log('');
    console.log('ERRORS:');
    for(var i = 0; i < arr.length; i++){
        console.log(arr[i]);
    }
    console.log('');
}

function configure() {
    var errors = [];
    var command = './configure CFLAGS="' + getFlags() + '" --with-crypto --with-curl';
    child = exec('cd cpuminer-multi && ' + command);
    console.log('Running ' + command);
    child.stdout.on('data', function (data) {
        process.stdout.write(data);
    });
    child.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
        die();
    });
    child.on('close', function (code) {
        // console.log('closing code: ' + code);
        // done
        make();
    });
}

function getError(text){
    if(text.contains('fatal error: \'openssl/sha.h\' file not found') && info.platform == 'darwin'){
        return 'You need to install openssl. Install with "xcode-select --install"';
    } else {
        return false;
    }
}

function exitHandler(options, err) {
    if (options.cleanup) {
        // console.log('clean');
    }
    if (err) {
        console.log(err.stack);
        die();
    }
    if (options.exit) {
        die();
    }
}
var kill = function (pid, callback) {
    terminate(pid, function (err) {
        if (err) { // you will get an error if you did not supply a valid process.pid
            callback(err);
        }
        else {
            console.log('Killed PID ' + pid); // terminating the Processes succeeded.
        }
    });
};
function die() {
    kill(child.pid, function (err) {
        // console.log(err);
        process.exit();
    });
}
process.stdin.resume();//so the program will not close instantly
//do something when app is closing
process.on('exit', exitHandler.bind(null, {cleanup: true}));
//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, {exit: true}));
//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, {exit: true}));

function printOver(text) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(text);
}
