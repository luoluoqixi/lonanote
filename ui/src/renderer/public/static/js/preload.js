/**
 * loading
 */
const initLoading = (colorMode) => {
  // const startTime = new Date().getTime();
  const _root = document.getElementById('root');
  if (_root && _root.innerHTML === '') {
    const backgroundColor = colorMode === 'dark' ? 'black' : 'white';
    const fontColor = colorMode === 'dark' ? 'white' : 'black';
    const loadingDiv = document.createElement('div');
    loadingDiv.style = `background:${backgroundColor};position:absolute;left:0;top:0;width:100%;height:100%;z-index: 9999;`;
    loadingDiv.innerHTML = `
    <style>
    html,
    body,
    #root {
      height: 100%;
      margin: 0;
      padding: 0;
      background:${backgroundColor};
      app-region: drag;
    }
    #root {
      background-repeat: no-repeat;
      background-size: 100% auto;
    }
    .preload-loading-title {
      pointer-events: none;
      font-size: 1.5rem;
      font-weight: bold;
      color: ${fontColor};
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    }
    .preload-loading-fade-in-out {
      animation: preloadLoadingfadeEffect 1.5s ease-in-out forwards;
    }
    @keyframes preloadLoadingfadeEffect {
      0% {
        opacity: 0;
      }
      50% {
        opacity: 1;
      }
      80% {
        opacity: 1;
      }
      100% {
        opacity: 0;
      }
    }
  </style>
  <div
    style="
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      min-height: 362px;
      z-index: 9999;
    "
  >
    <div class="preload-loading-title preload-loading-fade-in-out">
      LonaNote
    </div>
  </div>
    `;
    _root.parentElement.insertBefore(loadingDiv, _root.nextSibling);
    const waitTime = 1000;
    setTimeout(() => {
      const interval = setInterval(() => {
        if (window.initializeSuccess) {
          // const endTime = new Date().getTime();
          // console.debug(`${(endTime - startTime) / 1000} 秒`);
          //background:linear-gradient(#cf85a4, #534e81);
          _root.parentElement.removeChild(loadingDiv);
          clearInterval(interval);
        }
      }, 10);
    }, waitTime);
  }
};
(function () {
  initLoading('light');
})();
