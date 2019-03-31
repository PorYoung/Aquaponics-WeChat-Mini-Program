//app.js
// 腾讯地图组件 暂时没用
const QQMapWX = require('./utils/qqmap-wx-jssdk.min.js')
const config = {
  MaxHistoryLength: 8,
  mqttHost: 'wxs://localhost:443',
  // mqtt主机 协议wxs
  // mqttHost: 'wxs://iot.smartaq.cn',
  // mqtt配置
  mqttOptions: {
    connectTimeout: 4000,
    // 离线消息，不清除记录
    // 要发送离线也能接收的消息，需要设置qos大于1，retain为true，参考mqtt.js库
    clean: false
  },
  // web服务器地址
  // serverUrl: 'https://iot.smartaq.cn',
  serverUrl: 'http://localhost:8081',
  // 鉴权接口，检查登陆、服务器是否有session记录
  permissionCheckUrl: '/api/permissionCheck',
  observeIndexIdArray: ['TH2O', 'PHH2O', 'TDS', 'ORP', 'LEVEL', 'TAIR', 'LIGHT', 'RHSUB', 'RHAIR'],
  // 为url添加服务器主机地址，部分后台返回的url地址（如图片地址）没有主机地址
  addServerHost: function(params) {
    let that = this
    if (params instanceof Array) {
      let resArr = []
      params.forEach(function(item) {
        item = item.replace(/\\/g, '/')
        if (!item.match(/^http|^https/)) {
          //add server prefix
          item = config.serverUrl + item
          resArr.push(config.serverUrl + item)
        }
      })
      return resArr
    } else {
      params = params.replace(/\\/g, '/')
      if (!params.match(/^http|^https/)) {
        //add server prefix
        params = config.serverUrl + params
      }
      return params
    }
  },
  // 将后台返回的Date日期转换为****-**-**格式
  toLocaleDateString: function(date) {
    if (date) {
      return new Date(date).toLocaleDateString().replace(/\//g, '-')
    }
    return new Date().toLocaleDateString().replace(/\//g, '-')
  }
}
App({
  onLaunch: function() {
    // 展示本地存储能力
    var logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
  },
  globalData: {
    // 全局用户信息，保存后台返回的用户所有的配置，同时也存储在本地
    userInfo: null,
    // 地址
    location: {
      name: null,
      address: null,
      longitude: null,
      latitude: null
    }
  },
  // 腾讯地图组件key
  qqmapsdk: new QQMapWX({
    key: 'FFOBZ-N6NRU-BD5V5-2QEZU-H6PM5-WQF5F'
  }),
  // 获取地址方法
  getLocation: function(callback) {
    let that = this
    let qqmapsdk = that.qqmapsdk
    let getCurrentLocation = () => {
      //获取当前位置坐标
      wx.getLocation({
        type: 'wgs84',
        // type: 'gcj02',
        success: res => {
          //根据坐标获取当前位置名称，显示在顶部:腾讯地图逆地址解析
          qqmapsdk.reverseGeocoder({
            location: {
              latitude: res.latitude,
              longitude: res.longitude
            },
            success: addressRes => {
              let address = addressRes.result.formatted_addresses.recommend;
              that.globalData.location = {
                longitude: res.longitude,
                latitude: res.latitude,
                address: address
              }
              that.globalData.hasLocation = true
              typeof callback === 'function' && callback(that.globalData.location)
            },
            fail: err => {
              console.log(err)
            }
          })
        },
        fail: err => {
          wx.showModal({
            title: '位置信息不可用',
            content: '请您打开位置信息，再重新进入小程序',
            showCancel: false
          })
          console.log(err)
        }
      })
    }
    //先获取用户当前的设置
    wx.getSetting({
      success(res) {
        if (!res.authSetting['scope.address']) {
          wx.authorize({
            scope: 'scope.address',
            success(res) {
              //用户授权后执行方法
              getCurrentLocation()
            },
            fail(res) {
              //用户拒绝授权后执行
              wx.showModal({
                title: '提示',
                content: '未授权位置信息,可能会造成您无法正常使用,您可在右上角设置中开启授权',
                confirmText: '了解',
                showCancel: false
              })
            }
          })
        } else {
          getCurrentLocation()
        }
      }
    })
  },
  // 全局配置，通过getApp().config获得
  config: config,
  // 用于检查登陆的函数
  // flag为true，检查服务器是否有session
  // flag为false，检查本地是否存储userInfo信息
  // cb为回调函数
  checkLogin: function(cb, flag) {
    let that = this

    function localCheck() {
      //登录态过期
      //检查本地缓存
      if (that.globalData.userInfo) {
        typeof cb == "function" && cb()
      } else {
        let info = wx.getStorageSync('userInfo')
        //存在缓存，并且缓存时间在一周内
        let dateNow = new Date().getTime()
        let expired = 1000 * 60 * 60 * 24 * 7
        if (info && (dateNow - info.saveDate) < expired) {
          that.globalData.userInfo = info
          typeof cb === "function" && cb()
        } else {
          //无缓存，重新登陆
          return false
        }
      }
    }

    function serverCheck() {
      let header = that.globalData.header
      if (!header) {
        header = wx.getStorageSync('header')
        that.globalData.header = header
      }
      wx.request({
        header: header,
        url: config.serverUrl + config.permissionCheckUrl,
        method: 'get',
        data: {
          user_id: that.globalData.userInfo._id,
          signStr: that.globalData.userInfo.signStr
        },
        success: function(res) {
          console.log(res)
          if (res && res.data && res.data.errMsg == 1) {
            typeof cb == "function" && cb()
          } else {
            that.loginRefresh()
          }
        }
      })
    }
    return flag ? serverCheck() : localCheck()
  },
  // 刷新登陆信息，清除登陆记录
  loginRefresh: function(cb) {
    let that = this
    wx.removeStorageSync('userInfo')
    that.globalData.userInfo = null
    typeof cb == "function" && cb()
    wx.showModal({
      title: '提示',
      content: '登陆信息过期，请重新登陆',
      confirmText: '了解',
      showCancel: false,
      complete: function() {
        wx.reLaunch({
          url: '/pages/login/login',
        })
      }
    })
  },
  // 返回xxxx-xx-xx格式日期，用于日期选择器
  normalDate: function(date) {
    if (date) {
      if (!(date instanceof Date)) {
        date = new Date(date)
      }
    } else {
      date = new Date()
    }
    let dd = date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate()
    return dd
  },
  // 返回数据指标对应中文名
  toIndexName: function(key) {
    let name = ''
    switch (key) {
      case 'TH2O':
        name = '水温'
        break
      case 'PHH2O':
        name = '酸碱度'
        break
      case 'TDS':
        name = '总溶解固体'
        break
      case 'ORP':
        name = '氧化还原电位'
        break
      case 'LEVEL':
        name = '水位线'
        break
      case 'TAIR':
        name = '室温'
        break
      case 'LIGHT':
        name = '光照强度'
        break
      case 'RHSUB':
        name = '土壤湿度'
        break
      case 'RHAIR':
        name = '空气湿度'
        break
    }
    return name
  },
  getSystemWindowWidth: function() {
    var windowWidth = 320;
    try {
      var res = wx.getSystemInfoSync();
      windowWidth = res.windowWidth;
    } catch (e) {
      console.error('getSystemInfoSync failed!');
    }
    return windowWidth
  },
  // 判断是否为数值
  isNum: function(v) {
    return !(v === '') && !(v === undefined) && !Number.isNaN(Number(v))
  }
})