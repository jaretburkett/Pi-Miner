var exec = require('child_process').exec;
var terminate = require('terminate');

// get platform info
var os = require('os');
var info = {
    arch: os.arch(), //'arm', 'arm64', 'ia32', 'mips', 'mipsel', 'ppc', 'ppc64', 's390', 's390x', 'x32', 'x64', and 'x86'
    cpus: os.cpus().length, // num of cpus
    platform: os.platform()
};
var config = require('./config');
var minerData = {
    cpu:[],
    hashrate:0,


};

var child;

function run() {
    var command = './cpuminer -a ' + config.algo + ' -o ' + config.url + ' -u ' + config.username + ' -p ' + config.password;
    child = exec('cd cpuminer-multi && ' + command);
    child.stdout.on('data', function (data) {
        process.stdout.write(data);
        // console.log('stdout: ' + data);
        processOutput(data);
    });
    child.stderr.on('data', function (data) {
        processError(data)
    });
    child.on('close', function (code) {
        console.log('closing code: ' + code);
    });
}

function processOutput(data){
    process.stdout.write(data);
}
function processError(data){
    process.stderr.write(data);
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
