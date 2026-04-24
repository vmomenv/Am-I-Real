# Groundflare Admin Console Chinese Operations Design

## Scope

This spec defines a UI and interaction redesign for the existing Groundflare admin console.

It covers:
- converting the admin interface to fixed Chinese copy
- changing the visual direction from a terminal-heavy surface to an operations console
- making every visible admin action area real and usable
- preserving the existing backend architecture and data model

It does not redefine the underlying backend storage model, auth model, or challenge-generation model except where the UI must expose them differently.

## Context

The current backend implementation already includes:
- single-admin login
- protected `/admin` area
- asset upload/storage
- site settings persistence
- challenge-session generation and persistence

What needs to change is the admin surface itself.

The current UI still has several problems relative to the approved direction:
- too much English UI copy
- some surfaces still feel like placeholder operator shells
- some controls are visible but not yet real enough for day-to-day operations
- the visual tone is closer to a terminal skin than a practical Chinese operations console

## Goals

- Make the admin interface fully Chinese for all fixed UI copy.
- Keep the two-column asset workflow: left `AI 图片池`, right `真实图片池`.
- Ensure each visible control on screen corresponds to a real backend-backed operation.
- Use a cleaner operations-console visual language rather than an exaggerated hacker-terminal style.
- Keep the page desktop-first and optimized for actual operator use.

## Non-Goals

- Making backend chrome text itself CMS-editable
- Adding analytics dashboards in this redesign
- Changing the authentication model
- Replacing the current backend architecture

## Chosen Direction

The approved direction is `B 运营控制台`.

Key decisions:
- backend fixed UI copy should be Chinese
- operational content should be editable
- the admin console should remain desktop-first
- left column is `AI 图片池`
- right column is `真实图片池`
- both columns must have their own `上传图片` entry
- the bottom area becomes a true editable configuration section
- placeholder areas like `shell`, `later`, `standby`, or dummy controls must be removed or converted into real features

## Overall Visual Language

The admin UI should feel like a serious internal operations console.

Visual rules:
- light neutral page background
- white control cards and panels
- blue-gray borders and accents
- moderate shadows only
- readable Chinese typography
- very restrained motion

It should not feel like:
- a cyberpunk toy panel
- an English-first developer dashboard
- a dark hacker terminal skin

It should feel like:
- an internal media-operations system
- something an operator can actually use daily
- a Chinese-language admin console with clear hierarchy and controls

## Page Structure

### 1. Login Page

The login page remains a single-admin access point but changes to fixed Chinese copy.

Required content:
- backend product label
- page title: `管理员登录`
- username field
- password field
- login button
- invalid-login feedback area

Visual tone:
- operations-console style
- not flashy
- centered card layout

The login page should not introduce extra copy like account recovery, multi-user onboarding, or marketing language.

### 2. Main Operations Console

After login, the operator lands on a Chinese operations console with three major regions:

1. top status bar
2. two-column asset workspace
3. bottom configuration editor

### 3. Top Status Bar

The top bar should contain real operator context and quick actions:
- 当前管理员
- 最近保存时间
- 快速上传
- 退出登录

This bar should stay compact and not dominate the screen.

## Two-Column Asset Workspace

The center of the admin console remains two equal columns.

### Left Column: `AI 图片池`

This column manages AI-generated assets.

Required top controls:
- `上传图片`
- 搜索框
- 排序选择
- 筛选项

### Right Column: `真实图片池`

This column manages human/real-photo assets.

Required top controls:
- `上传图片`
- 搜索框
- 排序选择
- 筛选项

### Shared Column Behavior

Both columns should support:
- search by asset name
- sort by upload time
- filter: `全部 / 仅启用 / 仅停用`

Both upload buttons must be real and scoped:
- left upload opens AI image upload flow
- right upload opens real image upload flow

## Asset Cards

Asset cards should remain lightweight but fully operational.

Each card shows:
- thumbnail preview
- asset name
- upload time
- current status

Each card supports real actions:
- `重命名`
- `启用 / 停用`
- `删除`

The redesign should remove fake button behavior. If a button is visible, it must work.

## Bottom Configuration Editor

The old “settings rail” becomes a true editable Chinese configuration section.

Editable fields:
- `显示站点名`
- `成功跳转地址`
- `背景音乐`
- `总轮数`
- `通过轮数`

Additional required control:
- `上传音频`

Editing model:
- `显示站点名` as text input
- `成功跳转地址` as URL input
- `背景音乐` as selector bound to uploaded audio assets
- `总轮数` and `通过轮数` as numeric inputs
- `保存配置` as a real submit action

## Functional Requirements For Visible Controls

All currently visible operation areas in the redesigned UI must map to real behavior.

This includes:
- per-column upload buttons
- search
- sort
- filter
- rename
- enable/disable
- delete
- audio upload
- configuration save
- logout

No placeholder surface may remain with “coming later” semantics.

## Validation And Feedback

### Asset Area Feedback

After any asset operation:
- upload success updates the relevant column immediately
- rename updates the card name immediately
- enable/disable updates card state immediately
- delete removes the card immediately

### Configuration Feedback

The configuration editor must validate before save:
- `通过轮数 <= 总轮数`
- active real pool count >= `总轮数`
- active AI pool count >= `8`

Audio rules:
- if no audio is selected, save may still succeed
- UI should warn that the public flow will run silently

Successful save:
- show inline success feedback such as `配置已保存`

Failed save:
- show inline error feedback in the configuration area
- do not rely on browser alerts

### Cross-Section Integrity Feedback

If asset-pool changes make the current challenge configuration invalid, both the relevant asset column and the configuration section should surface that state clearly.

The operator should not have to discover invalid configuration only by leaving the page.

## Chinese Copy Rules

All fixed admin interface copy should be Chinese.

Examples of required replacements:
- `Sign in` -> `管理员登录`
- `AI Image Pool` -> `AI 图片池`
- `Real Photo Pool` -> `真实图片池`
- `Settings Rail` -> `配置编辑区`
- `Upload Drawer` -> `上传面板`
- `Active / Inactive` -> `已启用 / 已停用`
- `Disable / Enable / Archive` -> `停用 / 启用 / 删除`

The only allowed persistent English should be technical values that are truly data, not UI chrome.

## Interaction Boundaries

This redesign does not require changing backend domain rules. It changes how the operator reaches them.

Expected mapping:
- asset UI actions call existing or planned `/api/admin/assets*`
- settings editor calls `/api/admin/settings`
- login/logout/session stay on `/api/admin/auth/*`

## Testing Requirements For The Redesign

Implementation should add or update tests for:
- Chinese admin desk headings
- presence of both upload buttons
- visibility of configuration editor fields
- real action affordances for asset cards
- form-driven settings save surface

## Summary

The admin backend should shift from an English-heavy pseudo-terminal into a Chinese operations console. It keeps the approved dual-column asset model, but every visible action becomes real, both image pools get their own upload entry, and the bottom settings section becomes a true editable configuration editor.
