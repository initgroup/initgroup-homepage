@echo off
setlocal
cd /d "%~dp0.."
title INIT Homepage - 127.0.0.1:8200
powershell -NoExit -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
