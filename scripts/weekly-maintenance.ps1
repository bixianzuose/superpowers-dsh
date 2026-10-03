<#
  每周维护任务驱动脚本（计划任务 + 手动均可）。
  用法：powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File scripts\weekly-maintenance.ps1
        ... -DryRun   只验证脚本链路，不调用 dsh
        ... -Probe    用极短任务验证 dsh 链路（含 stderr 处理），约 1 分钟
  兼容 Windows PowerShell 5.1 与 PowerShell 7；文件必须存为 UTF-8 with BOM，
  否则 5.1 会按 ANSI 解码中文。
  注意：调用 dsh 时必须临时关闭 Stop 语义 —— 5.1 会把子进程的 stderr 行
  （dsh 的诊断/reasoning 都走 stderr）当成终止性错误抛出。
#>
param(
  [string]$Profile = 'spdsh-maint',
  [string]$Repo = 'D:\shuju\superpowers-dsh',
  [string]$GitHubRepo = 'bixianzuose/superpowers-dsh',
  [switch]$DryRun,
  [switch]$Probe
)
$ErrorActionPreference = 'Stop'

$stamp = Get-Date -Format 'yyyy-MM-dd-HHmmss'
$logDir = Join-Path $Repo '.maintenance\logs'
New-Item -ItemType Directory -Force $logDir | Out-Null
$log = Join-Path $logDir "$stamp.log"

# 日志先行：任何早期失败都要留下痕迹
"=== weekly-maintenance start $(Get-Date -Format o) ===" | Set-Content -Path $log -Encoding UTF8
function Log([string]$m) {
  # 统一 UTF-8：5.1 的 Add-Content 默认 ANSI、Tee-Object 默认 UTF-16，混写会产生乱码
  ("[" + (Get-Date -Format 'HH:mm:ss') + "] " + $m) | Add-Content -Path $log -Encoding UTF8
  Write-Host $m
}
Log ("profile=" + $Profile + " dryRun=" + $DryRun + " probe=" + $Probe + " repo=" + $Repo)

$npx = 'C:\Program Files\nodejs\npx.cmd'
if (-not (Test-Path $npx)) {
  $cmd = Get-Command npx.cmd -ErrorAction SilentlyContinue
  if ($cmd) { $npx = $cmd.Source }
}
if (-not (Test-Path $npx)) { Log 'npx not found; aborting'; exit 127 }
Log ("npx=" + $npx)

$prompt = '按 .maintenance/weekly-task.md 执行本周仓库维护。先读该文件，然后从第 1 步走到第 7 步。所有改动走分支 + PR，不要 push main，不要自动发 Release。结束时打印报告路径与最后那行总结。'
if ($Probe) { $prompt = '只回复两个字：链路' }

# 无人值守：凭据不可用时要快速失败，绝不弹交互窗口挂住
$env:GIT_TERMINAL_PROMPT = '0'
$env:GCM_INTERACTIVE = 'never'

# 第 2 步用 gh（pr list / pr diff / pr merge）判 PR。本 checkout 同时挂了 origin 与
# upstream（obra/superpowers），而 gh 没有默认仓库时会自己挑一个 —— 实测会挑中上游，
# 于是把上游的几十个 PR 当成「本仓库的外部信号」。没有 gh（或未登录）不致命，
# 但必须留下痕迹，让第 2 步知道自己是在哪个仓库上操作。
# gh repo set-default 写的是「当前 checkout 的本地配置」，所以必须先站到 $Repo 里再设，
# 否则计划任务从别的目录拉起时，设置落在错误的仓库上（甚至不在任何 git 仓库里）。
Push-Location $Repo
try {
  $gh = Get-Command gh -ErrorAction SilentlyContinue
  if ($gh) {
    $prevGhPref = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
      & $gh.Source repo set-default $GitHubRepo 2>&1 | Out-Null
      # 失败时 gh 会把整段 NativeCommandError 渲染塞进输出，压成一行再入日志
      $resolved = ((& $gh.Source repo set-default --view 2>&1 | Out-String) -replace '\s+', ' ').Trim()
      if ($LASTEXITCODE -eq 0 -and $resolved -eq $GitHubRepo) {
        Log ("gh default repo = " + $resolved + " (PR/issue 列表即本仓库)")
      } else {
        Log ("gh default repo 设置失败：期望 " + $GitHubRepo + '，实得 "' + $resolved + '"；第 2 步请显式加 -R ' + $GitHubRepo)
      }
    } catch {
      Log ("gh repo set-default exception: " + $_.Exception.Message)
    } finally {
      $ErrorActionPreference = $prevGhPref
    }
  } else {
    Log 'gh not found; 第 2 步无法自动取 PR/issue 列表，将跳过并记录'
  }

  if ($DryRun) {
    Log 'DRY RUN: not invoking dsh'
    Log ("would run: " + $npx + " -y @deepseek-ai/dsh " + $Profile + " <prompt>")
    Log ("cwd=" + (Get-Location).Path)
    Log 'DRY RUN ok (exit 0)'
    exit 0
  }

  $code = 1
  # dsh 的诊断输出走 stderr；5.1 在 Stop 语义下会把 stderr 当终止错误，这里必须放开
  $callPreference = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    Log 'launching headless dsh ...'
    & $npx -y '@deepseek-ai/dsh' $Profile $prompt 2>&1 | Out-File -FilePath $log -Append -Encoding utf8
    $code = $LASTEXITCODE
    if ($null -eq $code) { $code = 0 }
    Log ("dsh exit code " + $code)
  } catch {
    Log ("exception: " + $_.Exception.Message)
    $code = 1
  } finally {
    $ErrorActionPreference = $callPreference
    Log ("=== weekly-maintenance end exit=" + $code + " ===")
  }
} finally {
  Pop-Location
}
exit $code