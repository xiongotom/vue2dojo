#!/usr/bin/env node
const program = require('commander');
const path = require('path');
const ts = require('./app/transfer');

program
  .version('0.1.0')
  .description('该工具用于VUE单文件组件转换为DOJO风格')
  // .command('*')
  .option('-i, --input <path>', '用于指定输入路径')
  .option('-o, --out <path>', '用于指定输出路径，如果使用-f参数，该路径指定到文件，如果使用-r参数，该路径指定到文件夹')
  .option('-p, --publish', '是否需要将非vue的文件也输出到目标路径')
  // .action((cmd, options) => {
  //   // let inputPath = options.file || '';
  //   // if (inputPath == '') {
  //   //   console.log('请输入需要转换的文件路径');
  //   // } else {
  //     console.log(`file: ${options.file}, out is ${options.out}`);
  //   // }
  // })
  .parse(process.argv);

// console.log(`file: ${program.file}, out is ${program.out}`);
const t = new ts();
(function exec() {
  var fPath = program.input;
  // 检查参数
  if (!fPath) {
    console.log('未检测到输入的路径');
    return;
  } else if (fPath) {
    let inPath = path.resolve(fPath);
    console.log(`输入路径：${inPath}`);
    // 输出路径默认与输入路径相同
    let outPath = program.out ? path.resolve(program.out) : inPath.replace('.vue', '.js')
    let isPublish = program.out != null && program.publish != null;
    console.log(`输出路径：${outPath}`);
    t.exec(inPath, outPath, isPublish).then(() => {
      console.log('finished!!!')
    })
  }
}).apply();

// module.exports = exec;