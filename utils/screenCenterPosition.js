const { screen} = require('electron');
/**
 * 计算窗口严格居中的位置
 * 考虑 Mac 系统的菜单栏和 Dock 影响
 */
function calculateCenteredPosition(width, height) {
  const primaryDisplay = screen.getPrimaryDisplay();
  const workArea = primaryDisplay.workArea;
  const bounds = primaryDisplay.bounds;
  
  // 在 Mac 系统上，需要考虑菜单栏和 Dock 的影响
  if (process.platform === 'darwin') {
    // 使用 workArea 而不是 bounds，workArea 已经排除了菜单栏和 Dock
    const x = Math.round(workArea.x + (workArea.width - width) / 2);
    const y = Math.round(workArea.y + (workArea.height - height) / 2);
    return { x, y };
  } else {
    // Windows 和 Linux 系统使用 bounds
    const x = Math.round(bounds.x + (bounds.width - width) / 2);
    const y = Math.round(bounds.y + (bounds.height - height) / 2);
    return { x, y };
  }
}

module.exports = {
    calculateCenteredPosition
}