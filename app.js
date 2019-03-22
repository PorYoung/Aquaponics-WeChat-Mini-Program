//app.js
const QQMapWX = require('./utils/qqmap-wx-jssdk.min.js')
const config = {
  MaxHistoryLength: 8,
  // mqttHost: 'wxs://localhost:443',
  mqttHost: 'wxs://fishV.smartaq.cn',
  mqttOptions: {
    connectTimeout: 4000,
    clean: false
  },
  serverUrl: 'https://fishV.smartaq.cn',
  // serverHttpsUrl: 'https://localhost:443',
  permissionCheckUrl: '/api/permissionCheck',
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
    userInfo: null,
    location: {
      name: null,
      address: null,
      longitude: null,
      latitude: null
    }
  },
  qqmapsdk: new QQMapWX({
    key: 'FFOBZ-N6NRU-BD5V5-2QEZU-H6PM5-WQF5F'
  }),
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
  config: config,
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
  }
})