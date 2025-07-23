!macro customInstall
  ; 创建桌面快捷方式并设置图标（使用可执行文件内嵌的图标）
  CreateShortCut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_FILENAME}" "" "$INSTDIR\${PRODUCT_FILENAME}" 0
  
  ; 创建开始菜单快捷方式并设置图标（使用可执行文件内嵌的图标）
  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_FILENAME}" "" "$INSTDIR\${PRODUCT_FILENAME}" 0
  ; 卸载程序快捷方式不设置自定义图标，使用系统默认
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\卸载 ${PRODUCT_NAME}.lnk" "$INSTDIR\Uninstall ${PRODUCT_NAME}.exe"
  
  ; 设置应用程序注册表项
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_FILENAME}" "" "$INSTDIR\${PRODUCT_FILENAME}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_FILENAME}" "Path" "$INSTDIR"
!macroend

!macro customUnInstall
  ; 删除注册表项
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_FILENAME}"
  
  ; 删除快捷方式
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\卸载 ${PRODUCT_NAME}.lnk"
  RMDir "$SMPROGRAMS\${PRODUCT_NAME}"
!macroend