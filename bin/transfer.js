#!/usr/bin/env node

const fs = require('fs');
const readline = require('readline');
const path = require('path');
// 正则表达式
const inpReg = /from \'(.*?)\'/g
const inpReplaceReg = /(\w*)from/g;
const inpNameReg = /import(.*?)from/g;
const inpNameReplaceReg = /(\w*)import(.*)from/g

var mo = function () {};

/**
 * 将单个vue文件转换为amd风格的js文件
 * @param {String} inPath 输入路径
 * @param {String} outPath 输出路径
 */
mo.prototype.doTransfer = function (inPath, outPath) {
  // 初始化参数
  let inTemplate = false;
  let inScript = false;
  let templateBuffer = [];
  let scriptBuffer = [];
  let scriptInpAr = [];
  let scriptInpNameAr = [];

  return new Promise((resolve, reject) => {
    let rl = readline.createInterface({
      input: fs.createReadStream(inPath)
    });
    // 逐行读取
    rl.on('line', (line) => {
      if (line === '<template>') {
        inTemplate = true;
        return;
      }
      if (line === '</template>') {
        inTemplate = false;
        return;
      }
      if (inTemplate === true) {
        templateBuffer.push(line);
      }
      if (line === '<script>') {
        inScript = true;
        return;
      }
      if (line == '</script>') {
        inScript = false;
        return;
      }
      if (inScript) {
        if (inpNameReg.test(line)) {
          scriptInpNameAr.push(line.match(inpNameReg)[0].replace(inpNameReplaceReg, '$1$2').trim());
          scriptInpAr.push(line.match(inpReg)[0].replace(inpReplaceReg, '$1').trim());
          return;
        }
        if (line.toLowerCase().indexOf('export default') !== -1) {
          line = line.replace('export default', 'return ');
          scriptBuffer.push(line);
          scriptBuffer.push('  template: templateStr,');
          return;
        }
        scriptBuffer.push('  '+line);
      }
    });

    // 判断路径是否存在，
    let dirName = path.dirname(outPath);
    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName);
    }
    
    // 写入文件
    rl.on('close', () => {
      if (scriptBuffer.length > 0) {
        var sAr = [];
        sAr.push('define([');
        sAr.push(`  ${scriptInpAr.join(',\n  ')}`);
        sAr.push('], function (');
        sAr.push(`  ${scriptInpNameAr.join(',\n  ')}`);
        sAr.push(') {');
        sAr.push(`  var templateStr = \`${templateBuffer.join('\n')}\`;`);
        sAr.push(`  ${scriptBuffer.join('\n  ')}`);
        sAr.push('})')
        fs.writeFile(outPath, sAr.join('\n'), (err) => {
          if (err) {
            console.error(`write script error: ${err}`);
            reject(err);
          } else {
            resolve();
          }
        })
      }
    });
  });
}

module.exports = mo;
