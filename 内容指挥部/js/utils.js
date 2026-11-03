/* ═══════════════════════════════════════════════════════════════
   内容指挥部 · 工具函数
   ═══════════════════════════════════════════════════════════════ */

// 数字解析（支持"1.2万"格式）
function parseNumber(str) {
  if (typeof str === 'number') return str;
  if (!str) return 0;
  str = String(str).trim().replace(/,/g, '');
  
  let multiplier = 1;
  if (str.includes('万') || str.toLowerCase().includes('w')) {
    multiplier = 10000;
    str = str.replace(/[万wW]/g, '');
  } else if (str.includes('亿') || str.toLowerCase().includes('y')) {
    multiplier = 100000000;
    str = str.replace(/[亿yY]/g, '');
  } else if (str.toLowerCase().includes('k')) {
    multiplier = 1000;
    str = str.replace(/[kK]/g, '');
  }
  
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num * multiplier;
}

// 数字格式化
function formatNumber(num) {
  if (num >= 10000) return (num / 10000).toFixed(1) + '万';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return String(num);
}

// 计算选题评级
function calcRating(scores) {
  const total = (scores.pain || 0) + (scores.useful || 0) + 
                (scores.debate || 0) + (scores.suspense || 0) + (scores.track || 0);
  let rating = 'C';
  if (total >= 21) rating = 'S';
  else if (total >= 17) rating = 'A';
  else if (total >= 13) rating = 'B';
  return { rating, total };
}

// 计算选题类型
function calcTopicType(scores) {
  const dims = [
    { key: 'pain', val: scores.pain || 0 },
    { key: 'useful', val: scores.useful || 0 },
    { key: 'debate', val: scores.debate || 0 },
    { key: 'suspense', val: scores.suspense || 0 }
  ];
  dims.sort((a, b) => b.val - a.val);
  if (dims[0].val === dims[1].val) {
    const order = ['pain', 'useful', 'debate', 'suspense'];
    for (const key of order) {
      if (scores[key] === dims[0].val) {
        return key === 'pain' ? '痛点型' : key === 'useful' ? '实用型' : key === 'debate' ? '评论型' : '完播型';
      }
    }
  }
  return dims[0].key === 'pain' ? '痛点型' : dims[0].key === 'useful' ? '收藏型' : dims[0].key === 'debate' ? '评论型' : '完播型';
}

// 文案体检（10项）
function checkScript(script, ip, standards) {
  const results = [];
  const wpm = standards.wpm || 240;
  
  // 1. 开头有结果或冲突
  const hookPatterns = /[0-9]+[秒天年月]|真的|竟然|竟然|千万别|还在|焦虑|踩雷|不会|没时间|？/;
  results.push({
    id: 'hook',
    name: '开头有结果或冲突',
    pass: hookPatterns.test(script.hook || ''),
    tip: '前5秒需要给出结果、冲突或疑问'
  });
  
  // 2. 标题埋痛点
  const painPatterns = /还在|焦虑|踩雷|不会|没时间|为什么|怎么|总是|经常|难|痛|坑|错|后悔|\？/;
  results.push({
    id: 'titlePain',
    name: '标题埋痛点',
    pass: painPatterns.test(script.title || ''),
    tip: '标题应包含目标观众的痛点关键词'
  });
  
  // 3. 信息点 >= 3
  const infoCount = (script.body || '').split(/[。！？；\n]/).filter(s => s.trim().length > 5).length;
  results.push({
    id: 'infoPoints',
    name: '信息点 >= 3',
    pass: infoCount >= 3,
    tip: `当前约 ${infoCount} 个信息点，建议至少 3 个`
  });
  
  // 4. 时长 <= 目标
  const totalChars = (script.hook || '').length + (script.body || '').length + (script.cta || '').length;
  const duration = totalChars / wpm * 60;
  results.push({
    id: 'duration',
    name: '时长合理',
    pass: duration <= 180,
    tip: `预估 ${Math.round(duration)}秒，建议不超过3分钟`
  });
  
  // 5. 封面大字 <= 12字
  const coverChars = (script.cover || '').length;
  results.push({
    id: 'coverText',
    name: '封面大字 <= 12字',
    pass: coverChars <= 12,
    tip: `当前 ${coverChars} 字，建议精简`
  });
  
  // 6. 标签 3-5 个
  const tags = (script.tags || '').split(/[,，\s]+/).filter(t => t.trim());
  results.push({
    id: 'tagCount',
    name: '标签 3-5 个',
    pass: tags.length >= 3 && tags.length <= 5,
    tip: `当前 ${tags.length} 个，建议 3-5 个`
  });
  
  // 7. 含赛道词
  const trackWord = ip?.track || '';
  const hasTrackWord = trackWord && tags.some(t => t.includes(trackWord));
  results.push({
    id: 'trackTag',
    name: '含赛道标签',
    pass: hasTrackWord || !trackWord,
    tip: trackWord ? `建议包含赛道词「${trackWord}」` : '未设置IP赛道'
  });
  
  // 8. 中段有悬念
  const suspensePatterns = /但是|然而|不过|其实|没想到|结果|竟然|转折|关键|秘密/;
  results.push({
    id: 'midSuspense',
    name: '中段埋悬念',
    pass: suspensePatterns.test(script.body || ''),
    tip: '正文中加入转折或悬念提升完播'
  });
  
  // 9. 结尾引导互动
  const ctaPatterns = /你觉得|评论区|告诉我|你|你们|大家|赞同|反对|怎么看|留言/;
  results.push({
    id: 'cta',
    name: '结尾引导互动',
    pass: ctaPatterns.test(script.cta || ''),
    tip: '结尾引导评论提升互动率'
  });
  
  // 10. 无极限词
  const extremeWords = Store.data.settings.extremeWords || [];
  const fullText = (script.title || '') + (script.hook || '') + (script.body || '') + (script.cta || '');
  const foundExtreme = extremeWords.filter(w => fullText.includes(w));
  results.push({
    id: 'noExtreme',
    name: '无极限词',
    pass: foundExtreme.length === 0,
    tip: foundExtreme.length ? `发现：${foundExtreme.join('、')}` : '通过'
  });
  
  return {
    results,
    score: Math.round(results.filter(r => r.pass).length / results.length * 100),
    passed: results.filter(r => r.pass).length,
    total: results.length
  };
}

// 象限诊断
function diagnosePost(post, standards, avgPlay) {
  const fiveSec = post.fiveSecRate;
  const favRate = post.play > 0 ? (post.favorite / post.play * 100) : 0;
  const avgRate = post.duration > 0 ? (post.avgPlay / post.duration * 100) : 0;
  const commentRate = post.play > 0 ? (post.comment / post.play * 100) : 0;
  
  const hasFiveSec = fiveSec !== null && fiveSec !== undefined;
  
  let quadrant = 'unknown';
  let color = 'gray';
  
  if (hasFiveSec) {
    const fiveOk = fiveSec >= standards.fiveSecLine;
    const favOk = favRate >= standards.favLine;
    
    if (fiveOk && favOk) { quadrant = 'hit'; color = 'green'; }
    else if (!fiveOk && favOk) { quadrant = 'goodContent'; color = 'yellow'; }
    else if (fiveOk && !favOk) { quadrant = 'goodHook'; color = 'orange'; }
    else { quadrant = 'redo'; color = 'red'; }
  } else {
    if (favRate >= standards.favLine) { quadrant = 'maybeGood'; color = 'yellow'; }
    else { quadrant = 'unknown'; color = 'gray'; }
  }
  
  const conclusions = {
    hit: '爆款潜质',
    goodContent: '内容好、开头弱',
    goodHook: '开头强、干货弱',
    redo: '需要重做',
    maybeGood: '收藏达标（无5秒数据）',
    unknown: '数据不足'
  };
  
  const suggestions = [];
  if (hasFiveSec && fiveSec < standards.fiveSecLine) {
    suggestions.push('优化前5秒钩子');
  }
  if (favRate < standards.favLine) {
    suggestions.push('增加实用信息点');
  }
  if (avgRate < standards.avgLine) {
    suggestions.push('提升中段留存');
  }
  if (commentRate < standards.commentLine) {
    suggestions.push('加强互动引导');
  }
  if (avgPlay > 0 && avgPlay < avgPlay * 0.6) {
    suggestions.push('检查发布时段/标签');
  }
  
  return {
    quadrant,
    color,
    conclusion: conclusions[quadrant],
    metrics: { fiveSec, favRate, avgRate, commentRate },
    suggestions
  };
}

// 自动分镜
function autoStoryboard(script, wpm = 240) {
  const shots = [];
  const sections = [
    { name: 'hook', text: script.hook || '' },
    { name: 'body', text: script.body || '' },
    { name: 'cta', text: script.cta || '' }
  ];
  
  let shotIndex = 0;
  const charsPerShot = Math.round(wpm / 60 * 4);
  
  sections.forEach((section, sIdx) => {
    if (!section.text) return;
    
    if (sIdx === 0 && section.text) {
      shots.push({
        id: 'shot_' + (++shotIndex),
        scene: '特写',
        visual: '面对镜头，表情专注',
        lines: section.text,
        chars: section.text.length,
        duration: Math.max(1, Math.round(section.text.length / (wpm / 60))),
        done: false
      });
      return;
    }
    
    if (sIdx === 2 && section.text) {
      shots.push({
        id: 'shot_' + (++shotIndex),
        scene: '近景',
        visual: '面对镜头，手势引导',
        lines: section.text,
        chars: section.text.length,
        duration: Math.max(1, Math.round(section.text.length / (wpm / 60))),
        done: false
      });
      return;
    }
    
    const sentences = section.text.split(/([。！？；\n])/).filter(s => s.trim());
    let currentShot = { lines: '', chars: 0 };
    
    sentences.forEach((sentence, i) => {
      if (currentShot.chars + sentence.length > charsPerShot && currentShot.chars > 0) {
        shots.push({
          id: 'shot_' + (++shotIndex),
          scene: shotIndex % 2 === 0 ? '近景' : '中景',
          visual: '',
          lines: currentShot.lines,
          chars: currentShot.chars,
          duration: Math.max(1, Math.round(currentShot.chars / (wpm / 60))),
          done: false
        });
        currentShot = { lines: '', chars: 0 };
      }
      currentShot.lines += sentence;
      currentShot.chars += sentence.length;
    });
    
    if (currentShot.chars > 0) {
      shots.push({
        id: 'shot_' + (++shotIndex),
        scene: shotIndex % 2 === 0 ? '近景' : '中景',
        visual: '',
        lines: currentShot.lines,
        chars: currentShot.chars,
        duration: Math.max(1, Math.round(currentShot.chars / (wpm / 60))),
        done: false
      });
    }
  });
  
  return shots;
}

// ═══ 对标拆解（FR-03-03/04，PRD-03 §3.1/3.2 启发式，原创转写）═══

// FR-03-03：口播稿自动分段 → { opening, body, ending }；空稿返回 null
function segmentScript(text) {
  const t = (text || '').trim();
  if (!t) return null;
  // 切句：按中英文句末标点/换行切，保留标点
  const sentences = t.split(/\n+/).flatMap(para => para.split(/(?<=[。！？!?])/)).map(s => s.trim()).filter(Boolean);
  if (!sentences.length) return null;
  const HOOK_WORDS = /[0-9一二两三四五六七八九十百千万]+|为什么|怎么|如何|千万别|不要|还在|竟然|居然|没想到|结果|真相|秘密|其实|告诉你|建议|后悔|一定|你有没有|如果你|普通人|打工人|姐妹|兄弟|[？?]/;
  const CTA_WORDS = /关注|点赞|收藏|评论|转发|留言|私信|评论区|主页|下期|你觉得|你会|告诉我|聊聊|说说|扣[个一1]|双击|记得/;
  // 开头段：前 1–2 句中命中钩子词表的句子；未命中默认首句
  let openingIdx = 0;
  for (let i = 0; i < Math.min(2, sentences.length); i++) {
    if (HOOK_WORDS.test(sentences[i])) { openingIdx = i; break; }
  }
  // 结尾段：末 1–2 句中命中互动引导词表的句子；未命中默认末句
  let endingIdx = -1;
  for (let i = sentences.length - 1; i >= Math.max(0, sentences.length - 2); i--) {
    if (CTA_WORDS.test(sentences[i])) { endingIdx = i; break; }
  }
  if (endingIdx < 0) endingIdx = sentences.length - 1;
  // 单句/双句防重叠：开头优先，结尾让位
  if (sentences.length === 1) endingIdx = -1;
  if (sentences.length === 2 && endingIdx === openingIdx) endingIdx = -1;
  const join = (from, to) => sentences.slice(from, to + 1).join('');
  const bodyFrom = sentences.length === 1 ? -1 : openingIdx + 1;
  const bodyTo = (endingIdx > openingIdx ? endingIdx : openingIdx) - (endingIdx > openingIdx ? 0 : 0);
  return {
    opening: join(openingIdx, openingIdx),
    body: sentences.length > 1 ? join(openingIdx + 1, Math.max(openingIdx + 1, (endingIdx > openingIdx ? endingIdx : sentences.length - 1) - 1)) : '',
    ending: endingIdx > openingIdx ? join(endingIdx, endingIdx) : ''
  };
}

// FR-03-04：三段 → 4 类结构标签；识别不出返回 ''（提示手动归类）
function classifyBenchLabels(parts) {
  const opening = parts.opening || '';
  const body = parts.body || '';
  const ending = parts.ending || '';
  const pick = (text, cat) => {
    const rules = BENCH_LABEL_RULES[cat] || [];
    for (let i = 0; i < rules.length; i++) {
      if (rules[i].test(text)) return BENCH_LABELS[cat][i];
    }
    return '';
  };
  // 正文结构：按特征计数判定（清单/问答/故事/时间线/对比/递进，兜底总分总）
  let structure = '';
  if (body) {
    const enumHits = (body.match(/第[一二三四五六七八九十0-9]+|首先|其次|再次|最后[，,一]/g) || []).length
      + (body.match(/(?:^|[。！？!?；;\n])\s*[0-9]+[.、)]/g) || []).length;
    const qHits = (body.match(/[？?]/g) || []).length;
    const iCount = (body.match(/我/g) || []).length;
    if (enumHits >= 2) structure = '清单式';
    else if (qHits >= 2) structure = '问答式';
    else if (iCount >= 3) structure = '故事式';
    else if (/以前|当时|后来|现在|第一天|第二|那个月|这一年|之后/.test(body)) structure = '时间线';
    else if (/对比|而是|反而|区别|VS|vs|换成了/.test(body)) structure = '对比式';
    else if (/更|甚至|进一步|关键|最重要的是|而且|更何况/.test(body)) structure = '递进式';
    else {
      const sents = body.split(/[。！？!?]/).filter(s => s.trim()).length;
      structure = sents >= 3 ? '总分总' : '';
    }
  }
  return {
    angle: pick(opening + body.slice(0, 120), 'angle'),
    hook: pick(opening, 'hook'),
    structure,
    ending: pick(ending, 'ending')
  };
}

// HTML转义
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// 时间格式化
function formatTimeLeft(timestamp) {
  const diff = timestamp - Date.now();
  if (diff <= 0) return '已过期';
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return `${Math.floor(diff / 60000)}分钟后`;
  if (hours < 24) return `${hours}小时后`;
  return `${Math.floor(hours / 24)}天后`;
}

// 简易Markdown渲染
function renderMarkdown(text) {
  if (!text) return '';
  return escHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}
