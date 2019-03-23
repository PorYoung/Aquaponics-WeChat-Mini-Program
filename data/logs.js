let logs = [{
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