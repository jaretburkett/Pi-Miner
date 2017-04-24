var os = require('os');
console.log('Arch:',os.arch());
console.log('CPUs:', os.cpus().length);
console.log('hostname:', os.hostname().split('.')[0]);
console.log('Platform:', os.platform()); // darwin, linux, win32
