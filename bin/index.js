#!/usr/bin/env node
const program = require('commander');
const path = require('path');
const ts = require('./app/transfer');
const watch = require('watch');
const fs = require('fs-extra');

// 需要忽略的文件夹
const ignoreFolder = ['.svn', '.vscode', 'node_modules'];

program
  .version('0.1.0')
  .description('该工具用于VUE单文件组件转换为DOJO风格')
  // .command('*')
  .option('-i, --input <path>', '用于指定输入路径')
  .option('-o, --out <path>', '用于指定输出路径，如果使用-f参数，该路径指定到文件，如果使用-r参数，该路径指定到文件夹')
  .option('-p, --publish', '是否需要将非vue的文件也输出到目标路径')
  .option('-w, --watch', '是否持续监控目标文件的改变')
  // .action((cmd, options) => {
  //   // let inputPath = options.file || '';
  //   // if (inputPath == '') {
  //   //   console.log('请输入需要转换的文件路径');
  //   // } else {
  //     console.log(`file: ${options.file}, out is ${options.out}`);
  //   // }
  // })
  .parse(process.argv);

  /**
   * 
   * @param {String} f 目标文件路径
   * @param {String} inPath 输入基础路径
   * @param {String} outPath 输出基础路径
   */
const deal = function (f, inPath, outPath) {
  if (path.extname(f) === '.vue') {
    // 如果是VUE文件，则转换之
    let i = path.relative(inPath, f);
    let o = path.join(outPath, i).replace('.vue', '.js');
    console.log(`[UPDATE]: ${f} => ${o}`)
    t.exec(f, o);
  } else if (program.publish) {
    // 如果是发布模式，则其他后缀的文件修改后也许复制
    let i = path.relative(inPath, f);
    let o = path.join(outPath, i);
    t.copyFile(f, o);
  }
}

// console.log(`file: ${program.file}, out is ${program.out}`);
const t = new ts();
(function exec() {
  console.time('vue2dojo')
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
      console.timeEnd('vue2dojo')
    });
    if (program.watch) {
      watch.createMonitor(inPath, {
        filter: function (f) {
          let s = fs.statSync(f);
          if (s.isDirectory() && ignoreFolder.indexOf(path.basename(f)) !== -1) {
            return false;
          }
          // 如果是发布模式，则需要监视非vue文件的改变
          if (!program.publish) {
            if (s.isFile()) {
              return path.extname(f) === '.vue';
            }
          }
          return true;
        }
      }, (monitor) => {
        monitor.on('changed', (f, curr, prev) => {
          deal(f, inPath, outPath);
        });
        monitor.on('created', (f, stat) => {
          deal(f, inPath, outPath);
        });
      })
    }
  }
}).apply();

// module.exports = exec;