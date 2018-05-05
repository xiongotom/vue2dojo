## vue 单文件组件转dojo文件，只是简单的代码风格转换

用法
```bash
vue2dojo -i 'input path' -o 'output path'
```

> 暂时仅支持template、script、style标签。只是简单的风格转换，不涉及到任何编译

vue文件：
```html
<template>
  <div class="vue-demo-button" title="VUE测试按钮" @click="clickHdl">
    <i class="el-icon-success"></i>
  </div>
</template>
<script>
export default {
  name: "vueButton",
  methods: {
    clickHdl() {
      // do something
    }
  }
};
</script>
<style>
.vue-demo-button {
  width: 50px;
  height: 50px;
  background-color: var(--main-color);
}
</style>
```
转换后的js文件
```javascript
define([], function () {
  //----------------------------模板----------------------------//
  var templateStr = `  <div class="vue-demo-button" title="VUE测试按钮" @click="clickHdl">
    <i class="el-icon-success"></i>
  </div>`;
  //----------------------------样式----------------------------//
  (function() {
    if (!document.getElementById('vueSButton_cjbvqm1jsho')) {
      var head = document.getElementsByTagName('head').item(0);
      var styleNode = document.createElement('style');
      var rules = document.createTextNode('.vue-demo-button {   width: 50px;   height: 50px;   background-color: var(--main-color); }');
      styleNode.type = 'text/css';
      styleNode.id = 'vueSButton_cjbvqm1jsho';
      if (styleNode.styleSheet) {
        styleNode.styleSheet.cssText = rules.nodeValue;
      } else {
        styleNode.appendChild(rules);
      }
      head.appendChild(styleNode);
    }
  })();
  //----------------------------代码主题----------------------------//
  return  {
    template: templateStr,
      name: "vueButton",
      methods: {
        clickHdl() {
          // do something
        }
      }
    };
})
```