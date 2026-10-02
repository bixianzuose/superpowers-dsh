<#
  每周维护任务驱动脚本。
  以 headless dsh 跑 .maintenance/weekly-task.md，输出同时落 .maintenance/logs/。
  用法：pwsh -File scripts/weekly-maintenance.ps1 [-Profile spdsh-maint] [-Repo D:\shuju\superpowers-dsh]
#>
param(
  [string]$Profile = 'spdsh-maint',
  [string]$Repo = 'D:\shuju\superpowers-dsh'
)
$ErrorActionPreference = 'Stop'
$stamp = Get-Date -Format 'yyyy-MM-dd-HHmmss'
$logDir = Join-Path $Repo '.maintenance\logs'
New-Item -ItemType Directory -Force $logDir | Out-Null
$log = Join-Path $logDir "$stamp.log"

$prompt = '按 .maintenance/weekly-task.md 执行本周仓库维护。先读该文件，然后从第 1 步走到第 7 步。所有改动走分支 + PR，不要 push main，不要自动发 Release。结束时打印报告路径与最后那行总结。'

Push-Location $Repo
$code = 1
try {
  & npx -y '@deepseek-ai/dsh' $Profile $prompt *>&1 | Tee-Object -FilePath $log
  $code = $LASTEXITCODE
} catch {
  "驱动脚本异常: $_" | Tee-Object -FilePath $log -Append
  $code = 1
} finally {
  Pop-Location
  "[wrapper] profile=$Profile exit=$code at $(Get-Date -Format o)" | Add-Content -Path $log
}
exit $code