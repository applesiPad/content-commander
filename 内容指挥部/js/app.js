/* ═══════════════════════════════════════════════════════════════
   内容指挥部 · 应用控制器
   ═══════════════════════════════════════════════════════════════ */

const App = {
  currentPage: 'dashboard',
  currentIp: null,
  editingId: null,
  currentChatId: null,
  
  init() {
    Store.init();
    this.bindEvents();
    this.loadTheme();

    // FR-01-06：恢复上次的 IP 过滤选择
    this.currentIp = Store.data.ui?.currentIp || null;
    const ipName = this.currentIp ? (Store.getIP(this.currentIp)?.name || '全部 IP') : '全部 IP';
    const nameEl = document.getElementById('currentIpName');
    if (nameEl) nameEl.textContent = ipName;

    if (!Store.data.ips || Store.data.ips.length === 0) {
      this.showWelcomeWizard();
    } else {
      this.navigate('dashboard');
    }
  },
  
  bindEvents() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => this.navigate(item.dataset.page));
    });
    
    document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
    document.getElementById('ipSwitcher').addEventListener('click', () => this.showIPSwitcher());
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.closeModal();
    });
    
    if (!Store.storageOk) document.getElementById('storageWarn').style.display = 'block'; // NFR-08
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeModal();
        this.closeTeleprompter();
      }
      // FR-06-05：空格 暂停/继续（仅提词器打开时拦截默认滚动）
      if (e.code === 'Space' && document.getElementById('teleprompter')?.classList.contains('active')) {
        e.preventDefault();
        this.tpTogglePause();
      }
    });
  },
  
  navigate(page) {
    this.currentPage = page;
    Store.data.ui.currentPage = page;
    Store.save();
    
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });
    
    const titles = {
      dashboard: '指挥板', ip: 'IP 与账号', hot: '热点雷达', bench: '对标拆解',
      topic: '选题池', script: '文案工坊', shoot: '拍摄与提词',
      schedule: '发布排期', review: '数据复盘', ai: 'AI 助手', settings: '设置'
    };
    document.getElementById('pageTitle').textContent = titles[page] || page;
    this.renderPage(page);
  },
  
  renderPage(page) {
    const content = document.getElementById('content');
    const renderers = {
      dashboard: () => this.renderDashboard(),
      ip: () => this.renderIP(),
      hot: () => this.renderHot(),
      bench: () => this.renderBench(),
      topic: () => this.renderTopic(),
      script: () => this.renderScript(),
      shoot: () => this.renderShoot(),
      schedule: () => this.renderSchedule(),
      review: () => this.renderReview(),
      ai: () => this.renderAI(),
      settings: () => this.renderSettings()
    };
    
    content.innerHTML = (renderers[page] || renderers.dashboard)();
    content.className = 'content fade-in';
  },
  
  // 欢迎向导
  showWelcomeWizard() {
    this.showModal(`
      <div style="text-align:center;margin-bottom:24px">
        <div style="width:64px;height:64px;background:var(--ink);border-radius:16px;display:flex;align-items:center;justify-content:center;color:#fff;font-family:var(--font-mono);font-size:24px;font-weight:700;margin:0 auto 16px">&gt;_</div>
        <div style="font-size:22px;font-weight:900;margin-bottom:8px">欢迎使用内容指挥部</div>
        <div style="font-size:14px;color:var(--muted)">面向短视频口播创作者的多 IP / 多账号内容工作台</div>
      </div>
      <div style="font-size:13px;color:var(--muted);line-height:1.8;margin-bottom:20px">
        <p>这里可以管理你的全部创作流程：</p>
        <p style="margin-top:8px">🔥 热点雷达 → 🎯 对标拆解 → 💡 选题 → ✍️ 文案 → 🎬 拍摄 → 📅 排期 → 📈 复盘</p>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px">
        <button class="btn btn-primary" style="width:100%;padding:14px" onclick="App.closeModal();App.loadSampleData()">📦 载入示例工作室</button>
        <button class="btn btn-secondary" style="width:100%;padding:14px" onclick="App.closeModal();App.navigate('ip')">✨ 从空白开始</button>
        <button class="btn btn-secondary" style="width:100%;padding:14px" onclick="App.closeModal();document.getElementById('importFile').click()">📂 导入已有数据</button>
      </div>
      <input type="file" id="importFile" style="display:none" accept=".json" onchange="App.importData(event)">
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid var(--line);font-size:12px;color:var(--muted);text-align:center">
        数据存储在本地浏览器 · 离线可用 · 随时备份导出
      </div>
    `);
  },
  
  // 指挥板
  renderDashboard() {
    const stats = Store.getStats(this.currentIp);
    const data = Store.getFilteredData(this.currentIp);
    const today = new Date();
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      weekDays.push(d);
    }
    
    const accounts = this.currentIp ? data.accounts : Store.data.accounts;
    const scheduledContents = data.contents.filter(c => c.stage === 'schedule' && c.scheduledAt);
    
    return `
      <div class="dashboard-stats">
        <div class="stat-card clickable" onclick="App.navigate('shoot')">
          <div class="stat-value">${stats.pendingShoot}</div>
          <div class="stat-label">待拍摄</div>
        </div>
        <div class="stat-card clickable" onclick="App.navigate('schedule')">
          <div class="stat-value">${stats.pendingPublish}</div>
          <div class="stat-label">待发布</div>
        </div>
        <div class="stat-card clickable" onclick="App.navigate('review')">
          <div class="stat-value">${stats.pendingBackfill}</div>
          <div class="stat-label">待回填</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.postsThisWeek}</div>
          <div class="stat-label">近7天发布</div>
        </div>
      </div>
      
      <div class="grid-2" style="margin-bottom:24px">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">本周排期</h3>
            <button class="btn btn-sm btn-secondary" onclick="App.navigate('schedule')">查看全部</button>
          </div>
          <div class="schedule-timeline">
            <div class="timeline-header">
              <div class="timeline-cell"></div>
              ${weekDays.map(d => `
                <div class="timeline-cell">
                  ${['日','一','二','三','四','五','六'][d.getDay()]}<br>
                  <span style="font-weight:600;color:var(--ink)">${d.getDate()}</span>
                </div>
              `).join('')}
            </div>
            ${accounts.slice(0, 5).map(acc => {
              const ip = Store.getIP(acc.ipId);
              return `
                <div class="timeline-row">
                  <div class="timeline-account">
                    <span style="color:${ip?.color || '#999'}">${ip?.avatar || '👤'}</span>
                    <span style="margin-left:6px;font-size:11px">${acc.name}</span>
                  </div>
                  ${weekDays.map(d => {
                    const dayStr = d.toISOString().slice(0, 10);
                    const dayContents = scheduledContents.filter(c => 
                      c.scheduledAt && c.scheduledAt.slice(0, 10) === dayStr &&
                      c.targetAccounts?.includes(acc.id)
                    );
                    return `
                      <div class="timeline-slot">
                        ${dayContents.slice(0, 2).map(c => `
                          <div class="timeline-content" style="background:${ip?.color}20;color:${ip?.color}" title="${escHtml(c.title)}">
                            ${(c.title || '未命名').slice(0, 8)}
                          </div>
                        `).join('')}
                      </div>
                    `;
                  }).join('')}
                </div>
              `;
            }).join('')}
            ${accounts.length === 0 ? `
              <div style="text-align:center;padding:20px;color:var(--muted);font-size:13px">
                暂无账号，请先<a href="#" onclick="App.navigate('ip');return false" style="color:var(--accent)">添加IP和账号</a>
              </div>
            ` : ''}
          </div>
        </div>
        
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">近期热点</h3>
            <button class="btn btn-sm btn-secondary" onclick="App.navigate('hot')">查看全部</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px">
            ${data.hots.filter(h => h.dueAt > Date.now()).sort((a, b) => b.createdAt - a.createdAt).slice(0, 3).map(h => `
              <div class="hot-card" style="margin:0">
                <div class="hot-header">
                  <span class="hot-title">${escHtml(h.title)}</span>
                  <span class="tag tag-${h.heat === '高' ? 'danger' : h.heat === '中' ? 'warning' : ''}">${h.heat || '中'}</span>
                </div>
                <div class="hot-meta">
                  <span>${h.source || '未分类'}</span>
                  <span>·</span>
                  <span>${formatTimeLeft(h.dueAt)}</span>
                </div>
              </div>
            `).join('') || `
              <div style="text-align:center;padding:20px;color:var(--muted);font-size:13px">
                暂无热点，去<a href="#" onclick="App.navigate('hot');return false" style="color:var(--accent)">热点雷达</a>看看
              </div>
            `}
          </div>
        </div>
      </div>
      
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><h3 class="card-title">营销节点</h3></div>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${Store.data.settings.nodes.filter(n => {
              if (n.hidden) return false;
              const [m, d] = n.date.split('-');
              const now = new Date();
              const nodeDate = new Date(now.getFullYear(), parseInt(m) - 1, parseInt(d));
              const diff = nodeDate - now;
              return diff >= 0 && diff < 30 * 24 * 3600 * 1000;
            }).map(n => `<div class="tag tag-accent">${n.name} ${n.date}</div>`).join('') || '<span class="text-muted text-sm">近30天无节点</span>'}
          </div>
        </div>
        
        <div class="card">
          <div class="card-header"><h3 class="card-title">产量对比</h3></div>
          <div style="display:flex;align-items:end;gap:4px;height:80px;padding-top:10px">
            ${[...Array(7)].map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              const dayStr = d.toISOString().slice(0, 10);
              const count = data.posts.filter(p => p.publishedAt && p.publishedAt.slice(0, 10) === dayStr).length;
              const maxCount = Math.max(1, ...[...Array(7)].map((_, j) => {
                const dd = new Date();
                dd.setDate(dd.getDate() - (6 - j));
                return data.posts.filter(p => p.publishedAt && p.publishedAt.slice(0, 10) === dd.toISOString().slice(0, 10)).length;
              }));
              const height = Math.max(4, (count / maxCount) * 60);
              return `
                <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:4px">
                  <div style="width:100%;height:${height}px;background:var(--accent-soft);border-radius:4px" title="${count}条"></div>
                  <span style="font-size:10px;color:var(--muted)">${d.getDate()}</span>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      </div>
    `;
  },
  
  // IP与账号
  renderIP() {
    const ips = Store.data.ips;
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div>
          <h2 style="font-size:18px;font-weight:700;margin-bottom:4px">IP 管理</h2>
          <p class="text-muted text-sm">管理你的人设和账号</p>
        </div>
        <button class="btn btn-primary" onclick="App.showIPModal()">+ 新建 IP</button>
      </div>
      ${ips.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">👤</div>
          <div class="empty-title">还没有 IP</div>
          <div class="empty-desc">创建你的第一个 IP 人设，开始管理内容</div>
          <button class="btn btn-primary" onclick="App.showIPModal()">创建 IP</button>
        </div>
      ` : `
        <div class="ip-grid">
          ${ips.map(ip => {
            const accounts = Store.getAccountsByIP(ip.id);
            const contents = Store.getContentsByIP(ip.id);
            const weekPosts = Store.data.posts.filter(p => 
              accounts.some(a => a.id === p.accountId) && 
              p.publishedAt >= Date.now() - 7 * 24 * 3600 * 1000
            ).length;
            return `
              <div class="ip-card" onclick="App.showIPArchive('${ip.id}')">
                <div class="ip-avatar" style="background:${ip.color}20">${ip.avatar}</div>
                <div class="ip-name">${escHtml(ip.name)}</div>
                <div class="ip-track">${escHtml(ip.track || '未设置赛道')}</div>
                <div class="ip-stats">
                  <div><span class="ip-stat-value">${accounts.length}</span> 账号</div>
                  <div><span class="ip-stat-value">${contents.length}</span> 内容</div>
                  <div><span class="ip-stat-value">${weekPosts}</span> 本周</div>
                </div>
              </div>
            `;
          }).join('')}
          <div class="ip-card" onclick="App.showIPModal()" style="border-style:dashed;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;color:var(--muted)">
            <div style="font-size:32px">+</div>
            <div>新建 IP</div>
          </div>
        </div>
        ${ips.length > 0 ? `
          <div style="margin-top:32px">
            <h3 style="font-size:15px;font-weight:700;margin-bottom:6px">平台矩阵</h3>
            <div class="text-xs text-muted" style="margin-bottom:12px">行 = IP，列 = 平台；格内为登记粉丝数，空白格点击「+ 开号」直接登记</div>
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th style="min-width:120px">IP</th>${this.getAllPlatforms().map(p => `<th style="text-align:center"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${p.color};margin-right:4px"></span>${p.name}</th>`).join('')}</tr></thead>
                <tbody>
                  ${ips.map(ip => `
                    <tr>
                      <td><span style="display:flex;align-items:center;gap:6px"><span style="color:${ip.color}">${ip.avatar}</span>${escHtml(ip.name)}</span></td>
                      ${this.getAllPlatforms().map(p => {
                        const accs = Store.data.accounts.filter(a => a.ipId === ip.id && a.platform === p.key);
                        if (accs.length === 0) {
                          return `<td style="text-align:center"><button class="btn btn-sm btn-secondary" onclick="App.showAccountModal(null, '${ip.id}', '${p.key}')">+ 开号</button></td>`;
                        }
                        const fans = accs.reduce((s, a) => s + (a.followers || 0), 0);
                        return `<td style="text-align:center;cursor:pointer" title="${escAttr(accs.map(a => a.name).join('、'))}" onclick="App.showAccountModal('${accs[0].id}')"><span class="font-mono" style="font-weight:600">${formatNumber(fans)}</span>${accs.length > 1 ? `<span class="text-xs text-muted"> ×${accs.length}</span>` : ''}</td>`;
                      }).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          <div style="margin-top:32px">
            <h3 style="font-size:15px;font-weight:700;margin-bottom:16px">账号列表</h3>
            <div class="table-wrap">
              <table class="table">
                <thead><tr><th>IP</th><th>平台</th><th>账号名</th><th>粉丝</th><th>7日涨粉</th><th>操作</th></tr></thead>
                <tbody>
                  ${Store.data.accounts.map(acc => {
                    const ip = Store.getIP(acc.ipId);
                    return `
                      <tr>
                        <td><span style="display:flex;align-items:center;gap:6px"><span style="color:${ip?.color || '#999'}">${ip?.avatar || '👤'}</span>${ip?.name || '未归属'}</span></td>
                        <td><span class="tag">${this.getPlatformName(acc.platform)}</span></td>
                        <td>${escHtml(acc.name)}</td>
                        <td class="font-mono">${formatNumber(acc.followers || 0)}</td>
                        <td class="font-mono" style="color:${(acc.weekGain || 0) >= 0 ? 'var(--success)' : 'var(--danger)'}">${(acc.weekGain || 0) >= 0 ? '+' : ''}${formatNumber(acc.weekGain || 0)}</td>
                        <td>
                          <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();App.showAccountModal('${acc.id}')">编辑</button>
                          <button class="btn btn-sm btn-secondary" onclick="event.stopPropagation();App.deleteAccount('${acc.id}')">删除</button>
                        </td>
                      </tr>
                    `;
                  }).join('') || '<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--muted)">暂无账号</td></tr>'}
                </tbody>
              </table>
            </div>
          </div>
        ` : ''}
      `}
    `;
  },
  
  // 热点雷达
  renderHot() {
    const data = Store.getFilteredData(this.currentIp);
    const hots = data.hots.sort((a, b) => b.createdAt - a.createdAt);
    const activeHots = hots.filter(h => h.dueAt > Date.now());
    const expiredHots = hots.filter(h => h.dueAt <= Date.now());
    
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div>
          <h2 style="font-size:18px;font-weight:700;margin-bottom:4px">热点雷达</h2>
          <p class="text-muted text-sm">发现值得蹭的热点，72小时黄金窗口</p>
        </div>
        <button class="btn btn-primary" onclick="App.showHotModal()">+ 录入热点</button>
      </div>
      <div class="card" style="margin-bottom:16px;padding:12px 16px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <span style="font-size:13px;font-weight:700">🔥 热榜直达</span>
          ${(Store.data.settings.hotLinks || []).map(l => `<a class="btn btn-sm btn-secondary" style="text-decoration:none" href="${escAttr(l.url)}" target="_blank" rel="noopener">${escHtml(l.name)} ↗</a>`).join('') || '<span class="text-muted text-sm">暂无链接</span>'}
          <a style="color:var(--accent);cursor:pointer;font-size:12px;margin-left:auto" onclick="App.navigate('settings')">在设置中管理 →</a>
        </div>
      </div>
      ${activeHots.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">🔥</div>
          <div class="empty-title">暂无活跃热点</div>
          <div class="empty-desc">录入你发现的热点，开始蹭热点创作</div>
          <button class="btn btn-primary" onclick="App.showHotModal()">录入热点</button>
        </div>
      ` : `
        <div style="display:flex;flex-direction:column;gap:12px">
          ${activeHots.map(h => this.renderHotCard(h)).join('')}
        </div>
      `}
      ${expiredHots.length > 0 ? `
        <div style="margin-top:32px">
          <h3 style="font-size:14px;font-weight:600;color:var(--muted);margin-bottom:12px">已过期 (${expiredHots.length})</h3>
          <div style="display:flex;flex-direction:column;gap:8px;opacity:.6">
            ${expiredHots.slice(0, 5).map(h => this.renderHotCard(h, true)).join('')}
          </div>
        </div>
      ` : ''}
    `;
  },
  
  renderHotCard(hot, expired = false) {
    return `
      <div class="hot-card" style="${expired ? 'opacity:.6' : ''}">
        <div class="hot-header">
          <span class="hot-title">${escHtml(hot.title)}</span>
          <div style="display:flex;gap:8px;align-items:center">
            <span class="tag tag-${hot.heat === '高' ? 'danger' : hot.heat === '中' ? 'warning' : ''}">${hot.heat || '中'}</span>
            <span class="tag">${hot.trend === '升' ? '↑' : hot.trend === '降' ? '↓' : '→'} ${hot.trend || '平'}</span>
            ${!expired ? `<button class="btn btn-sm btn-secondary" onclick="App.showHotModal('${hot.id}')">编辑</button>` : ''}
            ${!expired ? `<button class="btn btn-sm btn-secondary" onclick="App.showHotAngles('${hot.id}')">💡 角度</button>` : ''}
            ${!expired ? `<button class="btn btn-sm btn-accent" onclick="App.hotToTopic('${hot.id}')">转选题</button>` : ''}
            ${(hot.converted || []).length ? `<span class="tag tag-success" title="已生成 ${hot.converted.length} 个选题">已转选题</span>` : ''}
            <button class="btn btn-sm btn-secondary" onclick="App.deleteHot('${hot.id}')">删除</button>
          </div>
        </div>
        <div class="hot-meta">
          <span>${hot.source || '未分类'}</span>
          <span>·</span>
          <span>${expired ? '已过期' : formatTimeLeft(hot.dueAt)}</span>
          ${hot.remark ? `<span>·</span><span>${escHtml(hot.remark)}</span>` : ''}
        </div>
      </div>
    `;
  },
  
  // 对标拆解
  renderBench() {
    const data = Store.getFilteredData(this.currentIp);
    const benchmarks = data.benchmarks;
    
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div>
          <h2 style="font-size:18px;font-weight:700;margin-bottom:4px">对标拆解</h2>
          <p class="text-muted text-sm">学习优秀创作者的方法论</p>
        </div>
        <button class="btn btn-primary" onclick="App.showBenchModal()">+ 添加对标</button>
      </div>
      ${benchmarks.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">🎯</div>
          <div class="empty-title">暂无对标账号</div>
          <div class="empty-desc">添加同量级、高一级、头部标杆各1-2个</div>
          <button class="btn btn-primary" onclick="App.showBenchModal()">添加对标</button>
        </div>
      ` : `
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
          ${benchmarks.map(b => {
            const ip = Store.getIP(b.ipId);
            const works = Store.data.benchWorks.filter(w => w.benchId === b.id);
            const avgLikes = works.length > 0 ? Math.round(works.reduce((sum, w) => sum + (w.likes || 0), 0) / works.length) : 0;
            return `
              <div class="card">
                <div class="card-header">
                  <div>
                    <div style="font-weight:700">${escHtml(b.name)}${(b.criteria || []).filter(Boolean).length >= 4 ? ' <span class="tag tag-success" title="勾选标准 ≥4 条">好对标</span>' : ''}</div>
                    <div style="font-size:12px;color:var(--muted)">${this.getPlatformName(b.platform)} · ${b.level || '未分类'}</div>
                  </div>
                  <div style="display:flex;gap:4px">
                    <button class="btn btn-sm btn-secondary" onclick="App.showBenchModal('${b.id}')">编辑</button>
                    <button class="btn btn-sm btn-secondary" onclick="App.deleteBenchmark('${b.id}')">删除</button>
                  </div>
                </div>
                <div style="display:flex;gap:16px;font-size:12px;margin-bottom:12px">
                  <div><span class="font-mono font-bold">${formatNumber(b.followers || 0)}</span> 粉丝</div>
                  <div><span class="font-mono font-bold">${works.length}</span> 作品</div>
                  <div><span class="font-mono font-bold">${formatNumber(avgLikes)}</span> 均赞</div>
                </div>
                <div style="font-size:12px;color:var(--muted)">IP: <span style="color:${ip?.color || 'var(--muted)'}">${ip?.avatar || '🌐'} ${ip?.name || '共用'}</span></div>
                <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--line)">
                  <button class="btn btn-sm btn-secondary" onclick="App.showBenchWorks('${b.id}')">查看作品 (${works.length})</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    `;
  },
  
  // 选题池
  renderTopic() {
    const data = Store.getFilteredData(this.currentIp);
    const topics = data.topics.sort((a, b) => {
      const ratingOrder = { S: 0, A: 1, B: 2, C: 3 };
      const ra = ratingOrder[calcRating(a.scores || {}).rating] ?? 4;
      const rb = ratingOrder[calcRating(b.scores || {}).rating] ?? 4;
      if (ra !== rb) return ra - rb;
      return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
    });
    
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div>
          <h2 style="font-size:18px;font-weight:700;margin-bottom:4px">选题池</h2>
          <p class="text-muted text-sm">五维评分，S/A/B/C 评级排序</p>
        </div>
        <button class="btn btn-primary" onclick="App.showTopicModal()">+ 新建选题</button>
      </div>
      ${topics.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">💡</div>
          <div class="empty-title">选题池是空的</div>
          <div class="empty-desc">从热点、对标或灵感中新建选题</div>
          <button class="btn btn-primary" onclick="App.showTopicModal()">新建选题</button>
        </div>
      ` : `
        <div style="display:flex;flex-direction:column;gap:12px">
          ${topics.map(t => {
            const { rating, total } = calcRating(t.scores || {});
            const topicType = calcTopicType(t.scores || {});
            const ip = Store.getIP(t.ipId);
            return `
              <div class="topic-card">
                <div class="topic-header">
                  <div style="display:flex;align-items:center;gap:8px">
                    <span style="color:${ip?.color || 'var(--muted)'}">${ip?.avatar || '💡'}</span>
                    <span class="topic-title">${escHtml(t.title)}</span>
                  </div>
                  <div style="display:flex;gap:8px;align-items:center">
                    ${this.miniRadar(t.id, t.scores)}
                    <span class="topic-rating rating-${rating.toLowerCase()}">${rating}</span>
                    <button class="btn btn-sm btn-secondary" onclick="App.showTopicModal('${t.id}')">编辑</button>
                    <button class="btn btn-sm btn-accent" onclick="App.createContentFromTopic('${t.id}')">写稿</button>
                  </div>
                </div>
                <div class="topic-scores">
                  ${FIVE_DIMS.map(d => `<span class="topic-score"><span>${d.icon}</span><span class="font-mono">${t.scores?.[d.key] || 0}</span></span>`).join('')}
                  <span style="margin-left:auto;color:var(--muted)">总分 <span class="font-mono font-bold">${total}</span></span>
                  <span class="tag">${topicType}</span>
                  ${t.source === 'hot' ? `<span class="tag" style="cursor:pointer" title="查看来源热点" onclick="App.navigate('hot')">🔥来自热点</span>` : t.source === 'bench' && t.srcRef ? `<span class="tag" style="cursor:pointer" title="查看来源作品拆解" onclick="App.showWorkDetail('${t.srcRef}')">🎯来自对标</span>` : ''}
                  <span class="tag tag-${t.status === 'doing' ? 'accent' : t.status === 'done' ? 'success' : ''}">${t.status === 'pool' ? '候选' : t.status === 'doing' ? '进行中' : '已完成'}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    `;
  },
  
  // 文案工坊
  renderScript() {
    const data = Store.getFilteredData(this.currentIp);
    const contents = data.contents.filter(c => c.stage === 'draft' || c.stage === 'topic');
    const selectedId = this.editingId || contents[0]?.id;
    const content = selectedId ? Store.getContent(selectedId) : null;
    const ip = content ? Store.getIP(content.ipId) : null;
    
    return `
      <div style="display:flex;gap:24px">
        <div style="width:200px;flex-shrink:0">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <h3 style="font-size:13px;font-weight:600;color:var(--muted)">稿件列表</h3>
            <button class="btn btn-sm btn-secondary" onclick="App.showContentModal()">+</button>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px">
            ${contents.map(c => {
              const cIp = Store.getIP(c.ipId);
              return `
                <div class="nav-item ${c.id === selectedId ? 'active' : ''}" onclick="App.editingId='${c.id}';App.renderPage('script')" style="font-size:13px;padding:8px 12px">
                  <span style="color:${cIp?.color || 'var(--muted)'}">${cIp?.avatar || '📝'}</span>
                  <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(c.title || '未命名')}</span>
                </div>
              `;
            }).join('') || '<div class="text-muted text-sm" style="padding:8px">暂无稿件</div>'}
          </div>
        </div>
        <div style="flex:1">
          ${content ? `
            <div class="script-editor">
              <div class="script-fields">
                <div class="script-field">
                  <div class="script-field-label">标题</div>
                  <input type="text" class="form-input" id="scriptTitle" value="${escAttr(content.title || '')}" placeholder="输入标题...">
                </div>
                <div class="script-field">
                  <div class="script-field-label">开头钩子 (前5秒)</div>
                  <textarea class="form-textarea" id="scriptHook" rows="3" placeholder="前5秒要给出结果或冲突...">${escHtml(content.hook || '')}</textarea>
                </div>
                <div class="script-field">
                  <div class="script-field-label">正文</div>
                  <textarea class="form-textarea" id="scriptBody" rows="8" placeholder="正文内容...">${escHtml(content.body || '')}</textarea>
                </div>
                <div class="script-field">
                  <div class="script-field-label">结尾引导</div>
                  <textarea class="form-textarea" id="scriptCta" rows="2" placeholder="引导互动...">${escHtml(content.cta || '')}</textarea>
                </div>
                <div class="grid-2">
                  <div class="script-field">
                    <div class="script-field-label">封面大字 (<=12字)</div>
                    <input type="text" class="form-input" id="scriptCover" value="${escAttr(content.cover || '')}" placeholder="封面上的大字" oninput="App._liveCoverPreview()">
                  </div>
                  <div class="script-field">
                    <div class="script-field-label">标签 (逗号分隔)</div>
                    <input type="text" class="form-input" id="scriptTags" value="${escAttr(content.tags || '')}" placeholder="标签1,标签2,标签3">
                  </div>
                </div>
                <div style="display:flex;gap:8px">
                  <button class="btn btn-primary" onclick="App.saveScript('${content.id}')">保存</button>
                  <button class="btn btn-secondary" onclick="App.runScriptCheck('${content.id}')">运行体检</button>
                  <button class="btn btn-secondary" onclick="App.moveToShoot('${content.id}')">进入拍摄</button>
                </div>
              </div>
              <div class="script-sidebar">
                <div class="card">
                  <div class="card-title" style="margin-bottom:12px">稿件信息</div>
                  <div style="font-size:12px;display:flex;flex-direction:column;gap:8px">
                    <div class="flex justify-between"><span class="text-muted">IP</span><span>${ip?.name || '未归属'}</span></div>
                    <div class="flex justify-between"><span class="text-muted">字数</span><span class="font-mono">${(content.hook || '').length + (content.body || '').length + (content.cta || '').length}</span></div>
                    <div class="flex justify-between"><span class="text-muted">预估时长</span><span class="font-mono">${Math.round(((content.hook || '').length + (content.body || '').length + (content.cta || '').length) / (Store.data.settings.standards.wpm || 240) * 60)}秒</span></div>
                    <div class="flex justify-between"><span class="text-muted">阶段</span><span class="tag">${CONTENT_STAGES.find(s => s.key === content.stage)?.name || content.stage}</span></div>
                  </div>
                </div>
                <div class="card">
                  <div class="card-title" style="margin-bottom:12px">封面预览 <span style="font-weight:400;font-size:11px;color:var(--muted)">（画幅示意，非最终图）</span></div>
                  <div style="display:flex;gap:6px;margin-bottom:10px;justify-content:center">
                    ${['9:16', '3:4', '16:9'].map(r => `<button class="btn btn-sm cover-ratio-btn ${(this.coverRatio || '9:16') === r ? 'btn-accent' : 'btn-secondary'}" data-r="${r}" onclick="App.setCoverRatio('${r}')">${r}</button>`).join('')}
                  </div>
                  <div id="coverPreviewBox" style="width:150px;aspect-ratio:9/16;background:linear-gradient(135deg, ${ip?.color || '#1e3a8a'}, #111827);border-radius:12px;display:flex;align-items:center;justify-content:center;padding:10px;margin:0 auto">
                    <span id="coverPreviewText" style="color:#fff;font-weight:900;font-size:24px;line-height:1.35;text-align:center;word-break:break-all;text-shadow:0 2px 8px rgba(0,0,0,.35)">${escHtml(content.cover || '（封面大字）')}</span>
                  </div>
                  <div class="text-xs text-muted" style="margin-top:8px;text-align:center">底色随 IP 主题色 · 可截图留存</div>
                </div>
                <div class="card" id="checkResult">
                  <div class="card-title" style="margin-bottom:12px">体检结果</div>
                  <div class="text-muted text-sm">点击"运行体检"查看结果</div>
                </div>
                <div class="card">
                  <div class="card-title" style="margin-bottom:12px">钩子模板</div>
                  <div style="display:flex;flex-direction:column;gap:6px">
                    ${HOOK_TEMPLATES.slice(0, 5).map(t => `<div style="font-size:12px;padding:6px 10px;background:var(--soft);border-radius:var(--radius-sm);cursor:pointer" onclick="App.insertHook('${escAttr(t)}')">${t}</div>`).join('')}
                  </div>
                </div>
                <div class="card">
                  <div class="card-title" style="margin-bottom:12px">标题公式</div>
                  <div style="display:flex;flex-direction:column;gap:6px">
                    ${TITLE_FORMULAS.slice(0, 5).map(f => `<div style="font-size:12px;padding:6px 10px;background:var(--soft);border-radius:var(--radius-sm);cursor:pointer" onclick="App.useTitleFormula('${escAttr(f.pattern)}')" title="${f.category}">${f.pattern}</div>`).join('')}
                  </div>
                </div>
                <div class="card">
                  <div class="card-title" style="margin-bottom:12px">正文结构</div>
                  <div style="display:flex;flex-direction:column;gap:6px">
                    ${BODY_STRUCTURES.slice(0, 4).map(s => `
                      <div style="font-size:12px;padding:6px 10px;background:var(--soft);border-radius:var(--radius-sm);cursor:pointer"
                           onclick="App.useStructure('${escAttr(s.name)}')" title="${escAttr(s.pattern)}">
                        <strong>${s.name}</strong>
                        <div style="color:var(--muted);font-size:11px;margin-top:2px">${s.pattern.slice(0, 20)}...</div>
                      </div>
                    `).join('')}
                  </div>
                </div>
                <div class="card">
                  <div class="card-title" style="margin-bottom:12px">文案快照</div>
                  <div id="snapshotList" style="display:flex;flex-direction:column;gap:6px">
                    ${(content.snaps || []).slice(-5).reverse().map((s, i) => `
                      <div style="font-size:11px;padding:6px 10px;background:var(--soft);border-radius:var(--radius-sm);display:flex;justify-content:space-between;align-items:center">
                        <span>${new Date(s.at).toLocaleString('zh-CN', {month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
                        <button class="btn btn-sm btn-secondary" onclick="App.restoreSnapshot('${content.id}', ${(content.snaps || []).length - 1 - i})">恢复</button>
                      </div>
                    `).join('') || '<div class="text-muted text-sm">暂无快照</div>'}
                  </div>
                  <button class="btn btn-sm btn-secondary" style="margin-top:8px;width:100%" onclick="App.saveSnapshot('${content.id}')">保存快照</button>
                </div>
              </div>
            </div>
          ` : `
            <div class="empty-state">
              <div class="empty-icon">✍️</div>
              <div class="empty-title">选择或新建稿件</div>
              <div class="empty-desc">从左侧选择稿件，或新建一篇开始创作</div>
              <button class="btn btn-primary" onclick="App.showContentModal()">新建稿件</button>
            </div>
          `}
        </div>
      </div>
    `;
  },
  
  // 拍摄与提词
  renderShoot() {
    const data = Store.getFilteredData(this.currentIp);
    const shootContents = data.contents.filter(c => c.stage === 'shoot' || c.stage === 'schedule');
    
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div>
          <h2 style="font-size:18px;font-weight:700;margin-bottom:4px">拍摄与提词</h2>
          <p class="text-muted text-sm">分镜脚本、提词器、拍摄检查</p>
        </div>
      </div>
      <div class="grid-4" style="margin-bottom:24px">
        <div class="stat-card"><div class="stat-value">${shootContents.filter(c => c.stage === 'shoot').length}</div><div class="stat-label">待拍摄</div></div>
        <div class="stat-card"><div class="stat-value">${shootContents.filter(c => c.shots?.length > 0).length}</div><div class="stat-label">已有分镜</div></div>
      </div>
      ${(() => {
        // FR-06-03：拍摄日程——按 shootDate 分组（今天/明天/未来/已过期/未排期），可改期，过期未拍置灰
        const shootables = data.contents.filter(c => c.stage === 'shoot');
        if (!shootables.length) return '';
        const todayStr = new Date().toISOString().slice(0, 10);
        const tomorrowStr = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
        const groups = [
          { name: '📅 今天', items: [] }, { name: '📅 明天', items: [] },
          { name: '📅 未来', items: [] }, { name: '⚠️ 已过期未拍', items: [] }, { name: '未排期', items: [] }
        ];
        shootables.forEach(c => {
          const sd = c.shootDate;
          if (!sd) groups[4].items.push(c);
          else if (sd === todayStr) groups[0].items.push(c);
          else if (sd === tomorrowStr) groups[1].items.push(c);
          else if (sd > tomorrowStr) groups[2].items.push(c);
          else groups[3].items.push(c);
        });
        return `
          <div class="card" style="margin-bottom:20px">
            <div class="card-header"><h3 class="card-title">拍摄日程</h3><span class="text-xs text-muted">设置拍摄日期后自动分组；过期未拍置灰提醒</span></div>
            ${groups.filter(g => g.items.length).map(g => `
              <div style="margin-bottom:10px">
                <div style="font-size:12px;font-weight:700;color:var(--muted);margin-bottom:6px">${g.name}（${g.items.length}）</div>
                ${g.items.map(c => {
                  const done = (c.shots || []).filter(s => s.done).length;
                  const total = (c.shots || []).length;
                  const overdue = g.name.indexOf('已过期') === 0;
                  return `
                    <div style="display:flex;align-items:center;gap:10px;padding:7px 10px;background:var(--soft);border-radius:var(--radius-sm);margin-bottom:5px;${overdue ? 'opacity:.55' : ''}">
                      <span style="font-size:13px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(c.title || '未命名')}${total ? ` <span class="text-muted text-xs">${done}/${total} 镜</span>` : ''}${overdue ? ' <span class="text-xs" style="color:var(--danger)">过期未拍</span>' : ''}</span>
                      <input type="date" class="form-input" style="width:150px;padding:4px 8px;font-size:12px" value="${c.shootDate || ''}" onchange="Store.updateContent('${c.id}', { shootDate: this.value }); App.toast(this.value ? '已改期至 ' + this.value : '已清除拍摄日期'); App.renderPage('shoot')">
                    </div>`;
                }).join('')}
              </div>`).join('') || ''}
          </div>
        `;
      })()}
      <div style="display:flex;flex-direction:column;gap:12px">
        ${shootContents.length === 0 ? `
          <div class="empty-state">
            <div class="empty-icon">🎬</div>
            <div class="empty-title">暂无待拍摄内容</div>
            <div class="empty-desc">从文案工坊进入拍摄阶段</div>
          </div>
        ` : shootContents.map(c => {
          const ip = Store.getIP(c.ipId);
          const shots = c.shots || [];
          const completedShots = shots.filter(s => s.done).length;
          const sc = this.getShootCheck(c);
          const checkDone = sc.fixed.filter(Boolean).length + sc.custom.filter(x => x.done).length;
          const checkTotal = SHOOT_CHECK_FIXED.length + sc.custom.length;
          return `
            <div class="card">
              <div class="card-header">
                <div>
                  <div style="display:flex;align-items:center;gap:8px">
                    <span style="color:${ip?.color || 'var(--muted)'}">${ip?.avatar || '🎬'}</span>
                    <span style="font-weight:600">${escHtml(c.title || '未命名')}</span>
                  </div>
                  <div style="font-size:12px;color:var(--muted);margin-top:4px">${shots.length} 个分镜 · 已完成 ${completedShots}/${shots.length}</div>
                </div>
                <div style="display:flex;gap:8px">
                  <button class="btn btn-sm btn-secondary" onclick="App.showShootCheckModal('${c.id}')" title="FR-06-04：当天有效，次日自动清零">✅ 开拍清单 ${checkDone}/${checkTotal}</button>
                  ${shots.length > 0 ? `<button class="btn btn-sm btn-secondary" onclick="App.rebuildShots('${c.id}')">重建分镜</button>` : ''}
                  <button class="btn btn-sm btn-secondary" onclick="App.editShots('${c.id}')">编辑分镜</button>
                  <button class="btn btn-sm btn-accent" onclick="App.openTeleprompter('${c.id}')">提词器</button>
                </div>
              </div>
              ${shots.length > 0 ? `
                <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;margin-top:12px">
                  ${shots.slice(0, 6).map((s, i) => `
                    <div style="background:var(--soft);padding:10px;border-radius:var(--radius-sm);font-size:12px;${s.done ? 'opacity:.5' : ''}">
                      <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                        <span class="font-mono text-muted">#${i + 1}</span>
                        <span class="tag" style="font-size:10px">${s.scene}</span>
                      </div>
                      <div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(s.lines || '')}</div>
                      <div style="display:flex;justify-content:space-between;margin-top:6px">
                        <span class="text-muted">${s.duration}秒</span>
                        <input type="checkbox" ${s.done ? 'checked' : ''} title="${s.doneAt ? '打勾于 ' + new Date(s.doneAt).toLocaleString() : '未拍'}" onchange="App.toggleShot('${c.id}', ${i})">
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : '<div style="text-align:center;padding:16px;color:var(--muted);font-size:13px">暂无分镜，点击"编辑分镜"自动生成</div>'}
              ${shots.length > 0 && completedShots === shots.length && c.stage === 'shoot' ? `
                <div style="margin-top:14px;padding:12px;background:var(--soft);border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
                  <span style="font-size:13px">🎬 全部镜头已拍完${c.editDone ? '，剪辑中' : ''}</span>
                  ${c.editDone
                    ? `<button class="btn btn-sm btn-accent" onclick="App.finishEditing('${c.id}')">✂️ 剪辑完成，去排发布</button>`
                    : `<button class="btn btn-sm btn-accent" onclick="App.finishShooting('${c.id}')">拍完了，进入剪辑</button>`}
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
      ${(() => {
        // FR-06-08：景别速查卡（常驻可折叠）
        if (!this.shotGuideOpen) {
          return `<div class="card" style="cursor:pointer" onclick="App.toggleShotGuide()"><div style="display:flex;justify-content:space-between;align-items:center"><h3 class="card-title">🎬 景别速查</h3><span class="text-xs text-muted">展开 ▾</span></div></div>`;
        }
        return `
          <div class="card">
            <div style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;margin-bottom:12px" onclick="App.toggleShotGuide()">
              <h3 class="card-title" style="margin:0">🎬 景别速查</h3><span class="text-xs text-muted">收起 ▴</span>
            </div>
            <div class="grid-4">
              ${SHOT_TYPE_GUIDE.map(s => `
                <div style="background:var(--soft);border-radius:var(--radius-sm);padding:12px">
                  <div style="font-weight:700;margin-bottom:4px">${s.icon} ${s.name}</div>
                  <div style="font-size:12px;color:var(--muted);line-height:1.7">${s.use}</div>
                  <div style="font-size:11.5px;margin-top:6px;color:var(--accent)">适用：${s.fit}</div>
                </div>`).join('')}
            </div>
          </div>`;
      })()}
    `;
  },

  // 发布排期
  renderSchedule() {
    const data = Store.getFilteredData(this.currentIp);
    const today = new Date();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    const accounts = this.currentIp ? Store.getAccountsByIP(this.currentIp) : Store.data.accounts;
    const scheduledContents = data.contents.filter(c => c.stage === 'schedule' || c.stage === 'published');
    
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div>
          <h2 style="font-size:18px;font-weight:700;margin-bottom:4px">发布排期</h2>
          <p class="text-muted text-sm">7天排期视图，管理发布计划</p>
        </div>
      </div>
      <div class="schedule-board">
        ${days.map(d => {
          const dayStr = d.toISOString().slice(0, 10);
          const isToday = dayStr === today.toISOString().slice(0, 10);
          const dayContents = scheduledContents.filter(c => c.scheduledAt && c.scheduledAt.slice(0, 10) === dayStr);
          return `
            <div class="schedule-day" style="${isToday ? 'border-color:var(--accent)' : ''}">
              <div class="schedule-day-header" style="${isToday ? 'color:var(--accent);font-weight:700' : ''}">${['日','一','二','三','四','五','六'][d.getDay()]} ${d.getDate()}</div>
              ${dayContents.map(c => {
                const ip = Store.getIP(c.ipId);
                return `<div class="schedule-item" style="background:${ip?.color || 'var(--accent)'}20;color:${ip?.color || 'var(--accent)'}" onclick="App.showContentModal('${c.id}')"><div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(c.title || '未命名')}</div><div style="font-size:10px;opacity:.8;margin-top:2px">${c.scheduledTime || ''}</div></div>`;
              }).join('')}
              ${dayContents.length === 0 ? '<div style="text-align:center;color:var(--muted);font-size:11px;padding:20px 0">无排期</div>' : ''}
            </div>
          `;
        }).join('')}
      </div>
      <div style="margin-top:24px">
        <h3 style="font-size:14px;font-weight:600;margin-bottom:12px">待发布内容</h3>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>标题</th><th>IP</th><th>计划发布</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>
              ${scheduledContents.map(c => {
                const ip = Store.getIP(c.ipId);
                return `
                  <tr>
                    <td>${escHtml(c.title || '未命名')}</td>
                    <td><span style="color:${ip?.color || 'var(--muted)'}">${ip?.avatar || '📝'} ${ip?.name || '未归属'}</span></td>
                    <td class="font-mono text-sm">${c.scheduledAt || '未设定'}</td>
                    <td><span class="tag tag-${c.stage === 'published' ? 'success' : 'accent'}">${c.stage === 'published' ? '已发布' : '待发布'}</span></td>
                    <td>
                      <button class="btn btn-sm btn-secondary" onclick="App.showContentModal('${c.id}')">编辑</button>
                      ${c.stage === 'schedule' ? `<button class="btn btn-sm ${PUB_CHECK_ITEMS.every((_, i) => (c.pubCheck || [])[i]) ? 'btn-accent' : 'btn-secondary'}" title="${PUB_CHECK_ITEMS.every((_, i) => (c.pubCheck || [])[i]) ? '确认清单已全勾' : '发布确认清单未全勾，点击需确认跳过'}" onclick="App.markPublished('${c.id}')">标记已发布</button>` : ''}
                    </td>
                  </tr>
                `;
              }).join('') || '<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--muted)">暂无排期内容</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },
  
  // 数据复盘
  renderReview() {
    const data = Store.getFilteredData(this.currentIp);
    const standards = Store.data.settings.standards;
    // FR-08-08：筛选器（日期/平台/账号），会话内记忆
    const f = this.reviewFilter = this.reviewFilter || { days: 0, platform: '', account: '' };
    let posts = data.posts.filter(p => p.publishedAt);
    if (f.days > 0) {
      const since = Date.now() - f.days * 86400000;
      posts = posts.filter(p => new Date(p.publishedAt).getTime() >= since);
    }
    if (f.platform) posts = posts.filter(p => (Store.data.accounts.find(a => a.id === p.accountId) || {}).platform === f.platform);
    if (f.account) posts = posts.filter(p => p.accountId === f.account);
    const filterAccounts = f.platform ? Store.data.accounts.filter(a => a.platform === f.platform) : Store.data.accounts;
    
    const totalPlay = posts.reduce((sum, p) => sum + (p.play || 0), 0);
    const totalLikes = posts.reduce((sum, p) => sum + (p.likes || 0), 0);
    const totalFav = posts.reduce((sum, p) => sum + (p.favorite || 0), 0);
    const avgFiveSec = posts.filter(p => p.fiveSecRate).reduce((sum, p, _, arr) => sum + p.fiveSecRate / arr.length, 0);
    const avgFavRate = totalPlay > 0 ? (totalFav / totalPlay * 100) : 0;
    const avgPlay = posts.length > 0 ? totalPlay / posts.length : 0;
    
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <div>
          <h2 style="font-size:18px;font-weight:700;margin-bottom:4px">数据复盘</h2>
          <p class="text-muted text-sm">回填数据、象限诊断、趋势分析</p>
        </div>
        <button class="btn btn-secondary" onclick="App.showBackfillModal()">回填数据</button>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;align-items:center">
        <select class="form-select" style="width:auto" onchange="App.setReviewFilter('days', this.value)">
          <option value="0" ${f.days === 0 ? 'selected' : ''}>全部时间</option>
          <option value="7" ${f.days === 7 ? 'selected' : ''}>近 7 天</option>
          <option value="30" ${f.days === 30 ? 'selected' : ''}>近 30 天</option>
        </select>
        <select class="form-select" style="width:auto" onchange="App.setReviewFilter('platform', this.value)">
          <option value="">全部平台</option>
          ${this.getAllPlatforms().map(p => `<option value="${p.key}" ${f.platform === p.key ? 'selected' : ''}>${p.name}</option>`).join('')}
        </select>
        <select class="form-select" style="width:auto" onchange="App.setReviewFilter('account', this.value)">
          <option value="">全部账号</option>
          ${filterAccounts.map(a => `<option value="${a.id}" ${f.account === a.id ? 'selected' : ''}>${escHtml(a.name)}</option>`).join('')}
        </select>
        ${(f.days || f.platform || f.account) ? `<button class="btn btn-sm btn-secondary" onclick="App.reviewFilter={days:0,platform:'',account:''};App.renderPage('review')">清空筛选</button>` : ''}
      </div>
      <div class="review-stats">
        <div class="review-stat"><div class="review-stat-value">${posts.length}</div><div class="review-stat-label">发布数</div></div>
        <div class="review-stat"><div class="review-stat-value">${formatNumber(totalPlay)}</div><div class="review-stat-label">总播放</div></div>
        <div class="review-stat"><div class="review-stat-value">${avgFiveSec.toFixed(1)}%</div><div class="review-stat-label">均5秒完播</div></div>
        <div class="review-stat"><div class="review-stat-value">${avgFavRate.toFixed(2)}%</div><div class="review-stat-label">均收藏率</div></div>
        <div class="review-stat"><div class="review-stat-value">${formatNumber(totalLikes)}</div><div class="review-stat-label">总点赞</div></div>
      </div>

      <div class="grid-2" style="margin-bottom:24px">
        <div class="card">
          <h3 style="font-size:14px;font-weight:600;margin-bottom:4px">趋势（近 30 天 · 双轴）</h3>
          <div class="text-xs text-muted" style="margin-bottom:8px">柱 = 每日发布数（左轴）· 线 = 每日播放量（右轴）</div>
          ${this.renderTrendChart(posts)}
        </div>
        <div class="card">
          <h3 style="font-size:14px;font-weight:600;margin-bottom:4px">对比视图</h3>
          <div style="display:flex;gap:6px;margin-bottom:10px;align-items:center;flex-wrap:wrap">
            <button class="btn btn-sm ${(this.compareMode || 'ip') === 'ip' ? 'btn-accent' : 'btn-secondary'}" onclick="App.compareMode='ip';App.renderPage('review')">按 IP</button>
            <button class="btn btn-sm ${this.compareMode === 'account' ? 'btn-accent' : 'btn-secondary'}" onclick="App.compareMode='account';App.renderPage('review')">按账号</button>
            <select class="form-select" style="width:auto;margin-left:auto" onchange="App.compareMetric=this.value;App.renderPage('review')">
              <option value="play" ${(this.compareMetric || 'play') === 'play' ? 'selected' : ''}>总播放</option>
              <option value="likes" ${this.compareMetric === 'likes' ? 'selected' : ''}>总点赞</option>
              <option value="favorite" ${this.compareMetric === 'favorite' ? 'selected' : ''}>总收藏</option>
            </select>
          </div>
          ${this.renderCompareChart(posts)}
        </div>
      </div>

      <div class="grid-2" style="margin-bottom:24px">
        <div class="quadrant-chart">
          <h3 style="font-size:14px;font-weight:600;margin-bottom:16px">爆款象限图</h3>
          ${this.renderQuadrantChart(posts, standards)}
        </div>

        <div class="card">
          <div class="card-header">
            <h3 class="card-title">诊断建议</h3>
          </div>
          <div style="display:flex;flex-direction:column;gap:12px">
            ${posts.slice(0, 5).map(p => {
              const content = Store.getContent(p.contentId);
              const diagnosis = diagnosePost(p, standards, avgPlay);
              return `
                <div style="padding:10px;background:var(--soft);border-radius:var(--radius-sm)">
                  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
                    <span style="font-size:13px;font-weight:600">${escHtml(content?.title || '未命名')}</span>
                    <span class="tag tag-${diagnosis.color === 'green' ? 'success' : diagnosis.color === 'yellow' ? 'warning' : diagnosis.color === 'red' ? 'danger' : ''}">${diagnosis.conclusion}</span>
                  </div>
                  ${diagnosis.suggestions.length > 0 ? `
                    <div style="font-size:12px;color:var(--muted)">
                      ${diagnosis.suggestions.slice(0, 2).map(s => `• ${s}`).join(' ')}
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('') || '<div class="text-muted text-sm">暂无数据</div>'}
          </div>
        </div>
      </div>

      <div>
        <h3 style="font-size:14px;font-weight:600;margin-bottom:12px">发布记录</h3>
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>内容</th><th>账号</th><th>发布日期</th><th>播放</th><th>点赞</th><th>收藏</th><th>评论</th><th>5秒完播</th><th>诊断</th></tr></thead>
            <tbody>
              ${posts.sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0)).slice(0, 20).map(p => {
                const content = Store.getContent(p.contentId);
                const account = Store.data.accounts.find(a => a.id === p.accountId);
                const ip = account ? Store.getIP(account.ipId) : null;
                const diagnosis = diagnosePost(p, standards, avgPlay);
                return `
                  <tr>
                    <td>${escHtml(content?.title || '未命名')}</td>
                    <td><span style="color:${ip?.color || 'var(--muted)'}">${ip?.avatar || '📱'} ${account?.name || '未知'}</span></td>
                    <td class="font-mono text-sm">${p.publishedAt?.slice(0, 10) || '-'}${this.isBackfillOverdue(p) ? ' <span class="tag tag-danger" title="已发布超过 48 小时仍未回填数据">⏰ 48h未回填</span>' : ''}</td>
                    <td class="font-mono">${formatNumber(p.play || 0)}</td>
                    <td class="font-mono">${formatNumber(p.likes || 0)}</td>
                    <td class="font-mono">${formatNumber(p.favorite || 0)}</td>
                    <td class="font-mono">${formatNumber(p.comment || 0)}</td>
                    <td class="font-mono">${p.fiveSecRate ? p.fiveSecRate + '%' : '-'}</td>
                    <td><span class="tag tag-${diagnosis.color === 'green' ? 'success' : diagnosis.color === 'yellow' ? 'warning' : diagnosis.color === 'red' ? 'danger' : ''}">${diagnosis.conclusion}</span></td>
                  </tr>
                `;
              }).join('') || '<tr><td colspan="9" style="text-align:center;padding:20px;color:var(--muted)">暂无发布记录</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  // FR-10-03：阈值即时生效 + 恢复默认
  setStandard(key, val) {
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) {
      this.toast('请输入非负数字');
      this.renderPage('settings');
      return;
    }
    Store.data.settings.standards[key] = num;
    Store.save();
    const std = Store.data.settings.standards;
    if ((std.ratingS || 0) <= (std.ratingA || 0) || (std.ratingA || 0) <= (std.ratingB || 0)) {
      this.toast('注意：评级线应满足 S > A > B');
    }
  },

  resetStandard(key) {
    Store.data.settings.standards[key] = DEFAULT_STANDARDS[key];
    Store.save();
    this.renderPage('settings');
  },

  resetStandards() {
    if (!confirm('将全部数据标准线恢复为默认值？改动立即生效。')) return;
    Store.data.settings.standards = { ...DEFAULT_STANDARDS };
    Store.save();
    this.renderPage('settings');
    this.toast('已恢复全部默认标准线');
  },

  // FR-01-04：自定义平台追加/删除
  addCustomPlatform() {
    const name = (document.getElementById('newPlatformName')?.value || '').trim();
    const url = (document.getElementById('newPlatformUrl')?.value || '').trim();
    if (!name) { this.toast('请输入平台名称'); return; }
    if (url && !/^https?:\/\//i.test(url)) { this.toast('后台地址需以 http(s):// 开头'); return; }
    if (this.getAllPlatforms().some(p => p.name === name)) { this.toast('平台「' + name + '」已存在'); return; }
    const s = Store.data.settings;
    s.customPlatforms = s.customPlatforms || [];
    const palette = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f43f5e'];
    s.customPlatforms.push({ key: 'custom_' + Date.now(), name, color: palette[s.customPlatforms.length % palette.length], creatorUrl: url });
    Store.save();
    this.renderPage('settings');
    this.toast(`已追加平台「${name}」，可在开号/矩阵中使用`);
  },

  deleteCustomPlatform(key) {
    const p = (Store.data.settings.customPlatforms || []).find(x => x.key === key);
    if (!p) return;
    const inUse = Store.data.accounts.filter(a => a.platform === key).length;
    if (!confirm(`删除自定义平台「${p.name}」？${inUse ? `该平台仍有 ${inUse} 个账号，账号数据保留但不再显示平台名。` : ''}`)) return;
    Store.data.settings.customPlatforms = Store.data.settings.customPlatforms.filter(x => x.key !== key);
    Store.save();
    this.renderPage('settings');
    this.toast('已删除自定义平台');
  },

  // FR-02-07：营销节点管理（内置可隐藏，自定义可删除）
  toggleNode(idx, shown) {
    const nodes = Store.data.settings.nodes || [];
    if (nodes[idx]) nodes[idx].hidden = !shown;
    Store.save();
    this.renderPage('settings');
  },

  deleteNode(idx) {
    const nodes = Store.data.settings.nodes || [];
    if (!nodes[idx] || nodes[idx].type !== 'custom') return;
    if (!confirm(`删除自定义节点「${nodes[idx].name}」？`)) return;
    nodes.splice(idx, 1);
    Store.save();
    this.renderPage('settings');
    this.toast('已删除自定义节点');
  },

  addCustomNode() {
    const name = (document.getElementById('nodeName')?.value || '').trim();
    const date = (document.getElementById('nodeDate')?.value || '').trim();
    if (!name) { this.toast('请输入节点名称'); return; }
    if (!/^\d{2}-\d{2}$/.test(date)) { this.toast('日期格式：MM-DD，如 03-15'); return; }
    Store.data.settings.nodes = Store.data.settings.nodes || [];
    Store.data.settings.nodes.push({ date, name, type: 'custom' });
    Store.save();
    this.renderPage('settings');
    this.toast(`已添加节点「${name}」(${date})`);
  },

  // FR-02-06：热榜直达链接管理
  addHotLink() {
    const name = (document.getElementById('hotLinkName')?.value || '').trim();
    const url = (document.getElementById('hotLinkUrl')?.value || '').trim();
    if (!name) { this.toast('请输入名称'); return; }
    if (!/^https?:\/\//i.test(url)) { this.toast('链接需以 http(s):// 开头'); return; }
    Store.data.settings.hotLinks = Store.data.settings.hotLinks || [];
    Store.data.settings.hotLinks.push({ name, url });
    Store.save();
    this.renderPage('settings');
    this.toast(`已添加「${name}」`);
  },

  deleteHotLink(idx) {
    const links = Store.data.settings.hotLinks || [];
    if (!links[idx]) return;
    if (!confirm(`删除热榜链接「${links[idx].name}」？`)) return;
    links.splice(idx, 1);
    Store.save();
    this.renderPage('settings');
  },

  // FR-08-08：复盘筛选
  setReviewFilter(key, val) {
    this.reviewFilter = this.reviewFilter || { days: 0, platform: '', account: '' };
    this.reviewFilter[key] = key === 'days' ? (parseInt(val) || 0) : val;
    if (key === 'platform') this.reviewFilter.account = '';
    this.renderPage('review');
  },

  // FR-08-06：30 天趋势图（发布数柱=左轴，播放量线=右轴）
  renderTrendChart(posts) {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      days.push(new Date(Date.now() - i * 86400000).toISOString().slice(0, 10));
    }
    const byDay = days.map(day => {
      const dayPosts = posts.filter(p => (p.publishedAt || '').slice(0, 10) === day);
      return { day, count: dayPosts.length, play: dayPosts.reduce((s, p) => s + (p.play || 0), 0) };
    });
    const maxPlay = Math.max(1, ...byDay.map(d => d.play));
    const maxCount = Math.max(1, ...byDay.map(d => d.count));
    const W = 560, H = 230, P = 38;
    const x = i => P + (W - P * 2) * (byDay.length > 1 ? i / (byDay.length - 1) : 0.5);
    const yPlay = v => H - P - (H - P * 2) * (v / maxPlay);
    const yCount = v => H - P - (H - P * 2) * (v / maxCount);
    const playPath = byDay.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${yPlay(d.play).toFixed(1)}`).join(' ');
    const bars = byDay.map((d, i) => d.count ? `<rect x="${(x(i) - 3).toFixed(1)}" y="${yCount(d.count).toFixed(1)}" width="6" height="${(H - P - yCount(d.count)).toFixed(1)}" fill="var(--accent)" opacity=".22"/>` : '').join('');
    if (!posts.length) return '<div class="text-muted text-sm">当前筛选下暂无发布记录</div>';
    return `
      <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">
        <rect x="${P}" y="${P / 2}" width="${W - P * 2}" height="${H - P * 1.5}" fill="none" stroke="var(--line)"/>
        ${bars}
        <path d="${playPath}" fill="none" stroke="var(--accent)" stroke-width="2"/>
        <text x="${P}" y="${P / 2 - 6}" font-size="10" fill="var(--muted)">播放峰值 ${formatNumber(maxPlay)}</text>
        <text x="${W - P}" y="${P / 2 - 6}" text-anchor="end" font-size="10" fill="var(--muted)">发布峰值 ${maxCount} 条/天</text>
        <text x="${P}" y="${H - 8}" font-size="10" fill="var(--muted)">${days[0].slice(5)}</text>
        <text x="${W - P}" y="${H - 8}" text-anchor="end" font-size="10" fill="var(--muted)">${days[days.length - 1].slice(5)}</text>
      </svg>`;
  },

  // FR-08-07：对比视图（按 IP / 按账号，横向条形）
  renderCompareChart(posts) {
    const mode = this.compareMode || 'ip';
    const metric = this.compareMetric || 'play';
    let groups = [];
    if (mode === 'ip') {
      groups = Store.data.ips.map(ip => ({
        name: `${ip.avatar} ${ip.name}`, color: ip.color,
        posts: posts.filter(p => {
          const a = Store.data.accounts.find(x => x.id === p.accountId);
          return a && a.ipId === ip.id;
        })
      }));
      const orphan = posts.filter(p => {
        const a = Store.data.accounts.find(x => x.id === p.accountId);
        return !a || !Store.data.ips.some(ip => ip.id === a.ipId);
      });
      if (orphan.length) groups.push({ name: '（未归属 IP）', color: '#94a3b8', posts: orphan });
    } else {
      groups = Store.data.accounts.map(a => ({
        name: a.name, color: (this.getAllPlatforms().find(p => p.key === a.platform) || {}).color || '#3b82f6',
        posts: posts.filter(p => p.accountId === a.id)
      })).filter(g => g.posts.length);
    }
    const rows = groups.map(g => ({ name: g.name, color: g.color, count: g.posts.length, value: g.posts.reduce((s, p) => s + (p[metric] || 0), 0) }))
      .sort((a, b) => b.value - a.value);
    if (!rows.length) return '<div class="text-muted text-sm">当前筛选下暂无数据</div>';
    const max = Math.max(1, ...rows.map(r => r.value));
    const metricName = { play: '播放', likes: '点赞', favorite: '收藏' }[metric];
    return `
      <div style="display:flex;flex-direction:column;gap:8px">
        ${rows.map(r => `
          <div style="display:flex;align-items:center;gap:8px;font-size:12px">
            <span style="width:96px;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escAttr(r.name)}">${escHtml(r.name)}<span class="text-muted"> ×${r.count}</span></span>
            <div style="flex:1;background:var(--soft);border-radius:6px;height:18px;overflow:hidden">
              <div style="width:${(r.value / max * 100).toFixed(1)}%;height:100%;background:${r.color};opacity:.75;border-radius:6px"></div>
            </div>
            <span class="font-mono" style="width:60px;text-align:right">${formatNumber(r.value)}</span>
          </div>`).join('')}
        <div class="text-xs text-muted">指标：${metricName}${mode === 'account' ? ' · 仅显示有记录的账号' : ''}</div>
      </div>`;
  },

  // 爆款象限图（横轴5秒完播率，纵轴收藏率）
  renderQuadrantChart(posts, standards) {
    const validPosts = posts.filter(p => p.fiveSecRate !== null && p.fiveSecRate !== undefined && p.play > 0);
    if (validPosts.length === 0) {
      return '<div style="text-align:center;padding:40px;color:var(--muted)">暂无足够数据绘制象限图</div>';
    }

    const width = 400;
    const height = 350;
    const padding = 50;
    const fiveLine = standards.fiveSecLine;
    const favLine = standards.favLine;

    return `
      <svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto">
        <!-- Background -->
        <rect x="${padding}" y="${padding}" width="${width - padding * 2}" height="${height - padding * 2}" fill="var(--soft)" stroke="var(--line)"/>

        <!-- Quadrant lines -->
        <line x1="${padding + (width - padding * 2) * fiveLine / 100}" y1="${padding}"
              x2="${padding + (width - padding * 2) * fiveLine / 100}" y2="${height - padding}"
              stroke="var(--muted)" stroke-dasharray="4"/>
        <line x1="${padding}" y1="${height - padding - (height - padding * 2) * favLine / 5}"
              x2="${width - padding}" y2="${height - padding - (height - padding * 2) * favLine / 5}"
              stroke="var(--muted)" stroke-dasharray="4"/>

        <!-- Labels -->
        <text x="${width / 2}" y="${height - 10}" text-anchor="middle" font-size="11" fill="var(--muted)">5秒完播率 %</text>
        <text x="15" y="${height / 2}" text-anchor="middle" font-size="11" fill="var(--muted)" transform="rotate(-90, 15, ${height / 2})">收藏率 %</text>

        <!-- Quadrant labels -->
        <text x="${padding + 10}" y="${padding + 20}" font-size="10" fill="var(--muted)">内容好开头弱</text>
        <text x="${width - padding - 80}" y="${padding + 20}" font-size="10" fill="var(--success)">爆款潜质</text>
        <text x="${padding + 10}" y="${height - padding - 10}" font-size="10" fill="var(--muted)">需要重做</text>
        <text x="${width - padding - 80}" y="${height - padding - 10}" font-size="10" fill="var(--warning)">开头强干货弱</text>

        <!-- Data points -->
        ${validPosts.map(p => {
          const favRate = p.play > 0 ? (p.favorite / p.play * 100) : 0;
          const x = padding + (width - padding * 2) * (p.fiveSecRate || 0) / 100;
          const y = height - padding - (height - padding * 2) * Math.min(favRate, 5) / 5;
          const ip = Store.data.accounts.find(a => a.id === p.accountId);
          const color = ip ? Store.getIP(ip.ipId)?.color || 'var(--accent)' : 'var(--accent)';
          return `<circle cx="${x}" cy="${y}" r="5" fill="${color}" opacity="0.7"/>`;
        }).join('')}
      </svg>
    `;
  },
  
  // AI助手
  renderAI() {
    const chats = Store.data.settings.ai.chats || [];
    const activeChat = this.currentChatId || chats[0]?.id;
    const chat = chats.find(c => c.id === activeChat);
    const messages = chat?.messages || [];
    
    return `
      <div class="ai-container">
        <div class="ai-sessions">
          <button class="btn btn-secondary" style="width:100%;margin-bottom:12px" onclick="App.newChat()">+ 新对话</button>
          ${chats.map(c => `<div class="ai-session ${c.id === activeChat ? 'active' : ''}" onclick="App.currentChatId='${c.id}';App.renderPage('ai')">${escHtml(c.title || '新对话')}</div>`).join('') || '<div class="text-muted text-sm" style="padding:8px">暂无对话</div>'}
        </div>
        <div class="ai-chat">
          <div class="ai-messages">
            ${messages.length === 0 ? `
              <div style="text-align:center;padding:40px;color:var(--muted)">
                <div style="font-size:48px;margin-bottom:16px">🤖</div>
                <div style="font-size:14px;font-weight:600;margin-bottom:8px">AI 助手</div>
                <div style="font-size:13px">点击下方模板生成完整提示词，填空后发送</div>
              </div>
            ` : messages.map((m, mi) => `<div class="ai-message ${m.role}"><div class="ai-bubble">${renderMarkdown(m.content)}${m.role === 'assistant' && !m.content.startsWith('❌') && !m.content.startsWith('**未配置') ? `<div style="text-align:right;margin-top:8px"><button class="btn btn-sm btn-secondary" onclick="App.showAIBackfill(${mi})">↩ 回填到稿件</button></div>` : ''}</div></div>`).join('')}
          </div>
          <div style="padding:12px 20px 0;border-top:1px solid var(--line)">
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">
              ${AI_TEMPLATES.map(t => `<button class="btn btn-sm btn-secondary" title="${escAttr(t.desc)}" onclick="App.useAITemplate('${t.name}')">${t.name}</button>`).join('')}
            </div>
            ${Store.data.settings.ai.baseUrl ? `<div class="text-muted" style="font-size:11px;margin-bottom:8px">🔒 发送后内容将传给你配置的服务商（${escAttr(this._aiHost())}），API Key 仅存本机、不随备份导出</div>` : ''}
          </div>
          <div class="ai-input-area">
            <input type="text" class="ai-input" id="aiInput" placeholder="输入消息或先点模板生成提示词..." onkeypress="if(event.key==='Enter')App.sendAIMessage()">
            <button class="btn btn-accent" onclick="App.sendAIMessage()">发送</button>
          </div>
        </div>
      </div>
    `;
  },
  
  // 设置
  renderSettings() {
    const settings = Store.data.settings;
    const standards = settings.standards;
    // FR-10-03：全部阈值可配置（改动即时生效 + 可恢复默认）
    const stdRows = [
      { key: 'wpm', label: '口播语速', desc: '字/分钟，用于估算时长与分镜', type: 'int' },
      { key: 'fiveSecLine', label: '5秒完播达标线', desc: '%，象限图竖线', type: 'int' },
      { key: 'favLine', label: '收藏率达标线', desc: '%，象限图横线', type: 'float' },
      { key: 'avgLine', label: '均播比达标线', desc: '%（平均播放占时长比例）', type: 'int' },
      { key: 'commentLine', label: '评论率达标线', desc: '%，诊断建议用', type: 'float' },
      { key: 'hotMult', label: '爆款倍数', desc: '点赞 ≥ 中位数×该值 判爆款', type: 'float' },
      { key: 'favPortrait', label: '收藏型画像比', desc: '收藏/点赞 ≥ 该值打标签', type: 'float' },
      { key: 'ratingS', label: '选题评级线 S', desc: '五维总分 ≥ 此为 S', type: 'int' },
      { key: 'ratingA', label: '选题评级线 A', desc: '五维总分 ≥ 此为 A', type: 'int' },
      { key: 'ratingB', label: '选题评级线 B', desc: '五维总分 ≥ 此为 B', type: 'int' },
      { key: 'coverLimit', label: '封面大字上限', desc: '字数，体检项用', type: 'int' },
      { key: 'ipLimit', label: 'IP 数量上限', desc: '超出后不可新建 IP', type: 'int' }
    ];

    return `
      <div style="max-width:700px">
        <div class="settings-section">
          <div class="settings-title">主理人信息</div>
          <div class="settings-row">
            <div><div class="settings-label">名称</div></div>
            <input type="text" class="form-input" style="width:200px" value="${escAttr(settings.masterName || '')}" onchange="Store.data.settings.masterName=this.value;Store.save()">
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-title">数据标准线 <button class="btn btn-sm btn-secondary" style="float:right" onclick="App.resetStandards()">恢复全部默认</button></div>
          ${stdRows.map(r => `
          <div class="settings-row">
            <div><div class="settings-label">${r.label}</div><div class="settings-desc">${r.desc}（默认 ${DEFAULT_STANDARDS[r.key]}）</div></div>
            <div style="display:flex;align-items:center;gap:6px">
              <input type="number" step="${r.type === 'float' ? '0.1' : '1'}" class="form-input" style="width:90px" value="${standards[r.key] != null ? standards[r.key] : DEFAULT_STANDARDS[r.key]}" onchange="App.setStandard('${r.key}', this.value)">
              <button class="btn btn-sm btn-secondary" title="恢复该项默认值" onclick="App.resetStandard('${r.key}')">↺</button>
            </div>
          </div>`).join('')}
        </div>
        <div class="settings-section">
          <div class="settings-title">平台管理（内置 + 自定义追加）</div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">
            ${this.getAllPlatforms().map(p => `<span class="tag" style="display:inline-flex;align-items:center;gap:5px"><span style="width:8px;height:8px;border-radius:50%;background:${p.color};display:inline-block"></span>${escHtml(p.name)}${String(p.key).indexOf('custom_') === 0 ? `<a style="color:var(--danger);cursor:pointer;margin-left:4px;font-weight:700" title="删除该自定义平台" onclick="App.deleteCustomPlatform('${p.key}')">×</a>` : ''}</span>`).join('')}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <input id="newPlatformName" class="form-input" style="width:130px" placeholder="平台名称">
            <input id="newPlatformUrl" class="form-input" style="width:220px" placeholder="创作者后台地址（可选，https://…）">
            <button class="btn btn-secondary" onclick="App.addCustomPlatform()">+ 追加平台</button>
          </div>
          <div class="settings-desc" style="margin-top:6px">追加后即可开号/建矩阵/参与筛选；填了后台地址的平台会在稿件弹窗出现「后台直达」按钮</div>
        </div>
        <div class="settings-section">
          <div class="settings-title">营销节点管理 <span style="font-weight:400;font-size:11px;color:var(--muted)">（内置可隐藏，自定义可删除）</span></div>
          <div style="display:flex;flex-direction:column;gap:4px;max-height:200px;overflow:auto;margin-bottom:10px">
            ${(settings.nodes || []).map((n, i) => `
            <div style="display:flex;align-items:center;gap:8px;font-size:12.5px;padding:5px 8px;background:var(--soft);border-radius:6px;${n.hidden ? 'opacity:.5' : ''}">
              <span class="font-mono">${n.date}</span>
              <span style="flex:1">${escHtml(n.name)}${n.type === 'custom' ? ' <span class="text-muted">· 自定义</span>' : ''}</span>
              <label style="display:flex;align-items:center;gap:3px;font-size:11px;cursor:pointer"><input type="checkbox" ${!n.hidden ? 'checked' : ''} onchange="App.toggleNode(${i}, this.checked)">显示</label>
              ${n.type === 'custom' ? `<a style="color:var(--danger);cursor:pointer;font-weight:700" title="删除" onclick="App.deleteNode(${i})">×</a>` : ''}
            </div>`).join('') || '<span class="text-muted text-sm">暂无节点</span>'}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <input id="nodeName" class="form-input" style="width:150px" placeholder="节点名称，如 女神节">
            <input id="nodeDate" class="form-input" style="width:130px" placeholder="日期 MM-DD">
            <button class="btn btn-sm btn-secondary" onclick="App.addCustomNode()">+ 添加自定义节点</button>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-title">热榜直达链接 <span style="font-weight:400;font-size:11px;color:var(--muted)">（纯跳转，不抓取）</span></div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">
            ${(settings.hotLinks || []).map((l, i) => `<span class="tag" style="display:inline-flex;align-items:center;gap:4px">${escHtml(l.name)}<a style="color:var(--danger);cursor:pointer;font-weight:700" title="删除" onclick="App.deleteHotLink(${i})">×</a></span>`).join('') || '<span class="text-muted text-sm">暂无链接</span>'}
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <input id="hotLinkName" class="form-input" style="width:130px" placeholder="名称，如 微博热搜">
            <input id="hotLinkUrl" class="form-input" style="width:260px" placeholder="https://…">
            <button class="btn btn-sm btn-secondary" onclick="App.addHotLink()">+ 添加链接</button>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-title">AI 接口配置</div>
          <div class="settings-row">
            <div><div class="settings-label">服务商预设</div><div class="settings-desc">选中后自动填地址与参考模型（模型名以服务商控制台为准）</div></div>
            <select class="form-select" style="width:250px" onchange="App.applyAIProvider(this.value)">
              ${AI_PROVIDERS.map(p => {
                const current = settings.ai.baseUrl || '';
                const isCur = p.key === 'custom' ? (current && !AI_PROVIDERS.some(x => x.baseUrl && x.baseUrl === current)) : (p.key === (settings.ai.provider || 'none') || (p.baseUrl && p.baseUrl === current));
                return `<option value="${p.key}" ${isCur ? 'selected' : ''}>${p.name}</option>`;
              }).join('')}
            </select>
          </div>
          <div class="settings-row">
            <div><div class="settings-label">API 地址</div><div class="settings-desc">OpenAI 兼容格式的 Base URL</div></div>
            <input type="text" class="form-input" style="width:250px" value="${escAttr(settings.ai.baseUrl || '')}" placeholder="https://api.openai.com/v1" onchange="Store.data.settings.ai.baseUrl=this.value;Store.save()">
          </div>
          <div class="settings-row">
            <div><div class="settings-label">API Key</div><div class="settings-desc">仅存储在本机，不随备份导出</div></div>
            <input type="password" class="form-input" style="width:250px" value="${escAttr(settings.ai.apiKey || '')}" onchange="Store.data.settings.ai.apiKey=this.value;Store.save()">
          </div>
          <div class="settings-row">
            <div><div class="settings-label">模型</div></div>
            <input type="text" class="form-input" style="width:200px" value="${escAttr(settings.ai.model || '')}" placeholder="gpt-4o-mini" onchange="Store.data.settings.ai.model=this.value;Store.save()">
          </div>
          <div class="settings-row">
            <div><div class="settings-label">温度</div><div class="settings-desc">0 稳定 / 0.7 均衡 / 1+ 更有创意（0~2）</div></div>
            <div style="display:flex;align-items:center;gap:8px">
              <input type="range" min="0" max="2" step="0.1" style="width:140px" value="${Number(settings.ai.temperature != null ? settings.ai.temperature : 0.7)}" onchange="Store.data.settings.ai.temperature=parseFloat(this.value);Store.save();App.renderPage('settings')">
              <span class="font-mono text-sm">${Number(settings.ai.temperature != null ? settings.ai.temperature : 0.7)}</span>
            </div>
          </div>
          <div class="settings-row">
            <div><div class="settings-label">连接测试</div><div class="settings-desc">发送一条最小请求验证地址/Key/模型</div></div>
            <button class="btn btn-secondary" onclick="App.testAIConnection()">测试连接</button>
          </div>
        </div>
        <div class="settings-section">
          <div class="settings-title">数据管理</div>
          <div style="display:flex;gap:12px;flex-wrap:wrap">
            <button class="btn btn-secondary" onclick="App.exportData()">导出备份</button>
            <button class="btn btn-secondary" onclick="document.getElementById('importFile').click()">导入恢复</button>
            <button class="btn btn-secondary" onclick="App.loadSampleData()">载入示例数据</button>
            <button class="btn btn-secondary" style="color:var(--danger)" onclick="App.clearData()">清空数据</button>
          </div>
          <div class="text-muted" style="font-size:12px;margin-top:10px">本地存储用量：${(JSON.stringify(Store.data).length / 1024).toFixed(1)} KB（约占浏览器 5 MB 配额的 ${(JSON.stringify(Store.data).length / 1024 / 5120 * 100).toFixed(1)}%）</div>
          <input type="file" id="importFile" style="display:none" accept=".json" onchange="App.importData(event)">
        </div>
        <div class="settings-section">
          <div class="settings-title">关于</div>
          <div style="font-size:13px;color:var(--muted);line-height:1.8">
            <p><strong>内容指挥部</strong> v1.0</p>
            <p>面向短视频口播创作者的多 IP / 多账号内容工作台</p>
            <p style="margin-top:12px">功能：热点 → 对标 → 选题 → 文案 → 拍摄 → 排期 → 复盘</p>
            <p>数据存储在本机浏览器，支持备份/恢复</p>
            <p style="margin-top:12px;padding-top:10px;border-top:1px solid var(--line)"><strong>产品边界与声明</strong></p>
            <p>· 不登录、不授权、不调用任何内容平台接口，不代发、不抓取榜单；</p>
            <p>· 评分/体检/诊断均为创作参考，不保证平台审核结果或传播效果；</p>
            <p>· AI 生成内容需人工核对事实与合规；不代替专业法律意见。</p>
          </div>
        </div>
      </div>
    `;
  },
  
  // IP管理
  showIPModal(id) {
    const ip = id ? Store.getIP(id) : null;
    // FR-01-02：IP 数量上限（可在设置调整）
    if (!ip && Store.data.ips.length >= (Store.data.settings.standards.ipLimit || 8)) {
      alert(`IP 数量已达上限（${Store.data.settings.standards.ipLimit || 8} 个）。可在「设置 → 数据标准线 → IP 数量上限」调整。`);
      return;
    }
    this.showModal(`
      <div class="modal-title">${ip ? '编辑' : '新建'} IP</div>
      <div class="form-group">
        <label class="form-label">名称</label>
        <input type="text" class="form-input" id="ipName" value="${escAttr(ip?.name || '')}" placeholder="IP名称">
      </div>
      <div class="form-group">
        <label class="form-label">赛道</label>
        <input type="text" class="form-input" id="ipTrack" value="${escAttr(ip?.track || '')}" placeholder="如：效率、美食、读书">
      </div>
      <div class="form-group">
        <label class="form-label">一句话人设</label>
        <input type="text" class="form-input" id="ipPersona" value="${escAttr(ip?.persona || '')}" placeholder="一句话介绍你的人设">
      </div>
      <div class="form-group">
        <label class="form-label">目标观众</label>
        <input type="text" class="form-input" id="ipAudience" value="${escAttr(ip?.audience || '')}" placeholder="如：25-35岁职场人">
      </div>
      <div class="form-group">
        <label class="form-label">每周更新目标（条/周）</label>
        <input type="number" class="form-input" id="ipWeeklyGoal" value="${ip?.weeklyGoal || 3}" min="1" style="width:100px">
      </div>
      <div class="form-group">
        <label class="form-label">开通平台（矩阵）</label>
        <div class="text-xs text-muted" style="margin-bottom:6px">勾选后自动登记对应平台账号（账号名默认同 IP 名，可后续编辑）；编辑时只补建缺少的平台，不会删除已有账号</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${this.getAllPlatforms().map(p => {
            const has = ip ? Store.data.accounts.some(a => a.ipId === ip.id && a.platform === p.key) : false;
            return `<label style="display:flex;align-items:center;gap:5px;font-size:13px;padding:5px 10px;background:var(--soft);border-radius:var(--radius-sm);cursor:pointer${has ? ';opacity:.55' : ''}">
              <input type="checkbox" class="ip-plat-check" value="${p.key}" ${has ? 'checked disabled' : ''}>
              <span style="width:8px;height:8px;border-radius:50%;background:${p.color};display:inline-block"></span> ${p.name}${has ? ' ·已有' : ''}
            </label>`;
          }).join('')}
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">形象</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${IP_AVATARS.map(a => `<div style="width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:20px;border-radius:50%;cursor:pointer;border:2px solid ${ip?.avatar === a ? 'var(--accent)' : 'var(--line)'}" onclick="document.querySelectorAll('.avatar-opt').forEach(e=>e.style.borderColor='var(--line)');this.style.borderColor='var(--accent)';document.getElementById('ipAvatar').value='${a}'" class="avatar-opt">${a}</div>`).join('')}
          </div>
          <input type="hidden" id="ipAvatar" value="${ip?.avatar || IP_AVATARS[0]}">
        </div>
        <div class="form-group">
          <label class="form-label">主题色</label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            ${IP_COLORS.map(c => `<div style="width:32px;height:32px;background:${c};border-radius:50%;cursor:pointer;border:3px solid ${ip?.color === c ? 'var(--ink)' : 'transparent'}" onclick="document.querySelectorAll('.color-opt').forEach(e=>e.style.border='3px solid transparent');this.style.border='3px solid var(--ink)';document.getElementById('ipColor').value='${c}'" class="color-opt"></div>`).join('')}
          </div>
          <input type="hidden" id="ipColor" value="${ip?.color || IP_COLORS[0]}">
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:20px">
        <button class="btn btn-primary" onclick="App.saveIP('${id || ''}')">${ip ? '保存' : '创建'}</button>
        <button class="btn btn-secondary" onclick="App.closeModal()">取消</button>
      </div>
    `);
  },
  
  saveIP(id) {
    const data = {
      name: document.getElementById('ipName').value.trim(),
      track: document.getElementById('ipTrack').value.trim(),
      persona: document.getElementById('ipPersona').value.trim(),
      audience: document.getElementById('ipAudience').value.trim(),
      weeklyGoal: parseInt(document.getElementById('ipWeeklyGoal').value) || 3,
      avatar: document.getElementById('ipAvatar').value,
      color: document.getElementById('ipColor').value
    };
    if (!data.name) { alert('请输入名称'); return; }
    // FR-01-05：勾选的平台自动登记账号（已有平台跳过，不删除）
    const platChecks = document.querySelectorAll('.ip-plat-check:checked:not(:disabled)');
    const plats = Array.from(platChecks).map(c => c.value);
    let created = 0;
    if (id) {
      Store.updateIP(id, data);
      const existingPlats = Store.getAccountsByIP(id).map(a => a.platform);
      plats.forEach(pk => {
        if (!existingPlats.includes(pk)) {
          Store.addAccount({ ipId: id, platform: pk, name: data.name, followers: 0, weekGain: 0 });
          created++;
        }
      });
    } else {
      const ip = Store.addIP(data);
      plats.forEach(pk => {
        Store.addAccount({ ipId: ip.id, platform: pk, name: data.name, followers: 0, weekGain: 0 });
        created++;
      });
    }
    this.closeModal();
    this.renderPage('ip');
    if (created > 0) this.toast(`已自动登记 ${created} 个平台账号（可在账号表中补充资料）`);
  },

  // 轻提示（FR-07-05 复制成功等场景）
  toast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('active');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => el.classList.remove('active'), 2200);
  },

  // 复制文本到剪贴板（FR-07-05）
  copyText(text, label) {
    const done = () => this.toast(`✓ 已复制${label || ''}`);
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => this._fallbackCopy(text, done));
    } else {
      this._fallbackCopy(text, done);
    }
  },

  _fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { alert('复制失败，请手动复制'); }
    document.body.removeChild(ta);
  },

  // FR-07-05：按字段复制稿件内容（title/tags/full）
  copyContentField(contentId, field) {
    const c = Store.getContent(contentId);
    if (!c) return;
    if (field === 'title') this.copyText(c.title || '', '标题');
    else if (field === 'tags') this.copyText(c.tags || '', '标签');
    else {
      const full = [c.title, c.hook, c.body, c.cta].filter(Boolean).join('\n\n') + (c.tags ? `\n\n${c.tags}` : '');
      this.copyText(full, '全文');
    }
  },
  
  deleteIP(id) {
    const ip = Store.getIP(id);
    if (!ip) return;
    const cascade = Store.countIPCascade(id);
    const msg = cascade.posts > 0
      ? `确定删除「${ip.name}」？\n\n将级联删除：${cascade.accounts} 个账号、${cascade.posts} 条发布记录（内容保留但标记未归属）。\n建议先在设置中导出备份。`
      : `确定删除「${ip.name}」？将级联删除 ${cascade.accounts} 个账号。`;
    if (!confirm(msg)) return;
    Store.deleteIP(id);
    if (this.currentIp === id) {
      this.currentIp = null;
      Store.data.ui.currentIp = null;
      Store.save();
      const nameEl = document.getElementById('currentIpName');
      if (nameEl) nameEl.textContent = '全部 IP';
    }
    this.renderPage('ip');
  },
  
  showIPArchive(id) {
    const ip = Store.getIP(id);
    if (!ip) return;
    const accounts = Store.getAccountsByIP(id);
    const contents = Store.getContentsByIP(id);
    const accIds = accounts.map(a => a.id);
    const posts = Store.data.posts.filter(p => accIds.includes(p.accountId));
    const totalPlay = posts.reduce((s, p) => s + (p.play || 0), 0);
    
    this.showModal(`
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <div style="width:48px;height:48px;border-radius:50%;background:${ip.color}20;display:flex;align-items:center;justify-content:center;font-size:24px">${ip.avatar}</div>
        <div>
          <div class="modal-title" style="margin:0">${escHtml(ip.name)}</div>
          <div style="font-size:12px;color:var(--muted)">${escHtml(ip.track || '未设置赛道')} · ${escHtml(ip.persona || '')}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:20px">
        <div class="stat-card" style="padding:12px"><div style="font-size:20px;font-weight:900;font-family:var(--font-mono)">${accounts.length}</div><div style="font-size:11px;color:var(--muted)">账号</div></div>
        <div class="stat-card" style="padding:12px"><div style="font-size:20px;font-weight:900;font-family:var(--font-mono)">${contents.length}</div><div style="font-size:11px;color:var(--muted)">内容</div></div>
        <div class="stat-card" style="padding:12px"><div style="font-size:20px;font-weight:900;font-family:var(--font-mono)">${formatNumber(totalPlay)}</div><div style="font-size:11px;color:var(--muted)">总播放</div></div>
        <div class="stat-card" style="padding:12px"><div style="font-size:20px;font-weight:900;font-family:var(--font-mono)">${posts.length}</div><div style="font-size:11px;color:var(--muted)">发布数</div></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:20px">
        <button class="btn btn-primary" onclick="App.closeModal();App.showIPModal('${id}')">编辑 IP</button>
        <button class="btn btn-secondary" onclick="App.closeModal()">关闭</button>
      </div>
    `);
  },
  
  // 账号管理（presetIpId/presetPlatform 用于矩阵「+开号」预填）
  showAccountModal(id, presetIpId, presetPlatform) {
    const acc = id ? Store.data.accounts.find(a => a.id === id) : null;
    const ips = Store.data.ips;
    const selIp = acc?.ipId || presetIpId || ips[0]?.id || '';
    const selPlat = acc?.platform || presetPlatform || this.getAllPlatforms()[0].key;
    this.showModal(`
      <div class="modal-title">${acc ? '编辑' : '新建'}账号</div>
      <div class="form-group">
        <label class="form-label">所属 IP</label>
        <select class="form-select" id="accIp">${ips.map(ip => `<option value="${ip.id}" ${selIp === ip.id ? 'selected' : ''}>${ip.avatar} ${escHtml(ip.name)}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label class="form-label">平台</label>
        <select class="form-select" id="accPlatform">${this.getAllPlatforms().map(p => `<option value="${p.key}" ${selPlat === p.key ? 'selected' : ''}>${p.name}</option>`).join('')}</select>
      </div>
      <div class="form-group">
        <label class="form-label">账号名</label>
        <input type="text" class="form-input" id="accName" value="${escAttr(acc?.name || '')}" placeholder="账号名称">
      </div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">粉丝数</label><input type="text" class="form-input" id="accFollowers" value="${acc?.followers || ''}" placeholder="如：1.2万"></div>
        <div class="form-group"><label class="form-label">7日涨粉</label><input type="text" class="form-input" id="accWeekGain" value="${acc?.weekGain || ''}" placeholder="如：+500"></div>
      </div>
      <div style="display:flex;gap:8px;margin-top:20px">
        <button class="btn btn-primary" onclick="App.saveAccount('${id || ''}')">${acc ? '保存' : '创建'}</button>
        <button class="btn btn-secondary" onclick="App.closeModal()">取消</button>
      </div>
    `);
  },
  
  saveAccount(id) {
    const data = {
      ipId: document.getElementById('accIp').value,
      platform: document.getElementById('accPlatform').value,
      name: document.getElementById('accName').value.trim(),
      followers: parseNumber(document.getElementById('accFollowers').value),
      weekGain: parseNumber(document.getElementById('accWeekGain').value)
    };
    if (!data.name) { alert('请输入账号名'); return; }
    if (id) Store.updateAccount(id, data);
    else Store.addAccount(data);
    this.closeModal();
    this.renderPage('ip');
  },
  
  deleteAccount(id) {
    const acc = Store.data.accounts.find(a => a.id === id);
    if (!acc) return;
    const postCount = Store.countAccountCascade(id);
    const msg = postCount > 0
      ? `确定删除账号「${acc.name}」？\n\n将同时删除该账号的 ${postCount} 条发布记录（含已回填数据），建议先备份。`
      : `确定删除账号「${acc.name}」？`;
    if (!confirm(msg)) return;
    Store.deleteAccount(id);
    this.renderPage('ip');
  },
  
  // 热点管理
  showHotModal(id) {
    const hot = id ? Store.data.hots.find(h => h.id === id) : null;
    const ips = Store.data.ips;
    this.showModal(`
      <div class="modal-title">${hot ? '编辑' : '录入'}热点</div>
      <div class="form-group"><label class="form-label">标题</label><input type="text" class="form-input" id="hotTitle" value="${escAttr(hot?.title || '')}" placeholder="热点标题"></div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">来源</label><input type="text" class="form-input" id="hotSource" value="${escAttr(hot?.source || '')}" placeholder="如：微博热搜"></div>
        <div class="form-group"><label class="form-label">热度</label><select class="form-select" id="hotHeat"><option value="高" ${hot?.heat === '高' ? 'selected' : ''}>高</option><option value="中" ${!hot || hot?.heat === '中' ? 'selected' : ''}>中</option><option value="低" ${hot?.heat === '低' ? 'selected' : ''}>低</option></select></div>
      </div>
      <div class="form-group"><label class="form-label">趋势</label><select class="form-select" id="hotTrend"><option value="升" ${hot?.trend === '升' ? 'selected' : ''}>↑ 升</option><option value="平" ${!hot || hot?.trend === '平' ? 'selected' : ''}>→ 平</option><option value="降" ${hot?.trend === '降' ? 'selected' : ''}>↓ 降</option></select></div>
      <div class="form-group">
        <label class="form-label">适合 IP（可多选）</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px">${ips.map(ip => `<label style="display:flex;align-items:center;gap:4px;font-size:13px"><input type="checkbox" value="${ip.id}" ${hot?.ipIds?.includes(ip.id) ? 'checked' : ''}><span style="color:${ip.color}">${ip.avatar}</span> ${escHtml(ip.name)}</label>`).join('')}</div>
      </div>
      <div class="form-group"><label class="form-label">备注</label><textarea class="form-textarea" id="hotRemark" rows="2" placeholder="补充说明...">${escHtml(hot?.remark || '')}</textarea></div>
      <div style="display:flex;gap:8px;margin-top:20px">
        <button class="btn btn-primary" onclick="App.saveHot('${id || ''}')">${hot ? '保存' : '录入'}</button>
        <button class="btn btn-secondary" onclick="App.closeModal()">取消</button>
      </div>
    `);
  },
  
  saveHot(id) {
    const ipChecks = document.querySelectorAll('.modal input[type="checkbox"]:checked');
    const ipIds = Array.from(ipChecks).map(c => c.value);
    const data = {
      title: document.getElementById('hotTitle').value.trim(),
      source: document.getElementById('hotSource').value.trim(),
      heat: document.getElementById('hotHeat').value,
      trend: document.getElementById('hotTrend').value,
      remark: document.getElementById('hotRemark').value.trim(),
      ipIds: ipIds
    };
    if (!data.title) { alert('请输入标题'); return; }
    if (id) Store.updateHot(id, data);
    else Store.addHot(data);
    this.closeModal();
    this.renderPage('hot');
  },
  
  deleteHot(id) {
    if (!confirm('确定删除此热点？')) return;
    Store.deleteHot(id);
    this.renderPage('hot');
  },

  // FR-02-05：热点转选题（预填标题/来源/回链，转换后记录 converted）；支持从角度句转入
  hotToTopic(hotId, ipId, angleIdx) {
    const hot = Store.data.hots.find(h => h.id === hotId);
    if (!hot) return;
    let title = hot.title;
    let forcedIp = null;
    if (ipId && angleIdx !== undefined && angleIdx !== null) {
      const a = ((hot.angles || {})[ipId] || [])[angleIdx];
      if (a) title = a;
      forcedIp = ipId;
    }
    // 已转过的提示可再次转（不同 IP 角度），但列出已有转换
    this.showTopicModal(null, {
      title,
      source: 'hot',
      srcRef: hot.id,
      ipId: forcedIp || (hot.ipIds && hot.ipIds[0]) || this.currentIp || Store.data.ips[0]?.id || ''
    });
  },

  // FR-02-04：切入角度（本地模板引擎，可编辑/补充——重新生成即覆盖，转选题可带走）
  showHotAngles(hotId) {
    const hot = Store.data.hots.find(h => h.id === hotId);
    if (!hot) return;
    const ipIds = (hot.ipIds && hot.ipIds.length) ? hot.ipIds : Store.data.ips.map(i => i.id);
    if (!ipIds.length) { this.toast('先到「IP 与账号」创建 IP，再生成切入角度'); return; }
    this.showModal(`
      <div class="modal-title">切入角度 · ${escHtml(hot.title)}</div>
      <div class="text-muted text-sm" style="margin-bottom:10px">本地模板引擎生成（赛道 × 人设 × 热点类型「${({ event: '事件', product: '产品', debate: '争议' }[detectHotType(hot)] || '话题')}」），输出为建议；可在 AI 助手用「热点切入角度」模板增强。</div>
      ${ipIds.map(ipId => {
        const ip = Store.getIP(ipId);
        if (!ip) return '';
        const angles = (hot.angles || {})[ipId] || [];
        return `
          <div style="margin-bottom:14px;padding:10px 12px;background:var(--soft);border-radius:10px">
            <div style="font-weight:700;margin-bottom:6px"><span style="color:${ip.color}">${ip.avatar}</span> ${escHtml(ip.name)} <span class="text-muted" style="font-weight:400;font-size:11px">${escHtml(ip.track || '')}</span></div>
            ${angles.length ? angles.map((a, i) => `
              <div style="display:flex;align-items:center;gap:8px;font-size:13px;padding:5px 0">
                <span style="flex:1;line-height:1.6">${escHtml(a)}</span>
                <button class="btn btn-sm btn-secondary" onclick="App.hotToTopic('${hotId}','${ipId}',${i})">→ 转选题</button>
              </div>`).join('') + `<button class="btn btn-sm btn-secondary" style="margin-top:4px" onclick="App.genHotAngles('${hotId}','${ipId}')">↻ 重新生成（覆盖）</button>`
              : `<button class="btn btn-sm btn-accent" onclick="App.genHotAngles('${hotId}','${ipId}')">💡 为该 IP 生成 3 条角度</button>`}
          </div>`;
      }).join('')}
      <div style="text-align:right"><button class="btn btn-secondary" onclick="App.closeModal()">关闭</button></div>
    `);
  },

  genHotAngles(hotId, ipId) {
    const hot = Store.data.hots.find(h => h.id === hotId);
    const ip = Store.getIP(ipId);
    if (!hot || !ip) return;
    hot.angles = hot.angles || {};
    hot.angles[ipId] = generateHotAngles(hot, ip);
    Store.save();
    this.showHotAngles(hotId);
  },
  
  // 对标管理
  showBenchModal(id) {
    const bench = id ? Store.data.benchmarks.find(b => b.id === id) : null;
    const ips = Store.data.ips;
    this.showModal(`
      <div class="modal-title">${bench ? '编辑' : '添加'}对标账号</div>
      <div class="form-group"><label class="form-label">账号名</label><input type="text" class="form-input" id="benchName" value="${escAttr(bench?.name || '')}" placeholder="对标账号名"></div>
      <div class="grid-2">
        <div class="form-group"><label class="form-label">平台</label><select class="form-select" id="benchPlatform">${this.getAllPlatforms().map(p => `<option value="${p.key}" ${bench?.platform === p.key ? 'selected' : ''}>${p.name}</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">级别</label><select class="form-select" id="benchLevel"><option value="同量级" ${bench?.level === '同量级' ? 'selected' : ''}>同量级</option><option value="高一级" ${bench?.level === '高一级' ? 'selected' : ''}>高一级</option><option value="头部标杆" ${bench?.level === '头部标杆' ? 'selected' : ''}>头部标杆</option></select></div>
      </div>
      <div class="form-group"><label class="form-label">所属 IP</label><select class="form-select" id="benchIp"><option value="">全部 IP 共用</option>${ips.map(ip => `<option value="${ip.id}" ${bench?.ipId === ip.id ? 'selected' : ''}>${ip.avatar} ${escHtml(ip.name)}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">粉丝量</label><input type="text" class="form-input" id="benchFollowers" value="${bench?.followers || ''}" placeholder="如：5.2万"></div>
      <div class="form-group"><label class="form-label">选择标准（勾满 4 条显示「好对标」徽章）</label>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
          ${BENCH_CRITERIA.map((c, i) => `<label style="font-size:12px;display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" id="benchCrit_${i}" ${(bench?.criteria || [])[i] ? 'checked' : ''}>${c}</label>`).join('')}
        </div>
      </div>
      <div style="display:flex;gap:8px;margin-top:20px">
        <button class="btn btn-primary" onclick="App.saveBench('${id || ''}')">${bench ? '保存' : '添加'}</button>
        <button class="btn btn-secondary" onclick="App.closeModal()">取消</button>
      </div>
    `);
  },
  
  saveBench(id) {
    const data = {
      name: document.getElementById('benchName').value.trim(),
      platform: document.getElementById('benchPlatform').value,
      level: document.getElementById('benchLevel').value,
      ipId: document.getElementById('benchIp').value || null,
      followers: parseNumber(document.getElementById('benchFollowers').value),
      criteria: BENCH_CRITERIA.map((c, i) => !!(document.getElementById('benchCrit_' + i) || {}).checked)
    };
    if (!data.name) { alert('请输入账号名'); return; }
    if (id) Store.updateBenchmark(id, data);
    else Store.addBenchmark(data);
    this.closeModal();
    this.renderPage('bench');
  },
  
  deleteBenchmark(id) {
    if (!confirm('确定删除此对标账号？其作品也将被删除')) return;
    Store.deleteBenchmark(id);
    this.renderPage('bench');
  },
  
  showBenchWorks(benchId) {
    const bench = Store.data.benchmarks.find(b => b.id === benchId);
    const works = Store.data.benchWorks.filter(w => w.benchId === benchId);
    // FR-03-05：爆款判定（中位数×hotMult）与收藏型画像；作品 <2 条不判定
    const std = Store.data.settings.standards;
    const sorted = works.map(w => w.likes || 0).sort((a, b) => a - b);
    const median = sorted.length ? (sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2) : 0;
    const hotLine = median * (std.hotMult || 2);
    const isHot = w => works.length >= 2 && (w.likes || 0) > 0 && (w.likes || 0) >= hotLine;
    const isFav = w => (w.likes || 0) > 0 && (w.favorite || 0) / (w.likes || 0) >= (std.favPortrait || 0.5);
    // FR-03-06：规律小结（录满 2 条有标签的作品后自动统计）
    const labeled = works.filter(w => w.labels);
    let summary = '';
    if (labeled.length >= 2) {
      const combos = {};
      const angles = {};
      labeled.forEach(w => {
        const l = w.labels;
        const combo = `${l.hook || '—'} → ${l.structure || '—'} → ${l.ending || '—'}`;
        combos[combo] = (combos[combo] || 0) + 1;
        if (l.angle) angles[l.angle] = (angles[l.angle] || 0) + 1;
      });
      const topCombo = Object.entries(combos).sort((a, b) => b[1] - a[1])[0];
      const angleStr = Object.entries(angles).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}×${n}`).join('、');
      const avgLikes = Math.round(labeled.reduce((s, w) => s + (w.likes || 0), 0) / labeled.length);
      summary = `
        <div style="background:var(--soft);border-radius:10px;padding:12px 14px;margin-bottom:12px;font-size:12.5px;line-height:1.9">
          <strong>📐 规律小结（${labeled.length} 条已拆解）</strong><br>
          最常用组合：<strong>${escHtml(topCombo[0])}</strong>（${topCombo[1]}/${labeled.length} 条）<br>
          ${angleStr ? `角度分布：${escHtml(angleStr)}<br>` : ''}已拆作品平均点赞：${formatNumber(avgLikes)}
        </div>`;
    }
    this.showModal(`
      <div class="modal-title">${escHtml(bench?.name || '')} 的作品（爆款线：${works.length >= 2 ? formatNumber(hotLine) + ' 赞' : '样本不足 2 条不判定'}）</div>
      ${summary}
      <div style="max-height:400px;overflow-y:auto">
        ${works.length === 0 ? '<div class="text-muted text-sm">暂无作品，点下方添加并粘贴完整文案</div>' : works.map(w => `
          <div style="padding:12px;border-bottom:1px solid var(--line)">
            <div style="font-weight:600;margin-bottom:4px;cursor:pointer" onclick="App.showWorkDetail('${w.id}')">${escHtml(w.title || '无标题')}
              ${isHot(w) ? '<span class="tag tag-accent" style="margin-left:6px">🔥 爆款</span>' : ''}
              ${isFav(w) ? '<span class="tag tag-success" style="margin-left:6px">⭐ 收藏型</span>' : ''}
              ${w.labels && (w.labels.hook || w.labels.structure) ? '<span class="tag" style="margin-left:6px">已拆解</span>' : ''}
            </div>
            <div style="font-size:12px;color:var(--muted);display:flex;gap:12px;align-items:center">
              <span>👍 ${formatNumber(w.likes || 0)}</span><span>💬 ${formatNumber(w.comment || 0)}</span><span>⭐ ${formatNumber(w.favorite || 0)}</span><span>🔁 ${formatNumber(w.share || 0)}</span>
              <span style="margin-left:auto;color:var(--accent);cursor:pointer" onclick="App.showWorkDetail('${w.id}')">拆解 ›</span>
            </div>
          </div>`).join('')}
      </div>
      <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-secondary" onclick="App.showBenchWorkModal('${benchId}')">+ 添加作品</button>
        <button class="btn btn-secondary" onclick="App.closeModal()">关闭</button>
      </div>
    `);
  },

  // FR-03-02：数字解析失败标红（支持 1.2万，解析不出且非空 → 标红提示手改）
  checkNumParse(inputId) {
    const el = document.getElementById(inputId);
    if (!el) return;
    const v = el.value.trim();
    const bad = v !== '' && parseNumber(v) === 0;
    el.style.borderColor = bad ? 'var(--danger)' : '';
    el.style.background = bad ? 'rgba(239,68,68,.07)' : '';
  },

  // ═══ 作品拆解详情（FR-03-03/04/07/08）═══
  showWorkDetail(workId) {
    const work = Store.data.benchWorks.find(w => w.id === workId);
    if (!work) return;
    // 首次打开自动分段+识别（空稿不拆）；手动改过的字段不会被自动覆盖
    if (!work.segments) {
      const seg = segmentScript(work.content || '');
      if (seg) {
        work.segments = seg;
        work.labels = classifyBenchLabels(seg);
        work.labelsManual = {};
        Store.save();
      }
    }
    const seg = work.segments;
    const labels = work.labels || {};
    const manual = work.labelsManual || {};
    const labelSelect = (cat, name) => `
      <select class="form-select" style="width:100%" onchange="App.saveWorkLabel('${workId}','${cat}',this.value)">
        <option value="">${manual[cat] ? '（手动归类）' : '识别不出，手动归类'}</option>
        ${BENCH_LABELS[cat].map(o => `<option value="${o}" ${labels[cat] === o ? 'selected' : ''}>${o}${manual[cat] && labels[cat] === o ? ' ✓' : ''}</option>`).join('')}
      </select>`;
    this.showModal(`
      <div class="modal-title">拆解 · ${escHtml(work.title || '无标题')}</div>
      ${work.content ? '' : '<p class="text-muted text-sm">⚠️ 该作品未粘贴文案，无法自动分段；可编辑作品补充完整口播稿。</p>'}
      ${seg ? `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span class="form-label" style="margin:0">自动分段（可手动改正后保存）</span>
          <button class="btn btn-sm btn-secondary" onclick="App.resplitWork('${workId}')">↻ 重新自动分段</button>
        </div>
        <div class="form-group"><label class="form-label">① 开头（钩子）</label><textarea class="form-textarea" id="segOpening" rows="2">${escHtml(seg.opening || '')}</textarea></div>
        <div class="form-group"><label class="form-label">② 正文</label><textarea class="form-textarea" id="segBody" rows="6">${escHtml(seg.body || '')}</textarea></div>
        <div class="form-group"><label class="form-label">③ 结尾（互动）</label><textarea class="form-textarea" id="segEnding" rows="2">${escHtml(seg.ending || '')}</textarea></div>
        <div style="text-align:right;margin-bottom:12px"><button class="btn btn-sm btn-primary" onclick="App.saveSegments('${workId}')">保存分段</button></div>
        <div class="form-label" style="margin-bottom:6px">结构识别（单击改为正确值，改过的不被自动覆盖）</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div><div style="font-size:11px;color:var(--muted);margin-bottom:3px">选题角度</div>${labelSelect('angle')}</div>
          <div><div style="font-size:11px;color:var(--muted);margin-bottom:3px">开头钩子</div>${labelSelect('hook')}</div>
          <div><div style="font-size:11px;color:var(--muted);margin-bottom:3px">正文结构</div>${labelSelect('structure')}</div>
          <div><div style="font-size:11px;color:var(--muted);margin-bottom:3px">结尾方式</div>${labelSelect('ending')}</div>
        </div>
      ` : '<p class="text-muted text-sm">暂无分段（文案为空或未录入）。</p>'}
      <div style="display:flex;gap:8px;margin-top:18px;flex-wrap:wrap">
        <button class="btn btn-accent" onclick="App.borrowWorkTopic('${workId}')">💡 借选题</button>
        <button class="btn btn-primary" onclick="App.useWorkStructure('${workId}')">🧱 套结构写稿</button>
        <button class="btn btn-secondary" onclick="App.closeModal()">关闭</button>
      </div>
    `);
  },

  resplitWork(workId) {
    const work = Store.data.benchWorks.find(w => w.id === workId);
    if (!work) return;
    if (!confirm('重新自动分段将覆盖三段的手动修改；标签里手动改过的会保留。继续？')) return;
    const seg = segmentScript(work.content || '');
    if (!seg) { this.toast('文案为空，无法拆分'); return; }
    work.segments = seg;
    work.labels = work.labels || {};
    work.labelsManual = work.labelsManual || {};
    const auto = classifyBenchLabels(seg);
    ['angle', 'hook', 'structure', 'ending'].forEach(cat => {
      if (!work.labelsManual[cat]) work.labels[cat] = auto[cat];
    });
    Store.save();
    this.showWorkDetail(workId);
    this.toast('已重新分段与识别');
  },

  saveSegments(workId) {
    const work = Store.data.benchWorks.find(w => w.id === workId);
    if (!work) return;
    work.segments = {
      opening: (document.getElementById('segOpening')?.value || '').trim(),
      body: (document.getElementById('segBody')?.value || '').trim(),
      ending: (document.getElementById('segEnding')?.value || '').trim()
    };
    Store.save();
    this.toast('分段已保存，重开不丢');
  },

  saveWorkLabel(workId, cat, value) {
    const work = Store.data.benchWorks.find(w => w.id === workId);
    if (!work) return;
    work.labels = work.labels || {};
    work.labelsManual = work.labelsManual || {};
    work.labels[cat] = value;
    work.labelsManual[cat] = true; // FR-03-04：改过的标签不再被自动覆盖
    Store.save();
    this.toast(`已记录${{ angle: '选题角度', hook: '开头钩子', structure: '正文结构', ending: '结尾方式' }[cat]}：${value || '手动归类'}`);
  },

  // FR-03-07：借选题 → 预填标题与按角度标签映射的五维默认分
  borrowWorkTopic(workId) {
    const work = Store.data.benchWorks.find(w => w.id === workId);
    if (!work) return;
    const angle = work.labels?.angle;
    const preset = {
      title: work.title ? `【借】${work.title}` : '【借】对标同款选题',
      source: 'bench',
      srcRef: work.id
    };
    if (angle && ANGLE_SCORE_PRESET[angle]) {
      preset.scores = Object.assign({ pain: 3, useful: 3, debate: 3, suspense: 3, track: 3 }, ANGLE_SCORE_PRESET[angle]);
    }
    this.closeModal();
    this.showTopicModal(null, preset);
  },

  // FR-03-08：套结构写稿 → 按正文结构标签生成全新占位草稿（不复制对标原句）
  useWorkStructure(workId) {
    const work = Store.data.benchWorks.find(w => w.id === workId);
    if (!work) return;
    const bench = Store.data.benchmarks.find(b => b.id === work.benchId);
    const structure = work.labels?.structure;
    const draft = STRUCTURE_DRAFTS[structure] || STRUCTURE_DRAFTS['总分总'];
    if (!structure) this.toast('该作品未识别出正文结构，已用「总分总」占位，可在拆解中手动归类');
    const ipId = bench?.ipId || this.currentIp || Store.data.ips[0]?.id || null;
    const content = Store.addContent({
      ipId,
      title: `【套结构·${structure || '总分总'}】${work.title || '新稿件'}`,
      hook: draft.hook,
      body: draft.body,
      cta: draft.cta,
      stage: 'draft',
      srcRef: work.id
    });
    this.closeModal();
    this.editingId = content.id;
    this.navigate('script');
    this.toast('结构草稿已生成，把 ____ 换成你的内容即可');
  },
  
  showBenchWorkModal(benchId, workId) {
    const work = workId ? Store.data.benchWorks.find(w => w.id === workId) : null;
    this.showModal(`
      <div class="modal-title">${work ? '编辑' : '添加'}作品</div>
      <div class="form-group"><label class="form-label">标题</label><input type="text" class="form-input" id="workTitle" value="${escAttr(work?.title || '')}" placeholder="作品标题"></div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
        <div class="form-group"><label class="form-label">点赞</label><input type="text" class="form-input" id="workLikes" value="${work?.likes || ''}" placeholder="1.2万" oninput="App.checkNumParse('workLikes')"></div>
        <div class="form-group"><label class="form-label">评论</label><input type="text" class="form-input" id="workComment" value="${work?.comment || ''}" placeholder="500" oninput="App.checkNumParse('workComment')"></div>
        <div class="form-group"><label class="form-label">收藏</label><input type="text" class="form-input" id="workFavorite" value="${work?.favorite || ''}" placeholder="800" oninput="App.checkNumParse('workFavorite')"></div>
        <div class="form-group"><label class="form-label">转发</label><input type="text" class="form-input" id="workShare" value="${work?.share || ''}" placeholder="200" oninput="App.checkNumParse('workShare')"></div>
      </div>
      <div class="form-group"><label class="form-label">完整文案</label><textarea class="form-textarea" id="workContent" rows="6" placeholder="粘贴完整口播稿，保存后点作品标题即可自动拆解...">${escHtml(work?.content || '')}</textarea></div>
      <div style="display:flex;gap:8px;margin-top:20px">
        <button class="btn btn-primary" onclick="App.saveBenchWork('${benchId}','${workId || ''}')">${work ? '保存' : '添加'}</button>
        <button class="btn btn-secondary" onclick="App.closeModal()">取消</button>
      </div>
    `);
    ['workLikes', 'workComment', 'workFavorite', 'workShare'].forEach(id => this.checkNumParse(id));
  },
  
  saveBenchWork(benchId, workId) {
    const data = {
      benchId,
      title: document.getElementById('workTitle').value.trim(),
      likes: parseNumber(document.getElementById('workLikes').value),
      comment: parseNumber(document.getElementById('workComment').value),
      favorite: parseNumber(document.getElementById('workFavorite').value),
      share: parseNumber(document.getElementById('workShare').value),
      content: document.getElementById('workContent').value.trim()
    };
    if (!data.title) { alert('请输入标题'); return; }
    if (workId) Store.updateBenchWork(workId, data);
    else Store.addBenchWork(data);
    this.closeModal();
    this.showBenchWorks(benchId);
  },
  
  // 选题管理（preset 支持：热点转选题等外部预填）
  showTopicModal(id, preset) {
    const topic = id ? Store.data.topics.find(t => t.id === id) : null;
    const p = topic || preset || {};
    const ips = Store.data.ips;
    const sourceLabels = { manual: '手动', hot: '来自热点', bench: '来自对标' };
    this.showModal(`
      <div class="modal-title">${topic ? '编辑' : '新建'}选题${p.source && p.source !== 'manual' ? ` <span class="tag tag-accent">${sourceLabels[p.source] || p.source}</span>` : ''}</div>
      <div class="form-group"><label class="form-label">标题</label><input type="text" class="form-input" id="topicTitle" value="${escAttr(p.title || '')}" placeholder="选题标题"></div>
      <div class="form-group"><label class="form-label">所属 IP</label><select class="form-select" id="topicIp">${ips.map(ip => `<option value="${ip.id}" ${(p.ipId || ips[0]?.id) === ip.id ? 'selected' : ''}>${ip.avatar} ${escHtml(ip.name)}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">五维评分</label><div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px">${FIVE_DIMS.map(d => `<div style="text-align:center"><div style="font-size:11px;color:var(--muted);margin-bottom:4px">${d.icon} ${d.name}</div><input type="number" min="1" max="5" class="form-input" style="text-align:center" id="score_${d.key}" value="${p.scores?.[d.key] || 3}"></div>`).join('')}</div></div>
      <div style="display:flex;gap:8px;margin-top:20px">
        <button class="btn btn-primary" onclick="App.saveTopic('${id || ''}', ${p.srcRef ? `'${p.source}'` : 'null'}, ${p.srcRef ? `'${p.srcRef}'` : 'null'})">${topic ? '保存' : '创建'}</button>
        <button class="btn btn-secondary" onclick="App.closeModal()">取消</button>
      </div>
    `);
  },

  saveTopic(id, source, srcRef) {
    const scores = {};
    FIVE_DIMS.forEach(d => { scores[d.key] = parseInt(document.getElementById('score_' + d.key).value) || 3; });
    const data = {
      title: document.getElementById('topicTitle').value.trim(),
      ipId: document.getElementById('topicIp').value,
      scores
    };
    if (!data.title) { alert('请输入标题'); return; }
    if (source) data.source = source;
    if (srcRef) data.srcRef = srcRef;
    let saved;
    if (id) saved = Store.updateTopic(id, data);
    else {
      saved = Store.addTopic(data);
      // FR-02-05：回写热点的 converted 列表
      if (source === 'hot' && srcRef) {
        const hot = Store.data.hots.find(h => h.id === srcRef);
        if (hot) {
          const converted = hot.converted || [];
          converted.push(saved.id);
          Store.updateHot(srcRef, { converted });
        }
      }
    }
    this.closeModal();
    this.renderPage('topic');
    if (!id && source === 'hot') this.toast('✓ 已转入选题池，热点已记录回链');
  },
  
  createContentFromTopic(topicId) {
    const topic = Store.data.topics.find(t => t.id === topicId);
    if (!topic) return;
    // FR-04-07：重复立项提示，可复用已有稿件
    const existing = Store.data.contents.find(c => c.topicId === topicId);
    if (existing && !confirm(`该选题已立项过「${existing.title || '未命名'}」。\n确定 = 再次新建一稿；取消 = 复用现有稿件继续写。`)) {
      this.editingId = existing.id;
      this.navigate('script');
      return;
    }
    const content = Store.addContent({ ipId: topic.ipId, title: topic.title, stage: 'draft', topicId });
    Store.updateTopic(topicId, { status: 'doing' });
    this.editingId = content.id;
    this.navigate('script');
  },

  // ═══ 五维雷达图（FR-04-05）═══
  miniRadar(topicId, scores) {
    const cx = 32, cy = 32, r = 25;
    const pt = (i, v) => {
      const ang = -Math.PI / 2 + i * 2 * Math.PI / 5;
      return `${(cx + r * v * Math.cos(ang)).toFixed(1)},${(cy + r * v * Math.sin(ang)).toFixed(1)}`;
    };
    const ring = g => FIVE_DIMS.map((_, i) => pt(i, g / 5)).join(' ');
    const poly = FIVE_DIMS.map((d, i) => pt(i, Math.min(5, Math.max(0, scores?.[d.key] || 0)) / 5)).join(' ');
    return `<svg width="46" height="46" viewBox="0 0 64 64" style="flex-shrink:0;cursor:pointer" title="查看画像对比" onclick="App.showTopicRadar('${topicId}')">
      ${[2, 3, 4, 5].map(g => `<polygon points="${ring(g)}" fill="none" stroke="var(--line)" stroke-width="1.5"/>`).join('')}
      <polygon points="${poly}" fill="var(--accent)" fill-opacity=".3" stroke="var(--accent)" stroke-width="2"/>
    </svg>`;
  },

  showTopicRadar(topicId) {
    const topic = Store.data.topics.find(t => t.id === topicId);
    if (!topic) return;
    const ip = Store.getIP(topic.ipId);
    const avg = ip ? this.ipAvgProfile(topic.ipId) : null;
    const CX = 150, CY = 140, R = 100;
    const pt = (i, v) => {
      const ang = -Math.PI / 2 + i * 2 * Math.PI / 5;
      return [CX + R * v * Math.cos(ang), CY + R * v * Math.sin(ang)];
    };
    const ring = g => FIVE_DIMS.map((_, i) => pt(i, g / 5).map(n => n.toFixed(1)).join(',')).join(' ');
    const polyOf = prof => FIVE_DIMS.map((d, i) => pt(i, Math.min(5, Math.max(0, prof?.[d.key] || 0)) / 5).map(n => n.toFixed(1)).join(',')).join(' ');
    const { rating, total } = calcRating(topic.scores || {});
    this.showModal(`
      <div class="modal-title">选题画像 · ${escHtml(topic.title || '未命名')}</div>
      <svg viewBox="0 0 300 292" style="width:100%;max-width:340px;display:block;margin:0 auto">
        ${[1, 2, 3, 4, 5].map(g => `<polygon points="${ring(g)}" fill="none" stroke="var(--line)" stroke-width="1"/>`).join('')}
        ${FIVE_DIMS.map((d, i) => {
          const [lx, ly] = pt(i, 1.22).map(n => n.toFixed(1));
          const [ax, ay] = pt(i, 1).map(n => n.toFixed(1));
          return `<line x1="${CX}" y1="${CY}" x2="${ax}" y2="${ay}" stroke="var(--line)"/><text x="${lx}" y="${ly}" text-anchor="middle" font-size="12" fill="var(--muted)">${d.icon} ${d.name}</text>`;
        }).join('')}
        ${avg ? `<polygon points="${polyOf(avg)}" fill="var(--muted)" fill-opacity=".15" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="4"/>` : ''}
        <polygon points="${polyOf(topic.scores)}" fill="var(--accent)" fill-opacity=".28" stroke="var(--accent)" stroke-width="2"/>
      </svg>
      <div style="display:flex;gap:14px;justify-content:center;font-size:12px;margin:8px 0;flex-wrap:wrap">
        <span><span style="display:inline-block;width:10px;height:10px;background:var(--accent);opacity:.5;border-radius:2px"></span> 本选题（${rating} · ${total} 分）</span>
        ${avg ? '<span><span style="display:inline-block;width:10px;height:10px;background:var(--muted);opacity:.4;border-radius:2px"></span> 该 IP 已发布平均画像</span>' : '<span class="text-muted">该 IP 暂无回填数据，不叠加平均画像</span>'}
      </div>
      <div class="text-xs text-muted" style="line-height:1.8;background:var(--soft);border-radius:8px;padding:8px 10px">口径：平均画像由该 IP 回填数据换算——痛点≈5秒完播÷达标线、实用≈收藏率÷达标线、悬念≈均播比÷达标线、争议≈评论率÷达标线（封顶 5，无数据维度取 3）；赛道维度暂无直接数据，取中间值。</div>
      <div style="margin-top:12px;text-align:right"><button class="btn btn-sm btn-secondary" onclick="App.copyRadarSummary('${topicId}')">📋 复制画像说明</button> <button class="btn btn-secondary" onclick="App.closeModal()">关闭</button></div>
    `);
  },

  ipAvgProfile(ipId) {
    const posts = Store.data.posts.filter(p => {
      const a = Store.data.accounts.find(x => x.id === p.accountId);
      return a && a.ipId === ipId;
    });
    if (!posts.length) return null;
    const std = Store.data.settings.standards;
    const clamp5 = v => Math.max(1, Math.min(5, v));
    const rates = posts.map(p => ({
      five: p.fiveSecRate != null ? p.fiveSecRate : null,
      fav: p.play ? (p.favorite || 0) / p.play * 100 : null,
      avp: p.duration ? (p.avgPlay || 0) / p.duration * 100 : null,
      com: p.play ? (p.comment || 0) / p.play * 100 : null
    }));
    const mean = f => {
      const vals = rates.map(r => f(r)).filter(v => v !== null && !isNaN(v));
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    const five = mean(r => r.five), fav = mean(r => r.fav), avp = mean(r => r.avp), com = mean(r => r.com);
    if (five == null && fav == null && avp == null && com == null) return null;
    return {
      pain: five != null ? clamp5(five / (std.fiveSecLine || 60) * 3) : 3,
      useful: fav != null ? clamp5(fav / (std.favLine || 2.2) * 3) : 3,
      suspense: avp != null ? clamp5(avp / (std.avgLine || 40) * 3) : 3,
      debate: com != null ? clamp5(com / (std.commentLine || 0.5) * 3) : 3,
      track: 3
    };
  },

  copyRadarSummary(topicId) {
    const topic = Store.data.topics.find(t => t.id === topicId);
    if (!topic) return;
    const { rating, total } = calcRating(topic.scores || {});
    const avg = this.ipAvgProfile(topic.ipId);
    const fmt = p => FIVE_DIMS.map(d => `${d.name}${p && p[d.key] != null ? p[d.key] : '-'}`).join('/');
    const text = [
      `【选题画像】${topic.title || '未命名'}`,
      `评级 ${rating}（五维总分 ${total}）：${fmt(topic.scores)}`,
      avg ? `IP 平均画像：${fmt(avg)}（来自回填数据换算）` : '该 IP 暂无回填数据，未叠加平均画像'
    ].join('\n');
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => this.toast('✓ 画像说明已复制')).catch(() => this.toast(text));
    else this.toast(text);
  },
  
  // 内容管理
  showContentModal(id) {
    const content = id ? Store.getContent(id) : null;
    const ips = Store.data.ips;
    const ipAccounts = content ? Store.getAccountsByIP(content.ipId) : [];
    const targetIds = content?.targetAccounts || [];
    // 排期时间拆分为日期+时间（默认今天 19:30）
    const schedDate = content?.scheduledAt ? content.scheduledAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const schedTime = content?.scheduledTime || '19:30';

    this.showModal(`
      <div class="modal-title">${content ? '编辑' : '新建'}稿件</div>
      <div class="form-group"><label class="form-label">标题</label><input type="text" class="form-input" id="contentTitle" value="${escAttr(content?.title || '')}" placeholder="稿件标题"></div>
      <div class="form-group"><label class="form-label">所属 IP</label><select class="form-select" id="contentIp" onchange="App._refreshModalAccounts(this.value)">${ips.map(ip => `<option value="${ip.id}" ${content?.ipId === ip.id ? 'selected' : ''}>${ip.avatar} ${escHtml(ip.name)}</option>`).join('')}</select></div>
      <div class="form-group"><label class="form-label">阶段</label><select class="form-select" id="contentStage">${CONTENT_STAGES.map(s => `<option value="${s.key}" ${content?.stage === s.key ? 'selected' : ''}>${s.name}</option>`).join('')}</select></div>
      ${content ? `
      <div class="form-group">
        <label class="form-label">排期时间（默认 19:30）</label>
        <div style="display:flex;gap:8px">
          <input type="date" class="form-input" id="schedDate" value="${schedDate}" style="flex:1">
          <input type="time" class="form-input" id="schedTime" value="${schedTime}" style="width:110px">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">目标账号（多选，一稿多发）</label>
        <div id="modalAccList" style="display:flex;flex-wrap:wrap;gap:8px">${this._renderModalAccounts(content.ipId, targetIds)}</div>
      </div>
      <div class="form-group">
        <label class="form-label">发布辅助</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px">
          <button class="btn btn-sm btn-secondary" onclick="App.copyContentField('${content.id}','title')">📋 复制标题</button>
          <button class="btn btn-sm btn-secondary" onclick="App.copyContentField('${content.id}','tags')">🏷️ 复制标签</button>
          <button class="btn btn-sm btn-secondary" onclick="App.copyContentField('${content.id}','full')">📄 复制全文</button>
        </div>
        <div class="text-xs text-muted" style="margin-bottom:6px">发布仅支持手动完成：复制文案 → 打开对应平台创作者后台 → 上传发布 → 回来点「标记已发布」</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${(ipAccounts.length ? ipAccounts : []).map(a => {
            const url = this.getCreatorUrl(a.platform);
            const p = this.getAllPlatforms().find(x => x.key === a.platform);
            return url ? `<a class="btn btn-sm btn-secondary" style="text-decoration:none" href="${url}" target="_blank" rel="noopener">${p?.name || a.platform}后台 ↗</a>` : '';
          }).join('') || '<span class="text-xs text-muted">该 IP 暂无账号，先到「IP 与账号」添加</span>'}
        </div>
      </div>
      ${content.stage === 'schedule' ? `
      <div class="form-group">
        <label class="form-label">发布确认清单 <span class="text-muted" style="font-weight:400;font-size:11px">（全勾选才亮「标记已发布」，可跳过并确认）</span></label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px">
          ${PUB_CHECK_ITEMS.map((t, i) => `<label style="font-size:12.5px;display:flex;align-items:center;gap:5px;cursor:pointer"><input type="checkbox" ${(content.pubCheck || [])[i] ? 'checked' : ''} onchange="App.togglePubCheck('${content.id}', ${i}, this.checked)">${t}</label>`).join('')}
        </div>
      </div>
      ` : ''}
      ` : ''}
      <div style="display:flex;gap:8px;margin-top:20px">
        <button class="btn btn-primary" onclick="App.saveContent('${id || ''}')">${content ? '保存' : '创建'}</button>
        <button class="btn btn-secondary" onclick="App.closeModal()">取消</button>
      </div>
    `);
  },

  _renderModalAccounts(ipId, targetIds) {
    const accs = Store.getAccountsByIP(ipId);
    return accs.map(a => {
      const p = this.getAllPlatforms().find(x => x.key === a.platform);
      return `<label style="display:flex;align-items:center;gap:5px;font-size:13px;padding:5px 10px;background:var(--soft);border-radius:var(--radius-sm);cursor:pointer">
        <input type="checkbox" class="sched-acc-check" value="${a.id}" ${(targetIds || []).includes(a.id) ? 'checked' : ''}>
        <span style="width:8px;height:8px;border-radius:50%;background:${p?.color || '#999'};display:inline-block"></span> ${escHtml(a.name)}
      </label>`;
    }).join('') || '<span class="text-xs text-muted">该 IP 暂无账号</span>';
  },

  _refreshModalAccounts(ipId) {
    const el = document.getElementById('modalAccList');
    if (el) el.innerHTML = this._renderModalAccounts(ipId, []);
  },

  saveContent(id) {
    const data = {
      title: document.getElementById('contentTitle').value.trim(),
      ipId: document.getElementById('contentIp').value,
      stage: document.getElementById('contentStage').value
    };
    if (!data.title) { alert('请输入标题'); return; }
    // FR-07-02：排期时间与目标账号（编辑态才显示这些字段）
    const schedDateEl = document.getElementById('schedDate');
    if (schedDateEl) {
      const t = document.getElementById('schedTime').value || '19:30';
      data.scheduledAt = schedDateEl.value;
      data.scheduledTime = t;
      data.targetAccounts = Array.from(document.querySelectorAll('.sched-acc-check:checked')).map(c => c.value);
    }
    if (id) Store.updateContent(id, data);
    else Store.addContent(data);
    this.closeModal();
    this.renderPage(this.currentPage);
  },
  
  saveScript(id) {
    const data = {
      title: document.getElementById('scriptTitle').value.trim(),
      hook: document.getElementById('scriptHook').value,
      body: document.getElementById('scriptBody').value,
      cta: document.getElementById('scriptCta').value,
      cover: document.getElementById('scriptCover').value,
      tags: document.getElementById('scriptTags').value
    };
    Store.updateContent(id, data);
    alert('已保存');
  },
  
  runScriptCheck(id) {
    const content = Store.getContent(id);
    const ip = Store.getIP(content.ipId);
    const result = checkScript(content, ip, Store.data.settings.standards);
    document.getElementById('checkResult').innerHTML = `
      <div class="card-title" style="margin-bottom:12px">体检结果</div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
        <div style="font-size:32px;font-weight:900;font-family:var(--font-mono);color:${result.score >= 80 ? 'var(--success)' : result.score >= 60 ? 'var(--warning)' : 'var(--danger)'}">${result.score}</div>
        <div><div style="font-size:13px">通过 ${result.passed}/${result.total} 项</div><div style="font-size:12px;color:var(--muted)">${result.score >= 80 ? '优秀，可以拍摄' : result.score >= 60 ? '基本合格，建议优化' : '需要修改'}</div></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        ${result.results.map(r => `
          <div style="font-size:12px;padding:6px 10px;background:${r.pass ? '#ecfdf5' : '#fef2f2'};border-radius:var(--radius-sm)">
            <div style="display:flex;align-items:center;gap:8px"><span>${r.pass ? '✅' : '❌'}</span><span style="flex:1">${r.name}</span></div>
            ${!r.pass && r.tip ? `<div style="color:var(--muted);margin-top:3px;padding-left:26px">💡 ${r.tip}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  },
  
  moveToShoot(id) {
    Store.updateContent(id, { stage: 'shoot' });
    const content = Store.getContent(id);
    if (content && (!content.shots || content.shots.length === 0)) {
      const shots = autoStoryboard(content, Store.data.settings.standards.wpm);
      Store.updateContent(id, { shots });
    }
    this.navigate('shoot');
  },
  
  insertHook(template) {
    const hookField = document.getElementById('scriptHook');
    if (hookField) hookField.value = template;
  },
  
  useTitleFormula(pattern) {
    const titleField = document.getElementById('scriptTitle');
    if (titleField) titleField.value = pattern;
  },

  useStructure(name) {
    const structure = BODY_STRUCTURES.find(s => s.name === name);
    if (structure) {
      const bodyField = document.getElementById('scriptBody');
      if (bodyField) {
        bodyField.value = `【${structure.name}】\n${structure.pattern}\n\n${bodyField.value}`;
      }
    }
  },

  saveSnapshot(contentId) {
    const content = Store.getContent(contentId);
    if (!content) return;
    if (!content.snaps) content.snaps = [];
    content.snaps.push({
      at: Date.now(),
      title: content.title || '',
      hook: content.hook || '',
      body: content.body || '',
      cta: content.cta || '',
      cover: content.cover || '',
      tags: content.tags || ''
    });
    if (content.snaps.length > 20) content.snaps = content.snaps.slice(-20);
    Store.updateContent(contentId, { snaps: content.snaps });
    this.renderPage('script');
  },

  restoreSnapshot(contentId, index) {
    const content = Store.getContent(contentId);
    if (!content || !content.snaps || !content.snaps[index]) return;
    const snap = content.snaps[index];
    Store.updateContent(contentId, {
      title: snap.title,
      hook: snap.hook,
      body: snap.body,
      cta: snap.cta,
      cover: snap.cover,
      tags: snap.tags
    });
    this.renderPage('script');
  },

  // 拍摄管理
  editShots(contentId) {
    const content = Store.getContent(contentId);
    if (!content) return;
    if (!content.shots || content.shots.length === 0) {
      const shots = autoStoryboard(content, Store.data.settings.standards.wpm);
      Store.updateContent(contentId, { shots });
    }
    this.editingId = contentId;
    this.navigate('shoot');
  },
  
  toggleShot(contentId, shotIndex) {
    const content = Store.getContent(contentId);
    if (!content || !content.shots) return;
    const shot = content.shots[shotIndex];
    shot.done = !shot.done;
    shot.doneAt = shot.done ? Date.now() : null; // FR-06-06：记录打勾时间
    Store.updateContent(contentId, { shots: content.shots });
    if (content.shots.length > 0 && content.shots.every(s => s.done)) {
      this.toast('全部镜头已拍完，可以「进入剪辑」了');
    }
    this.renderPage('shoot');
  },

  // FR-06-02：按文案重建分镜（确认覆盖，手动编辑会丢失）
  rebuildShots(contentId) {
    const content = Store.getContent(contentId);
    if (!content) return;
    const n = (content.shots || []).length;
    if (!confirm(`将按当前文案重新生成分镜，现有 ${n} 个分镜（含手动编辑与打勾记录）会被覆盖。确定重建？`)) return;
    const shots = autoStoryboard(content, Store.data.settings.standards.wpm);
    Store.updateContent(contentId, { shots });
    this.toast(`已重建 ${shots.length} 个分镜`);
    this.renderPage('shoot');
  },

  // FR-06-07：阶段流转链 拍完 → 剪辑 → 排期
  finishShooting(contentId) {
    Store.updateContent(contentId, { editDone: true, editDoneAt: Date.now() });
    this.toast('已标记拍完，进入剪辑阶段');
    this.renderPage('shoot');
  },

  finishEditing(contentId) {
    Store.updateContent(contentId, { stage: 'schedule' });
    this.toast('剪辑完成，已进入发布排期');
    this.navigate('schedule');
  },

  // ═══ 开拍检查清单（FR-06-04：当天有效，次日自动清零）═══
  getShootCheck(content) {
    const today = new Date().toISOString().slice(0, 10);
    let sc = content.shootCheck;
    if (!sc || sc.date !== today) {
      // 次日自动清零：固定项与勾选状态重置，自定义条目保留但取消勾选
      sc = { date: today, fixed: SHOOT_CHECK_FIXED.map(() => false), custom: ((sc && sc.custom) || []).map(c => ({ text: c.text, done: false })) };
    }
    return sc;
  },

  showShootCheckModal(contentId) {
    const content = Store.getContent(contentId);
    if (!content) return;
    const sc = this.getShootCheck(content);
    const canShoot = sc.fixed.every(Boolean) && sc.custom.every(c => c.done);
    this.showModal(`
      <div class="modal-title">开拍清单 · ${escHtml(content.title || '未命名')}</div>
      ${canShoot
        ? '<div style="background:#dcfce7;color:#15803d;padding:10px 14px;border-radius:10px;font-weight:700;margin-bottom:12px">✅ 全部就绪，可以开拍！</div>'
        : '<div class="text-muted text-sm" style="margin-bottom:12px">清单按内容+日期当天有效，次日自动清零；全部勾选显示「可以开拍」。</div>'}
      ${SHOOT_CHECK_FIXED.map((t, i) => `
        <label style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--soft);border-radius:8px;margin-bottom:6px;cursor:pointer">
          <input type="checkbox" ${sc.fixed[i] ? 'checked' : ''} onchange="App.toggleShootCheck('${contentId}','fixed',${i})">
          <span style="font-size:13.5px">${t}</span>
        </label>`).join('')}
      ${sc.custom.map((c, i) => `
        <label style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--soft);border-radius:8px;margin-bottom:6px;cursor:pointer">
          <input type="checkbox" ${c.done ? 'checked' : ''} onchange="App.toggleShootCheck('${contentId}','custom',${i})">
          <span style="font-size:13.5px;flex:1;${c.done ? 'text-decoration:line-through;color:var(--muted)' : ''}">${escHtml(c.text)}</span>
          <a style="color:var(--danger);cursor:pointer;font-weight:700" title="删除该项" onclick="App.delShootCheckItem('${contentId}',${i})">×</a>
        </label>`).join('')}
      <div style="display:flex;gap:8px;margin-top:10px">
        <input id="shootCheckNew" class="form-input" style="flex:1" placeholder="自定义检查项，如：提词器已调试" onkeypress="if(event.key==='Enter')App.addShootCheckItem('${contentId}')">
        <button class="btn btn-sm btn-secondary" onclick="App.addShootCheckItem('${contentId}')">+ 添加</button>
      </div>
      <div style="margin-top:14px;text-align:right"><button class="btn btn-secondary" onclick="App.closeModal()">关闭</button></div>
    `);
  },

  toggleShootCheck(contentId, kind, idx) {
    const content = Store.getContent(contentId);
    if (!content) return;
    const sc = this.getShootCheck(content);
    if (kind === 'fixed' && sc.fixed[idx] !== undefined) sc.fixed[idx] = !sc.fixed[idx];
    else if (kind === 'custom' && sc.custom[idx]) sc.custom[idx].done = !sc.custom[idx].done;
    Store.updateContent(contentId, { shootCheck: sc });
    this.showShootCheckModal(contentId); // 刷新「可以开拍」状态
  },

  addShootCheckItem(contentId) {
    const input = document.getElementById('shootCheckNew');
    const text = (input?.value || '').trim();
    if (!text) return;
    const content = Store.getContent(contentId);
    if (!content) return;
    const sc = this.getShootCheck(content);
    sc.custom.push({ text, done: false });
    Store.updateContent(contentId, { shootCheck: sc });
    this.showShootCheckModal(contentId);
  },

  delShootCheckItem(contentId, idx) {
    const content = Store.getContent(contentId);
    if (!content) return;
    const sc = this.getShootCheck(content);
    sc.custom.splice(idx, 1);
    Store.updateContent(contentId, { shootCheck: sc });
    this.showShootCheckModal(contentId);
  },

  toggleShotGuide() {
    this.shotGuideOpen = !this.shotGuideOpen;
    this.renderPage('shoot');
  },

  // ═══ 封面预览（FR-07-03：画幅示意）═══
  setCoverRatio(r) {
    this.coverRatio = r;
    const box = document.getElementById('coverPreviewBox');
    if (box) {
      box.style.aspectRatio = r.replace(':', '/');
      box.style.width = r === '16:9' ? '250px' : r === '3:4' ? '190px' : '150px';
    }
    const txt = document.getElementById('coverPreviewText');
    if (txt) txt.style.fontSize = r === '16:9' ? '20px' : '24px';
    document.querySelectorAll('.cover-ratio-btn').forEach(b => {
      b.classList.toggle('btn-accent', b.dataset.r === r);
      b.classList.toggle('btn-secondary', b.dataset.r !== r);
    });
  },

  _liveCoverPreview() {
    const t = document.getElementById('coverPreviewText');
    const inp = document.getElementById('scriptCover');
    if (t && inp) t.textContent = inp.value || '（封面大字）';
  },

  // ═══ 发布确认清单（FR-07-04）与 48h 待回填（FR-07-07）═══
  togglePubCheck(contentId, idx, checked) {
    const content = Store.getContent(contentId);
    if (!content) return;
    const arr = PUB_CHECK_ITEMS.map((_, i) => !!(content.pubCheck || [])[i]);
    arr[idx] = !!checked;
    Store.updateContent(contentId, { pubCheck: arr });
  },

  isBackfillOverdue(post) {
    if (!post || post.backfilledAt) return false;
    const t = new Date(post.publishedAt || 0).getTime();
    return t > 0 && (Date.now() - t) > 48 * 3600000;
  },

  // ═══ 全屏提词器（FR-06-05）═══
  // 默认值（PRD 要求开发时定并记录）：速度 1~10 档（步进0.5），每档 24px/s，默认 3 档=72px/s；
  // 滚轮每格 ±0.5 档；字号 24~80px 默认 48；镜像=左右翻转默认关；焦点线=窗口上方 35%；
  // 设置持久化在 settings.teleprompter，退出全屏保留
  openTeleprompter(contentId) {
    const content = Store.getContent(contentId);
    if (!content) return;
    if (this._tp) cancelAnimationFrame(this._tp.raf);
    const realShots = Array.isArray(content.shots) && content.shots.length > 0;
    const wpm = Store.data.settings.standards.wpm || 240;
    const durOf = txt => Math.max(1, Math.round((txt || '').length / (wpm / 60)));
    const shots = realShots ? content.shots : [
      { scene: '特写', lines: content.hook || '', duration: durOf(content.hook) },
      { scene: '中景', lines: content.body || '', duration: durOf(content.body) },
      { scene: '近景', lines: content.cta || '', duration: durOf(content.cta) }
    ].filter(s => s.lines && s.lines.trim());
    if (!shots.length) { this.toast('这条内容还没有可提词的文案'); return; }

    const saved = Store.data.settings.teleprompter || {};
    this._tp = {
      contentId, shots, realShots,
      offset: 0, playing: true, lastTs: 0, raf: 0,
      activeIdx: -1, maxOffset: 0,
      speed: Number(saved.speed) || 3,
      fontSize: Number(saved.fontSize) || 48,
      mirror: !!saved.mirror
    };

    document.getElementById('tpTitle').textContent = `提词器 · ${content.title || '未命名'}`;
    document.getElementById('teleprompterText').innerHTML = shots.map((s, i) => `
      <div class="tp-shot${s.done ? ' done' : ''}" id="tpShot_${i}">
        <div class="tp-shot-tag">
          <span>#${i + 1} · ${escHtml(s.scene || '')} · ${s.duration || 1}s</span>
          ${realShots ? `<span class="tp-shot-check" onclick="App.tpToggleShot(${i})">${s.done ? '✓ 已拍' : '○ 拍完打勾'}</span>` : ''}
        </div>
        <div class="tp-shot-lines">${escHtml(s.lines || '')}</div>
      </div>
    `).join('');
    document.getElementById('tpSpeed').value = this._tp.speed;
    document.getElementById('tpSpeedVal').textContent = this._tp.speed;
    document.getElementById('tpFont').value = this._tp.fontSize;
    document.getElementById('tpFontVal').textContent = this._tp.fontSize;
    document.getElementById('tpMirrorBtn').classList.toggle('on', this._tp.mirror);
    document.getElementById('teleprompter').classList.toggle('tp-mirror', this._tp.mirror);
    document.getElementById('teleprompter').classList.add('active');

    const box = document.getElementById('tpContent');
    box.removeEventListener('wheel', this._tpWheelHandler);
    box.addEventListener('wheel', this._tpWheelHandler, { passive: false });
    this._tpApplyFont();
    this._tpMeasure();
    this._tpApplyOffset();
    this._tpUpdatePlayBtn();
    this._tp.raf = requestAnimationFrame(ts => this._tpTick(ts));
  },

  _tpTick(ts) {
    const t = this._tp;
    if (!t) return;
    if (!t.lastTs) t.lastTs = ts;
    const dt = Math.max(0, Math.min((ts - t.lastTs) / 1000, 0.1));
    t.lastTs = ts;
    if (t.playing) {
      t.offset = Math.min(t.offset + t.speed * 24 * dt, t.maxOffset);
      if (t.maxOffset > 0 && t.offset >= t.maxOffset) {
        t.playing = false; // 滚到结尾自动停
        this._tpUpdatePlayBtn();
      }
      this._tpApplyOffset();
    }
    t.raf = requestAnimationFrame(next => this._tpTick(next));
  },

  _tpApplyOffset() {
    const t = this._tp;
    if (!t) return;
    document.getElementById('tpScroll').style.transform = `translateY(${-t.offset}px)`;
    // 焦点线（窗口上方 35%）所在的镜头即当前镜，高亮并更新进度
    const box = document.getElementById('tpContent');
    const focusY = box.getBoundingClientRect().top + box.clientHeight * 0.35;
    let idx = -1;
    t.shots.forEach((s, i) => {
      const el = document.getElementById('tpShot_' + i);
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (r.top <= focusY && r.bottom > focusY) idx = i;
    });
    if (idx !== t.activeIdx) {
      t.activeIdx = idx;
      t.shots.forEach((s, i) => {
        const el = document.getElementById('tpShot_' + i);
        if (el) el.classList.toggle('active', i === idx);
      });
      document.getElementById('tpFooter').textContent =
        (idx >= 0 ? `第 ${idx + 1}/${t.shots.length} 镜` : '即将开始') +
        ' ｜ 空格 暂停/继续 · 滚轮 调速 · Esc 退出';
    }
  },

  _tpMeasure() {
    const t = this._tp;
    if (!t) return;
    const box = document.getElementById('tpContent');
    const textH = document.getElementById('teleprompterText').offsetHeight;
    t.maxOffset = Math.max(0, textH - box.clientHeight * 0.35);
  },

  _tpApplyFont() {
    const t = this._tp;
    if (!t) return;
    document.getElementById('teleprompterText').style.fontSize = t.fontSize + 'px';
    this._tpMeasure();
  },

  _tpPersist() {
    const t = this._tp;
    if (!t) return;
    Store.data.settings.teleprompter = { speed: t.speed, fontSize: t.fontSize, mirror: t.mirror };
    Store.save();
  },

  _tpUpdatePlayBtn() {
    const t = this._tp;
    if (!t) return;
    document.getElementById('tpPlayBtn').textContent = t.playing ? '⏸ 暂停' : '▶ 继续';
  },

  _tpWheelHandler(e) {
    if (!App._tp) return;
    e.preventDefault();
    App.tpSetSpeed(App._tp.speed + (e.deltaY < 0 ? 0.5 : -0.5)); // 滚轮微调速度
  },

  tpSetSpeed(v) {
    const t = this._tp;
    if (!t) return;
    t.speed = Math.min(10, Math.max(1, Number(v) || 3));
    document.getElementById('tpSpeed').value = t.speed;
    document.getElementById('tpSpeedVal').textContent = t.speed;
    if (!t.playing && t.offset >= t.maxOffset && t.maxOffset > 0) {
      t.playing = true; // 结尾处调速即继续
      this._tpUpdatePlayBtn();
    }
    this._tpPersist();
  },

  tpSetFont(v) {
    const t = this._tp;
    if (!t) return;
    t.fontSize = Math.min(80, Math.max(24, Number(v) || 48));
    document.getElementById('tpFontVal').textContent = t.fontSize;
    this._tpApplyFont();
    this._tpApplyOffset();
    this._tpPersist();
  },

  tpToggleMirror() {
    const t = this._tp;
    if (!t) return;
    t.mirror = !t.mirror;
    document.getElementById('tpMirrorBtn').classList.toggle('on', t.mirror);
    document.getElementById('teleprompter').classList.toggle('tp-mirror', t.mirror);
    this._tpPersist();
  },

  tpTogglePause() {
    const t = this._tp;
    if (!t) return;
    if (!t.playing && t.offset >= t.maxOffset && t.maxOffset > 0) t.offset = 0; // 结尾再按 = 从头再来
    t.playing = !t.playing;
    this._tpUpdatePlayBtn();
  },

  tpToggleShot(idx) {
    const t = this._tp;
    if (!t || !t.realShots) return;
    const content = Store.getContent(t.contentId);
    if (!content || !content.shots || !content.shots[idx]) return;
    const shot = content.shots[idx];
    shot.done = !shot.done;
    shot.doneAt = shot.done ? Date.now() : null;
    Store.updateContent(t.contentId, { shots: content.shots });
    const el = document.getElementById('tpShot_' + idx);
    if (el) {
      el.classList.toggle('done', shot.done);
      const check = el.querySelector('.tp-shot-check');
      if (check) check.textContent = shot.done ? '✓ 已拍' : '○ 拍完打勾';
    }
  },
  
  // 排期管理
  markPublished(contentId) {
    const content = Store.getContent(contentId);
    if (!content) return;
    const targetAccounts = content.targetAccounts || [];
    if (targetAccounts.length === 0) {
      alert('尚未设置目标账号。请点击「编辑」在稿件弹窗中勾选目标账号后再标记发布。');
      return;
    }
    // FR-07-04：发布确认清单未全勾时需确认跳过
    if (!PUB_CHECK_ITEMS.every((_, i) => (content.pubCheck || [])[i])) {
      if (!confirm('发布确认清单未全部勾选（封面水印/错别字/赛道标签/发布时间），确认跳过检查直接标记？')) return;
    }
    // FR-07-06：幂等——已有发布记录的账号跳过
    const existing = new Set(Store.data.posts.filter(p => p.contentId === contentId).map(p => p.accountId));
    const newAccIds = targetAccounts.filter(id => !existing.has(id));
    if (newAccIds.length === 0) {
      alert('所有目标账号均已生成发布记录，无需重复标记。');
      Store.updateContent(contentId, { stage: 'published' });
      this.renderPage('schedule');
      return;
    }
    const skipped = targetAccounts.length - newAccIds.length;
    const msg = `将为 ${newAccIds.length} 个账号生成待回填发布记录${skipped > 0 ? `（${skipped} 个账号已有记录，自动跳过）` : ''}。\n\n请先到各平台后台完成发布，再回来标记。确认已发布？`;
    if (!confirm(msg)) return;
    const publishedAt = (content.scheduledAt || new Date().toISOString().slice(0, 10)) + 'T' + (content.scheduledTime || '19:30');
    newAccIds.forEach(accId => {
      Store.addPost({ contentId, accountId: accId, publishedAt, backfilledAt: null });
    });
    Store.updateContent(contentId, { stage: 'published' });
    this.renderPage('schedule');
    this.toast(`✓ 已生成 ${newAccIds.length} 条待回填记录`);
  },
  
  // 数据回填
  showBackfillModal() {
    const posts = Store.data.posts.filter(p => p.publishedAt && !p.backfilledAt);
    const numInput = (pid, field, label, val, step) => `<input type="number" ${step ? `step="${step}"` : ''} class="form-input" placeholder="${label}" value="${val || ''}" onchange="Store.updatePost('${pid}',{${field}:${field === 'fiveSecRate' ? 'parseFloat(this.value)||null' : 'parseInt(this.value)||0'}});Store.save()">`;
    this.showModal(`
      <div class="modal-title">回填数据</div>
      <div style="margin-bottom:16px">
        <button class="btn btn-sm btn-secondary" onclick="App.showPasteBackfill()">📋 粘贴回填</button>
        <button class="btn btn-sm btn-secondary" onclick="App.exportWeeklyReport()">📄 导出周报</button>
      </div>
      <div style="max-height:400px;overflow-y:auto">
        ${posts.length === 0 ? '<div class="text-muted text-sm">暂无待回填记录</div>' : posts.map(p => {
          const content = Store.getContent(p.contentId);
          const account = Store.data.accounts.find(a => a.id === p.accountId);
          return `<div style="padding:12px;border-bottom:1px solid var(--line)">
            <div style="font-weight:600;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center">
              <span>${escHtml(content?.title || '未命名')} - ${account?.name || '未知'}</span>
              <button class="btn btn-sm btn-secondary" style="color:var(--danger)" onclick="App.deletePostConfirm('${p.id}')">删除记录</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
              ${numInput(p.id, 'play', '播放', p.play)}
              ${numInput(p.id, 'likes', '点赞', p.likes)}
              ${numInput(p.id, 'favorite', '收藏', p.favorite)}
              ${numInput(p.id, 'comment', '评论', p.comment)}
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px">
              ${numInput(p.id, 'fiveSecRate', '5秒完播%', p.fiveSecRate, '0.1')}
              ${numInput(p.id, 'share', '转发', p.share)}
              ${numInput(p.id, 'gain', '涨粉', p.gain)}
            </div>
            <button class="btn btn-sm btn-accent" style="margin-top:8px" onclick="Store.updatePost('${p.id}',{backfilledAt:Date.now()});Store.save();App.showBackfillModal()">标记已回填</button>
          </div>`;
        }).join('')}
      </div>
      <div style="margin-top:16px"><button class="btn btn-secondary" onclick="App.closeModal()">关闭</button></div>
    `);
  },

  // FR-08-10：删除发布记录（二次确认）
  deletePostConfirm(postId) {
    if (!confirm('确定删除这条发布记录？删除后相关图表口径将重算，不可恢复。')) return;
    Store.deletePost(postId);
    this.showBackfillModal();
  },

  showPasteBackfill() {
    this.showModal(`
      <div class="modal-title">粘贴回填</div>
      <div class="form-group">
        <label class="form-label">粘贴数据</label>
        <textarea class="form-textarea" id="pasteData" rows="8" placeholder="从平台后台复制数据粘贴到这里&#10;格式：播放 点赞 收藏 评论&#10;例如：12000 850 320 45"></textarea>
        <div class="text-xs text-muted" style="margin-top:4px">支持格式：空格/Tab/逗号分隔，支持"1.2万"格式</div>
      </div>
      <div style="display:flex;gap:8px;margin-top:20px">
        <button class="btn btn-primary" onclick="App.processPasteBackfill()">解析并填入</button>
        <button class="btn btn-secondary" onclick="App.showBackfillModal()">返回</button>
      </div>
    `);
  },

  processPasteBackfill() {
    const text = document.getElementById('pasteData').value.trim();
    if (!text) { alert('请粘贴数据'); return; }

    // Parse numbers from text
    const numbers = text.split(/[\s,，\t]+/).filter(s => s).map(s => parseNumber(s));

    if (numbers.length < 4) {
      alert('数据不足，至少需要：播放 点赞 收藏 评论');
      return;
    }

    // Find first non-backfilled post
    const post = Store.data.posts.find(p => p.publishedAt && !p.backfilledAt);
    if (!post) {
      alert('没有待回填的记录');
      return;
    }

    Store.updatePost(post.id, {
      play: numbers[0] || 0,
      likes: numbers[1] || 0,
      favorite: numbers[2] || 0,
      comment: numbers[3] || 0,
      fiveSecRate: numbers[4] || null,
      duration: numbers[5] || null,
      backfilledAt: Date.now()
    });
    Store.save();

    alert('已填入并标记为已回填');
    this.showBackfillModal();
  },

  exportWeeklyReport() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000);

    const posts = Store.data.posts.filter(p => p.publishedAt && new Date(p.publishedAt) >= weekAgo);
    const contents = Store.data.contents.filter(c => new Date(c.createdAt) >= weekAgo);

    const totalPlay = posts.reduce((s, p) => s + (p.play || 0), 0);
    const totalLikes = posts.reduce((s, p) => s + (p.likes || 0), 0);
    const totalFav = posts.reduce((s, p) => s + (p.favorite || 0), 0);
    const totalComment = posts.reduce((s, p) => s + (p.comment || 0), 0);

    const ips = Store.data.ips;

    let report = `# 周报 · ${now.toLocaleDateString('zh-CN', {year:'numeric',month:'long',day:'numeric'})}\n\n`;
    report += `## 本周概览\n\n`;
    report += `- 发布数量：**${posts.length}** 条\n`;
    report += `- 新建内容：**${contents.length}** 条\n`;
    report += `- 总播放：**${formatNumber(totalPlay)}**\n`;
    report += `- 总点赞：**${formatNumber(totalLikes)}**\n`;
    report += `- 总收藏：**${formatNumber(totalFav)}**\n`;
    report += `- 总评论：**${formatNumber(totalComment)}**\n\n`;

    if (ips.length > 0) {
      report += `## 各IP表现\n\n`;
      ips.forEach(ip => {
        const ipAccounts = Store.getAccountsByIP(ip.id);
        const ipPosts = posts.filter(p => ipAccounts.some(a => a.id === p.accountId));
        if (ipPosts.length > 0) {
          const ipPlay = ipPosts.reduce((s, p) => s + (p.play || 0), 0);
          report += `### ${ip.avatar} ${ip.name}\n`;
          report += `- 发布：${ipPosts.length} 条\n`;
          report += `- 播放：${formatNumber(ipPlay)}\n\n`;
        }
      });
    }

    report += `## 发布明细\n\n`;
    report += `| 内容 | 账号 | 播放 | 点赞 | 收藏 | 评论 |\n`;
    report += `|------|------|------|------|------|------|\n`;
    posts.forEach(p => {
      const content = Store.getContent(p.contentId);
      const account = Store.data.accounts.find(a => a.id === p.accountId);
      report += `| ${content?.title || '-'} | ${account?.name || '-'} | ${p.play || 0} | ${p.likes || 0} | ${p.favorite || 0} | ${p.comment || 0} |\n`;
    });

    report += `\n---\n*由内容指挥部生成*\n`;

    // Download as markdown
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `周报-${now.toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);

    this.closeModal();
  },
  
  // AI助手
  newChat() {
    const chats = Store.data.settings.ai.chats || [];
    const newChat = { id: Store.genId('chat'), title: '新对话', messages: [], createdAt: Date.now() };
    chats.unshift(newChat);
    Store.data.settings.ai.chats = chats;
    Store.save();
    this.currentChatId = newChat.id;
    this.renderPage('ai');
  },
  
  // FR-09-04：模板生成完整提示词（填空后发送），need 字段做必选参数校验
  useAITemplate(templateName) {
    const tpl = AI_TEMPLATES.find(t => t.name === templateName);
    if (!tpl) return;
    if (tpl.need === 'posts' && Store.data.posts.length === 0) {
      this.toast('该模板需要回填数据：请先到「数据复盘」回填发布记录');
      return;
    }
    if (tpl.need === 'bench' && Store.data.benchmarks.length === 0) {
      this.toast('该模板需要对标账号：请先到「对标拆解」添加');
      return;
    }
    const input = document.getElementById('aiInput');
    if (!input) return;
    input.value = this.buildAIPrompt(tpl);
    input.focus();
  },

  buildAIPrompt(tpl) {
    const ip = this.currentIp ? Store.getIP(this.currentIp) : null;
    const ipInfo = ip
      ? `名称「${ip.name}」，赛道「${ip.track || '未设置'}」，人设「${ip.persona || '未设置'}」，观众「${ip.audience || '未设置'}」`
      : '（未选择 IP，请在提示词中补充你的定位）';
    const recent = Store.getContentsByIP(this.currentIp).slice(0, 5).map(c => `《${c.title || '未命名'}》`).join('、') || '（暂无）';
    let out = tpl.prompt.replace(/\{IP_INFO\}/g, ipInfo).replace(/\{RECENT\}/g, recent);
    if (tpl.need === 'posts') out = out.replace(/\{DATA\}/g, this.getPostsSummary());
    return out;
  },

  // 回填数据摘要（30 天内，供周复盘/账号对比模板注入）
  getPostsSummary() {
    const monthAgo = Date.now() - 30 * 86400000;
    const posts = Store.data.posts.filter(p => (p.publishedAt || 0) >= monthAgo);
    if (!posts.length) return '（30 天内无发布记录）';
    return JSON.stringify(posts.slice(-40).map(p => {
      const c = Store.getContent(p.contentId);
      return {
        标题: c?.title || '', 发布: p.publishedAt ? new Date(p.publishedAt).toISOString().slice(0, 10) : '',
        播放: p.play || 0, 点赞: p.likes || 0, 收藏: p.favorite || 0, 评论: p.comment || 0, 涨粉: p.gainFans || 0
      };
    }));
  },

  _aiHost() {
    try { return new URL(Store.data.settings.ai.baseUrl).host; } catch (e) { return '未配置地址'; }
  },

  // FR-09-05：AI 结果回填到稿件字段
  showAIBackfill(msgIdx) {
    const chats = Store.data.settings.ai.chats || [];
    const chat = chats.find(c => c.id === (this.currentChatId || chats[0]?.id));
    const msg = chat?.messages?.[msgIdx];
    if (!msg || !msg.content) return;
    const drafts = Store.data.contents.filter(c => ['topic', 'draft', 'shoot'].includes(c.stage)).slice(0, 20);
    if (!drafts.length) { this.toast('暂无稿件：先到选题池「立项写稿」'); return; }
    const fieldBtn = (cid, idx, field, label) => `<button class="btn btn-sm btn-secondary" onclick="App.backfillAI('${cid}',${idx},'${field}')">${label}</button>`;
    this.showModal(`
      <div class="modal-title">回填 AI 结果到稿件</div>
      <p class="text-muted text-sm" style="margin-bottom:10px">将把这条 AI 回复填入所选字段；字段已有内容时会追加在末尾，不会覆盖。</p>
      <div style="display:flex;flex-direction:column;gap:8px;max-height:50vh;overflow:auto">
        ${drafts.map(c => `
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;background:var(--soft);border-radius:8px;flex-wrap:wrap">
            <span style="font-size:13px;font-weight:600">${escHtml(c.title || '未命名')}</span>
            <span style="display:flex;gap:4px">
              ${fieldBtn(c.id, msgIdx, 'title', '标题')}
              ${fieldBtn(c.id, msgIdx, 'hook', '开头')}
              ${fieldBtn(c.id, msgIdx, 'body', '正文')}
              ${fieldBtn(c.id, msgIdx, 'cta', '结尾')}
            </span>
          </div>`).join('')}
      </div>
      <div style="margin-top:14px;text-align:right"><button class="btn btn-secondary" onclick="App.closeModal()">关闭</button></div>
    `);
  },

  backfillAI(contentId, msgIdx, field) {
    const chats = Store.data.settings.ai.chats || [];
    const chat = chats.find(c => c.id === (this.currentChatId || chats[0]?.id));
    const text = (chat?.messages?.[msgIdx]?.content || '').trim();
    const content = Store.getContent(contentId);
    if (!content || !text) return;
    const labels = { title: '标题', hook: '开头', body: '正文', cta: '结尾' };
    const merged = content[field] ? content[field] + '\n\n' + text : text;
    Store.updateContent(contentId, { [field]: merged });
    this.closeModal();
    this.toast(`已回填到「${content.title || '未命名'}」的${labels[field]}`);
  },

  // FR-09-02：服务商预设下拉
  applyAIProvider(key) {
    const ai = Store.data.settings.ai;
    ai.provider = key;
    const p = AI_PROVIDERS.find(x => x.key === key);
    if (p && p.baseUrl) {
      ai.baseUrl = p.baseUrl;
      if (p.models.length && !/填入/.test(p.models[0])) ai.model = p.models[0];
    }
    Store.save();
    this.renderPage('settings');
    if (p && p.local) this.toast('Ollama 为本机服务：免 Key；若跨域报错，需以 OLLAMA_ORIGINS=* 启动');
  },

  // FR-09-01/10-04：测试连接（最小请求，非流式）
  async testAIConnection() {
    const ai = Store.data.settings.ai;
    if (!ai.baseUrl || !/^https?:\/\//i.test(ai.baseUrl)) {
      this.toast('请先填写 http(s) 开头的 API 地址');
      return;
    }
    const isLocal = /localhost|127\.0\.0\.1/.test(ai.baseUrl);
    if (!ai.apiKey && !isLocal) {
      this.toast('请先填 API Key（Ollama 本地地址可免 Key）');
      return;
    }
    this.toast('测试中…');
    try {
      const resp = await fetch(ai.baseUrl.replace(/\/+$/, '') + '/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(ai.apiKey ? { 'Authorization': 'Bearer ' + ai.apiKey } : {}) },
        body: JSON.stringify({ model: ai.model || 'gpt-4o-mini', messages: [{ role: 'user', content: '只回复两个字：成功' }], max_tokens: 200, stream: false })
      });
      if (!resp.ok) {
        this.showModal(this.buildAIErrorModal(resp.status, ''));
        return;
      }
      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content || '';
      this.toast(`✅ 连接成功，模型回复：${text.slice(0, 24) || '（空回复，检查模型名）'}`);
    } catch (e) {
      this.showModal(this.buildAIErrorModal(0, String(e && e.message || e)));
    }
  },

  // FR-09-09：连接失败分类引导（错误可读、不暴露堆栈）
  buildAIErrorModal(status, rawMsg) {
    let title, reason, extra = '';
    if (status === 401 || status === 403) {
      title = 'Key 无效或无权限'; reason = '服务商返回 ' + status + '：API Key 填错、未生效，或没有该模型权限。';
    } else if (status === 404) {
      title = '地址或模型名不对'; reason = '服务商返回 404：检查 Base URL 是否带 /v1、模型 ID 是否拼写正确（豆包需填接入点 ID）。';
    } else if (status === 429) {
      title = '限流或额度不足'; reason = '服务商返回 429：余额不足或请求过快，稍后重试。';
    } else if (status === 0) {
      title = '连不上（多为浏览器跨域）'; reason = '请求没有到达服务器（浏览器拦截）。原始信息：' + escHtml(rawMsg.slice(0, 80));
      extra = `
        <p style="margin:8px 0"><strong>三条解决路径：</strong></p>
        <p>① 换支持浏览器直连的服务商（或在服务商控制台开启跨域允许）；</p>
        <p>② 用本地 Ollama：以 <code>OLLAMA_ORIGINS=*</code> 启动后选「Ollama 本地」预设；</p>
        <p>③ 自建中转：把 Base URL 指向你自己的转发服务（产品不捆绑任何代理）。</p>`;
    } else {
      title = '连接失败'; reason = 'HTTP ' + status + (rawMsg ? '：' + escHtml(rawMsg.slice(0, 80)) : '');
    }
    return `
      <div class="modal-title">❌ 测试连接失败：${title}</div>
      <div style="font-size:13.5px;line-height:1.9">
        <p>${reason}</p>
        ${extra}
        <p style="margin-top:10px;color:var(--muted)">排查顺序：地址 → Key → 模型名 → 网络/跨域。</p>
      </div>
      <div style="margin-top:14px;text-align:right"><button class="btn btn-secondary" onclick="App.closeModal()">知道了</button></div>
    `;
  },
  
  async sendAIMessage() {
    const input = document.getElementById('aiInput');
    if (!input || !input.value.trim()) return;
    const message = input.value.trim();
    const settings = Store.data.settings.ai;
    if (!this.currentChatId) this.newChat();
    const chats = settings.chats || [];
    const chat = chats.find(c => c.id === this.currentChatId);
    if (!chat) return;
    chat.messages.push({ role: 'user', content: message, timestamp: Date.now() });
    if (chat.messages.length === 1) chat.title = message.slice(0, 20) + (message.length > 20 ? '...' : '');
    input.value = '';
    this.renderPage('ai');
    
    if (settings.apiKey && settings.baseUrl) {
      try {
        const ip = this.currentIp ? Store.getIP(this.currentIp) : null;
        const sys = '你是短视频口播创作专家，回答要具体、可执行、口语化。' +
          (ip ? `当前IP：「${ip.name}」，赛道「${ip.track || '未设置'}」，人设「${ip.persona || '未设置'}」，观众「${ip.audience || '未设置'}」。` : '');
        const response = await fetch(settings.baseUrl.replace(/\/+$/, '') + '/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${settings.apiKey}` },
          body: JSON.stringify({
            model: settings.model || 'gpt-4o-mini',
            messages: [{ role: 'system', content: sys }, ...chat.messages.map(m => ({ role: m.role, content: m.content }))],
            stream: true,
            temperature: Number(settings.temperature != null ? settings.temperature : 0.7)
          })
        });
        if (!response.ok) {
          const guide = (response.status === 401 || response.status === 403) ? 'Key 无效或无权限（HTTP ' + response.status + '）'
            : response.status === 404 ? '地址或模型名不对（HTTP 404，检查 /v1 与模型 ID）'
            : response.status === 429 ? '限流或额度不足（HTTP 429）'
            : 'HTTP ' + response.status;
          throw new Error(guide);
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = '';
        chat.messages.push({ role: 'assistant', content: '', timestamp: Date.now() });
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
          for (const line of lines) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content || '';
              assistantMessage += delta;
              chat.messages[chat.messages.length - 1].content = assistantMessage;
              this.renderPage('ai');
            } catch (e) {}
          }
        }
        Store.save();
      } catch (e) {
        const msg = String(e && e.message || e);
        const isNet = /Failed to fetch|NetworkError|Load failed/i.test(msg);
        const text = isNet
          ? '❌ 连接失败：请求没有到达服务器，多为浏览器跨域（CORS）限制。\n\n三条解决路径：\n① 换支持浏览器直连的服务商；\n② 本地 Ollama（以 OLLAMA_ORIGINS=* 启动）；\n③ 自建中转。\n\n到 设置 → AI 接口配置 → 「测试连接」可查看详细分类引导。'
          : `❌ 请求失败：${msg}`;
        chat.messages.push({ role: 'assistant', content: text, timestamp: Date.now() });
        Store.save();
        this.renderPage('ai');
      }
    } else {
      // No AI configured, show prompt template
      const prompt = this.generatePromptTemplate(message);
      chat.messages.push({
        role: 'assistant',
        content: `**未配置 AI 接口**\n\n以下是为你生成的提示词，可以复制到任意 AI 工具使用：\n\n---\n\n${prompt}\n\n---\n\n💡 在设置中配置 AI 接口后可直接对话`,
        timestamp: Date.now()
      });
      Store.save();
      this.renderPage('ai');
    }
  },

  generatePromptTemplate(userMessage) {
    const ip = this.currentIp ? Store.getIP(this.currentIp) : null;
    const recentContents = Store.getContentsByIP(this.currentIp).slice(0, 5);

    return `你是一个短视频内容创作专家。

${ip ? `当前IP信息：
- 名称：${ip.name}
- 赛道：${ip.track || '未设置'}
- 人设：${ip.persona || '未设置'}
- 目标观众：${ip.audience || '未设置'}` : ''}

${recentContents.length > 0 ? `最近的内容：
${recentContents.map(c => `- ${c.title}`).join('\n')}` : ''}

用户问题：${userMessage}

请给出专业、实用的建议。`;
  },
  
  // 工具方法
  // FR-01-04：全部平台 = 内置清单 + 自定义追加
  getAllPlatforms() {
    const s = Store.data.settings;
    const base = (s.platforms && s.platforms.length) ? s.platforms : DEFAULT_PLATFORMS;
    return base.concat(s.customPlatforms || []);
  },

  getCreatorUrl(platformKey) {
    const custom = (Store.data.settings.customPlatforms || []).find(p => p.key === platformKey);
    if (custom) return custom.creatorUrl || '';
    return PLATFORM_CREATOR_URLS[platformKey] || '';
  },

  getPlatformName(key) {
    const plat = this.getAllPlatforms().find(p => p.key === key);
    return plat?.name || key;
  },

  clearData() {
    if (!confirm('确定清空全部业务数据（IP/账号/内容/发布记录）？\n\n将保留：主理人信息、主题、数据标准与 AI 设置。\n注意：清空不等于清除 AI Key，如需清除请到 AI 接口配置中删除。\n此操作不可恢复，建议先导出备份！')) return;
    Store.resetBusinessData();
    this.currentIp = null;
    location.reload();
  },

  loadTheme() {
    const theme = Store.data.settings.theme || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('themeToggle').textContent = theme === 'dark' ? '☀️' : '🌙';
  },

  toggleTheme() {
    const current = Store.data.settings.theme || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    Store.data.settings.theme = next;
    Store.save();
    document.documentElement.setAttribute('data-theme', next);
    document.getElementById('themeToggle').textContent = next === 'dark' ? '☀️' : '🌙';
  },

  showModal(content) {
    document.getElementById('modal').innerHTML = content;
    document.getElementById('modalOverlay').classList.add('active');
  },

  closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
  },

  closeTeleprompter() {
    const t = this._tp;
    if (t) {
      cancelAnimationFrame(t.raf);
      document.getElementById('tpContent').removeEventListener('wheel', this._tpWheelHandler);
      this._tp = null;
    }
    document.getElementById('teleprompter').classList.remove('active', 'tp-mirror');
    if (this.currentPage === 'shoot') this.renderPage('shoot'); // 同步打勾状态
  },

  loadSampleData() {
    if (!confirm('载入示例数据将覆盖当前数据，确定继续？')) return;
    Store.reset();

    const ip1 = Store.addIP({ name: '效率进化论', track: '效率', persona: '帮你用更少时间做更多事', audience: '25-35岁职场人', avatar: '🚀', color: '#3b82f6' });
    const ip2 = Store.addIP({ name: '味蕾实验室', track: '美食', persona: '用科学方法做好每顿饭', audience: '爱做饭的年轻人', avatar: '🍳', color: '#ef4444' });
    const ip3 = Store.addIP({ name: '读书笔记', track: '读书', persona: '把书读薄，把知识用厚', audience: '想养成阅读习惯的人', avatar: '📚', color: '#22c55e' });

    Store.addAccount({ ipId: ip1.id, platform: 'douyin', name: '效率进化论', followers: 12000, weekGain: 500 });
    Store.addAccount({ ipId: ip1.id, platform: 'xiaohongshu', name: '效率笔记', followers: 8000, weekGain: 300 });
    Store.addAccount({ ipId: ip2.id, platform: 'douyin', name: '味蕾实验室', followers: 25000, weekGain: 1200 });
    Store.addAccount({ ipId: ip3.id, platform: 'xiaohongshu', name: '读书小记', followers: 5000, weekGain: 200 });

    Store.addTopic({ title: '早起打卡30天的变化', ipId: ip1.id, source: 'manual', scores: { pain: 4, useful: 5, debate: 3, suspense: 4, track: 5 }, status: 'doing' });
    Store.addTopic({ title: '5分钟早餐合集', ipId: ip2.id, source: 'manual', scores: { pain: 5, useful: 5, debate: 2, suspense: 3, track: 5 }, status: 'pool' });
    Store.addTopic({ title: '原子习惯读书笔记', ipId: ip3.id, source: 'bench', scores: { pain: 3, useful: 5, debate: 3, suspense: 4, track: 5 }, status: 'pool' });

    Store.addContent({ ipId: ip1.id, title: '早起打卡30天，我的生活发生了什么变化', stage: 'draft', hook: '坚持早起30天后，我发现了一个惊人的变化...', body: '不是体重减轻了，也不是皮肤变好了，而是...', cta: '你也试试？评论区打卡', cover: '30天早起挑战', tags: '早起,自律,效率' });

    Store.addHot({ title: '世界读书日', source: '营销节点', heat: '高', trend: '升', ipIds: [ip3.id], remark: '4月23日' });

    const bench1 = Store.addBenchmark({ name: '效率工具派', platform: 'xiaohongshu', level: '同量级', ipId: ip1.id, followers: 15000 });
    Store.addBenchWork({ benchId: bench1.id, title: '这个时间管理方法改变了我的工作效率', likes: 2500, comment: 180, favorite: 800, share: 120, content: '今天分享一个让我效率翻倍的方法...\n\n第一步...\n第二步...\n第三步...\n\n你试过吗？' });

    Store.save();
    alert('示例数据已载入');
    location.reload();
  },

  exportData() {
    const data = Store.export();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `内容指挥部-备份-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (Store.import(e.target.result)) {
        alert('导入成功');
        location.reload();
      } else {
        alert('导入失败，请检查文件格式');
      }
    };
    reader.readAsText(file);
  },

  showIPSwitcher() {
    const ips = Store.data.ips;
    const options = [
      { id: null, name: '全部 IP', avatar: '🌐' },
      ...ips
    ];
    this.showModal(`
      <div class="modal-title">切换 IP</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${options.map(ip => `
          <div class="nav-item ${this.currentIp === ip.id ? 'active' : ''}"
               onclick="App.currentIp=${ip.id ? `'${ip.id}'` : 'null'};Store.data.ui.currentIp=${ip.id ? `'${ip.id}'` : 'null'};Store.save();document.getElementById('currentIpName').textContent='${escAttr(ip.name)}';App.closeModal();App.renderPage(App.currentPage)">
            <span style="font-size:18px">${ip.avatar || '🌐'}</span>
            <span>${escHtml(ip.name)}</span>
          </div>
        `).join('')}
      </div>
    `);
  }
};

// 初始化
document.addEventListener('DOMContentLoaded', () => App.init());
