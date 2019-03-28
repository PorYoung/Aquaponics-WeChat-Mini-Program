// pages/single/single.js
/**
 * 接下来任务
 * http请求获取设备监测数据
 * 有历史数据则调用mqttConnection连接mqtt建立mqtt通信，获取实时数据
 * 增加删除设备功能deletDevice
 */
const app = getApp()
const mqtt = require('../../utils/mqtt.min.js')
const config = Object.assign({
  // 获取设备信息Api
  fetchDeviceInfoApi: '/api/fetchDeviceInfo'
}, app.config)
// mqtt客户端实例
let mqttClient = null
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
    startDate: null,
    todayDate: null,
    // 数据对象
    dataIndexArray: [],
    dataIndex: [{
      id: 'CO2',
      n: '二氧化碳',
      val: 50,
      max: 100,
      min: 0,
      fMax: 70,
      fMin: 20
    }, {
      id: 'WT',
      n: '水温',
      val: 20,
      max: 40,
      min: -10,
      fMax: 30,
      fMin: 10
    }, {
      id: 'AT',
      n: '室温',
      val: 20,
      max: 40,
      min: -10,
      fMax: 30,
      fMin: 10
    }],
    dataTableItems: [{
      ttitle: 'd1',
      thead: ['指标', '数值', '状态'],
      tbody: [
        ['a', '3.1', -1],
        ['b', '5.2', 1],
        ['c', '2.2', 0]
      ]
    }, {
      ttitle: 'd2',
      thead: ['指标', '数值', '状态'],
      tbody: [
        ['a', '4.1', 2],
        ['b', '3.2', -2],
        ['c', '3.2', 0]
      ]
    }]
  },
  // 模拟数据变化
  dataChangeSimulation: function() {
    let that = this

    function simulate(d) {
      let s = Math.ceil((Math.random() - 0.5)) > 0 ? 1 : -1
      return Math.random() * (d.fMax - d.fMin) * s + d.val
    }
    setInterval(() => {
      let dataIndex = that.data.dataIndex
      // let dataIndexArray = that.data.dataIndexArray.push(dataIndex)
      for (let i = 0; i < dataIndex.length; i++) {
        dataIndex[i].val = simulate(dataIndex[i])
      }
      that.setData({
        dataIndex: dataIndex
      })
    }, 5000)
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
  },
  bindDateChange: function(e) {
    let queryDate = e.detail.value
    this.setData({
      queryDate: queryDate
    })
  },
  // 显示数据
  showDataIndex: function() {

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
    let indexId = e.target.dataset.indexId
    console.log(indexId)
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
      startDate: startDate
    })
    // 获取当前设备信息
    that.fetchDeviceInfo()
    // 模拟
    that.dataChangeSimulation()
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
    // mqtt配置
    config.mqttOptions = Object.assign(config.mqttOptions, {
      username: userInfo._id,
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
      try {
        json = JSON.parse(message.toString())
      } catch (e) {
        console.log('收到来自', topic, '的消息', message.toString())
        return
      }
      console.log('收到来自', topic, '的消息', json)
    })

    mqttClient.on('reconnect', (error) => {
      console.log('正在重连:', error)
    })

    mqttClient.on('error', (error) => {
      console.log('连接失败:', error)
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function() {

  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function() {

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function() {

  }
})