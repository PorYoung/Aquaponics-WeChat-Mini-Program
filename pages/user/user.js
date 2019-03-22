// pages/user/user.js
const app = getApp()
const config = Object.assign({
  addDeviceApi: '/api/addADevice'
}, app.config)
Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: null,
    deviceAvatarTempSrc: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    let that = this
    /* 
      check login
    */
    let state = app.checkLogin(null, true)
    if (state == false) {
      app.loginRefresh()
    } else {
      that.setData({
        userInfo: app.globalData.userInfo
      })
    }
  },
  addDeviceFromShow: function() {
    if (!this.data.addDeviceFromFlag) {
      this.setData({
        addDeviceFromFlag: 1
      })
      setTimeout((that = this) => {
        that.setData({
          addDeviceFromFlag: 2
        })
      }, 100)
    } else {
      this.setData({
        addDeviceFromFlag: 1
      })
      setTimeout((that = this) => {
        that.setData({
          addDeviceFromFlag: false,
          deviceAvatarTempSrc: ''
        })
      }, 100)
    }
  },
  addDeviceSubmit: function(e) {
    let that = this
    let value = e.detail.value
    console.log(value)
    if (!value.devicePassword || !value.devicePasswordConfirm) {
      wx.showToast({
        title: '请输入设备密码',
      })
      return
    }
    if (value.devicePassword != value.devicePasswordConfirm) {
      wx.showToast({
        title: '两次密码不匹配',
      })
      return
    }
    wx.showToast({
      icon: "loading",
      title: "正在添加",
      mask: true
    })
    wx.uploadFile({
      header: app.globalData.header,
      url: config.serverUrl + config.addDeviceApi,
      filePath: that.data.deviceAvatarTempSrc,
      name: 'file',
      formData: {
        user_id: that.data.userInfo._id,
        password: value.devicePassword,
        tag: value.deviceTag,
        description: value.deviceDesc,
        name: value.deviceName
      },
      success: function(res) {
        if (res && res.data) {
          let data = JSON.parse(res.data)
          if (data.errMsg == 403) {
            return app.loginRefresh()
          }
          if (data.errMsg == 1) {
            wx.showToast({
              icon: 'success',
              title: '添加成功',
            })
          } else {
            wx.showModal({
              title: '出错了',
              content: '抱歉，添加失败',
              showCancel: false
            })
          }
        }
      },
      fail: function(e) {
        console.log(e)
        wx.showModal({
          title: '提示',
          content: '添加失败，请检查图片',
          showCancel: false
        })
      },
      complete: function() {
        wx.hideToast()
      }
    })
  },
  chooseDeviceAvatar: function(e) {
    var that = this;
    wx.chooseImage({
      count: 1, // 默认9
      sizeType: ['original', 'compressed'], // 可以指定是原图还是压缩图，默认二者都有
      sourceType: ['album', 'camera'], // 可以指定来源是相册还是相机，默认二者都有
      success: function(res) {
        // 返回选定照片的本地文件路径列表，tempFilePath可以作为img标签的src属性显示图片
        var deviceAvatarTempSrc = res.tempFilePaths[0];
        that.setData({
          deviceAvatarTempSrc: deviceAvatarTempSrc
        })
      }
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