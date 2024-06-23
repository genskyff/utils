$ErrorActionPreference = "Stop"

Write-Host "==> Updating scoop package..." -ForegroundColor Cyan
scoop update -a
scoop cleanup -a

Write-Host "==> Updating rust package..." -ForegroundColor Cyan
rustup update
cargo install-update -a
cargo cache -a

Write-Host "==> Updating gem package..." -ForegroundColor Cyan
gem update
gem cleanup

Write-Host "==> Updating npm package..." -ForegroundColor Cyan
npm outdated -g
npm update -g
