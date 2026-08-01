@echo off
setlocal
cd /d "%~dp0.."
title INIT Homepage - Git Publish
powershell -NoExit -NoProfile -ExecutionPolicy Bypass -File "%~dp0git-publish-main.ps1"
