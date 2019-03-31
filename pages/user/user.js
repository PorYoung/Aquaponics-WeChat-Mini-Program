// pages/user/user.js
const app = getApp()
const config = Object.assign({
  // 添加设备Api
  addDeviceApi: '/api/addADevice'
}, app.config)
Page({

  /**
   * 页面的初始数据
   */
  data: {
    userInfo: null,
    // 设备上传头像临时地址
    deviceAvatarTempSrc: '',
    observeIndexIdArray: [],
    observeIndexNameArray: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    let that = this
    /* 
      check login
    */
    app.checkLogin(null, true)
    let observeIndexIdArray = config.observeIndexIdArray
    let observeIndexNameArray = []
    observeIndexIdArray.forEach(item => {
      observeIndexNameArray.push(app.toIndexName(item))
    })
    that.setData({
      userInfo: app.globalData.userInfo,
      observeIndexIdArray: observeIndexIdArray,
      observeIndexNameArray: observeIndexNameArray
    })
  },
  // 显示添加设备面板（普通用户，level=0，不显示）
  addDeviceFormShow: function() {
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
  // 添加设备
  addDeviceSubmit: function(e) {
    let that = this
    let value = e.detail.value
    if (!value.devicePassword || !value.devicePasswordConfirm) {
      wx.showToast({
        title: '请输入设备密码',
        mask: true
      })
      return
    }
    if (value.devicePassword != value.devicePasswordConfirm) {
      wx.showToast({
        title: '两次密码不匹配',
        mask: true
      })
      return
    }
    let indexDefine = {}
    Object.keys(value).forEach(key => {
      let ks = key.split('-')
      if (ks.length > 1) {
        let id = ks[0]
        let type = ks[1]
        if (that.data.observeIndexIdArray.includes(id)) {
          indexDefine[id] = indexDefine[id] || {}
          if (!app.isNum(value[key])) {
            if (type == 'min') {
              indexDefine[id][type] = 0
            } else if (type == 'max') {
              indexDefine[id][type] = 100
            } else if (type == 'fMin') {
              indexDefine[id][type] = 0
            } else if (type == 'fMax') {
              indexDefine[id][type] = 100
            }
          } else {
            indexDefine[id][type] = Number(value[key])
          }
        }
      }

    })
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
        name: value.deviceName,
        define: JSON.stringify(indexDefine)
      },
      success: function(res) {
        if (res && res.statusCode == 200 && res.data) {
          let data = JSON.parse(res.data)
          if (data.errMsg == 403) {
            return app.loginRefresh()
          }
          if (data.errMsg == 1) {
            wx.hideToast()
            wx.showToast({
              title: '添加成功',
              mask: true
            })
            that.addDeviceFormShow()
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
    })
  },
  // 选择设备头像
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
  }
})