let lastTime = 0;
let requestAnimationFrame = function (callback, element) {
  let currTime = new Date().getTime();
  let timeToCall = Math.max(0, 16 - (currTime - lastTime));
  let id = setTimeout(function () { callback(currTime + timeToCall); },
    timeToCall);
  lastTime = currTime + timeToCall;
  return id;
};

module.exports = requestAnimationFrame;