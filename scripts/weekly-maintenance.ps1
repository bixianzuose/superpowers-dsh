<#
  每周维护任务驱动脚本（计划任务 + 手动均可）。
  用法：powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File scripts\weekly-maintenance.ps1
        powershell ... -File scripts\weekly-maintenance.ps1 -DryRun    # 只验证链路，不调用 dsh
  兼容 Windows PowerShell 5.1 与 PowerShell 7；文件必须存为 UTF-8 with BOM，
  否则 5.1 会按 ANSI 解码中文，脚本行为不可预期。
#>
param(
  [string]$Profile = 'spdsh-maint',
  [string]$Repo = 'D:\shuju\superpowers-dsh',
  [switch]$DryRun
)
$ErrorActionPreference = 'Stop'

$stamp = Get-Date -Format 'yyyy-MM-dd-HHmmss'
$logDir = Join-Path $Repo '.maintenance\logs'
New-Item -ItemType Directory -Force $logDir | Out-Null
$log = Join-Path $logDir "$stamp.log"

# 日志先行：任何早期失败都要留下痕迹
"=== weekly-maintenance start $(Get-Date -Format o) ===" | Set-Content -Path $log -Encoding UTF8
function Log([string]$m) {
  ("[" + (Get-Date -Format 'HH:mm:ss') + "] " + $m) | Add-Content -Path $log
  Write-Host $m
}
Log ("profile=" + $Profile + " dryRun=" + $DryRun + " repo=" + $Repo)

$npx = 'C:\Program Files\nodejs\npx.cmd'
if (-not (Test-Path $npx)) {
  $cmd = Get-Command npx.cmd -ErrorAction SilentlyContinue
  if ($cmd) { $npx = $cmd.Source }
}
if (-not (Test-Path $npx)) { Log 'npx not found; aborting'; exit 127 }
Log ("npx=" + $npx)

$prompt = '按 .maintenance/weekly-task.md 执行本周仓库维护。先读该文件，然后从第 1 步走到第 7 步。所有改动走分支 + PR，不要 push main，不要自动发 Release。结束时打印报告路径与最后那行总结。'

# 无人值守：凭据不可用时要快速失败，绝不弹交互窗口挂住
$env:GIT_TERMINAL_PROMPT = '0'
$env:GCM_INTERACTIVE = 'never'

if ($DryRun) {
  Log 'DRY RUN: not invoking dsh'
  Log ("would run: " + $npx + " -y @deepseek-ai/dsh " + $Profile + " <prompt>")
  Log ("cwd=" + $Repo)
  Log 'DRY RUN ok (exit 0)'
  exit 0
}

Push-Location $Repo
$code = 1
try {
  Log 'launching headless dsh ...'
  & $npx -y '@deepseek-ai/dsh' $Profile $prompt *>&1 | Tee-Object -FilePath $log -Append
  $code = $LASTEXITCODE
  if ($null -eq $code) { $code = 0 }
  Log ("dsh exit code " + $code)
} catch {
  Log ("exception: " + $_)
  $code = 1
} finally {
  Pop-Location
  Log ("=== weekly-maintenance end exit=" + $code + " ===")
}
exit $code