// pages/single/detail/detail.js
const app = getApp()
const config = Object.assign({
  getDeviceDataApi: '/api/getDeviceData',
  getIndexDefineApi: '/api/getIndexDefine',
  updateIndexDefineApi: '/api/updateIndexDefine'
}, app.config)
const wxCharts = require('../../../utils/wxcharts.js')
let lineChart = null
let startPos = null
Page({
  data: {
    indexId: null,
    canvasHeight: 400,
    canvasWidth: 320,
    dataSubRatio: 0.3,
    define: null
  },
  onLoad: function(options) {
    let that = this
    let {
      deviceId,
      indexId
    } = options
    if (!config.observeIndexIdArray.includes(indexId) || !deviceId) {
      return wx.navigateBack()
    }
    // 检查登陆
    app.checkLogin(null, true)
    let today = app.normalDate()
    let startDate = app.normalDate(new Date(new Date(today).getTime() - 365 * 1000 * 3600 * 24))
    that.setData({
      userInfo: app.globalData.userInfo,
      deviceId: deviceId,
      indexId: indexId,
      todayDate: today,
      startDate: startDate,
      indexName: app.toIndexName(indexId)
    })
    // index define
    that.getIndexDefine()
  },
  // 获取数据定义
  getIndexDefine: function() {
    let that = this
    console.log(that.data.indexId, that.data.deviceId)
    wx.showLoading({
      title: '通信中',
    })
    wx.request({
      header: app.globalData.header,
      url: config.serverUrl + config.getIndexDefineApi,
      data: {
        deviceId: that.data.deviceId,
        indexId: that.data.indexId
      },
      success: function(res) {
        if (res && res.data) {
          if (res.data.errMsg == 1) {
            console.log(res.data.define)
            let define = res.data.define
            define.whoSet.avatarUrl = config.addServerHost(define.whoSet.avatarUrl)
            define.date = new Date(define.date).toLocaleString()
            that.setData({
              define: define
            })
          } else if (res.data.errMsg == -1) {
            wx.showToast({
              icon: 'none',
              title: '尚未定义数据',
            })
          } else if (res.data.errMsg == 403) {
            return app.loginRefresh()
          } else {
            wx.showModal({
              title: '出错了',
              content: '获取失败啦',
              showCancel: false,
              confirmText: '了解',
              complete: function() {
                wx.navigateBack()
              }
            })
          }
        }
      },
      complete: function() {
        wx.hideLoading()
      }
    })
  },
  // 修改数据阈值
  updateIndexDefine: function(e) {
    let that = this
    let value = e.detail.value
    wx.showLoading({
      title: '通信中',
    })
    wx.request({
      header: app.globalData.header,
      url: config.serverUrl + config.updateIndexDefineApi,
      method: 'post',
      data: {
        deviceId: that.data.deviceId,
        indexId: that.data.indexId,
        user_id: app.globalData.userInfo._id,
        define: value
      },
      success: function(res) {
        if (res && res.data) {
          if (res.data.errMsg == 1) {
            console.log(res.data.define)
            let define = res.data.define
            define.whoSet = app.globalData.userInfo
            define.date = new Date(define.date).toLocaleString()
            that.setData({
              define: define
            })
            wx.showToast({
              title: '设置成功',
            })
          } else if (res.data.errMsg == 403) {
            return app.loginRefresh()
          } else {
            wx.showModal({
              title: '出错了',
              content: '设置失败啦',
              showCancel: false,
              confirmText: '了解',
              complete: function() {
                wx.navigateBack()
              }
            })
          }
        }
      },
      fail: function() {
        wx.hideLoading()
      }
    })
  },
  bindStartDateChange: function(e) {
    let queryStartDate = e.detail.value
    this.setData({
      queryStartDate: queryStartDate
    })
  },
  bindStopDateChange: function(e) {
    let queryStopDate = e.detail.value
    this.setData({
      queryStopDate: queryStopDate
    })
  },
  // 查询历史数据
  queryHistoryData: function(e, queryDate) {
    let that = this
    let deviceId = that.data.deviceId
    let queryStartDate = new Date(that.data.queryStartDate)
    let queryStopDate = new Date(that.data.queryStopDate)
    queryStartDate = new Date(queryStartDate.getTime())
    queryStopDate = new Date(queryStopDate.getTime() + 1000 * 3600 * 24)
    if (queryStopDate.getTime() < queryStartDate.getTime()) {
      return wx.showToast({
        icon: 'none',
        title: '请选择正确日期',
      })
    } else if (queryStartDate.getTime() == queryStopDate.getTime()) {
      queryStopDate = new Date(queryStartDate.getTime() + 1000 * 3600 * 24)
    }
    if (queryDate) {
      queryStartDate = new Date(queryDate).getTime()
      queryStopDate = new Date(queryStartDate.getTime() + 1000 * 3600 * 24)
    }
    wx.showLoading({
      title: '通信中',
    })
    wx.request({
      header: app.globalData.header,
      url: config.serverUrl + config.getDeviceDataApi,
      method: 'post',
      data: {
        deviceId: deviceId,
        start: queryStartDate,
        stop: queryStopDate
      },
      success: function(res) {
        if (res.data && res.data.errMsg == 1) {
          console.log(res.data.data)
          let data = res.data.data
          if (data.length <= 0) {
            return wx.hideLoading()
          }
          let {
            graphData
          } = that.formatDataList(data)
          that.setData({
            graphData: graphData
          })
          that.showDataGraph()
        } else if (res.data.errMsg == 403) {
          return app.loginRefresh()
        } else {
          console.log('get data fail.')
        }
      },
      complete: function() {
        wx.hideLoading()
      }
    })
  },
  // 格式化数据
  formatDataList: function(data) {
    let that = this
    let graphData = {}
    graphData.categories = []
    graphData.dataList = {}

    let indexId = that.data.indexId
    let indexName = that.data.indexName
    let maxArray = []
    let minArray = []
    let fMaxArray = []
    let fMinArray = []
    let categories = []
    let dataArray = []
    for (let i = 0; i < data.length; i++) {
      let indexData = data[i].data[indexId]
      // gragh
      categories.push(new Date(data[i].date).toLocaleString())
      dataArray.push(indexData.val)
      let max = indexData.max
      let min = indexData.min
      let fMax = indexData.fMax
      let fMin = indexData.fMin
      if (app.isNum(max)) {
        maxArray.push(max)
      }
      if (app.isNum(min)) {
        minArray.push(min)
      }
      if (app.isNum(fMax)) {
        fMaxArray.push(fMax)
      }
      if (app.isNum(fMin)) {
        fMinArray.push(fMin)
      }
    }
    graphData.categories = categories
    graphData.dataList[indexId] = {
      name: indexName,
      data: dataArray,
      color: '#36f'
    }
    graphData.dataList['Max'] = {
      name: '预警最大值',
      data: maxArray,
      color: '#f15c80'
    }
    graphData.dataList['Min'] = {
      name: '预警最小值',
      data: minArray,
      color: "#dd514c"
    }
    graphData.dataList['FMax'] = {
      name: '合适最大值',
      data: fMaxArray,
      color: '#90ed7d'
    }
    graphData.dataList['FMin'] = {
      name: '合适最小值',
      data: fMinArray,
      color: '#39b54a'
    }
    return {
      graphData
    }
  },
  showDataGraph: function(updateFlag) {
    let that = this
    let series = []
    if (!that.data.graphData)
      return
    let graphData = that.data.graphData
    let dataSubRatio = that.data.dataSubRatio
    // let dataSubGap = Math.round(1 / dataSubRatio)
    let graphLength = that.data.graphData.categories.length
    let dataSubGap = 0.3
    if (graphLength > 500) {
      dataSubGap = Math.round(1 / 0.02)
    } else if (graphLength > 400) {
      dataSubGap = Math.round(1 / 0.05)
    } else if (graphLength > 300) {
      dataSubGap = Math.round(1 / 0.1)
    } else if (graphLength > 200) {
      dataSubGap = Math.round(1 / 0.2)
    } else if (graphLength <= 200) {
      dataSubGap = Math.round(1 / dataSubRatio)
    }
    Object.keys(graphData.dataList).forEach((key, index) => {
      let data = []
      for (let i = 0; i < graphData.dataList[key].data.length; i++) {
        if (i % dataSubGap == 0) {
          data.push(graphData.dataList[key].data[i])
        }
      }
      graphData.dataList[key].data = data
      series.push(graphData.dataList[key])
      series[index].format = function(val, name) {
        return Number.parseFloat(val).toFixed(2);
      }
    })
    let categories = []
    for (let i = 0; i < graphData.categories.length; i++) {
      if (i % dataSubGap == 0) {
        categories.push(graphData.categories[i])
      }
    }
    graphData.categories = categories
    console.log(series)
    if (lineChart && updateFlag) {
      lineChart.updateData({
        categories: graphData.categories,
        series: series
      })
    } else {
      let width = app.getSystemWindowWidth()
      let height = that.data.canvasHeight
      that.setData({
        cavasWidth: width,
        canvasHeight: height
      })
      lineChart = new wxCharts({
        canvasId: 'dataLineCanvas',
        type: 'line',
        categories: graphData.categories,
        animation: false,
        series: series,
        xAxis: {
          disableGrid: false
        },
        yAxis: {
          title: '观测值',
          format: function(val) {
            return val.toFixed(2);
          },
          min: 0
        },
        width: width,
        height: height,
        dataLabel: true,
        dataPointShape: true,
        enableScroll: true,
        extra: {
          lineStyle: 'curve'
        },
        background: '#f6f7f9'
      })
    }
  },
  graphTouchHandler: function(e) {
    lineChart.scrollStart(e);
  },
  graphMoveHandler: function(e) {
    lineChart.scroll(e);
  },
  graphTouchEndHandler: function(e) {
    lineChart.scrollEnd(e);
    lineChart.showToolTip(e, {
      format: function(item, category) {
        return category + ' ' + item.name + ':' + item.data
      }
    });
  },
})