//logs.js
// const util = require('../../utils/util.js')
const app = getApp()
const logs = require('../../data/logs.js')
Page({
  data: {
    logs: []
  },
  onLoad: function() {
    this.setData({
      logs: logs
    })
  }
})