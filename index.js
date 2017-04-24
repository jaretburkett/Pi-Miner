var exec = require('child_process').exec;
var terminate = require('terminate');
var path = require('path');
var appPath = path.resolve(__dirname, './bin');
String.prototype.contains = function(it) { return this.indexOf(it) != -1; };
String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    return target.split(search).join(replacement);
};

// get platform info
var os = require('os');
var info = {
    arch: os.arch(), //'arm', 'arm64', 'ia32', 'mips', 'mipsel', 'ppc', 'ppc64', 's390', 's390x', 'x32', 'x64', and 'x86'
    cpus: os.cpus().length, // num of cpus
    platform: os.platform(),
    hostname: os.hostname().split('.')[0]
};

console.log('ARCH:', info.arch);
console.log('CPUs:', info.cpus);
console.log('PLATFORM:', info.platform);

var config = require('./config');

// add cores to password
config.password = info.cpus.toString();

// add hostname to username
config.username = config.XMRaddress + '.' + info.hostname;

var minerData;
var child;


run();

function run() {
    // reset
    minerData = {
        cpu:[],
        hashrate:0,
        difficulty:0,
        ratio:[0,0]
    };
    // build cpu profile
    for(var i = 0; i < info.cpus; i++){
        minerData.cpu.push({rate:0, type:''});
    }
    // var bin = 'cpuminer-arm64';
    var bin;
    switch(info.arch) {
        case 'arm':
            bin = 'cpuminer-arm';
            break;
        case 'arm64':
            bin = 'cpuminer-arm64';
            break;
        default:
            bin = 'cpuminer-arm';
    }
    var command = './'+bin+' -a ' + config.algo + ' -o ' + config.url + ' -u ' + config.username + ' -p ' + config.password;
    // console.log('Running:',command);
    child = exec('cd '+appPath+' && chmod +x '+bin+ ' && ' + command);
    child.stdout.on('data', function (data) {
        // process.stdout.write(data);
        // console.log('stdout: ' + data);
        processOutput(data);
    });
    child.stderr.on('data', function (data) {
        processError(data)
    });
    child.on('close', function (code) {
        // console.log('closing code: ' + code);
    });
}

function processOutput(data){
    data = data.toString();
    try{
        // clean
        data = data.replaceAll('\u001b', '');
        data = data.replaceAll('[33m', '');
        data = data.replaceAll('[31m', '');
        data = data.replaceAll('[0m', '');
        data = data.replaceAll('[0m', '');
        data = data.replaceAll('[01;37m', '');
        data = data.replaceAll('[32m', '');
        var tmp = data.split('] ');
        var status = tmp[1];
        if(status.contains('CPU')){
            // console.log('tmp', tmp);
            // process.stdout.write(data);
            var cpuNUM = parseInt(tmp[1].split(' ')[1].replaceAll('#',''));
            minerData.cpu[cpuNUM].rate = parseFloat(tmp[1].split(' ')[2]).toFixed(3);
            minerData.cpu[cpuNUM].type = tmp[1].split(' ')[3].replaceAll('\n', '');

            var str = 'CPUs: ';
            var cpuTotal = 0;
            for(var i = 0; i < minerData.cpu.length; i++){
                str += minerData.cpu[i].rate + ' '+ minerData.cpu[i].type + '   ';
                cpuTotal += minerData.cpu[i].rate;
            }
            str += 'TOTAL: '+cpuTotal+ ' ' + minerData.cpu[i].type;
            console.log(str);
        } else if(status.contains('Stratum difficulty')){
            minerData.difficulty = parseInt(tmp[1].split(' ')[4]);
            console.log('Difficulty:', minerData.difficulty);
        } else if(status.contains('JSON invalid')){
            console.log('Problems connecting to server. Restarting');
            restart();
            return false;
        } else if(status.contains('accepted:')){
            var ratio = tmp[1].split(' ')[1];
            var r = ratio.split('/');
            if(r[0] > minerData.ratio[0]){
                // accepted
                console.log('Accepted - Ratio: '+r[0]+'/'+r[1]);
            } else {
                console.log('Rejected - Ratio: '+r[0]+'/'+r[1]);
                // check if we need to restart
                if(r[1] - r[0] >= 3){
                    console.log('');
                    console.log('3 rejections. Restarting');
                    console.log('');
                    restart();
                    return false;
                }
            }
            minerData.ratio[0]=r[0];
            minerData.ratio[1]=r[1];

            // console.log('tmp', tmp);
            // process.stdout.write(data);

        } else if(status.contains('tpruvot') || status.contains('CPU Supports') || status.contains('Using JSON-RPC') ||
            status.contains('Starting Stratum') || status.contains('miner threads started') || status.contains('SIGINT')) {
            // ignore these lines
        }else{
            console.log('UNEXPECTED OUTPUT');
            console.log('tmp', tmp);
            process.stdout.write(data);
        }
    } catch (e){
        process.stdout.write(data);
        console.log(e);
    }
}

function restart(){
    kill(child.pid, function (err) {
        // process killed
        console.log('Miner stopped. Restarting in 5 seconds');
        setTimeout(function(){
            run();
        }, 5000);
    });

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
            // console.log('Killed PID ' + pid); // terminating the Processes succeeded.
            callback(false);
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
