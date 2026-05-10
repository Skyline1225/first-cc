# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 语言要求

始终使用中文与用户交流。

## 项目概述

一个使用 Electron 构建的桌面番茄钟应用。具有可配置的专注/休息时长、专注时播放环境音乐、系统通知提醒以及每日统计功能。

## 常用命令

```bash
npm run dev       # 开发模式运行
npm run build     # 构建 Windows 安装包 (.exe)
npm run build:dir # 构建未打包目录（更快）
```

## 架构说明

- **main.js** - Electron 主进程：窗口创建、系统托盘、通知
- **preload.js** - 上下文桥接，安全暴露 API（通知、应用路径）给渲染进程
- **renderer.js** - UI 逻辑：计时器状态管理、模式切换、localStorage 持久化
- **index.html** - UI 结构：设置面板、标签页、进度环、统计显示
- **styles.css** - 深色主题样式，包含渐变背景和圆形进度条
- **ambient.wav** - 8秒循环环境音频，用于专注时播放

## 关键实现

- 关闭窗口时隐藏到系统托盘（完全退出需通过任务管理器或应用菜单）
- 设置和统计数据保存到 localStorage
- 音频播放与计时器开始/暂停/停止生命周期绑定
- 三种计时模式：专注、短休息、长休息
- 每 N 个番茄后触发长休息（可配置，默认 4 个）
- 可配置自动开始休息和下一个专注时段