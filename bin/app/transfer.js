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
  let inStyle = false;
  let templateBuffer = [];
  let scriptBuffer = [];
  let scriptInpAr = [];
  let scriptInpNameAr = [];
  let styleBuffer = [];

  return new Promise((resolve, reject) => {
    let rl = readline.createInterface({
      input: fs.createReadStream(inPath)
    });
    // 逐行读取
    rl.on('line', (line) => {
      //------------------------------template start---------------------------------//
      if (line === '<template>') {
        inTemplate = true;
        return;
      }
      if (line === '</template>') {
        inTemplate = false;
        return;
      }
      if (inTemplate === true) {
        if (line.trim() != '') {
          templateBuffer.push(line);
        }
      }
      //------------------------------template over---------------------------------//
      //------------------------------script start---------------------------------//
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
      //------------------------------script over---------------------------------//
      //------------------------------css start---------------------------------//
      if (line == '<style>') {
        inStyle = true;
        return;
      }

      if (line == '</style>') {
        inStyle = false;
        return;
      }

      if (inStyle) {
        if (line.trim() != '') {
          styleBuffer.push(line);
        }
      }
      //------------------------------css over---------------------------------//
    });

    // 判断路径是否存在，
    let dirName = path.dirname(outPath);
    if (!fs.existsSync(dirName)) {
      fs.mkdirSync(dirName);
    }
    
    // 写入文件
    rl.on('close', () => {
      var sAr = [];
      if (scriptBuffer.length > 0 && templateBuffer.length > 0) {
        sAr.push(`define([${scriptInpAr.length>0 ? (`\n  ${scriptInpAr.join(',\n  ')}\n`) : ''}], function (${scriptInpNameAr.length>0 ? (`\n  ${scriptInpNameAr.join(',\n  ')}\n`) : ''}) {`);
        // sAr.push(' function (');
        // sAr.push(`  ${scriptInpNameAr.join(',\n  ')}`);
        // sAr.push(') {');
        // template
        sAr.push('  //----------------------------模板----------------------------//');
        sAr.push(`  var templateStr = \`\n${templateBuffer.join('\n')}\n  \`;`);
        // 样式表
        if (styleBuffer.length > 0) {
          sAr.push('  //----------------------------样式----------------------------//');
          sAr.push('  '+this.buildStyleScript(styleBuffer, inPath));
        }
        // script
        sAr.push('  //----------------------------代码主题----------------------------//');
        sAr.push(`  ${scriptBuffer.join('\n  ')}`);
        sAr.push('})')
      }
      fs.writeFile(outPath, sAr.join('\n'), (err) => {
        if (err) {
          console.error(`write script error: ${err}`);
          reject(err);
        } else {
          resolve();
        }
      });
      // if (styleBuffer.length > 0) {
      //   let cssPath = path.join(outPath)
      //   fs.writeFile()
      // }
    });
  });
}
/**
 * 生成加载样式文本的代码
 * @param {Array} styleBuffer 
 * @param {String} inPath 
 */
mo.prototype.buildStyleScript = function (styleBuffer, inPath) {
  let sAr = [];
  // 随机id
  let cssId = path.basename(inPath, '.vue') + '_' + Math.random().toString(32).substr(2);
  sAr.push('(function() {');
  sAr.push(`  if (!document.getElementById('${cssId}')) {`);
  sAr.push('    var head = document.getElementsByTagName(\'head\').item(0);');
  sAr.push('    var styleNode = document.createElement(\'style\');');
  sAr.push(`    var rules = document.createTextNode(\`\n      ${styleBuffer.join('\n      ')}\n      \`);`)
  sAr.push('    styleNode.type = \'text/css\';');
  sAr.push(`    styleNode.id = '${cssId}';`);
  sAr.push('    if (styleNode.styleSheet) {');
  sAr.push(`      styleNode.styleSheet.cssText = rules.nodeValue;`);
  sAr.push('    } else {');
  sAr.push(`      styleNode.appendChild(rules);`);
  sAr.push('    }');
  sAr.push('    head.appendChild(styleNode);');
  sAr.push('  }');
  sAr.push('})();');
  return sAr.join('\n  ');
}

/**
 * 执行入口
 * @param {String} inPath 输入路径
 * @param {String} outPath 输出路径
 */
mo.prototype.exec = function (inPath, outPath) {
  let selfFun = arguments.callee;
  let stat = fs.statSync(inPath)
  if (stat.isDirectory()) {
    // 文件夹
    fs.readdir(inPath, (err, fAr) => {
      fAr.forEach(fPath => {
        fPath = path.join(inPath, fPath);
        let fStat = fs.statSync(fPath);
        if (fStat.isFile()) {
          // 如果不是vue，返回
          if (path.extname(fPath) !== '.vue') {
            return;
          }
          let out = path.join(outPath, (path.basename(fPath, '.vue') + '.js'));
          console.log(`${fPath} => ${out}`);
          this.doTransfer(fPath, out);
        } else if (fStat.isDirectory()) {
          let out = path.join(outPath, path.relative(inPath, fPath));
          // 递归
          selfFun.call(this, fPath, out);
        }
      })
    })
  } else if (stat.isFile()) {
    // 单个文件直接转换
    if (path.extname(outPath) == '') {
      // 如果输入路径是文件夹，需要将输出路径转换为到文件的路径
      outPath = path.join(outPath, (path.basename(inPath, '.vue') + '.js'))
    }
    this.doTransfer(inPath, outPath);
  }
}

module.exports = mo;
