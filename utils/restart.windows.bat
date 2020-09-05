@echo off
sleep 1 && taskkill /F /PID %1 && sleep 1 && %2
