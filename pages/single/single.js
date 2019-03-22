// pages/single/single.js
const app = getApp()
const mqtt = require('../../utils/mqtt.min.js')
const config = Object.assign({
  fetchDeviceInfoApi: '/api/fetchDeviceInfo'
}, app.config)
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

  },
  showDeviceDetail: function() {
    let that = this
    that.setData({
      showDeviceDetail: !that.data.showDeviceDetail
    })
  },
  switchToContent: function(e) {
    console.log(e, this.data.switchComment)
    if (this.data.switchComment == false) {
      return
    }
    this.setData({
      switchComment: false
    })
  },
  switchToComment: function(e) {
    console.log(e, this.data.switchComment)
    if (this.data.switchComment == true) {
      return
    }
    this.setData({
      switchComment: true
    })
  },
  showDataIndex: function() {

  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    // console.log(this.data.device, this.data.dataIndex);
    app.checkLogin(null, true)
    config.mqttOptions.clientId = app.globalData.userInfo._id
    let that = this
    let deviceId = options.deviceId
    that.setData({
      userInfo: app.globalData.userInfo,
      deviceId: deviceId
    })
    that.fetchDeviceInfo()
  },
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
  mqttConnection: function() {
    config.mqttOptions = Object.assign(config.mqttOptions, {
      username: userInfo._id,
      password: userInfo.signStr,
      clientId: userInfo._id
    })
    mqttClient = mqtt.connect(config.mqttHost, config.mqttOptions)

    mqttClient.on('connect', function() {
      mqttClient.subscribe('/public/systemInfo');
      mqttClient.subscribe('/device/' + that.data.device._id)
      console.log('connect');
      console.log('订阅：/device/', that.data.device._id)
      that.setData({
        connStatus: 'connected'
      });
    })

    mqttClient.on('message', function(topic, message) {
      // message is Buffer
      console.log('收到来自', topic, '的消息', message.toString())
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