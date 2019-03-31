// pages/single/single.js
/**
 * 接下来任务
 * http请求获取设备监测数据
 * 有历史数据则调用mqttConnection连接mqtt建立mqtt通信，获取实时数据
 * 增加删除设备功能deletDevice
 */
const app = getApp()
const mqtt = require('../../utils/mqtt.min.js')
const wxCharts = require('../../utils/wxcharts.js')
const config = Object.assign({
  // 获取设备信息Api
  fetchDeviceInfoApi: '/api/fetchDeviceInfo',
  getDeviceDataApi: '/api/getDeviceData',
  deleteDeviceApi: '/api/removeDevice',
  getIndexDefineApi: '/api/getIndexDefine'
}, app.config)
// mqtt客户端实例
let mqttClient = null
let lineChart = null;
let startPos = null;
Page({

  /**
   * 页面的初始数据
   */
  data: {
    rpxRatio: 0.5,
    showDeviceDetail: false,
    showDataDetail: false,
    switchComment: false,
    switchData: false,
    switchMonitor: true,
    switchWarning: true,
    switchControl: false,
    switchIssue: false,
    startDate: null,
    queryStartDate: null,
    queryStopDate: null,
    todayDate: null,
    lastMqttUpdateDate: null,
    abandonMqttDataCount: 0,
    correctMqttDataCount: 0,
    abandonMqttDataRatio: 0,
    warningMqttDataCount: 0,
    // data graph canvas
    canvasHeight: 400,
    canvasWidth: 320,
    dataSubRatio: 0.5,
    dataSubLimit: 35,
    dataMoreSubRatio: 0.2,
    // 数据对象
    dataIndexArray: [],
    dataIndex: [],
    dataTableItems: [],
    warningDataArray: [],
    graphData: null,
    showDataTable: true,
    showDataGraph: false
  },
  // 模拟数据变化
  dataChangeSimulation: function() {
    let that = this

    function simulate(d) {
      let s = Math.ceil((Math.random() - 0.5)) > 0 ? 1 : -1
      let val = Math.random() * (d.fMax - d.fMin) * s * 0.125 + Number.parseFloat(d.val)
      return Number.parseFloat(val).toFixed(2)
    }

    function dataIndexArrayItem(d) {
      let simuData = {}
      d.forEach((item) => {
        let key = item.id
        simuData[key] = item
      })
      let dataItem = {
        date: new Date(),
        data: simuData
      }
      return dataItem
    }
    // setInterval(() => {
    function genrateData() {
      // deepCopy
      let dataIndexJson = JSON.stringify(that.data.dataIndex)
      let dataIndex = JSON.parse(dataIndexJson)
      // deepCopy
      let dataItem = dataIndexArrayItem(dataIndex)
      let dataIndexArrayJson = JSON.stringify(that.data.dataIndexArray)
      let dataIndexArray = JSON.parse(dataIndexArrayJson)
      let warningDataArray = JSON.parse(JSON.stringify(that.data.warningDataArray))
      dataIndexArray.push(dataItem)
      if (dataIndexArray.length > 200) {
        dataIndexArray.splice(0, 100)
      }
      let flag = false
      for (let i = 0; i < dataIndex.length; i++) {
        let val = simulate(dataIndex[i])
        dataIndex[i].val = val
        if (val >= dataIndex[i].max || val <= dataIndex[i].min) {
          flag = true
        }
      }
      if (flag) {
        warningDataArray.push(dataIndex)
      }
      that.setData({
        dataIndex: dataIndex,
        dataIndexArray: dataIndexArray,
        warningDataArray: warningDataArray
      })
    }
    setInterval(() => {
      genrateData()
    }, 1000)
  },
  // 获取设备数据定义
  getIndexDefine: function() {
    let that = this
    wx.showLoading({
      title: '通信中',
    })
    wx.request({
      header: app.globalData.header,
      url: config.serverUrl + config.getIndexDefineApi,
      data: {
        deviceId: that.data.deviceId
      },
      success: function(res) {
        if (res.data && res.data.errMsg == 1) {
          let dataIndex = []
          let defines = res.data.define.define
          Object.keys(defines).forEach(key => {
            let index = Object.assign(defines[key])
            index.val = 0
            index.id = key
            index.name = app.toIndexName(key)
            dataIndex.push(index)
          })
          that.setData({
            dataIndex: dataIndex
          })
        } else {
          wx.showToast({
            title: '获取数据定义失败',
          })
          setTimeout(() => {
            wx.navigateBack()
          }, 1500)
        }
      },
      complete: function() {
        wx.hideLoading()
      }
    })
  },
  // 显示设备详情面板
  showDeviceDetail: function() {
    let that = this
    that.setData({
      showDeviceDetail: !that.data.showDeviceDetail
    })
  },
  // 切换到仪表盘面板
  switchToMonitor: function(e) {
    if (this.data.switchMonitor == true) {
      return
    }
    this.setData({
      switchMonitor: true,
      switchData: false,
      switchComment: false
    })
  },
  // 切换到数据面板
  switchToData: function(e) {
    if (this.data.switchData == true) {
      return
    }
    this.setData({
      switchData: true,
      switchMonitor: false,
      switchComment: false
    })
  },
  // 切换到记录面板
  switchToComment: function(e) {
    if (this.data.switchComment == true) {
      return
    }
    this.setData({
      switchComment: true,
      switchData: false,
      switchMonitor: false
    })
    if (this.data.switchWarning) {
      this.setData({
        warningMqttDataCount: 0
      })
    }
  },
  // 切换到预警面板
  switchToWarning: function(force) {
    if (!force) {
      if (this.data.switchWarning == true) {
        return
      }
    }
    let {
      dataTableItems
    } = this.formatWarningDataToTable(this.data.warningDataArray)
    this.setData({
      switchWarning: true,
      switchControl: false,
      switchIssue: false,
      warningMqttDataCount: 0,
      warningDataTableItems: dataTableItems
    })
  },
  switchToCommentAndWarning: function() {
    this.switchToComment()
    this.switchToWarning(true)
  },
  // 切换到控制面板
  switchToControl: function(e) {
    if (this.data.switchControl == true) {
      return
    }
    this.setData({
      switchControl: true,
      switchWarning: false,
      switchIssue: false
    })
  },
  // 切换到备忘面板
  switchToIssue: function(e) {
    if (this.data.switchIssue == true) {
      return
    }
    this.setData({
      switchIssue: true,
      switchControl: false,
      switchWarning: false
    })
  },
  // 选择查询日期
  bindDateChange: function(e) {
    let queryDate = e.detail.value
    this.setData({
      queryDate: queryDate
    })
    this.queryHistoryData()
    /* // 模拟查询
    let {
      dataTableItems,
      graphData
    } = this.formatDataList(this.data.dataIndexArray)
    this.setData({
      dataTableItems: dataTableItems,
      graphData: graphData
    })
    if (this.data.showDataGraph) {
      this.showDataGraph(true)
    } */
  },
  // 选择查询起始日期
  bindStartDateChange: function(e) {
    let queryStartDate = e.detail.value
    this.setData({
      queryStartDate: queryStartDate
    })
  },
  // 选择查询截止日期
  bindStopDateChange: function(e) {
    let queryStopDate = e.detail.value
    this.setData({
      queryStopDate: queryStopDate
    })
  },
  /* // 查询预警、备忘记录
  queryRecordHistory: function() {
    let that = this
    let {
      dataTableItems
    } = that.formatDataList(that.data.warningDataArray)
    that.setData({
      warningDataTableItems: dataTableItems
    })
  }, */
  // 切换数据显示方式
  queryCheckboxChange: function(e) {
    let that = this
    let value = e.detail.value
    if (value && value[0] == 'showGraph') {
      that.setData({
        showDataGraph: true,
        showDataTable: false
      })
      if (that.data.graphData.categories.length < 20)
        that.showDataGraph(null, true)
      else
        that.showDataGraph()
    } else {
      that.setData({
        showDataGraph: false,
        showDataTable: true
      })
    }
  },
  // 查询历史数据
  queryHistoryData: function(queryDate) {
    let that = this
    let deviceId = that.data.deviceId
    let startDate = that.data.startDate
    let stopDate = that.data.stopDate
    if (queryDate) {
      startDate = stopDate = queryDate
    }
    wx.request({
      header: app.globalData.header,
      url: config.serverUrl + config.getDeviceDataApi,
      method: 'post',
      data: {
        deviceId: deviceId,
        startDate: startDate,
        stopDate: startDate
      },
      success: function(res) {
        if (res.data && res.data.errMsg == 1) {
          console.log(res.data.data)
          let data = res.data.data
          let {
            dataTableItems,
            graphData
          } = that.formatDataList(data)
          that.setData({
            dataTableItems: dataTableItems,
            graphData: graphData
          })
        } else if (res.data.errMsg == 403) {
          return app.loginRefresh()
        } else {
          console.log('get data fail.')
        }
      }
    })
  },
  // 格式化数据
  formatDataList: function(data) {
    let dataTableItems = []

    let graphData = {}
    graphData.categories = []
    graphData.dataList = {}

    let dataGap = 0.3
    if (data.length > 500) {
      dataGap = Math.round(1 / 0.01)
    } else if (data.length > 400) {
      dataGap = Math.round(1 / 0.05)
    } else if (data.length > 300) {
      dataGap = Math.round(1 / 0.1)
    } else if (data.length > 200) {
      dataGap = Math.round(1 / 0.2)
    } else if (data.length <= 200) {
      dataGap = Math.round(1 / this.data.dataSubRatio)
    }

    for (let i = 0; i < data.length; i++) {
      if (data.length > 100 && i % dataGap != 0) {
        continue
      }
      // table
      let item = {}
      item.ttitle = new Date(data[i].date).toLocaleString()
      item.thead = ['指标', '数值', '状态']
      let indexData = data[i].data
      let indexDataArr = []
      // gragh
      graphData.categories.push(item.ttitle)
      Object.keys(indexData).forEach(key => {
        let name = app.toIndexName(key)
        // table
        indexData[key].name = name
        indexData[key].id = key
        let arr = []
        arr[0] = name
        arr[1] = indexData[key].val
        arr[2] = indexData[key].stat
        indexDataArr.push(arr)
        // graphData
        graphData.dataList[key] = graphData.dataList[key] || {}
        graphData.dataList[key].name = name
        let tempData = graphData.dataList[key].data || []
        tempData.push(arr[1])
        graphData.dataList[key].data = tempData
      })
      item.tbody = indexDataArr
      dataTableItems.push(item)
    }
    return {
      dataTableItems,
      graphData
    }
  },
  // 图表显示数据
  showDataGraph: function(updateFlag, notSubFlag) {
    let that = this
    // 默认截取数据
    notSubFlag = notSubFlag || false
    let series = []
    if (!that.data.graphData)
      return
    let graphData = that.data.graphData
    let dataMoreSubRatio = that.data.dataMoreSubRatio
    let dataSubRatio = that.data.dataSubRatio
    let dataSubLimit = that.data.dataSubLimit
    let subRatio = dataSubRatio
    if (graphData.categories.length > dataSubLimit) {
      subRatio = dataMoreSubRatio
    }
    let dataSubGap = Math.round(1 / subRatio)
    Object.keys(graphData.dataList).forEach((key, index) => {
      let data = []
      for (let i = 0; i < graphData.dataList[key].data.length; i++) {
        if (!notSubFlag) {
          if (i % dataSubGap == 0) {
            data.push(graphData.dataList[key].data[i])
          }
        } else {
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
      if (!notSubFlag) {
        if (i % dataSubGap == 0) {
          categories.push(graphData.categories[i])
        }
      } else {
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
  // 显示数据
  showDataIndex: function() {

  },
  // 格式化预警数据
  formatWarningDataToTable: function(data) {
    let that = this
    let dataTableItems = []

    for (let i = 0; i < data.length; i++) {
      // table
      let item = {}
      item.ttitle = new Date(data[i].date).toLocaleString()
      item.warningId = data[i]._id
      item.thead = ['指标', '数值', '状态']
      let indexData = data[i].data
      let indexDataArr = []
      Object.keys(indexData).forEach(key => {
        let name = app.toIndexName(key)
        // table
        indexData[key].name = name
        indexData[key].id = key
        let arr = []
        arr[0] = name
        arr[1] = indexData[key].val
        arr[2] = indexData[key].stat
        indexDataArr.push(arr)
      })
      item.tbody = indexDataArr
      dataTableItems.push(item)
    }
    return {
      dataTableItems
    }
  },
  // 更新预警备注
  updateWarningIssueNote: function(e) {
    let {
      warningId,
      warningNote
    } = e.currentTarget.dataset
    console.log(warningId, warningNote)
  },
  // 显示最新预警消息
  showLatestWarningData: function() {
    let {
      dataTableItems
    } = this.formatWarningDataToTable(this.data.warningDataArray)
    this.setData({
      warningMqttDataCount: 0,
      warningDataTableItems: dataTableItems
    })
  },
  // 删除设备
  deleteDevice: function() {
    let that = this
    wx.showModal({
      title: '提示',
      content: '确定要删除该设备吗？删除后将无法复原，影响用户使用',
      success: function(res) {
        if (res.confirm) {
          // 发送删除请求
          wx.request({
            header: app.globalData.header,
            url: config.serverUrl + config.deleteDeviceApi,
            method: 'post',
            data: {
              deviceId: that.data.deviceId
            },
            success: function(res) {
              if (res.data && res.data.errMsg == 1) {
                wx.showToast({
                  title: '删除成功',
                  mask: true
                })
                setTimeout(() => {
                  wx.navigateBack()
                }, 1500)
              } else if (res.data.errMsg == 403) {
                return app.loginRefresh()
              } else {
                wx.showToast({
                  icon: 'none',
                  title: '删除失败',
                })
              }
            }
          })
        }
      },
      fail: function() {
        wx.showToast({
          icon: 'none',
          title: '删除失败',
        })
      }
    })
  },
  // 跳转到指标详情
  goToIndexDetail: function(e) {
    let indexId = e.currentTarget.dataset.indexId
    console.log(indexId)
    wx.navigateTo({
      url: './detail/detail?deviceId=' + this.data.deviceId + '&indexId=' + indexId,
    })
  },
  // 修改数据采集时间
  changeCollectTimeConfirm: function(e) {
    let val = e.detail.value
    this.setData({
      collectTime: val
    })
  },
  changeCollecTime: function() {
    let that = this
    let collectTime = that.data.collectTime
    if (collectTime > 10 || collectTime < 1) {
      wx.showToast({
        icon: 'none',
        title: '请检查输入'
      })
      return
    }
    wx.showLoading({
      title: '正在与设备通信',
    })
    // 发送请求
    setTimeout(() => {
      wx.hideLoading()
    }, 3000)
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    // console.log(this.data.device, this.data.dataIndex);
    // 检查登陆
    app.checkLogin(null, true)
    // mqtt连接客户端clientId，为用户_id
    config.mqttOptions.clientId = app.globalData.userInfo._id
    let that = this
    let deviceId = options.deviceId
    let today = app.normalDate()
    let startDate = app.normalDate(new Date(new Date(today).getTime() - 365 * 1000 * 3600 * 24))
    that.setData({
      userInfo: app.globalData.userInfo,
      deviceId: deviceId,
      todayDate: today,
      queryStartDate: today,
      queryStopDate: today,
      startDate: startDate
    })
    // 获取当前设备信息
    that.fetchDeviceInfo()
    // 模拟
    // that.dataChangeSimulation()
    // 数据定义，指标初始化
    that.getIndexDefine()
  },
  // 获取当前设备信息
  fetchDeviceInfo: function(detail) {
    let that = this
    wx.request({
      header: app.globalData.header,
      url: config.serverUrl + config.fetchDeviceInfoApi,
      method: 'get',
      data: {
        deviceId: that.data.deviceId,
        detail: !!detail
      },
      success: function(res) {
        if (res && res.data && res.data.errMsg == 1) {
          let device = res.data.device
          device.avatarUrl = config.addServerHost(device.avatarUrl)
          device.date = config.toLocaleDateString(device.date)
          that.setData({
            device: device
          })
        } else if (res.data.errMsg == 403) {
          return app.loginRefresh()
        } else {
          console.log(res.data)
          wx.showModal({
            title: '出错了',
            content: '这套设备信息获取失败啦',
            showCancel: false,
            confirmText: '了解',
            complete: function() {
              wx.navigateBack()
            }
          })
        }
      }
    })
  },
  // mqtt连接
  mqttConnection: function() {
    let that = this
    let userInfo = that.data.userInfo
    console.log(userInfo)
    // mqtt配置
    config.mqttOptions = Object.assign(config.mqttOptions, {
      username: 'user/' + userInfo._id,
      password: userInfo.signStr,
      clientId: userInfo._id
    })
    // 连接mqtt
    mqttClient = mqtt.connect(config.mqttHost, config.mqttOptions)

    mqttClient.on('connect', function() {
      // 订阅公共消息
      mqttClient.subscribe('public/info');
      // 订阅设备数据消息
      mqttClient.subscribe('device/' + that.data.device._id + '/data')
      mqttClient.subscribe('device/' + that.data.device._id + '/warning')
      console.log('connect');
      console.log('订阅：device/', that.data.device._id + '/data')
      that.setData({
        connStatus: 'connected'
      });
    })
    // 监听消息接收
    mqttClient.on('message', function(topic, message) {
      // message is Buffer
      let json = null
      let abandonMqttDataCount = that.data.abandonMqttDataCount
      let correctMqttDataCount = that.data.correctMqttDataCount
      try {
        json = JSON.parse(message.toString())
      } catch (e) {
        console.log('收到来自', topic, '的消息', message.toString())
        if (topic == 'device/' + that.data.deviceId + '/data') {
          abandonMqttDataCount++
          that.setData({
            abandonMqttDataCount: abandonMqttDataCount,
            abandonMqttDataRatio: Number(abandonMqttDataCount / (abandonMqttDataCount + correctMqttDataCount)).toFixed(2)
          })
        }
        return
      }
      if (topic == 'device/' + that.data.deviceId + '/data') {
        correctMqttDataCount++
        that.setData({
          correctMqttDataCount: correctMqttDataCount,
          abandonMqttDataRatio: Number(abandonMqttDataCount / (abandonMqttDataCount + correctMqttDataCount)).toFixed(2)
        })
        console.log('收到来自', topic, '的消息', json)
        that.formatToShowIndexData(json)
      } else if (topic == 'device/' + that.data.deviceId + '/warning') {
        let warningDataArray = JSON.parse(JSON.stringify(that.data.warningDataArray))
        if (warningDataArray.length > 10) {
          warningDataArray = warningDataArray.slice(0, 10)
        }
        warningDataArray = [json].concat(warningDataArray)
        // if (!that.data.switchComment || !that.data.switchWarning) {
        let warningMqttDataCount = that.data.warningMqttDataCount
        warningMqttDataCount++
        warningMqttDataCount = warningMqttDataCount > 99 ? 99 : warningMqttDataCount
        that.setData({
          warningMqttDataCount: warningMqttDataCount
        })
        // }
        that.setData({
          warningDataArray: warningDataArray
        })
        console.log('收到来自', topic, '的消息', json)
      }
    })

    mqttClient.on('reconnect', (error) => {
      console.log('正在重连:', error)
    })

    mqttClient.on('error', (error) => {
      console.log('连接失败:', error)
    })
  },
  formatToShowIndexData: function(newData) {
    let that = this
    let dataIndex = JSON.parse(JSON.stringify(that.data.dataIndex))
    for (let i = 0; i < dataIndex.length; i++) {
      let id = dataIndex[i].id
      dataIndex[i].val = newData[id]
    }
    that.setData({
      dataIndex: dataIndex,
      lastMqttUpdateDate: new Date().toLocaleString()
    })
  },
  onShow: function() {
    this.mqttConnection()
  },
  onHide: function() {
    mqttClient.end()
  },
  onUnload: function() {
    mqttClient.end()
  }
})