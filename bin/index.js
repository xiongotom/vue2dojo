#!/usr/bin/env node
const program = require('commander');
const path = require('path');
const ts = require('./transfer')

program
  .version('0.1.0')
  .description('该工具用于VUE单文件组件转换为DOJO风格')
  // .command('*')
  .option('-f, --file <path>', '用于指定单个文件')
  .option('-o, --out <path>', '用于指定输出路径')
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

function exec() {
  // 检查参数
  if (program.file == null) {
    console.log('未检测到输入的路径');
    return;
  }
  let inPath = path.resolve(program.file);
  // 输出路径默认与输入路径相同
  let outPath = program.out ? path.resolve(program.out) : inPath.replace('.vue', '.js')
  console.log(outPath);

  let t = new ts(inPath, outPath);
  t.doTransfer();
}

module.exports = exec;