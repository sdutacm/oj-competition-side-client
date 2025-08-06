!macro customInstall
  ; 检查和安装 Visual C++ Redistributable
  DetailPrint "检查 Visual C++ Redistributable..."
  
  ; 检查 VC++ 2019/2022 Redistributable
  ReadRegStr $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
  ${If} $0 != "1"
    DetailPrint "Visual C++ Redistributable 未安装，尝试自动安装..."
    MessageBox MB_YESNO|MB_ICONQUESTION "应用程序需要 Microsoft Visual C++ Redistributable。是否自动下载并安装？" IDYES install_vcredist IDNO skip_vcredist
    
    install_vcredist:
      DetailPrint "正在下载 Visual C++ Redistributable..."
      NSISdl::download "https://aka.ms/vs/17/release/vc_redist.x64.exe" "$TEMP\vc_redist.x64.exe"
      Pop $R0
      ${If} $R0 == "success"
        DetailPrint "正在安装 Visual C++ Redistributable..."
        ExecWait '"$TEMP\vc_redist.x64.exe" /quiet /norestart' $0
        Delete "$TEMP\vc_redist.x64.exe"
        ${If} $0 == 0
          DetailPrint "Visual C++ Redistributable 安装成功"
        ${Else}
          DetailPrint "Visual C++ Redistributable 安装失败，错误代码: $0"
          MessageBox MB_OK|MB_ICONWARNING "Visual C++ Redistributable 安装失败。如果应用程序无法运行，请手动安装 Microsoft Visual C++ Redistributable。"
        ${EndIf}
      ${Else}
        DetailPrint "下载 Visual C++ Redistributable 失败: $R0"
        MessageBox MB_OK|MB_ICONWARNING "无法下载 Visual C++ Redistributable。如果应用程序无法运行，请手动安装 Microsoft Visual C++ Redistributable。"
      ${EndIf}
      Goto after_vcredist
    
    skip_vcredist:
      DetailPrint "跳过 Visual C++ Redistributable 安装"
      MessageBox MB_OK|MB_ICONINFO "如果应用程序无法运行，请手动安装 Microsoft Visual C++ Redistributable。"
      
    after_vcredist:
  ${Else}
    DetailPrint "Visual C++ Redistributable 已安装"
  ${EndIf}
  
  ; 确保图标文件被复制到安装目录
  SetOutPath "$INSTDIR"
  File "${PROJECT_DIR}\public\favicon.ico"
  
  ; 创建桌面快捷方式并设置图标
  CreateShortCut "$DESKTOP\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_FILENAME}" "" "$INSTDIR\favicon.ico" 0
  
  ; 创建开始菜单快捷方式并设置图标
  CreateDirectory "$SMPROGRAMS\${PRODUCT_NAME}"
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\${PRODUCT_NAME}.lnk" "$INSTDIR\${PRODUCT_FILENAME}" "" "$INSTDIR\favicon.ico" 0
  CreateShortCut "$SMPROGRAMS\${PRODUCT_NAME}\卸载 ${PRODUCT_NAME}.lnk" "$INSTDIR\Uninstall ${PRODUCT_NAME}.exe" "" "$INSTDIR\favicon.ico" 0
  
  ; 强化任务栏图标修复：设置AppUserModelId和应用程序注册表
  WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_FILENAME}" "ApplicationCompany" "SDUTACM"
  WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_FILENAME}" "ApplicationName" "SDUT OJ 竞赛客户端"
  WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_FILENAME}" "ApplicationDescription" "专业的在线评测系统客户端"
  WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_FILENAME}" "ApplicationIcon" "$INSTDIR\favicon.ico"
  WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_FILENAME}" "AppUserModelId" "org.sdutacm.SDUTOJCompetitionSideClient"
  WriteRegStr HKCU "Software\Classes\Applications\${PRODUCT_FILENAME}\shell\open" "CommandId" "org.sdutacm.SDUTOJCompetitionSideClient"
  
  ; 关键修复：直接注册AppUserModelId到Windows系统注册表
  WriteRegStr HKCU "Software\Classes\AppUserModelId\org.sdutacm.SDUTOJCompetitionSideClient" "DisplayName" "SDUT OJ 竞赛客户端"
  WriteRegStr HKCU "Software\Classes\AppUserModelId\org.sdutacm.SDUTOJCompetitionSideClient" "IconUri" "$INSTDIR\favicon.ico"
  WriteRegStr HKCU "Software\Classes\AppUserModelId\org.sdutacm.SDUTOJCompetitionSideClient" "IconBackgroundColor" "#FFFFFF"
  WriteRegStr HKCU "Software\Classes\AppUserModelId\org.sdutacm.SDUTOJCompetitionSideClient" "PackageInstallPath" "$INSTDIR"
  WriteRegStr HKCU "Software\Classes\AppUserModelId\org.sdutacm.SDUTOJCompetitionSideClient" "ShowInSettings" "0"
  
  ; 设置应用程序注册表项（用户级注册表）
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_FILENAME}" "" "$INSTDIR\${PRODUCT_FILENAME}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_FILENAME}" "Path" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_FILENAME}" "ApplicationCompany" "SDUTACM"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_FILENAME}" "ApplicationName" "SDUT OJ 竞赛客户端"
  
  ; 注册AppUserModelId到Windows Toast通知系统
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\ApplicationAssociationToasts" "org.sdutacm.SDUTOJCompetitionSideClient_" "0"
  
  ; 设置应用程序默认图标和协议关联
  WriteRegStr HKCU "Software\Classes\org.sdutacm.SDUTOJCompetitionSideClient" "" "SDUT OJ 竞赛客户端"
  WriteRegStr HKCU "Software\Classes\org.sdutacm.SDUTOJCompetitionSideClient" "ApplicationIcon" "$INSTDIR\favicon.ico,0"
  WriteRegStr HKCU "Software\Classes\org.sdutacm.SDUTOJCompetitionSideClient" "AppUserModelId" "org.sdutacm.SDUTOJCompetitionSideClient"
  WriteRegStr HKCU "Software\Classes\org.sdutacm.SDUTOJCompetitionSideClient\DefaultIcon" "" "$INSTDIR\favicon.ico,0"
  WriteRegStr HKCU "Software\Classes\org.sdutacm.SDUTOJCompetitionSideClient\shell\open\command" "" '"$INSTDIR\${PRODUCT_FILENAME}" "%1"'
  
  ; 使用PowerShell修复快捷方式的AppUserModelId属性 - 任务栏图标的最终修复
  nsExec::ExecToLog 'powershell.exe -WindowStyle Hidden -Command "$$shell = New-Object -ComObject WScript.Shell; $$desktop_shortcut = $$shell.CreateShortcut(\"$$env:USERPROFILE\\Desktop\\${PRODUCT_NAME}.lnk\"); $$desktop_shortcut.Save(); $$startmenu_shortcut = $$shell.CreateShortcut(\"$$env:APPDATA\\Microsoft\\Windows\\Start Menu\\Programs\\${PRODUCT_NAME}\\${PRODUCT_NAME}.lnk\"); $$startmenu_shortcut.Save();"'
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