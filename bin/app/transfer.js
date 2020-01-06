#!/usr/bin/env node

const fs = require('fs-extra');
const readline = require('readline');
const path = require('path');
// const cssRules = require('css-rules');
const css = require('css')
// 正则表达式
const inpReg = /from ['"](.*?)['"]/g
const inpReplaceReg = /(\w*)from/g;
const inpNameReg = /import(.*?)from/g;
const inpNameReplaceReg = /(\w*)import(.*)from/g

var mo = function () {};

/**
 * 将单个vue文件转换为amd风格的js文件
 * @param {String} inPath 输入路径
 * @param {String} outPath 输出路径
 */
mo.prototype.doTransfer = function (inPath, outPath, fileId) {
  // 初始化参数
  let inTemplate = false;
  let inScript = false;
  let inStyle = false;
  let isScopeStyle = false;
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
      if (/\<script/.test(line)) {
        inScript = true;
        return;
      }
      if (/<\/script>/.test(line)) {
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
        scriptBuffer.push(line);
      }
      //------------------------------script over---------------------------------//
      //------------------------------css start---------------------------------//
      if (/\<style/.test(line)) {
        inStyle = true;
        isScopeStyle = /scoped/.test(line);
        return;
      }

      if (/<\/style>/.test(line)) {
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

    // 判断路径是否存在，如果不存在，创建该路径（文件夹）
    let dirName = path.dirname(outPath);
    if (!fs.existsSync(dirName)) {
      fs.mkdirsSync(dirName);
    }
    
    // 写入文件
    rl.on('close', () => {
      var sAr = [];
      if (scriptBuffer.length > 0 && templateBuffer.length > 0) {
        // 找到模板根节点，赋值一个随机字符串的class，并找到已经赋值的class，用于后面样式的处理
        // let randomClass = (path.basename(inPath, '.vue') + '-' + Math.random().toString(32).substr(2)).toLowerCase();
        let randomClass = (path.basename(inPath, '.vue').toLowerCase() + '-' + fileId);
        // 寻找根节点（div），如果不是div，则不对根节点赋值随机class
        let hasRootDiv = false;
        let rootTransition = false;
        let transitionClass = '';
        let oldClass = '';
        if (isScopeStyle) {
          for(var i=0; i<templateBuffer.length; i++) {
            let line = templateBuffer[i];
            if (/\<div/.test(line)) {
              // 寻找是否已存在class
              let rootClassMatch = line.match(/[^:]class=\"(.*?)\"/);
              if (rootClassMatch && rootClassMatch.length === 2) {
                oldClass = rootClassMatch[1];
                line = line.replace(`class="${oldClass}"`, `class="${oldClass} ${randomClass}"`);
              } else {
                line = line.replace(/\<div/, `<div class="${randomClass}"`);
              }
              templateBuffer[i] = line;
              hasRootDiv = true;
              break;
            } else if (line.trim() !== '' && !/<transition/.test(line)) {
              // 如果该行不是空，说明根节点不是div
              // 如果第一行是transition，繼續尋找
              continue;
            }
            if (/<transition/.test(line)) {
              rootTransition = true;
              transitionClass = line.match(/name=\"(.*?)\"/)[1] || '';
            }
          }
        }
        // 引用
        sAr.push(`define([${scriptInpAr.length>0 ? (`\n  ${scriptInpAr.join(',\n  ')}\n`) : ''}], function (${scriptInpNameAr.length>0 ? (`\n  ${scriptInpNameAr.join(',\n  ')}\n`) : ''}) {`);
        sAr.push('  //----------------------------模板----------------------------//');
        sAr.push(`  var templateStr = \`\n${templateBuffer.join('\n')}\n  \`;`);
        // 样式表
        if (styleBuffer.length > 0) {
          sAr.push('  //----------------------------样式----------------------------//');
          if (isScopeStyle) {
            sAr.push('  '+this.buildStyleScript(fileId, styleBuffer, inPath, randomClass, oldClass, transitionClass));
          } else {
            sAr.push('  '+this.buildStyleScript(fileId, styleBuffer, inPath));
          }
        }
        // script
        sAr.push('  //----------------------------代码主体----------------------------//');
        sAr.push(`  ${scriptBuffer.join('\n  ')}`);
        sAr.push('});')
      }
      fs.writeFile(outPath, sAr.join('\n'), (err) => {
        if (err) {
          console.error(`write script error: ${err}`);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  });
}
/**
 * 生成加载样式文本的代码
 * @param {Array} styleBuffer 
 * @param {String} inPath 
 * @param {String | null} 需要加到每个class名称上的前缀
 * @param {String | null} 根节点的class
 */
mo.prototype.buildStyleScript = function (fileId, styleBuffer, inPath, prefix, rootOldClass, transitionClass) {
  let sAr = [],
      cssAr = [];
  // 添加前缀
  if (prefix) {
    prefix = '.' + prefix;
    let oldAr = rootOldClass.split(' ').map(item => item.trim() !== '' ? '.'+item : '');
    // let rules = cssRules(styleBuffer.join(''));
    let rules = css.parse(styleBuffer.join(''))
    if(rules && rules.stylesheet) {
      rules = rules.stylesheet.rules

    }
    rules.forEach(rule => {
      // let cssName = rule[0];
      // let cssText = rule[1].cssText;
      const deal = (cssName, cssText) => {
        // 寻找根节点的class
        let clsAr = cssName.split(' ');
        let rootClass = clsAr.find(item => oldAr.indexOf(item) !== -1);
        if (rootClass) {
          cssAr.push(cssName.replace(rootClass, `${rootClass}${prefix}`) + ' {');
        } else if (transitionClass && new RegExp(transitionClass + '-').test(cssName)) {
          // transition class
          cssAr.push(`${prefix}${cssName} {`);
        } else {
          cssAr.push(`${prefix} ${cssName}` + ' {');
        }
        
        // css 内容
        let cssTextAr = cssText.split(';').map(item => item.trim() !== '' ? ('  ' + item.trim()+ ';') : '');
        cssAr = cssAr.concat(cssTextAr);
        cssAr.push('}');
      }
      let r
      switch(rule.type) {
        case 'rule':
          r = this._strRule(rule);
          r.map(_i => deal(_i.name, _i.text));
          break;
        case 'media':
          cssAr.push(`@media ${rule.media} {`);
          for(let _r of rule.rules) {
            r = this._strRule(_r)
            r.map(_i => deal(_i.name, _i.text));
          }
          cssAr.push('}');
      }
    })
    cssAr = cssAr.filter(item => item.trim() !== '')
  } else {
    cssAr = styleBuffer;
  }
  // console.log(rules);
  // 随机id
  // let cssId = path.basename(inPath, '.vue') + '_' + Math.random().toString(32).substr(2);
  cssId = path.basename(inPath, '.vue').toLowerCase() + '_' + fileId;
  sAr.push('(function() {');
  sAr.push(`  if (!document.getElementById('${cssId}')) {`);
  sAr.push('    var head = document.getElementsByTagName(\'head\').item(0);');
  sAr.push('    var styleNode = document.createElement(\'style\');');
  sAr.push(`    var rules = document.createTextNode(\`\n      ${cssAr.join('\n      ')}\n      \`);`)
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

mo.prototype._strRule = function(rule) {
  let des = rule.declarations;
  let selector = rule.selectors;
  let text = des.map(item => {
    return `${item.property}: ${item.value};`
  }).join('\n')
  return selector.map(sel => {
    return{
      name: sel,
      text: text
    }
  })
}


/**
 * 复制文件
 * @param {String} inPath 输入路径
 * @param {String} outPath 输出路径
 */
mo.prototype.copyFile = function (inPath, outPath) {
  let outFolder = path.dirname(outPath);
  return new Promise((resolve, reject) => {
    fs.ensureDir(outFolder, err => {
      if (!err) {
        fs.copy(inPath, outPath, err => {
          if (err) {
            console.error(`copy file error: ${err}`);
            reject(err);
          } else {
            resolve();
          }
        })
      } else {
        console.error(`create folder error: ${err}`)
        reject(err);
      }
    })
  })
}

/**
 * 执行入口
 * @param {String} inPath 输入路径
 * @param {String} outPath 输出路径
 * @param {Boolean} isPublish 是否是发布状态，如果是，将输出其他文件（不是vue文件）到outPath
 */
mo.prototype.exec = async function (inPath, outPath, isPublish) {
  // 如果是发布模式，则需要避免输入和输出路径相同的情况
  if (inPath == outPath && isPublish) {
    return;
  }
  let selfFun = arguments.callee;
  let stat = await fs.stat(inPath)
  if (stat.isDirectory()) {
    // 文件夹
    let fAr = await fs.readdir(inPath);
    const pAr = fAr.map( fPath => {
      fPath = path.join(inPath, fPath);
      let fStat = fs.statSync(fPath);
      if (fStat.isFile()) {
        // 如果不是vue，返回
        if (path.extname(fPath) !== '.vue') {
          if (isPublish) {
            let oPath = path.join(outPath, path.basename(fPath));
            // 如果输出文件已存在，并且修改时间晚于输入文件的修改时间，则认定无需转换
            if (fs.existsSync(oPath)) {
              fs.stat(oPath, (err, oStat) => {
                if (!err && oStat.mtime >= fStat.mtime) {
                  return new Promise(resolve => resolve());
                } else {
                  return this.copyFile(fPath, oPath);
                }
              })
            } else {
              return this.copyFile(fPath, oPath);
            }
          }
        } else {
          let out = path.join(outPath, (path.basename(fPath, '.vue') + '.js'));
          let p = fStat.size.toString(36);
          // 如果输出文件已存在，并且修改时间晚于输入文件的修改时间，则认定无需转换
          if (fs.existsSync(out)) {
            fs.stat(out, (err, oStat) => {
              if (!err && oStat.mtime >= fStat.mtime) {
                return new Promise(resolve => resolve());
              } else {
                console.log(`${fPath} => ${out}`);
                return this.doTransfer(fPath, out, p);
              }
            })
          } else {
            console.log(`${fPath} => ${out}`);
            return this.doTransfer(fPath, out, p);
          }
        }
      } else if (fStat.isDirectory()) {
        let out = path.join(outPath, path.relative(inPath, fPath));
        // 递归
        return selfFun.call(this, fPath, out, isPublish);
      }
    });
    for (const p of pAr) {
      await p;
    }
    return;
  } else if (stat.isFile() && path.extname(inPath) === '.vue') {
    // 单个文件直接转换
    if (path.extname(outPath) == '') {
      // 如果输入路径是文件夹，需要将输出路径转换为到文件的路径
      outPath = path.join(outPath, (path.basename(inPath, '.vue') + '.js'))
    }
    // let p = path.relative(path.resolve('./'), path.dirname(inPath));
    // p = p.replace(/[\/\\]/g, '-').toLowerCase();
    let p = stat.size.toString(36);
    return this.doTransfer(inPath, outPath, p);
  }
}

module.exports = mo;
