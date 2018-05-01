#!/usr/bin/env node
const exec = require('./bin/index');

const vue2dojo = function() {
  console.log('this is a simple tool');
  exec();
}

exports.vue2dojo = vue2dojo;