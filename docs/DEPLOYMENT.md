# SAHE3D Deployment Guide

## 1. Production Target

- **Repository:** [https://github.com/tejasrmap/SAHE3DbySahithiV](https://github.com/tejasrmap/SAHE3DbySahithiV)
- **Branch:** `main`
- **Hosting Platform:** Vercel
- **Production URL:** [https://sahe3dbysahithi.vercel.app](https://sahe3dbysahithi.vercel.app)

## 2. Build Configuration

- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Node Version:** >= 18.0.0

## 3. Configuration Files

### `vercel.json`
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "cleanUrls": true,
  "trailingSlash": false
}
```
