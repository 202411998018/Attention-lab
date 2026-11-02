# Attention Lab — 实验设计与数据记录说明

本项目包含三个可在浏览器中运行的注意实验。实验脚本使用 JavaScript 动态生成试次，记录逐试次行为数据，并将数据保存在参与者当前浏览器的 localStorage 中。实验结束后可下载 CSV。

> 当前版本用于课程项目原型与小规模试测。正式收集前仍需在目标电脑和浏览器中检查刺激时序、显示尺寸、反应设备及数据完整性。

## 1. Posner Spatial Cueing｜空间线索实验

**研究问题：** 外源性外围线索与内源性中央箭头能否引导空间注意？线索有效性与线索—目标间隔如何影响目标定位反应？

### 设计
- 线索类型：外周线索（外源性）/ 中央箭头（内源性）。
- 线索有效性：有效 / 无效 / 中性。
- SOA：200 ms / 600 ms（目标起始相对线索起始的间隔）。
- 目标位置：左 / 右。
- 正式试次：2 × 3 × 2 × 4 = 48 次；每个线索类型 × 有效性 × SOA 单元内左右目标各出现两次。
- 练习：12 次。
- 反应：A = 左，L = 右；目标出现后 1800 ms 内作答，超时单独记录。

### 主要指标
- 正确率与正确试次反应时；
- 线索效应：无效条件 RT − 有效条件 RT；
- 外周线索与中央箭头线索效应的差异；
- 不同 SOA 下线索效应的变化。

### 键盘操作
- 通过 Tab 移动焦点、Enter 确认；知情同意复选框使用 Space 勾选，Esc 返回或退出。
- Posner：A = 左侧，L = 右侧；视觉搜索：F = 存在，J = 不存在。
- 面孔变化检测：Space = 发现变化，N = 没有变化；发现变化后按 1–4 选择面部部位。
- 如启用眼动校准，可按 1–9 依次选择九个校准点；实验结果页按 1–4 导出或返回。

### 逐试次字段
`cue_type`、`cue_validity`、`cue_side`、`target_side`、`soa_requested_ms`、`soa_actual_ms`、`response_key`、`response_side`、`response_status`、`correct`、`rt_ms`。

## 2. Face Flicker Change Detection｜面孔闪烁变化检测

**研究问题：** 不同面部特征的变化是否具有不同的觉察难度？

### 设计
- 刺激：`assets/face-change-stimuli/` 中的 8 张 SVG，组成注视方向、嘴角、眉毛和鼻子四组单特征变化配对；已删除发型变化条件。
- 范式：A（250 ms）→ 空屏（80 ms）→ B（250 ms）→ 空屏（80 ms），循环呈现。
- 正式试次：每类变化 4 次（A/B 方向各两次），共 16 个变化试次；另有 5 个无变化 catch trials，共 21 次。
- 参与者发现变化后按“发现变化”，并选择变化部位；认为没有变化时按“没有变化”。
- 练习阶段为 6 次（每类变化 1 次，另有 2 次无变化试次）。每个试次最长 12 秒；超时作为独立状态记录，不自动等同于正确拒绝或漏报。

### 主要指标
- 命中、漏报、虚报、正确拒绝；
- 变化检测反应时；
- 变化部位判断正确率；
- 不同面部特征的检测表现。

### 逐试次字段
`change_present`、`change_feature`、`file_a`、`file_b`、`change_direction`、`decision`、`outcome`、`feature_choice`、`feature_choice_correct`、`decision_rt_ms`、`feature_choice_rt_ms`、`flicker_presentations`。

### 方法学限制
当前每类变化只有一个基础刺激配对，变化类型与刺激实例尚未分离；四类变化的视觉显著性也未经预实验匹配。因此当前结果只能作为原型试测，不应直接将部位差异解释为社会性或认知机制差异。正式研究前应扩展多个面孔实例并进行显著性/难度预试。

## 3. Visual Search / Feature Integration｜视觉搜索与特征整合

**研究问题：** 特征搜索与结合搜索的反应时和正确率如何随搜索集合大小变化？

### 设计
- 目标：红色 T。
- 特征搜索：红色 T（目标）出现在绿色 T（干扰项）中，目标由颜色这一单一特征区分。
- 结合搜索：红色 T（目标）出现在红色 L 与绿色 T 两类干扰项中，目标需要结合颜色和形状识别。
- 集合大小：8 / 16 / 24。
- 目标存在性：存在 / 不存在。
- 正式试次：2 × 3 × 2 × 4 = 48 次。
- 练习：12 次。
- 反应：F = 存在，J = 不存在；超时（5000 ms）单独记录。

### 主要指标
- 各条件正确率和正确试次反应时；
- 反应时随集合大小增加的变化；
- 搜索斜率：分别对目标存在与不存在试次，计算 RT 对集合大小的回归斜率；
- 特征搜索与结合搜索斜率的比较。

### 逐试次字段
`search_type`、`set_size`、`target_present`、`target_position`、`stimulus_area_width_px`、`stimulus_area_height_px`、`stimulus_layout`（含每个项目的像素坐标和相对坐标）、`response_key`、`response_present`、`response_status`、`correct`、`rt_ms`。

## 数据保存与导出

- 每完成一个试次，程序立即将该行数据追加到浏览器 localStorage 的 `attentionLabData`。
- 练习与正式试次通过 `phase` 字段区分；分析正式实验时筛选 `phase = formal`。
- 当前 session 数据可在结束页下载；也可下载当前浏览器中累计的所有试次数据。
- 若启用本地 WebGazer，眼动样本会记录 session、参与者、实验、试次、屏幕坐标和试次内时间，并可单独导出。
- 数据保存在当前浏览器和设备中，不会自动上传服务器。清除浏览器存储或更换设备可能导致数据丢失，请及时导出备份。
- 不要在参与者编号中输入姓名、学号或其他直接身份信息。

## 眼动追踪状态

仓库当前未包含 `vendor/webgazer.js`。因此默认行为实验可以正常运行，但摄像头眼动追踪暂不可用。只有在加入本地 WebGazer 构建并完成设备校准、精度验证后，才应启用眼动数据收集。网页不会保存摄像头视频。

## 正式收集前的验证清单

1. 在目标浏览器中完成每个实验至少一次完整练习和正式流程。
2. 检查每个条件的试次数、左右目标平衡和随机化。
3. 用外部计时/屏幕录制或浏览器日志检查实际刺激时序；浏览器 setTimeout 并非精密实验呈现系统。
4. 检查超时是否单独保留，反应时是否从目标/首个刺激呈现时刻开始。
5. 导出 CSV，确认每行一个试次、字段完整、练习与正式试次可区分。
6. 先进行小规模预试，再决定是否调整参数或开始正式收集。

## References

- Posner, M. I. (1980). Orienting of attention. *Quarterly Journal of Experimental Psychology*, 32(1), 3–25.
- Treisman, A. M., & Gelade, G. (1980). A feature-integration theory of attention. *Cognitive Psychology*, 12(1), 97–136.
- Rensink, R. A., O'Regan, J. K., & Clark, J. J. (1997). To see or not to see: The need for attention to perceive changes in scenes. *Psychological Science*, 8(5), 368–373.
