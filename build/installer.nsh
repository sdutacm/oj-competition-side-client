!macro customInstall
  ; 确保图标文件被复制到安装目录
  SetOutPath "$INSTDIR"
  File "${PROJECT_DIR}\public\favicon.ico"
  
  ; 创建桌面快捷方式并设置图标
  CreateShortCut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_FILENAME}" "" "$INSTDIR\favicon.ico" 0
  
  ; 创建开始菜单快捷方式并设置图标
  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_FILENAME}" "" "$INSTDIR\favicon.ico" 0
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\卸载 ${PRODUCT_NAME}.lnk" "$INSTDIR\Uninstall ${PRODUCT_NAME}.exe" "" "$INSTDIR\favicon.ico" 0
  
  ; 关键修复：设置AppUserModelId确保任务栏图标正确显示
  WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_FILENAME}\shell\open" "CommandId" "org.sdutacm.SDUTOJCompetitionSideClient"
  WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_FILENAME}" "ApplicationCompany" "SDUTACM"
  WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_FILENAME}" "ApplicationName" "${PRODUCT_NAME}"
  WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_FILENAME}" "ApplicationDescription" "SDUT OJ 竞赛客户端"
  WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_FILENAME}" "ApplicationIcon" "$INSTDIR\favicon.ico"
  
  ; 设置应用程序注册表项（用户级注册表）
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_FILENAME}" "" "$INSTDIR\${PRODUCT_FILENAME}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_FILENAME}" "Path" "$INSTDIR"
  
  ; 关键修复：注册AppUserModelId到Windows系统
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\ApplicationAssociationToasts" "org.sdutacm.SDUTOJCompetitionSideClient_" "0"
  
  ; 设置应用程序默认图标
  WriteRegStr HKCU "Software\Classes\org.sdutacm.SDUTOJCompetitionSideClient" "" "${PRODUCT_NAME}"
  WriteRegStr HKCU "Software\Classes\org.sdutacm.SDUTOJCompetitionSideClient\DefaultIcon" "" "$INSTDIR\favicon.ico,0"
  WriteRegStr HKCU "Software\Classes\org.sdutacm.SDUTOJCompetitionSideClient\shell\open\command" "" '"$INSTDIR\${PRODUCT_FILENAME}" "%1"'
!macroend

!macro customUnInstall
  ; 删除AppUserModelId相关注册表项
  DeleteRegKey HKCU "Software\Classes\Applications\${PRODUCT_FILENAME}"
  DeleteRegKey HKCU "Software\Classes\org.sdutacm.SDUTOJCompetitionSideClient"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\ApplicationAssociationToasts" "org.sdutacm.SDUTOJCompetitionSideClient_"
  
  ; 删除注册表项
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_FILENAME}"
  
  ; 删除快捷方式
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk"
  Delete "$SMPROGRAMS\${PRODUCT_NAME}\卸载 ${PRODUCT_NAME}.lnk"
  RMDir "$SMPROGRAMS\${PRODUCT_NAME}"
  
  ; 删除图标文件
  Delete "$INSTDIR\favicon.ico"
!macroend