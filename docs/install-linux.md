# Linux 安装指南

## 系统要求
- Linux 发行版：Ubuntu 18.04+、Debian 10+、CentOS 8+、Fedora 32+ 或其他主流发行版
- 桌面环境：GNOME、KDE、XFCE、LXDE 等
- 支持架构：x64、ARM64
- 推荐：4GB RAM，200MB 可用磁盘空间

## 下载安装包

### 方式一：从 GitHub Releases 下载（推荐）
1. 访问 [GitHub Releases 页面](https://github.com/sdutacm/oj-competition-side-client/releases)
2. 选择最新版本
3. 根据您的发行版下载对应的安装包：
   - **AppImage 格式**：`SDUT-OJ-Competition-Client-{version}.AppImage`（通用，推荐）
   - **DEB 格式**：`sdut-oj-competition-client_{version}_amd64.deb`（Debian/Ubuntu）
   - **RPM 格式**：`sdut-oj-competition-client-{version}.x86_64.rpm`（Red Hat/CentOS/Fedora）

### 方式二：从官方网站下载
1. 访问 [SDUT OJ 官网](https://oj.sdutacm.cn)
2. 在下载页面选择 Linux 版本

## 安装方法

### AppImage 格式（推荐 - 无需安装）

AppImage 是一个便携应用格式，无需安装即可运行：

1. **下载并设置权限**：
   ```bash
   # 下载后给予执行权限
   chmod +x SDUT-OJ-Competition-Client-{version}.AppImage
   ```

2. **直接运行**：
   ```bash
   # 双击运行或使用命令行
   ./SDUT-OJ-Competition-Client-{version}.AppImage
   ```

3. **集成到系统（可选）**：
   ```bash
   # 移动到用户应用目录
   mkdir -p ~/.local/bin
   mv SDUT-OJ-Competition-Client-{version}.AppImage ~/.local/bin/sdut-oj-client
   
   # 创建桌面快捷方式
   mkdir -p ~/.local/share/applications
   cat > ~/.local/share/applications/sdut-oj-client.desktop << EOF
   [Desktop Entry]
   Version=1.0
   Type=Application
   Name=SDUT OJ Competition Client
   Comment=SDUT OJ 竞赛客户端
   Exec=$HOME/.local/bin/sdut-oj-client
   Icon=sdut-oj-competition-client
   Terminal=false
   Categories=Education;Development;
   EOF
   ```

### DEB 格式（Debian/Ubuntu 系统）

1. **使用 dpkg 安装**：
   ```bash
   sudo dpkg -i sdut-oj-competition-client_{version}_amd64.deb
   
   # 如果有依赖问题，运行：
   sudo apt-get install -f
   ```

2. **使用 apt 安装**：
   ```bash
   sudo apt install ./sdut-oj-competition-client_{version}_amd64.deb
   ```

3. **使用图形界面安装**：
   - 双击 `.deb` 文件
   - 在软件中心中点击"安装"

### RPM 格式（Red Hat/CentOS/Fedora 系统）

1. **使用 rpm 安装**：
   ```bash
   sudo rpm -i sdut-oj-competition-client-{version}.x86_64.rpm
   ```

2. **使用 dnf 安装**（Fedora）：
   ```bash
   sudo dnf install sdut-oj-competition-client-{version}.x86_64.rpm
   ```

3. **使用 yum 安装**（CentOS/RHEL）：
   ```bash
   sudo yum localinstall sdut-oj-competition-client-{version}.x86_64.rpm
   ```

## 首次运行

### 从应用菜单启动
安装完成后，可以从应用菜单中找到"SDUT OJ Competition Client"并启动。

### 从命令行启动
```bash
# 如果已安装到系统
sdut-oj-competition-client

# 或者
/opt/SDUT\ OJ\ Competition\ Client/sdut-oj-competition-client
```

## 疑难解答

### 依赖问题

**缺少依赖库**：
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install libnss3 libatk-bridge2.0-0 libdrm2 libxss1 libgtk-3-0 libxrandr2 libasound2 libatspi2.0-0 libxcomposite1 libxdamage1 libxfixes3

# CentOS/RHEL/Fedora
sudo yum install nss atk at-spi2-atk gtk3 libXrandr alsa-lib libXcomposite libXdamage libXfixes

# 或使用 dnf（Fedora）
sudo dnf install nss atk at-spi2-atk gtk3 libXrandr alsa-lib libXcomposite libXdamage libXfixes
```

**AppImage 依赖问题**：
```bash
# 安装 FUSE（如果 AppImage 无法运行）
# Ubuntu/Debian
sudo apt install fuse

# CentOS/RHEL
sudo yum install fuse

# Fedora
sudo dnf install fuse
```

### 权限问题

**应用无法启动**：
```bash
# 检查并修复可执行权限
sudo chmod +x /opt/SDUT\ OJ\ Competition\ Client/sdut-oj-competition-client

# 对于 AppImage
chmod +x SDUT-OJ-Competition-Client-{version}.AppImage
```

### 图标和桌面集成问题

**桌面快捷方式不显示**：
```bash
# 更新桌面数据库
update-desktop-database ~/.local/share/applications/

# 或系统级别（需要 sudo）
sudo update-desktop-database /usr/share/applications/
```

### 网络连接问题

**防火墙设置**：
```bash
# 如果使用 ufw（Ubuntu）
sudo ufw allow out 80
sudo ufw allow out 443

# 如果使用 firewalld（CentOS/Fedora）
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 字体渲染问题

**字体显示异常**：
```bash
# 安装必要的字体
# Ubuntu/Debian
sudo apt install fonts-noto fonts-noto-cjk fonts-liberation

# CentOS/RHEL/Fedora
sudo yum install google-noto-fonts google-noto-cjk-fonts liberation-fonts
```

## 卸载方法

### DEB 包卸载
```bash
sudo apt remove sdut-oj-competition-client
# 或完全卸载（包括配置文件）
sudo apt purge sdut-oj-competition-client
```

### RPM 包卸载
```bash
sudo rpm -e sdut-oj-competition-client
# 或
sudo dnf remove sdut-oj-competition-client  # Fedora
sudo yum remove sdut-oj-competition-client  # CentOS/RHEL
```

### AppImage 卸载
```bash
# 删除 AppImage 文件
rm ~/.local/bin/sdut-oj-client

# 删除桌面快捷方式
rm ~/.local/share/applications/sdut-oj-client.desktop
```

### 清理用户数据（可选）
```bash
# 删除应用数据和缓存
rm -rf ~/.config/sdut-oj-competition-client
rm -rf ~/.cache/sdut-oj-competition-client
rm -rf ~/.local/share/sdut-oj-competition-client
```

## 系统集成优化

### 设置文件关联
如果需要将特定文件类型关联到应用，可以编辑 `.desktop` 文件添加 MIME 类型。

### 添加到系统 PATH
```bash
# 将 AppImage 添加到 PATH
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

### 开机自启动
```bash
# 创建自启动文件
mkdir -p ~/.config/autostart
cp /usr/share/applications/sdut-oj-competition-client.desktop ~/.config/autostart/
```

## 不同发行版特殊说明

### Arch Linux
```bash
# 使用 AUR 助手安装（如果有 AUR 包）
yay -S sdut-oj-competition-client-bin
```

### Flatpak 支持
如果将来提供 Flatpak 版本：
```bash
flatpak install flathub cn.sdutacm.OJCompetitionClient
```

---

如有其他问题，请访问 [GitHub Issues](https://github.com/sdutacm/oj-competition-side-client/issues) 获取帮助。
