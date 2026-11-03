/* ═══════════════════════════════════════════════════════════════
   内容指挥部 · 数据层
   ═══════════════════════════════════════════════════════════════ */

const Store = {
  data: null,
  
  init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.data = JSON.parse(saved);
        if (!this.data.version || this.data.version < SCHEMA_VERSION) {
          this.migrate();
        }
      } catch (e) {
        console.error('Failed to parse saved data:', e);
        this.data = null;
      }
    }
    if (!this.data) {
      this.reset();
    }
    return this;
  },
  
  reset() {
    this.data = {
      version: SCHEMA_VERSION,
      ips: [],
      accounts: [],
      contents: [],
      posts: [],
      topics: [],
      hots: [],
      benchmarks: [],
      benchWorks: [],
      settings: {
        masterName: '主理人',
        masterAvatar: '👤',
        theme: 'light',
        platforms: [...DEFAULT_PLATFORMS],
        customPlatforms: [],
        standards: { ...DEFAULT_STANDARDS },
        teleprompter: { speed: 3, fontSize: 48, mirror: false },
        ai: {
          protocol: 'openai',
          baseUrl: '',
          apiKey: '',
          model: '',
          chats: []
        },
        nodes: this.getDefaultNodes(),
        extremeWords: this.getDefaultExtremeWords()
      },
      ui: {
        currentIp: null,
        currentPage: 'dashboard'
      }
    };
    this.save();
    return this;
  },
  
  getDefaultNodes() {
    return [
      { date: '01-01', name: '元旦', type: 'festival' },
      { date: '02-14', name: '情人节', type: 'festival' },
      { date: '03-08', name: '妇女节', type: 'festival' },
      { date: '05-01', name: '劳动节', type: 'festival' },
      { date: '06-01', name: '儿童节', type: 'festival' },
      { date: '10-01', name: '国庆节', type: 'festival' },
      { date: '11-11', name: '双十一', type: 'shopping' },
      { date: '12-12', name: '双十二', type: 'shopping' }
    ];
  },
  
  getDefaultExtremeWords() {
    return [
      '最', '第一', '唯一', '绝对', '100%', '永远', '全部',
      '国家级', '世界级', '顶级', '极品', '绝无仅有',
      '保证', '承诺', '必赚', '零风险', '躺赚', '日入过万'
    ];
  },
  
  migrate() {
    this.data.version = SCHEMA_VERSION;
    this.save();
  },
  
  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.error('Failed to save:', e);
      if (e.name === 'QuotaExceededError') {
        alert('存储空间不足，请导出数据后清理');
      }
    }
  },
  
  // IP 管理
  addIP(ip) {
    ip.id = this.genId('ip');
    ip.createdAt = Date.now();
    if (!ip.weeklyGoal) ip.weeklyGoal = 3;
    this.data.ips.push(ip);
    this.save();
    return ip;
  },

  updateIP(id, updates) {
    const ip = this.data.ips.find(i => i.id === id);
    if (ip) Object.assign(ip, updates);
    this.save();
    return ip;
  },

  // 统计删除某 IP 将级联影响的数量（用于确认提示）
  countIPCascade(id) {
    const accIds = this.data.accounts.filter(a => a.ipId === id).map(a => a.id);
    return {
      accounts: accIds.length,
      posts: this.data.posts.filter(p => accIds.includes(p.accountId)).length
    };
  },

  // FR-01-07：删 IP → 账号与发布记录一并删除，内容保留标记「未归属」
  deleteIP(id) {
    const idx = this.data.ips.findIndex(i => i.id === id);
    if (idx > -1) {
      this.data.ips.splice(idx, 1);
      const accIds = this.data.accounts.filter(a => a.ipId === id).map(a => a.id);
      this.data.accounts = this.data.accounts.filter(a => a.ipId !== id);
      this.data.posts = this.data.posts.filter(p => !accIds.includes(p.accountId));
      this.data.contents.forEach(c => { if (c.ipId === id) c.ipId = null; });
      this.save();
    }
  },

  getIP(id) {
    return this.data.ips.find(i => i.id === id);
  },

  // 账号管理
  addAccount(acc) {
    acc.id = this.genId('acc');
    acc.createdAt = Date.now();
    this.data.accounts.push(acc);
    this.save();
    return acc;
  },

  updateAccount(id, updates) {
    const acc = this.data.accounts.find(a => a.id === id);
    if (acc) Object.assign(acc, updates);
    this.save();
    return acc;
  },

  // FR-01-07：删账号 → 同时删除该账号全部发布记录
  deleteAccount(id) {
    const idx = this.data.accounts.findIndex(a => a.id === id);
    if (idx > -1) {
      this.data.accounts.splice(idx, 1);
      this.data.posts = this.data.posts.filter(p => p.accountId !== id);
      this.save();
    }
  },

  countAccountCascade(id) {
    return this.data.posts.filter(p => p.accountId === id).length;
  },
  
  getAccountsByIP(ipId) {
    return this.data.accounts.filter(a => a.ipId === ipId);
  },
  
  // 内容管理
  addContent(content) {
    content.id = this.genId('content');
    content.createdAt = Date.now();
    content.updatedAt = Date.now();
    content.stage = content.stage || 'topic';
    this.data.contents.push(content);
    this.save();
    return content;
  },
  
  updateContent(id, updates) {
    const content = this.data.contents.find(c => c.id === id);
    if (content) {
      Object.assign(content, updates);
      content.updatedAt = Date.now();
    }
    this.save();
    return content;
  },
  
  deleteContent(id) {
    const idx = this.data.contents.findIndex(c => c.id === id);
    if (idx > -1) {
      this.data.contents.splice(idx, 1);
      this.data.posts = this.data.posts.filter(p => p.contentId !== id);
      this.save();
    }
  },
  
  getContent(id) {
    return this.data.contents.find(c => c.id === id);
  },
  
  getContentsByIP(ipId) {
    if (!ipId) return this.data.contents;
    return this.data.contents.filter(c => c.ipId === ipId);
  },
  
  // 发布记录
  addPost(post) {
    post.id = this.genId('post');
    post.createdAt = Date.now();
    this.data.posts.push(post);
    this.save();
    return post;
  },
  
  updatePost(id, updates) {
    const post = this.data.posts.find(p => p.id === id);
    if (post) Object.assign(post, updates);
    this.save();
    return post;
  },
  
  deletePost(id) {
    const idx = this.data.posts.findIndex(p => p.id === id);
    if (idx > -1) {
      this.data.posts.splice(idx, 1);
      this.save();
    }
  },
  
  getPostsByContent(contentId) {
    return this.data.posts.filter(p => p.contentId === contentId);
  },
  
  getPostsByAccount(accountId) {
    return this.data.posts.filter(p => p.accountId === accountId);
  },
  
  // 选题
  addTopic(topic) {
    topic.id = this.genId('topic');
    topic.createdAt = Date.now();
    topic.status = topic.status || 'pool';
    this.data.topics.push(topic);
    this.save();
    return topic;
  },
  
  updateTopic(id, updates) {
    const topic = this.data.topics.find(t => t.id === id);
    if (topic) Object.assign(topic, updates);
    this.save();
    return topic;
  },
  
  deleteTopic(id) {
    const idx = this.data.topics.findIndex(t => t.id === id);
    if (idx > -1) {
      this.data.topics.splice(idx, 1);
      this.save();
    }
  },
  
  // 热点
  addHot(hot) {
    hot.id = this.genId('hot');
    hot.createdAt = Date.now();
    hot.dueAt = hot.createdAt + 72 * 3600 * 1000;
    this.data.hots.push(hot);
    this.save();
    return hot;
  },
  
  updateHot(id, updates) {
    const hot = this.data.hots.find(h => h.id === id);
    if (hot) Object.assign(hot, updates);
    this.save();
    return hot;
  },
  
  deleteHot(id) {
    const idx = this.data.hots.findIndex(h => h.id === id);
    if (idx > -1) {
      this.data.hots.splice(idx, 1);
      this.save();
    }
  },
  
  // 对标
  addBenchmark(bench) {
    bench.id = this.genId('bench');
    bench.createdAt = Date.now();
    this.data.benchmarks.push(bench);
    this.save();
    return bench;
  },
  
  updateBenchmark(id, updates) {
    const bench = this.data.benchmarks.find(b => b.id === id);
    if (bench) Object.assign(bench, updates);
    this.save();
    return bench;
  },
  
  deleteBenchmark(id) {
    const idx = this.data.benchmarks.findIndex(b => b.id === id);
    if (idx > -1) {
      this.data.benchmarks.splice(idx, 1);
      this.data.benchWorks = this.data.benchWorks.filter(w => w.benchId !== id);
      this.save();
    }
  },
  
  addBenchWork(work) {
    work.id = this.genId('work');
    work.createdAt = Date.now();
    this.data.benchWorks.push(work);
    this.save();
    return work;
  },
  
  updateBenchWork(id, updates) {
    const work = this.data.benchWorks.find(w => w.id === id);
    if (work) Object.assign(work, updates);
    this.save();
    return work;
  },
  
  deleteBenchWork(id) {
    const idx = this.data.benchWorks.findIndex(w => w.id === id);
    if (idx > -1) {
      this.data.benchWorks.splice(idx, 1);
      this.save();
    }
  },
  
  // 工具
  genId(prefix) {
    return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },
  
  // FR-10-05：导出剥离 AI Key（NFR-05）
  export() {
    const clone = JSON.parse(JSON.stringify(this.data));
    if (clone.settings?.ai) delete clone.settings.ai.apiKey;
    clone.exportedAt = new Date().toISOString();
    return JSON.stringify(clone, null, 2);
  },

  // FR-10-07：清空业务数据，保留主理人/主题/数据标准/AI 设置
  resetBusinessData() {
    const settings = this.data.settings;
    this.data = {
      version: SCHEMA_VERSION,
      ips: [], accounts: [], contents: [], posts: [],
      topics: [], hots: [], benchmarks: [], benchWorks: [],
      ui: this.data.ui || {},
      settings
    };
    this.save();
  },
  
  import(json) {
    try {
      const data = JSON.parse(json);
      if (data.version) {
        this.data = data;
        this.save();
        return true;
      }
    } catch (e) {
      console.error('Import failed:', e);
    }
    return false;
  },
  
  getFilteredData(filterIp) {
    if (!filterIp) return this.data;
    return {
      ...this.data,
      accounts: this.data.accounts.filter(a => a.ipId === filterIp),
      contents: this.data.contents.filter(c => c.ipId === filterIp),
      topics: this.data.topics.filter(t => t.ipId === filterIp),
      hots: this.data.hots.filter(h => !h.ipIds || h.ipIds.includes(filterIp)),
      benchmarks: this.data.benchmarks.filter(b => !b.ipId || b.ipId === filterIp)
    };
  },
  
  getStats(filterIp) {
    const data = filterIp ? this.getFilteredData(filterIp) : this.data;
    const sevenDaysAgo = Date.now() - 7 * 24 * 3600 * 1000;
    
    const postsThisWeek = data.posts.filter(p => p.publishedAt >= sevenDaysAgo);
    const pendingShoot = data.contents.filter(c => c.stage === 'shoot').length;
    const pendingPublish = data.contents.filter(c => c.stage === 'schedule').length;
    const pendingBackfill = data.posts.filter(p => p.publishedAt && !p.backfilledAt).length;
    
    return {
      pendingShoot,
      pendingPublish,
      pendingBackfill,
      postsThisWeek: postsThisWeek.length,
      totalContents: data.contents.length,
      totalPosts: data.posts.length
    };
  }
};
