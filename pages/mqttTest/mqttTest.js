// pages/mqttTest/mqttTest.js
const app = getApp();
const mqtt = require('../../utils/mqtt.min.js');
let config, mqttClient = null;

// 本地测试设备账户
// 当前账户在数据库中的_id
const mqttUser = '5c8e3f2519bfdc2ae02e25b1'
// openid md5加密
const mqttPass = 'f8f980263ff8361e33911302a8fe6d66'
const mqttDevice = '5ca066a639184d3940f263e6'


/* // 服务器测试账户
const mqttUser = '5c9456f1179b7171ce19e773'
const mqttPass = 'f8f980263ff8361e33911302a8fe6d66'
const mqttDevice = '5c98db0322a74e08f9d4a26b' */
Page({

  /**
   * 页面的初始数据
   */
  data: {
    // 服务器测试账户
    username: 'user/' + mqttUser,
    password: mqttPass,
    clientId: null,
    publishTopic: 'device/' + mqttDevice + '/instruction',
    subscribeTopic: 'device/' + mqttDevice + '/data',
    publishMessage: null,
    message: [],
    subscribeMsg: [],
    publishMsg: [],
    pickerStartDate: '',
    pickerStopDate: '',
    deviceId: '5c972008c268aa41a0b83af1'
  },
  onLoad: function() {
    app.checkLogin(null, true)
    config = Object.assign({}, app.config);
    console.log(config);
    this.setData({
      userInfo: app.globalData.userInfo,
      pickerEndDate: app.normalDate(),
      pickerStartDate: app.normalDate((new Date()).getTime() - 1000 * 3600 * 24 * 7)
    })
  },
  connectionSubmit: function(event) {
    let that = this;
    let value = event.detail.value;
    let {
      username,
      password
    } = value;
    // let clientId = username.concat(Math.floor(Math.random() * 10000));
    let clientId = username;
    that.setData({
      username: username,
      password: password,
      clientId: clientId
    });
    config.mqttOptions = Object.assign(config.mqttOptions, {
      username,
      password,
      clientId
    });
    mqttClient = mqtt.connect(config.mqttHost, config.mqttOptions);

    mqttClient.on('connect', function() {
      mqttClient.subscribe('public/info');
      console.log('connect');
      that.setData({
        connStatus: 'connected'
      });
    })

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
  disconnectMqtt: function(event) {
    mqttClient.end()
    this.setData({
      connStatus: 'disconnected'
    })
  },
  subscribeSubmit: function(event) {
    let that = this;
    let value = event.detail.value;
    let {
      subscribeTopic
    } = value;
    if (mqttClient != null && mqttClient.connected && subscribeTopic != '') {
      mqttClient.subscribe(subscribeTopic, (err) => {
        if (!err) {
          console.log('订阅成功,topic:' + subscribeTopic);
        }
      })
    }
  },
  publishSubmit: function(event) {
    let that = this;
    let value = event.detail.value;
    let {
      publishTopic,
      publishMessage
    } = value;
    if (mqttClient != null && mqttClient.connected && publishTopic != '') {
      mqttClient.publish(publishTopic, publishMessage, {
        qos: 1,
        retain: true
      }, (err) => {
        if (!err) {
          console.log('发布成功,topic:' + publishTopic + ', msg:' + publishMessage);
        }
      })
    }
  },
  bindStopDateChange: function(event) {
    let date = event.detail.value
    this.setData({
      stopDate: date
    })
  },
  bindStartDateChange: function(event) {
    let date = event.detail.value
    this.setData({
      startDate: date
    })
  },
  getDeviceData: function(event) {
    let that = this
    let count, deviceId;
    if (event.detail.value) {
      count = event.detail.value.count
      deviceId = event.detail.value.deviceId
    }
    wx.request({
      header: app.globalData.header,
      url: config.serverUrl + '/api/getDeviceData',
      method: 'post',
      data: {
        deviceId: deviceId,
        count: count,
        startDate: that.data.startDate,
        stopDate: that.data.stopDate
      },
      success: function(res) {
        if (res.data && res.data.errMsg == 1) {
          console.log(res.data.data)
        } else {
          console.log('get data fail.')
        }
      }
    })
  },
  onUnload: function() {
    mqttClient.end();
  }
})