; Custom NSIS installer script for EDMS Sync Agent

!macro customInit
    ; Check if another instance is running
    System::Call 'kernel32::CreateMutex(i 0, i 0, t "EDMSSyncAgentMutex") i .r1 ?e'
    Pop $R0
    StrCmp $R0 0 +3
    MessageBox MB_OK|MB_ICONEXCLAMATION "EDMS Sync Agent is already running. Please close it before installing."
    Abort
!macroend

!macro customInstall
    ; Create application data directory
    CreateDirectory "$APPDATA\EDMS Sync Agent"
    
    ; Set registry keys for auto-start (optional)
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "EDMS Sync Agent" "$INSTDIR\EDMS Sync Agent.exe"
    
    ; Create uninstaller registry entries
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" "DisplayName" "EDMS Sync Agent"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" "UninstallString" "$INSTDIR\Uninstall EDMS Sync Agent.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" "DisplayIcon" "$INSTDIR\EDMS Sync Agent.exe,0"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" "Publisher" "EDMS Team"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}" "DisplayVersion" "${VERSION}"
!macroend

!macro customUnInstall
    ; Remove from auto-start
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "EDMS Sync Agent"
    
    ; Remove registry entries
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_GUID}"
    
    ; Remove application data (optional - ask user)
    MessageBox MB_YESNO "Do you want to remove all application data and settings?" IDNO +2
    RMDir /r "$APPDATA\EDMS Sync Agent"
!macroend 