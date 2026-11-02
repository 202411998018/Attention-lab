# Attention Lab — 实验设计与数据记录说明

本项目包含三个可在浏览器中运行的注意实验。实验脚本使用 JavaScript 动态生成试次，记录逐试次行为数据，并将数据保存在参与者当前浏览器的 localStorage 中。实验结束后可下载 CSV。

> 当前版本用于课程项目原型与小规模试测。正式收集前仍需在目标电脑和浏览器中检查刺激时序、显示尺寸、反应设备及数据完整性。

### 实验反应按键
- 只在刺激判断阶段使用键盘反应；实验选择、知情同意、页面跳转、结果下载等界面操作仍可使用鼠标。
- Posner：A = 左侧，L = 右侧。
- 视觉搜索：F = 存在，J = 不存在。
- 面孔变化检测：F = 发现变化，J = 没有变化；发现变化后按 1–4 选择变化部位。


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

### 逐试次字段
`cue_type`、`cue_validity`、`cue_side`、`target_side`、`soa_requested_ms`、`soa_actual_ms`、`response_key`、`response_side`、`response_status`、`correct`、`rt_ms`。

## 2. Face Flicker Change Detection｜面孔闪烁变化检测

**研究问题：** 不同面部特征的变化是否具有不同的觉察难度？

### 设计
- 刺激：`assets/face-change-stimuli/` 中的 8 张 SVG，组成注视方向、嘴角、眉毛和鼻子四组单特征变化配对；已删除发型变化条件。
- 范式：A（250 ms）→ 空屏（80 ms）→ B（250 ms）→ 空屏（80 ms），循环呈现。
- 正式试次：每类变化 4 次（A/B 方向各两次），共 16 个变化试次；另有 5 个无变化 catch trials，共 21 次。
- 参与者发现变化后按 F，并按 1–4 选择变化部位；认为没有变化时按 J。
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

## 眼动采集与数据结构建议

当前仓库已预留 WebGazer 初始化、九点点击校准和 gaze listener 接口，但尚未包含 `vendor/webgazer.js`，因此当前部署版本仍是纯行为实验，不能把眼动记录视为已启用。

建议将眼动设计为三个实验共享的可选模块：在实验开始前征得单独的眼动采集同意，启动摄像头并完成校准；摄像头不可用、参与者拒绝或校准质量不足时，仍可继续行为实验。正式试次只记录估计得到的注视坐标，不保存摄像头视频。

### 建议的数据表

1. **Session metadata**：匿名参与者编号、session ID、实验类型、浏览器与操作系统、屏幕分辨率、viewport 尺寸、devicePixelRatio、眼动启用状态、校准状态与校准误差。
2. **Trial**：一行一个试次，保留实验条件、刺激编号、practice/formal、刺激 onset、反应键、反应时、正确率、timeout 等行为字段。
3. **Gaze samples**：一行一个注视预测样本，包含 session ID、trial number、phase、样本时间、相对试次时间、x/y 像素坐标、归一化坐标和视口尺寸。
4. **Events**：一行一个实验事件，包含 session ID、trial number、event name、单调时钟时间和 UTC 时间。事件至少覆盖 fixation onset、cue onset/offset、target onset、face A/blank/B onset、search array onset 和 response。

### 时间同步与存储

- 使用 `performance.now()` 作为刺激事件和 gaze sample 的共同单调时钟；同时保存 UTC 时间用于追溯。不要仅依赖 `Date.now()` 对齐反应时和眼动。
- WebGazer 的 gaze listener 提供视口像素坐标以及相对于 `begin()` 的 elapsed time；记录回调到达时的本地单调时间，并保留库提供的 elapsed time 作为辅助字段。
- 行为试次数据量较小，可以保留逐试次保存；高频 gaze samples 不建议持续写入 localStorage。建议使用 IndexedDB 分批写入，避免存储配额耗尽或页面关闭导致内存数据丢失。
- 导出时至少提供 trials.csv、gaze.csv、events.csv 和 session.csv，所有表通过 session_id 与 trial_number 关联。

### 三个实验可分析的眼动指标

- **Posner**：中央注视点偏离比例、线索出现后是否提前转向线索位置、目标出现前后 gaze shift 的时间。
- **视觉搜索**：首次注视目标的时间、目标注视时长、注视次数、搜索路径；结合每个 search item 的实际屏幕 AOI 坐标分析。
- **面孔变化检测**：眼睛/眉毛/鼻子/嘴部 AOI 的注视比例、首次注视潜伏期、变化前后注视分布。

### 校准与质量控制

建议保留九点校准，并增加不参与模型训练的独立验证点；记录每个验证点的预测误差、有效样本比例和校准失败原因。正式分析前根据预试数据制定质量阈值，不要直接把“完成九点点击”当作校准合格。AOI 分析还需要保存刺激元素的实际屏幕矩形坐标，而不只是 CSS 内部坐标。

## 数据保存与导出

- 每完成一个试次，程序立即将该行数据追加到浏览器 localStorage 的 `attentionLabData`。
- 练习与正式试次通过 `phase` 字段区分；分析正式实验时筛选 `phase = formal`。
- 当前 session 数据可在结束页下载；也可下载当前浏览器中累计的所有试次数据。
- 当前 WebGazer 采集代码仍是预留实现；完整眼动采集应按上文的 Gaze samples 与 Events 结构实现，并先完成独立验证。
- 数据保存在当前浏览器和设备中，不会自动上传服务器。清除浏览器存储或更换设备可能导致数据丢失，请及时导出备份。
- 不要在参与者编号中输入姓名、学号或其他直接身份信息。

## 眼动追踪状态

仓库当前未包含 `vendor/webgazer.js`。因此默认行为实验可以正常运行，但摄像头眼动追踪暂不可用。只有在加入固定版本的 WebGazer 构建、完成设备校准与独立精度验证后，才应启用眼动数据收集。WebGazer 在浏览器本地进行注视估计；项目本身不应上传或保存摄像头视频。

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
