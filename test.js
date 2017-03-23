var os = require('os');
console.log('Arch:',os.arch());
console.log('CPUs:', os.cpus().length);
console.log('Platform:', os.platform()); // darwin, linux, win32