//index.js
//获取应用实例
const app = getApp()
const config = Object.assign({
  // 获取设备Api
  fetchOwnedDeviceApi: '/api/fetchOwnedDevice',
  // 绑定新设备Api
  bindDeviceApi: '/api/bindDevice',
}, app.config)
Page({
  data: {
    userInfo: null,
    hasUserInfo: false,
    location: {
      address: '获取位置'
    },
    hasLocation: false,
    searchValue: null,
    searchFocus: false,
    searchHistory: [],
    searchSuggestionData: [],
    deviceList: [],
    devicePage: -1
  },
  onLoad: function() {
    let that = this
    // 登陆检查
    let state = app.checkLogin(null, true)
    if (state == false) {
      // switch to user login
    } else {
      that.setData({
        userInfo: app.globalData.userInfo
      })
    }
    // 获取设备列表 在onShow中获取，避免首次加载重复请求
    // that.fetchDeviceList()
  },
  // 获取设备列表
  fetchDeviceList: function(cb) {
    let that = this
    /* if (that.data.devicePage == -2) {
      wx.showToast({
        title: '刷新成功'
      })
      return typeof cb == "function" && cb()
    } */
    wx.showLoading({
      title: '努力加载中',
    })
    wx.request({
      header: app.globalData.header,
      url: config.serverUrl + config.fetchOwnedDeviceApi,
      data: {
        user_id: that.data.userInfo._id,
        signStr: that.data.userInfo.signStr,
        page: that.data.devicePage,
        sortBy: 'date',
        order: -1
      },
      success: function(res) {
        if (res && res.statusCode == 200 && res.data) {
          console.log('fetchOwnedDevice:', res.data)
          if (res.data.errMsg == 403) {
            return app.loginRefresh()
          }
          if (res.data.errMsg == 1) {
            let devices = res.data.devices || []
            devices.forEach((item) => {
              if (!!item.avatarUrl) {
                item.avatarUrl = config.addServerHost(item.avatarUrl)
              }
              item.date = config.toLocaleDateString(item.date)
            })
            let deviceList = [].concat(that.data.deviceList)
            if (that.data.devicePage < 0) {
              deviceList = devices
            } else {
              deviceList = deviceList.concat(devices)
            }
            that.setData({
              deviceList: deviceList
            })
            /* if (that.data.devicePage) {
              that.setData({
                devicePage: -2
              })
            } */
          } else {
            wx.showToast({
              title: '抱歉，获取失败',
              icon: 'none'
            })
          }
        }
        typeof cb == "function" && cb()
      },
      complete: function() {
        wx.hideLoading()
        return typeof cb == "function" && cb()
      }
    })
  },
  // 显示绑定设备面板
  bindDeviceFormShow: function() {
    if (!this.data.bindDeviceFromFlag) {
      this.setData({
        bindDeviceFromFlag: 1
      })
      setTimeout((that = this) => {
        that.setData({
          bindDeviceFromFlag: 2
        })
      }, 100)
    } else {
      this.setData({
        bindDeviceFromFlag: 1
      })
      setTimeout((that = this) => {
        that.setData({
          bindDeviceFromFlag: false
        })
      }, 100)
    }
  },
  // 提交绑定设备
  bindDeviceSubmit: function(e) {
    let that = this
    let value = e.detail.value
    console.log(value)
    if (!value.deviceId || !value.devicePassword || !value.deviceTag) {
      wx.showToast({
        title: '请检查您的输入',
        icon: 'none'
      })
      return
    }
    wx.showLoading({
      title: '通信中',
    })
    wx.request({
      header: app.globalData.header,
      url: config.serverUrl + config.bindDeviceApi,
      method: 'post',
      data: {
        user_id: that.data.userInfo._id,
        deviceId: value.deviceId,
        password: value.devicePassword,
        tag: value.deviceTag,
        name: value.deviceName
      },
      success: function(res) {
        if (res && res.statusCode == 200 && res.data) {
          let data = res.data
          if (data.errMsg == 403) {
            return app.loginRefresh()
          }
          if (data.errMsg == 1) {
            wx.showToast({
              icon: 'success',
              title: '绑定成功',
            })
            let device = res.data.device
            device.avatarUrl = config.addServerHost(device.avatarUrl)
            device.date = config.toLocaleDateString(device.date)
            let deviceList = that.data.deviceList
            let isNew = true
            for (let i = 0; i < deviceList.length; i++) {
              if (deviceList[i]._id == device._id) {
                deviceList[i] = device
                isNew = false
                break
              }
            }
            if (isNew) {
              deviceList = [device].concat(deviceList)
            }
            that.setData({
              deviceList: deviceList
            })
          } else if (data.errMsg == -1) {
            wx.showModal({
              title: '提示',
              content: '您已绑定该设备，无需重复绑定',
              showCancel: false
            })
          } else {
            wx.showModal({
              title: '出错了',
              content: '设备不存在或密码错误',
              showCancel: false
            })
          }
        }
      },
      fail: function(e) {
        console.log(e)
        wx.showModal({
          title: '提示',
          content: '绑定失败，请检查网络',
          showCancel: false
        })
      },
      complete: function() {
        wx.hideLoading()
      }
    })
  },
  // 显示搜索面板
  searchBoardOn: function() {
    let that = this
    that.setData({
      searchFocus: true
    })
  },
  // 隐藏搜索面板
  searchBoardOff: function() {
    let that = this
    that.setData({
      searchFocus: false
    })
  },
  searchSuggestion: function(e) {
    let that = this
    return wx.showToast({
      icon: 'none',
      title: '功能开发中',
    })
    /*request for data

    */
    let key = e.detail.value
    if (key === '') {
      that.setData({
        searchSuggestionResult: []
      })
      return
    }
    let ssData = that.data.searchSuggestionData
    let ssResult = ssData.filter(item => {
      return item.indexOf(key) != -1
    }).sort((a, b) => {
      return a.indexOf(key) - b.indexOf(key)
    })
    that.setData({
      searchSuggestionResult: ssResult
    })
  },
  searchSubmit: function(e) {
    let that = this
    return wx.showToast({
      icon: 'none',
      title: '功能开发中',
    })
    let dataset = e.currentTarget.dataset
    let sv = null
    //search from suggestion
    if (dataset.hasOwnProperty('ssid')) {
      sv = that.data.searchSuggestionResult[dataset.ssid]
    }
    //search from history
    else if (dataset.hasOwnProperty('shid')) {
      sv = that.data.searchHistory[dataset.shid]
    }
    //search directly
    else {
      sv = e.detail.value
    }
    that.setData({
      searchValue: sv
    })
    console.log('search submit:' + sv)
    /*request

    */
    that.searchBoardOff()
    //add to search history and delete history
    let sh = that.data.searchHistory
    if (!sh.includes(sv)) {
      sh = [sv].concat(sh).slice(0, config.MaxHistoryLength)
    } else {
      sh = sh.splice(sh.indexOf(sv), 1).concat(sh)
    }
    that.setData({
      searchHistory: sh
    })
    wx.setStorageSync('searchHistory', sh)

    //navigate to search page
    wx.navigateTo({
      url: '../search/search?sv='.concat(sv),
      fail: function(res) {
        wx.showToast({
          title: '请求失败，请重试',
          icon: 'none'
        })
      },
    })
  },
  deleteHistory: function() {
    let that = this
    that.setData({
      searchHistory: []
    })
    wx.setStorageSync('searchHistory', [])
    console.log('delete history')
  },
  getLocation: function() {
    let that = this
    if (app.globalData.hasLocation === true) {
      that.setData({
        location: app.globalData.location,
        hasLocation: true
      })
    } else {
      app.getLocation(location => {
        that.setData({
          location: location,
          hasLocation: true
        })
      })
    }
  },
  tapToGetLocation: function() {
    let that = this
    that.getLocation()
    wx.chooseLocation({
      success: function(res) {
        app.globalData.location = res
        that.setData({
          location: res
        })
        console.log(that.data.location)
      },
    })
  },
  navToSingle: function(e) {
    let that = this
    let deviceId = e.currentTarget.dataset.deviceId
    wx.navigateTo({
      url: '../single/single?deviceId='.concat(deviceId),
    })
  },
  onShow: function() {
    let that = this
    // get user location
    that.getLocation()
    // check user info
    if (that.data.userInfo) {
      // refresh devices' list
      that.fetchDeviceList()
      //get user local search history
      let searchHistory = wx.getStorageSync('searchHistory') || []
      that.setData({
        searchHistory: searchHistory
      })
    }
  },
  // 下拉刷新事件，下拉重新获取设备列表（未来可能设置分页获取，目前设为-1，获取全部，设为-2表示已全部获取）
  onPullDownRefresh: function() {
    this.fetchDeviceList(function() {
      wx.stopPullDownRefresh()
    })
  }
})