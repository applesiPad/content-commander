/* ═══════════════════════════════════════════════════════════════
   内容指挥部 · 常量配置
   ═══════════════════════════════════════════════════════════════ */

const SCHEMA_VERSION = 1;
const STORAGE_KEY = 'content-commander-v1';

// 内置平台
const DEFAULT_PLATFORMS = [
  { key: 'douyin', name: '抖音', color: '#000000' },
  { key: 'xiaohongshu', name: '小红书', color: '#ff2442' },
  { key: 'shipinhao', name: '视频号', color: '#07c160' },
  { key: 'bilibili', name: 'B站', color: '#00a1d6' },
  { key: 'kuaishou', name: '快手', color: '#ff4906' },
  { key: 'weibo', name: '微博', color: '#ff8200' },
  { key: 'gongzhonghao', name: '公众号', color: '#07c160' },
  { key: 'zhihu', name: '知乎', color: '#0066ff' }
];

// 各平台创作者后台（发布辅助：用户点击跳转，产品不自动调用）
const PLATFORM_CREATOR_URLS = {
  douyin: 'https://creator.douyin.com/creator-micro/content/upload',
  xiaohongshu: 'https://creator.xiaohongshu.com/publish/publish',
  shipinhao: 'https://channels.weixin.qq.com/platform/post/create',
  bilibili: 'https://member.bilibili.com/platform/upload/video/frame',
  kuaishou: 'https://cp.kuaishou.com/article/publish/video',
  weibo: 'https://weibo.com',
  gongzhonghao: 'https://mp.weixin.qq.com',
  zhihu: 'https://www.zhihu.com/creator'
};

// 8 种 IP 形象
const IP_AVATARS = ['🎭', '🦊', '🐱', '🐻', '🐼', '🦁', '🐰', '🐶'];

// 8 种主题色
const IP_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'
];

// 五维评分维度
const FIVE_DIMS = [
  { key: 'pain', name: '痛点', icon: '💢' },
  { key: 'useful', name: '实用', icon: '🔧' },
  { key: 'debate', name: '争议', icon: '💬' },
  { key: 'suspense', name: '悬念', icon: '🎭' },
  { key: 'track', name: '赛道', icon: '🏃' }
];

// 内容阶段
const CONTENT_STAGES = [
  { key: 'topic', name: '选题', color: '#94a3b8' },
  { key: 'draft', name: '稿件', color: '#f59e0b' },
  { key: 'shoot', name: '拍摄', color: '#3b82f6' },
  { key: 'schedule', name: '排期', color: '#8b5cf6' },
  { key: 'published', name: '已发布', color: '#10b981' }
];

// 默认数据标准线
const DEFAULT_STANDARDS = {
  wpm: 240,           // 语速：字/分钟
  fiveSecLine: 60,    // 5秒完播达标线 %
  favLine: 2.2,       // 收藏率达标线 %
  avgLine: 40,        // 均播/时长达标线 %
  commentLine: 0.5,   // 评论率达标线 %
  hotMult: 2,         // 爆款倍数
  favPortrait: 0.5    // 收藏型画像阈值
};

// 标题公式
const TITLE_FORMULAS = [
  { pattern: '{pain}的人，{action}试试这个', category: '痛点' },
  { pattern: '为什么你总是{pain}？因为{reason}', category: '痛点' },
  { pattern: '{number}个{topic}小技巧，第{highlight}个最实用', category: '实用' },
  { pattern: '还在{pain}？这个方法帮你{result}', category: '痛点' },
  { pattern: '{topic}避坑指南：{number}个常见错误', category: '实用' },
  { pattern: '我花了{time}才搞懂的{topic}真相', category: '悬念' },
  { pattern: '{topic}干货｜从{start}到{end}的完整攻略', category: '实用' },
  { pattern: '别再{wrongAction}了！正确做法是{rightAction}', category: '争议' },
  { pattern: '{topic}新手必看：{number}步上手指南', category: '实用' },
  { pattern: '真相了！{topic}的底层逻辑其实是{insight}', category: '悬念' },
  { pattern: '{audience}千万别{action}，除非你{condition}', category: '争议' },
  { pattern: '从{start}到{end}，我做对了这{number}件事', category: '实用' },
  { pattern: '{topic}天花板！这个{result}太绝了', category: '悬念' },
  { pattern: '后悔没早知道的{number}个{topic}秘诀', category: '悬念' },
  { pattern: '{topic}圈不会告诉你的{number}个秘密', category: '争议' },
  { pattern: '一招教你解决{pain}，亲测有效', category: '痛点' },
  { pattern: '{topic}红黑榜：这些{item}千万别碰', category: '争议' },
  { pattern: '月省{amount}的{topic}方法，打工人狂喜', category: '实用' },
  { pattern: '{topic}测评：{itemA} vs {itemB}，结果出乎意料', category: '悬念' },
  { pattern: '被问爆的{topic}攻略，今天统一回复', category: '实用' }
];

// 钩子模板
const HOOK_TEMPLATES = [
  '你还在{pain}吗？',
  '{number}秒告诉你{topic}的真相',
  '千万别{action}，除非你看完这个',
  '今天讲一个{topic}的反常识',
  '这条内容可能颠覆你对{topic}的认知',
  '{result}的秘密，其实就这一步',
  '为什么{percent}的人都{wrongAction}？',
  '如果你正在{pain}，一定要看完',
  '{topic}最大的谎言就是{lie}',
  '花了{time}才明白的{topic}真相'
];

// 正文结构模板
const BODY_STRUCTURES = [
  { name: '问题-方案', pattern: '痛点引入 → 原因分析 → 解决方案 → 行动号召' },
  { name: '故事弧', pattern: '场景代入 → 冲突展开 → 转折 → 收获' },
  { name: '清单体', pattern: '第1点 → 第2点 → 第3点 → 总结' },
  { name: '对比式', pattern: '常见做法 → 问题 → 更好方法 → 效果' },
  { name: '时间线', pattern: '过去 → 现在 → 未来 → 行动建议' },
  { name: '金字塔', pattern: '结论 → 论据1 → 论据2 → 论据3 → 重申' },
  { name: 'SCQA', pattern: '情境 → 冲突 → 疑问 → 答案' }
];

// AI 模板
const AI_TEMPLATES = [
  { name: '爆款标题x10', desc: '生成10个爆款标题' },
  { name: '营销节点选题', desc: '根据营销节点生成选题' },
  { name: '热点切入角度', desc: '分析热点的切入角度' },
  { name: '系列选题规划', desc: '规划系列选题内容' },
  { name: '拆解对标爆款', desc: '拆解对标账号的爆款内容' },
  { name: '对标账号打法总结', desc: '总结对标账号的运营打法' },
  { name: '口播文案初稿', desc: '生成口播文案初稿' },
  { name: '黄金5秒开头', desc: '生成吸引人的开头' },
  { name: '分镜脚本', desc: '生成分镜脚本' },
  { name: '多平台改写', desc: '改写适配多平台的内容' },
  { name: '封面文案+标签', desc: '生成封面文案和标签' },
  { name: '评论区回复', desc: '生成评论区回复话术' },
  { name: 'IP人设定位', desc: '梳理IP人设定位' },
  { name: '多平台矩阵规划', desc: '规划多平台矩阵策略' },
  { name: '周复盘报告', desc: '生成周复盘报告' },
  { name: '账号对比分析', desc: '对比分析账号数据' }
];
