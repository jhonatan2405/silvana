@echo off
title Silvana - Recepcion IoT :8003
cd /d "%~dp0..\recepcion-iot-service"
call npm run dev
