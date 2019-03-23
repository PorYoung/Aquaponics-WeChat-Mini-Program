// pages/single/single.js
/**
 * 接下来任务
 * http请求获取设备监测数据
 * 有历史数据则调用mqttConnection连接mqtt建立mqtt通信，获取实时数据
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
    // 数据对象
    dataIndex: null
  },
  // 显示设备详情面板
  showDeviceDetail: function() {
    let that = this
    that.setData({
      showDeviceDetail: !that.data.showDeviceDetail
    })
  },
  // 切换到数据面板
  switchToContent: function(e) {
    console.log(e, this.data.switchComment)
    if (this.data.switchComment == false) {
      return
    }
    this.setData({
      switchComment: false
    })
  },
  // 切换到记录面板
  switchToComment: function(e) {
    console.log(e, this.data.switchComment)
    if (this.data.switchComment == true) {
      return
    }
    this.setData({
      switchComment: true
    })
  },
  // 显示数据
  showDataIndex: function() {

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
    that.setData({
      userInfo: app.globalData.userInfo,
      deviceId: deviceId
    })
    // 获取当前设备信息
    that.fetchDeviceInfo()
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