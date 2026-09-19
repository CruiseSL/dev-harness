# Codex 原生子代理统一调整

> 历史记录：本文描述 2026-09-07／08 当时的实现、方案和实验，不代表当前状态。文中的“未提交”、模型配置、修复次数与验收门槛按当时语境保留；当前收口状态见 [开发收口记录](development-closure-2026-09-19.md)。旧方案不作为新的执行指令。

日期：2026-09-08T10:46:01（本机时间）。本轮使用 skill-maintenance；没有外部 ChatGPT Pro 复核或外部对话。实际主模型未通过宿主元数据核实，不宣称使用工作区建议的 Sol/high。

## 结果

- Codex 使用默认原生子代理，显式选择模型/推理等级，fork_turns 为 none，完整任务单补足必要上下文。
- dev-harness 集中维护执行契约，OpenCode 模板包含相同正文并由校验器检查一致；Codex 任务指令不等于 OpenCode 权限头或新增沙箱。
- KA Pages 已安装 41 个运行时文件并验证哈希。项目配置移除 agent，保留 gpt-5.6-luna/xhigh；未修改全局 luna-worker。
- 迁移任务 `01a07ebe-92b2-7483-acf0-afc10c26bb01` 已收到继续指令并确认采用新方式，准备具体规格草案。复用已完成调查，不重复启动验证子任务。本报告时尚未观察到新原生子代理实际调用，不宣称迁移或上线完成。

## 验证

- 完整本地 suite：65/65 通过（补充直接角色证明测试前）。
- 随后 attestation + dispatch 针对性检查：17/17 通过，覆盖新增直接角色证明测试。
- 源包、41 文件暂存包、KA 安装包静态校验通过；安装版 helper 输出 default / gpt-5.6-luna / xhigh / none。
- git diff --check 通过。没有新增依赖，没有 provider live benchmark；不宣称速度提升。无需修复轮次。

## 基线与恢复

分支：feat/progressive-disclosure-evals；HEAD：9d88df9814e303046d7ff05e9cf42b31af2e10bb。

基线命令 `git diff --binary HEAD -- .`，精确字节 SHA-256：50a1c52d663cadeed5c904160947aeaa5f49b7af7622f78049cce6db39132c40。包含原有改动的文件快照位于 `/private/tmp/dev-harness-codex-direct-20260908/source`，原有改动保留。

本轮 11 个实现/测试文件相对该快照的 binary no-index patch：`/private/tmp/dev-harness-codex-direct-20260908/accepted.patch`，SHA-256：65b21ffa3b9f6194667545cb8574deeaaadd3780dc32914c212f21c675b6f5ab。没有外部 context ZIP；41 文件安装包逐文件 SHA 在 `/private/tmp/dev-harness-codex-direct-20260908/manifest.json`。

KA 安装前版本备份：`/private/tmp/dev-harness-codex-direct-20260908/ka-backup`；原配置：`/private/tmp/dev-harness-codex-direct-20260908/ka-config.before.json`；安装回执：`/private/tmp/dev-harness-codex-direct-20260908/receipt.json`。安装前逐文件确认目标未漂移。

更改仅位于本机源项目和 KA 项目安装目录；没有 commit、push 或部署。
