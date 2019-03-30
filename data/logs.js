let logs = [{
    "date": "3-30",
    "time": "->8:44",
    "content": "1.使用wxChart数据图显示数据",
    "author": "PorYoung"
  }, {
    "date": "3-29",
    "time": "->21:00",
    "content": "1.完善模拟数据变化\n2.增加表格显示数据",
    "author": "PorYoung"
  }, {
    "date": "3-28",
    "time": "->16:00",
    "content": "1.在设备详情页面增加历史面板——表格样式，目前只能查询一日的数据【完善：1.数据图形式；2.时间区间内数据】\n2.模拟数据变化",
    "author": "PorYoung"
  }, {
    "date": "3-26",
    "time": "23:00",
    "content": "服务器鉴权方式改变，所有等级为2的开发者直接通过验证，接收和发布设备消息；等级为1的管理者只能管理所属的设备；等级为0的用户只能管理自己绑定的设备",
    "author": "PorYoung"
  },
  {
    "date": "3-26",
    "time": "23:00",
    "content": "物联网设备已经能上传设备，服务器新增了删除设备、取消绑定设备、获取设备数据等接口，具体参考文档",
    "author": "PorYoung"
  },
  {
    "date": "3-26",
    "time": "23:00",
    "content": "1.添加mqtt测试页面，用于请求测试\n2.注意所有wx.request()需要加上app.globalData.header，已保证session不变",
    "author": "PorYoung"
  },
  {
    "date": "3-24",
    "time": "12:30",
    "content": "添加开发日志页面，记录开发日志，数据保存在/data/logs.js",
    "author": "PorYoung"
  },
  {
    "date": "3-23",
    "time": "11:40",
    "content": "1.添加测试设备：安思瑶手中的设备，实际数据测试等待3-24进行\n2.在设备详情页面`pages/single`添加删除设备按钮，由于服务器Api未实现，此功能尚未完成\n\n设备头像如下：",
    "images": ["https://iot.smartaq.cn/static/image/device/d307063fdaa718b5284dae227e305232.png"],
    "author": "PorYoung"
  },
  {
    "date": "3-23",
    "time": "11:00",
    "content": "1.修复首页不能自动刷新设备列表\n2.修复当page为-1时获取全部设备时，首页获取的设备列表是concat而不是覆盖的问题\n3.修复首页首次加载重复获取设备请求",
    "author": "PorYoung"
  },
  {
    "date": "3-23",
    "time": "9:00",
    "content": "更改部分方法拼写错误",
    "author": "PorYoung"
  },
  {
    "date": "3-23",
    "time": "7:00",
    "content": "为代码添加注释",
    "author": "PorYoung"
  }
]
module.exports = logs