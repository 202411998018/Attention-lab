# 正式统计分析与核查记录（基于 2026-11-08 原始 JSON）

## 数据清理

只纳入 `phase=formal` 的已完成试次；练习试次不纳入。RT 分析只使用正确反应。统计推断单位为参与者，先计算参与者内条件均值/斜率，再在参与者间汇总。

| 实验 | 正式试次 | 参与者 | 条件结构 |
|---|---:|---:|---|
| Posner | 240 | 5 | 2 cue type × 3 validity × 2 SOA；每格 pooled n=20 |
| 视觉搜索 | 288 | 5 | 2 search type × 3 set size × 2 target presence；每格 pooled n=24 |
| 面孔变化 | 105 | 5 | 每人16个变化试次（4类×4）+5个无变化试次 |

视觉搜索中 一名参与者 有两个完整正式 session，其余四人各一个。一名参与者 的斜率先按 session 分别计算，再在参与者内平均，避免该参与者被双倍计权；重复 session 可能带来练习/疲劳影响。Posner 238/240 正确；视觉搜索 269/288 正确。面孔变化：Hit=59、Miss=21、FA=2、CR=22、Timeout=1。

## Posner

定义 cueing effect=RT_invalid−RT_valid；valid benefit=RT_neutral−RT_valid；invalid cost=RT_invalid−RT_neutral。正值分别表示有效线索相对无效线索优势、有效线索收益、无效线索代价。

| Cue | SOA | Cueing M (SD) ms | Valid benefit M (SD) | Invalid cost M (SD) |
|---|---:|---:|---:|---:|
| 中央箭头 | 200 | 64.1 (69.0) | 2.4 (36.1) | 61.7 (76.8) |
| 中央箭头 | 600 | 79.9 (66.7) | 62.9 (66.5) | 17.0 (21.7) |
| 外周线索 | 200 | −27.5 (65.5) | −25.9 (61.3) | −1.7 (25.3) |
| 外周线索 | 600 | −7.0 (30.7) | −5.2 (31.8) | −1.9 (20.0) |

跨 SOA 后中央箭头 cueing effect=72.0 ms（SD=61.5；95% t CI [−4.4,148.4]）；外周线索=−17.3 ms（SD=25.4；95% t CI [−48.8,14.3]）。中央箭头效应方向五人均为正，但变异较大；外周线索未显示稳定优势。

**经典对照：** Posner（1980）及 Posner、Snyder 与 Davidson（1980）发现空间预期线索可缩短目标检测潜伏期。本实验中央箭头条件方向上与经典结果一致，但小样本、单人每格仅4次，且 SOA 下收益/代价构成不同，不能称为严格复现。

## 视觉搜索

每位参与者在正确试次中计算 set size 8、16、24 的条件平均 RT，再拟合 RT=intercept+slope×set size。一名参与者 两个 session 分别拟合后参与者内平均。

| 搜索类型 | 目标状态 | 斜率 M (SD), ms/item | 95% t CI |
|---|---|---:|---:|
| 特征 | 出现 | −0.28 (6.34) | [−8.15,7.59] |
| 特征 | 缺席 | 1.78 (8.16) | [−8.35,11.92] |
| 结合 | 出现 | 18.30 (7.35) | [9.17,27.43] |
| 结合 | 缺席 | 19.17 (8.17) | [9.02,29.32] |

配对斜率差（结合−特征）：目标出现 18.58 ms/item（SD=9.64；95% t CI [6.61,30.54]）；目标缺席 17.38 ms/item（SD=8.29；95% t CI [7.09,27.67]）。五名参与者差值均为正。

正确率：特征—缺席 68/72=94.4%；特征—出现 69/72=95.8%；结合—缺席 71/72=98.6%；结合—出现 61/72=84.7%。

**经典对照：** Treisman 与 Gelade（1980）的特征整合理论预测，单一特征搜索斜率较平缓，结合搜索随集合大小增加。本数据呈现相同方向；结合搜索目标出现条件正确率较低，需结合速度—准确率权衡解释。斜率仅由三个集合大小估计，样本仍小。

## 面孔变化检测：SDT

Signal=有变化；Noise=无变化。采用 loglinear 修正：
`H=(Hit+0.5)/(Hit+Miss+1)`
`FA=(FalseAlarm+0.5)/(FalseAlarm+CR+1)`
`d′=Z(H)-Z(FA)`；`c=−0.5×[Z(H)+Z(FA)]`。

五名参与者平均 d′=1.70（SD=0.32；95% t CI [1.30,2.09]）；平均 c=0.22（SD=0.38；95% t CI [−0.25,0.69]）。原始 Hit rate=59/80=73.8%；FA rate=2/25=8.0%。一个 no-change timeout 单独报告并排除于主 SDT 分母。

| 变化特征 | Hit | n | Hit rate |
|---|---:|---:|---:|
| 注视方向 | 20 | 20 | 100% |
| 嘴角 | 20 | 20 | 100% |
| 眉毛 | 12 | 20 | 60% |
| 鼻子 | 7 | 20 | 35% |

**社会性解释及经典对照：** 注视方向传递他人的注意对象和潜在意图，并能引导观察者的空间注意（Langton, Watt, & Bruce, 2000；Frischen, Bayliss, & Tipper, 2007）。嘴角变化可能携带表情、情绪及互动信息（Jack & Schyns, 2017）。因此，两类变化的高命中率可能部分与社会信息价值/诊断性有关。但这只是候选解释，物理显著性、变化幅度、局部对比度及材料差异也可能造成差异。

重要的是，Davies 与 Hoffman（2002）的经典 flicker 研究发现眼部变化比嘴部变化获得更多注意。本实验“注视方向”变化不等同于整块眼部/构形变化，“嘴角”变化也不等同于整块嘴部变化，因此当前排序不是对经典结果的直接复现。Rensink、O’Regan 与 Clark（1997）指出 flicker 中断可妨碍变化前后信息整合，注意和高层兴趣会影响变化识别。当前结果可能反映社会信息价值与局部可辨性共同作用，而非单一机制。

## 图表原则

- Posner：按 cue type × SOA 展示参与者级 cueing effect，并单独呈现 valid benefit / invalid cost。
- 视觉搜索：RT—set size 条件线、参与者级斜率点图/CI，正确率另列。
- 面孔变化：四类 hit rate（标明 n=20）、参与者级 d′/c、Hit/FA 计数。
- n=5 时展示每位参与者数据，不依赖显著性星号。

## 局限

样本量为每项5人，刚达到课程门槛；Posner每位参与者每格约4次，视觉搜索每格约4次，斜率仅由3个集合大小估计。面孔变化每类20个信号试次，但材料有限，社会意义与物理显著性未正交操纵。本 JSON 只有 gaze 样本数量元数据，不含逐点 x/y 坐标，因此不绘制真实眼动热力图。

## 参考文献

- Posner, M. I. (1980). Orienting of attention. *Quarterly Journal of Experimental Psychology*, 32(1), 3–25. https://doi.org/10.1080/00335558008248231
- Posner, M. I., Snyder, C. R. R., & Davidson, B. J. (1980). Attention and the detection of signals. *Journal of Experimental Psychology: General*, 109(2), 160–174. https://pubmed.ncbi.nlm.nih.gov/7381367/
- Treisman, A. M., & Gelade, G. (1980). A feature-integration theory of attention. *Cognitive Psychology*, 12(1), 97–136. https://doi.org/10.1016/0010-0285(80)90005-5
- Rensink, R. A., O’Regan, J. K., & Clark, J. J. (1997). To see or not to see: The need for attention to perceive changes in scenes. *Psychological Science*, 8(5), 368–373. https://doi.org/10.1111/j.1467-9280.1997.tb00427.x
- Davies, T. N., & Hoffman, D. D. (2002). Attention to faces: A change-blindness study. *Perception*, 31(9), 1123–1146. https://doi.org/10.1068/p3391
- Langton, S. R. H., Watt, R. J., & Bruce, V. (2000). Do the eyes have it? Cues to the direction of social attention. *Trends in Cognitive Sciences*, 4(2), 50–59. https://doi.org/10.1016/S1364-6613(99)01436-9
- Frischen, A., Bayliss, A. P., & Tipper, S. P. (2007). Gaze cueing of attention. *Psychological Bulletin*, 133(4), 694–724. https://doi.org/10.1037/0033-2909.133.4.694
- Jack, R. E., & Schyns, P. G. (2017). Toward a social psychophysics of face communication. *Annual Review of Psychology*, 68, 269–297. https://doi.org/10.1146/annurev-psych-010416-044242
