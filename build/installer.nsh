!macro customInstall
  ; 安全的应用程序安装 - 移除所有可能导致蓝屏的系统操作
  DetailPrint "正在安全安装应用程序..."
  
  ; 确保图标文件被复制到安装目录（安全操作）
  SetOutPath "$INSTDIR"
  File "${PROJECT_DIR}\public\favicon.ico"
  
  ; 安全创建桌面快捷方式
  CreateShortCut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_FILENAME}" "" "$INSTDIR\favicon.ico" 0
  
  ; 安全创建开始菜单快捷方式
  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_FILENAME}" "" "$INSTDIR\favicon.ico" 0
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\卸载 ${PRODUCT_NAME}.lnk" "$INSTDIR\Uninstall ${PRODUCT_NAME}.exe" "" "$INSTDIR\favicon.ico" 0
  
  ; 安全的注册表设置（不涉及系统级操作）
  WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_FILENAME}" "ApplicationCompany" "SDUTACM"
  WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_FILENAME}" "ApplicationName" "SDUT OJ 竞赛客户端"
  WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_FILENAME}" "ApplicationDescription" "专业的在线评测系统客户端"
  WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_FILENAME}" "ApplicationIcon" "$INSTDIR\favicon.ico"
  WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_FILENAME}" "AppUserModelId" "org.sdutacm.SDUTOJCompetitionSideClient"
  
  ; 安全的AppUserModelId注册表设置
  WriteRegStr HKCU "Software\Classes\AppUserModelId\org.sdutacm.SDUTOJCompetitionSideClient" "DisplayName" "SDUT OJ 竞赛客户端"
  WriteRegStr HKCU "Software\Classes\AppUserModelId\org.sdutacm.SDUTOJCompetitionSideClient" "IconUri" "$INSTDIR\favicon.ico"
  WriteRegStr HKCU "Software\Classes\AppUserModelId\org.sdutacm.SDUTOJCompetitionSideClient" "ShowInSettings" "0"
  
  ; 强化AppUserModelId识别 - 帮助Windows首次启动时正确显示图标
  WriteRegStr HKCU "Software\Classes\AppUserModelId\org.sdutacm.SDUTOJCompetitionSideClient" "IconBackgroundColor" "#FFFFFF"
  WriteRegStr HKCU "Software\Classes\AppUserModelId\org.sdutacm.SDUTOJCompetitionSideClient" "PackageInstallPath" "$INSTDIR"
  WriteRegStr HKCU "Software\Classes\AppUserModelId\org.sdutacm.SDUTOJCompetitionSideClient" "RelaunchCommand" '"$INSTDIR\${PRODUCT_FILENAME}"'
  WriteRegStr HKCU "Software\Classes\AppUserModelId\org.sdutacm.SDUTOJCompetitionSideClient" "RelaunchDisplayNameResource" "SDUT OJ 竞赛客户端"
  WriteRegStr HKCU "Software\Classes\AppUserModelId\org.sdutacm.SDUTOJCompetitionSideClient" "RelaunchIconResource" "$INSTDIR\favicon.ico,0"
  
  ; 应用程序路径注册（安全操作）
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_FILENAME}" "" "$INSTDIR\${PRODUCT_FILENAME}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_FILENAME}" "Path" "$INSTDIR"
  
  ; Windows任务栏通知注册 - 帮助首次启动图标识别
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\ApplicationAssociationToasts" "org.sdutacm.SDUTOJCompetitionSideClient_" "0"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\org.sdutacm.SDUTOJCompetitionSideClient" "ShowInActionCenter" "0"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\org.sdutacm.SDUTOJCompetitionSideClient" "Enabled" "1"
  
  ; 移除所有可能导致蓝屏的危险操作：
  ; - 移除 ie4uinit.exe 调用
  ; - 移除 taskkill/explorer.exe 操作  
  ; - 移除系统广播消息
  ; - 移除PowerShell执行
  
  DetailPrint "安全安装完成 - 已移除所有可能导致系统不稳定的操作"
  
  ; 创建安全说明文件
  FileOpen $0 "$INSTDIR\安全说明.txt" w
  FileWrite $0 "SDUT OJ 竞赛客户端 - 安全安装说明$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "✅ 此版本已移除所有可能导致系统不稳定的操作$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "如果任务栏图标显示不正确：$\r$\n"
  FileWrite $0 "1. 右键点击桌面 → 刷新$\r$\n"
  FileWrite $0 "2. 注销并重新登录Windows$\r$\n"
  FileWrite $0 "3. 重启计算机$\r$\n"
  FileWrite $0 "$\r$\n"
  FileWrite $0 "应用程序功能不受图标显示问题影响$\r$\n"
  FileClose $0
!macroend

!macro customUnInstall
  ; 删除AppUserModelId相关注册表项 - 完整清理
  DeleteRegKey HKCU "Software\Classes\Applications\${PRODUCT_FILENAME}"
  DeleteRegKey HKCU "Software\Classes\org.sdutacm.SDUTOJCompetitionSideClient"
  DeleteRegKey HKCU "Software\Classes\AppUserModelId\org.sdutacm.SDUTOJCompetitionSideClient"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\ApplicationAssociationToasts" "org.sdutacm.SDUTOJCompetitionSideClient_"
  
  ; 删除应用程序路径注册表项
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_FILENAME}"
  
  ; 删除快捷方式
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\卸载 ${PRODUCT_NAME}.lnk"
  RMDir "$SMPROGRAMS\${PRODUCT_NAME}"
  
  ; 删除图标文件
  Delete "$INSTDIR\favicon.ico"
  Delete "$INSTDIR\app.ico"
  Delete "$INSTDIR\icon.ico"
!macroend