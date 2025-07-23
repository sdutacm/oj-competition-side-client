; Custom NSIS script to ensure proper icon handling
; This script ensures the application icon is properly set for shortcuts and registry

; Force delete existing shortcuts and recreate with proper icons
!macro customInstall
  ; Delete existing shortcuts to ensure clean recreation
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  Delete "$DESKTOP\SDUT OJ Competition Side Client.lnk"
  Delete "$DESKTOP\SDUT OJ 竞赛客户端.lnk"
  
  ; Create desktop shortcut with icon using extraResources path
  CreateShortCut "$DESKTOP\SDUT OJ 竞赛客户端.lnk" "$INSTDIR\${PRODUCT_FILENAME}.exe" "" "$INSTDIR\resources\app-icon.ico" 0
  
  ; Clean up start menu
  RMDir /r "$SMPROGRAMS\${PRODUCT_NAME}"
  RMDir /r "$SMPROGRAMS\SDUT OJ Competition Side Client"
  RMDir /r "$SMPROGRAMS\SDUT OJ 竞赛客户端"
  
  ; Create start menu shortcut with icon  
  CreateDirectory "$SMPROGRAMS\SDUT OJ 竞赛客户端"
  CreateShortCut "$SMPROGRAMS\SDUT OJ 竞赛客户端\SDUT OJ 竞赛客户端.lnk" "$INSTDIR\${PRODUCT_FILENAME}.exe" "" "$INSTDIR\resources\app-icon.ico" 0
  CreateShortCut "$SMPROGRAMS\SDUT OJ 竞赛客户端\卸载 SDUT OJ 竞赛客户端.lnk" "$INSTDIR\Uninstall ${PRODUCT_NAME}.exe" "" "$INSTDIR\resources\app-icon.ico" 0
  
  ; Write registry keys for proper program identification and icon association
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_FILENAME}.exe" "" "$INSTDIR\${PRODUCT_FILENAME}.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_FILENAME}.exe" "Path" "$INSTDIR"
  
  ; Register application icon
  WriteRegStr HKLM "Software\Classes\Applications\${PRODUCT_FILENAME}.exe\DefaultIcon" "" "$INSTDIR\resources\app-icon.ico,0"
  WriteRegStr HKLM "Software\Classes\Applications\${PRODUCT_FILENAME}.exe\shell\open\command" "" '"$INSTDIR\${PRODUCT_FILENAME}.exe" "%1"'
!macroend

; Custom uninstall macro
!macro customUnInstall
  Delete "$DESKTOP\SDUT OJ 竞赛客户端.lnk"
  Delete "$DESKTOP\${PRODUCT_NAME}.lnk"
  Delete "$DESKTOP\SDUT OJ Competition Side Client.lnk"
  Delete "$SMPROGRAMS\SDUT OJ 竞赛客户端\SDUT OJ 竞赛客户端.lnk"
  Delete "$SMPROGRAMS\SDUT OJ 竞赛客户端\卸载 SDUT OJ 竞赛客户端.lnk"
  RMDir "$SMPROGRAMS\SDUT OJ 竞赛客户端"
  RMDir /r "$SMPROGRAMS\${PRODUCT_NAME}"
  
  DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\App Paths\${PRODUCT_FILENAME}.exe"
  DeleteRegKey HKLM "Software\Classes\Applications\${PRODUCT_FILENAME}.exe"
!macroend
