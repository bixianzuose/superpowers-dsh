<#
  每周维护任务驱动脚本。
  用 headless dsh 跑 .maintenance/weekly-task.md，输出同时落 .maintenance/logs/。
  手动用法：powershell -NoProfile -File scripts\weekly-maintenance.ps1
  兼容 Windows PowerShell 5.1 与 PowerShell 7。
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

# 计划任务环境下 PATH 可能不含 node，优先用绝对路径
$npx = 'C:\Program Files\nodejs\npx.cmd'
if (-not (Test-Path $npx)) {
  $cmd = Get-Command npx.cmd -ErrorAction SilentlyContinue
  if ($cmd) { $npx = $cmd.Source } else { throw 'npx not found; cannot start the maintenance run' }
}

$prompt = '按 .maintenance/weekly-task.md 执行本周仓库维护。先读该文件，然后从第 1 步走到第 7 步。所有改动走分支 + PR，不要 push main，不要自动发 Release。结束时打印报告路径与最后那行总结。'

# 无人值守：凭据不可用时要快速失败，绝不弹交互窗口挂住
$env:GIT_TERMINAL_PROMPT = '0'
$env:GCM_INTERACTIVE = 'never'

Push-Location $Repo
$code = 1
try {
  & $npx -y '@deepseek-ai/dsh' $Profile $prompt 2>&1 | Tee-Object -FilePath $log
  $code = $LASTEXITCODE
  if ($null -eq $code) { $code = 0 }
} catch {
  ("[wrapper] 驱动脚本异常: " + $_) | Tee-Object -FilePath $log -Append
  $code = 1
} finally {
  Pop-Location
  ("[wrapper] profile=" + $Profile + " exit=" + $code + " at " + (Get-Date -Format o)) | Add-Content -Path $log
}
exit $code