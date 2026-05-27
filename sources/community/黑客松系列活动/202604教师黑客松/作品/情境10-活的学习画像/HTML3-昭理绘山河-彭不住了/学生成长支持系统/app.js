const STORAGE_KEY = "teacher-growth-support-prototype-v1";
const CONTEXT_KEY = "teacher-growth-support-context-v1";

const PAGE_META = {
  home: {
    file: "index.html",
    title: "学生成长支持系统",
    eyebrow: "产品入口",
    description: "从证据进入、画像更新，到教师行动与效果回填，把教师日常使用的成长支持流程落成可演示、可继续生长的多页面工作台原型。",
  },
  "class-overview": {
    file: "class-overview.html",
    title: "班级总览",
    eyebrow: "教师日用首页",
    description: "优先看到谁需要关注、为什么需要关注，以及今天最值得处理的共性问题。",
  },
  observations: {
    file: "observations.html",
    title: "观察记录",
    eyebrow: "证据入口",
    description: "把课堂观察、作业样本和低负担证据统一收进系统，作为后续判断和干预的起点。",
  },
  "student-profile": {
    file: "student-profile.html",
    title: "单个学生画像",
    eyebrow: "学生核心页",
    description: "把当前快照、核心判断、成长轨迹、证据、建议和教师记录入口放在同一个决策界面里。",
  },
  "class-analysis": {
    file: "class-analysis.html",
    title: "班级问题分析",
    eyebrow: "备课支持",
    description: "从共性卡点、重复错误和示范对象出发，反推下一次课堂设计与分层支持。",
  },
  interventions: {
    file: "interventions.html",
    title: "干预记录",
    eyebrow: "行动与回填",
    description: "记录老师做了什么、针对谁、为什么做、结果怎样，让系统知道什么方法正在起效。",
  },
  reports: {
    file: "reports.html",
    title: "周报月报",
    eyebrow: "自动总结",
    description: "把一周证据压缩成班级状态、重点学生、共性问题与下周建议，支持教师复盘与持续跟进。",
  },
  "self-assessment": {
    file: "self-assessment.html",
    title: "学习认知偏好自评",
    eyebrow: "学生自评入口",
    description: "保留四维问答结构，但结果只作为当前倾向证据，不写成固定类型或能力结论。",
  },
};

const NAV_ORDER = ["home", "class-overview", "observations", "student-profile", "class-analysis", "interventions", "reports", "self-assessment"];

let state = loadState();
let context = loadContext();
let ui = { modal: null };

document.addEventListener("DOMContentLoaded", init);
document.addEventListener("click", handleClick);
document.addEventListener("change", handleChange);
document.addEventListener("submit", handleSubmit);

function init() {
  syncContextFromUrl();
  renderApp();
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clone(window.PROTOTYPE_BASE_STATE);
    const parsed = JSON.parse(raw);
    return mergeState(clone(window.PROTOTYPE_BASE_STATE), parsed);
  } catch (error) {
    console.warn("state load failed", error);
    return clone(window.PROTOTYPE_BASE_STATE);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadContext() {
  try {
    const raw = localStorage.getItem(CONTEXT_KEY);
    if (!raw) {
      return {
        classId: window.PROTOTYPE_BASE_STATE.meta.classId,
        week: window.PROTOTYPE_BASE_STATE.meta.week,
        subject: window.PROTOTYPE_BASE_STATE.meta.subject,
        risk: "all",
        studentId: "all",
        interventionType: "all",
        targetIssue: "all",
        workspaceKind: "observation",
      };
    }
    return { ...JSON.parse(raw) };
  } catch (error) {
      return {
        classId: window.PROTOTYPE_BASE_STATE.meta.classId,
        week: window.PROTOTYPE_BASE_STATE.meta.week,
        subject: window.PROTOTYPE_BASE_STATE.meta.subject,
        risk: "all",
        studentId: "all",
        interventionType: "all",
        targetIssue: "all",
        workspaceKind: "observation",
      };
  }
}

function saveContext() {
  localStorage.setItem(CONTEXT_KEY, JSON.stringify(context));
}

function mergeState(base, persisted) {
  return {
    ...base,
    ...persisted,
    meta: { ...base.meta, ...(persisted.meta || {}) },
    groups: persisted.groups || base.groups,
    students: persisted.students || base.students,
    snapshots: { ...base.snapshots, ...(persisted.snapshots || {}) },
    events: persisted.events || base.events,
    interventions: persisted.interventions || base.interventions,
    selfAssessments: persisted.selfAssessments || base.selfAssessments,
    classInsights: { ...base.classInsights, ...(persisted.classInsights || {}) },
    reports: { ...base.reports, ...(persisted.reports || {}) },
  };
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function syncContextFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const studentId = params.get("student");
  const workspace = params.get("workspace");
  if (studentId && hasStudent(studentId)) {
    context.studentId = studentId;
    saveContext();
  }
  if (workspace === "observation" || workspace === "intervention") {
    context.workspaceKind = workspace;
    saveContext();
  }
}

function currentPage() {
  return document.body.dataset.page || "home";
}

function renderApp() {
  const app = document.getElementById("app");
  if (!app) return;
  const page = currentPage();
  const pageKey = page in PAGE_META ? page : "home";
  if ((pageKey === "student-profile" || pageKey === "self-assessment") && context.studentId === "all") {
    context.studentId = getCurrentStudent().id;
    saveContext();
  }

  if (pageKey === "self-assessment") {
    app.innerHTML = `
      <div class="immersive-shell">
        <main class="page-content">${renderPage(pageKey)}</main>
      </div>
    `;
    renderModal();
    hydrateSavedAssessment();
    return;
  }

  app.innerHTML = `
    <div class="app-shell">
      ${renderSideRail(pageKey)}
      <div class="main-stage">
        <div class="top-stage">
          ${pageKey === "home" ? renderHero(pageKey) : ""}
          ${renderControlRibbon(pageKey)}
        </div>
        <main class="page-content">${renderPage(pageKey)}</main>
      </div>
    </div>
  `;

  renderModal();
}

function renderSideRail(page) {
  const activeStudent = getCurrentStudent();
  const nav = NAV_ORDER.map((key) => {
    const item = PAGE_META[key];
    return `
      <a class="nav-link ${page === key ? "active" : ""}" href="${item.file}${key === "student-profile" || key === "self-assessment" ? `?student=${encodeURIComponent(activeStudent.id)}` : ""}">
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.eyebrow)}</small>
      </a>
    `;
  }).join("");

  return `
    <aside class="side-rail">
      <a class="rail-brand" href="index.html">
        <span class="rail-badge">MVP 闭环原型</span>
        <h1>${escapeHtml(state.meta.productName)}</h1>
        <p>${escapeHtml(state.meta.tagline)}</p>
      </a>

      <div>
        <div class="rail-section-title">页面导航</div>
        <nav class="nav-list">${nav}</nav>
      </div>

      <div class="rail-meta">
        <div class="rail-section-title">当前课堂上下文</div>
        <strong>${escapeHtml(state.meta.className)}</strong><br />
        ${escapeHtml(state.meta.week)} · ${escapeHtml(context.subject)}<br />
        更新于 ${escapeHtml(state.meta.updatedAt)}
      </div>

      <div class="rail-note">
        <strong>使用边界</strong><br />
        所有判断都以“根据当前证据，系统推测”来表述，区分直接观察、任务推断和暂不宜下结论的状态信号。
      </div>
    </aside>
  `;
}

function renderHero(page) {
  const item = PAGE_META[page];
  const stats = renderHeroStats(page);
  return `
    <section class="hero-band">
      <div>
        <span class="eyebrow">${escapeHtml(item.eyebrow)}</span>
        <h2 class="hero-title">${escapeHtml(item.title)}</h2>
        <p class="hero-copy">${escapeHtml(item.description)}</p>
        <div class="hero-cta-row">${renderHeroActions(page)}</div>
      </div>
      <div class="hero-stat-grid">${stats}</div>
    </section>
  `;
}

function renderHeroActions(page) {
  if (page === "home") {
    return `
      <button class="action-btn" type="button" data-nav-jump="observations">记录课堂证据</button>
      <button class="ghost-btn" type="button" data-nav-jump="interventions">录入干预回填</button>
      <button class="ghost-btn" type="button" data-nav-jump="self-assessment">打开学生自评</button>
      <button class="ghost-btn" type="button" data-nav-jump="reports">查看趋势周报</button>
    `;
  }
  return "";
}

function renderHeroStats(page) {
  if (page === "student-profile" || page === "self-assessment") {
    const student = getCurrentStudent();
    const snapshot = getSnapshot(student.id);
    const latestAssessment = getLatestSelfAssessment(student.id);
    return [
      heroStatTile("当前支持级别", renderRiskLabel(snapshot.riskLevel), "结合近期证据综合更新"),
      heroStatTile("趋势信号", renderTrendLabel(snapshot.trend), "近两周变化方向"),
      heroStatTile("最近自评", latestAssessment ? formatDate(latestAssessment.date) : "未填写", "仅作为当前倾向证据"),
    ].join("");
  }

  if (page === "class-overview") {
    return [
      heroStatTile("需优先关注", String(state.students.filter((student) => getSnapshot(student.id).riskLevel === "high").length), "重点关注学生"),
      heroStatTile("共性卡点", String(state.classInsights.commonBottlenecks.length), "本周教研重点"),
    ].join("");
  }

  if (page === "class-analysis") {
    return [
      heroStatTile("TOP 卡点", state.classInsights.commonBottlenecks[0]?.label || "暂无", "班级层最先处理"),
      heroStatTile("示范对象", String(state.classInsights.demonstrationStudents.length), "可用于课堂带动"),
    ].join("");
  }

  if (page === "interventions") {
    return [
      heroStatTile("已记录干预", String(state.interventions.length), "系统可回看有效方式"),
      heroStatTile("重点回填", String(state.classInsights.attentionToday.length), "优先追踪这些学生"),
    ].join("");
  }

  if (page === "reports") {
    return [
      heroStatTile("关注学生", String(state.classInsights.attentionToday.length), "本周重点名单"),
      heroStatTile("下周建议", String(state.reports.weekly.nextWeekSuggestions.length), "可直接带去备课"),
    ].join("");
  }

  return [
    heroStatTile("关注学生", String(state.classInsights.attentionToday.length), "老师先看这些学生"),
    heroStatTile("进步线索", String(state.classInsights.progressToday.length), "强化正向反馈"),
  ].join("");
}

function heroStatTile(label, value, note) {
  return `
    <div class="hero-stat">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      <span>${escapeHtml(note)}</span>
    </div>
  `;
}

function renderControlRibbon(page) {
  const activeStudent = getCurrentStudent();
  const activeSnapshot = getSnapshot(activeStudent.id);
  const fieldKeys = getControlFieldKeys(page);
  return `
    <section class="control-ribbon">
      <div class="filters">
        ${fieldKeys.map((key) => renderControlField(key, page)).join("")}
      </div>

      <div class="quick-actions">
        ${page !== "student-profile" ? `<a class="tiny-btn" href="student-profile.html?student=${encodeURIComponent(activeStudent.id)}">查看当前学生画像</a>` : ""}
        <span class="status-pill ${renderRiskClass(activeSnapshot.riskLevel)}">
          <span class="status-dot" style="background:${riskColor(activeSnapshot.riskLevel)}"></span>
          ${context.studentId === "all" ? "当前视角：全部学生" : `当前选中：${escapeHtml(activeStudent.name)}`}
        </span>
      </div>
    </section>
  `;
}

function getControlFieldKeys(page) {
  switch (page) {
    case "student-profile":
    case "self-assessment":
      return ["studentId"];
    case "class-overview":
      return ["week", "risk"];
    case "observations":
      return ["studentId"];
    case "class-analysis":
      return ["week", "subject"];
    case "interventions":
      return ["studentId"];
    case "reports":
      return ["week"];
    case "home":
    default:
      return ["week"];
  }
}

function renderControlField(key, page) {
  if (key === "week") {
    return `
      <label class="field-chip">
        <span>周次</span>
        <select data-context-key="week">
          ${[state.meta.week, "第6周", "第5周"].map((week) => `
            <option value="${escapeHtml(week)}" ${context.week === week ? "selected" : ""}>${escapeHtml(week)}</option>
          `).join("")}
        </select>
      </label>
    `;
  }

  if (key === "subject") {
    return `
      <label class="field-chip">
        <span>学科</span>
        <select data-context-key="subject">
          ${window.PROTOTYPE_OPTIONS.subjects.map((subject) => `
            <option value="${escapeHtml(subject)}" ${context.subject === subject ? "selected" : ""}>${escapeHtml(subject)}</option>
          `).join("")}
        </select>
      </label>
    `;
  }

  if (key === "risk") {
    return `
      <label class="field-chip">
        <span>支持级别</span>
        <select data-context-key="risk">
          ${window.PROTOTYPE_OPTIONS.riskLevels.map((level) => `
            <option value="${escapeHtml(level.value)}" ${context.risk === level.value ? "selected" : ""}>${escapeHtml(level.label)}</option>
          `).join("")}
        </select>
      </label>
    `;
  }

  return `
    <label class="field-chip">
      <span>学生</span>
      <select data-context-key="studentId">
        ${page === "student-profile" || page === "self-assessment" ? "" : `<option value="all" ${context.studentId === "all" ? "selected" : ""}>全部学生</option>`}
        ${state.students.map((student) => `
          <option value="${escapeHtml(student.id)}" ${context.studentId === student.id ? "selected" : ""}>${escapeHtml(student.name)}</option>
        `).join("")}
      </select>
    </label>
  `;
}

function renderPage(page) {
  switch (page) {
    case "class-overview":
      return renderClassOverviewPage();
    case "observations":
      return renderObservationsPage();
    case "student-profile":
      return renderStudentProfilePage();
    case "class-analysis":
      return renderClassAnalysisPage();
    case "interventions":
      return renderInterventionsPage();
    case "reports":
      return renderReportsPage();
    case "self-assessment":
      return renderSelfAssessmentPage();
    case "home":
    default:
      return renderHomePage();
  }
}

function renderHomePage() {
  const recent = getRecentEvents(5);
  const attention = state.classInsights.attentionToday.map(renderStudentMiniCard).join("");
  const progress = state.classInsights.progressToday.map(renderStudentMiniCard).join("");

  return `
    <section class="page-section">
      <div class="section-head">
        <div>
          <h2>今日起点</h2>
          <p>先看需要关注的学生和值得放大的积极变化。</p>
        </div>
        <button class="tiny-btn" type="button" data-open-modal="class-setup">创建班级 / 导入学生</button>
      </div>
      <div class="report-grid">
        <div class="focus-card">
          <h3>今日优先关注</h3>
          <div class="compact-list">${attention}</div>
        </div>
        <div class="focus-card">
          <h3>今日进步线索</h3>
          <div class="compact-list">${progress}</div>
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="split-layout">
        <div class="story-panel">
          <div class="page-section" style="box-shadow:none;border:none;background:transparent;">
            <div class="section-head">
              <div>
                <h2>最近更新</h2>
              </div>
            </div>
            <div class="timeline">
              ${recent.map(renderEventTimelineItem).join("")}
            </div>
          </div>
        </div>
        <div class="result-stack">
          <div class="insight-card">
            <h3>本周共性卡点</h3>
            <div class="compact-list">
              ${state.classInsights.commonBottlenecks.slice(0, 3).map((item) => `
                <div class="signal-card bottleneck-bar">
                  <div class="row-between">
                    <strong>${escapeHtml(item.label)}</strong>
                    <small>${escapeHtml(String(item.count))} 人</small>
                  </div>
                  <div class="bar-track"><div class="bar-fill" style="width:${Math.min(item.count * 24, 100)}%"></div></div>
                  <p class="muted small">${escapeHtml(item.summary)}</p>
                </div>
              `).join("")}
            </div>
          </div>

          <div class="insight-card">
            <h3>项目一句话</h3>
            <div class="callout">
              让老师更早看见问题，更准确理解问题，更轻松采取行动。
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderClassOverviewPage() {
  const students = getVisibleStudents();
  const attentionSet = new Set(state.classInsights.attentionToday);
  const followUps = getInterventionFollowUps();

  return `
    <section class="page-section">
      <div class="split-layout">
        <div>
          <div class="section-head">
            <div>
              <h2>班级学生列表</h2>
              <p>默认按“现在需要处理的事”排序。</p>
            </div>
          </div>
          <div class="student-grid">
            ${students.map((student) => renderStudentCard(student, attentionSet.has(student.id))).join("")}
          </div>
        </div>
        <div class="result-stack">
          <div class="focus-card">
            <h3>今日建议关注名单</h3>
            <div class="compact-list">
              ${state.classInsights.attentionToday.map(renderStudentMiniCard).join("")}
            </div>
          </div>
          <div class="focus-card">
            <h3>支持提醒</h3>
            <div class="compact-list">
              ${students.filter((student) => getSnapshot(student.id).riskLevel !== "low").map((student) => {
                const snapshot = getSnapshot(student.id);
                return `
                  <div class="list-item">
                    <div class="row-between">
                      <strong>${escapeHtml(student.name)}</strong>
                      <span class="status-pill ${renderRiskClass(snapshot.riskLevel)}">${escapeHtml(renderRiskLabel(snapshot.riskLevel))}</span>
                    </div>
                    <p class="muted">${escapeHtml(snapshot.currentBarrier)}</p>
                  </div>
                `;
              }).join("")}
            </div>
          </div>
          <div class="focus-card">
            <h3>干预回看提醒</h3>
            <div class="compact-list">
              ${followUps.length ? followUps.map((item) => `
                <div class="signal-card">
                  <strong>${escapeHtml(item.studentName)} · ${escapeHtml(item.interventionType)}</strong>
                  <p class="muted">${escapeHtml(item.message)}</p>
                </div>
              `).join("") : `<div class="empty-state">当前没有需要回看的干预记录。</div>`}
            </div>
          </div>
          <div class="focus-card">
            <h3>本周共性知识卡点</h3>
            <div class="compact-list">
              ${state.classInsights.commonBottlenecks.map((item) => `
                <div class="signal-card bottleneck-bar">
                  <div class="row-between">
                    <strong>${escapeHtml(item.label)}</strong>
                    <small>${escapeHtml(String(item.count))} 人</small>
                  </div>
                  <div class="bar-track"><div class="bar-fill" style="width:${Math.min(item.count * 22, 100)}%"></div></div>
                  <p class="muted small">${escapeHtml(item.summary)}</p>
                </div>
              `).join("")}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderObservationsPage() {
  const entries = state.events
    .filter((event) => event.type === "teacher_observation")
    .filter((event) => context.studentId === "all" || !context.studentId || event.studentId === context.studentId)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const selectedStudentId = context.studentId === "all" ? getCurrentStudent().id : context.studentId;

  return `
    <section class="page-section">
      <div class="section-head">
        <div>
          <h2>观察记录</h2>
          <p>单独保留为证据入口页，只记录关键字段：对象、日期、证据类型、观察标题和关键现象。</p>
        </div>
      </div>
      <div class="page-block" style="padding:22px;">
        ${renderObservationForm(selectedStudentId)}
      </div>
    </section>

    <section class="page-section">
      <div class="section-head">
        <div>
          <h2>最近观察证据</h2>
          <p>优先回看最近进入系统的课堂观察，方便继续补证据或更新画像。</p>
        </div>
      </div>
      ${entries.length ? `
        <div class="timeline">
          ${entries.map((event) => `
            <article class="timeline-item">
              <div class="timeline-date">${escapeHtml(formatDate(event.date))} · ${escapeHtml(getStudent(event.studentId).name)}</div>
              <strong>${escapeHtml(event.title)}</strong>
              <p class="muted">${escapeHtml(event.summary)}</p>
            </article>
          `).join("")}
        </div>
      ` : `<div class="empty-state">当前筛选条件下还没有观察记录。</div>`}
    </section>
  `;
}

function renderStudentCard(student, highlighted) {
  const snapshot = getSnapshot(student.id);

  return `
    <article class="student-card" data-student-link="${escapeHtml(student.id)}">
      <div class="student-topline">
        <div>
          <div class="student-name">${escapeHtml(student.name)}</div>
          <div class="muted small">${escapeHtml(getGroupName(student.groupId))}</div>
        </div>
        <div class="status-pill ${renderRiskClass(snapshot.riskLevel)}">
          <span class="status-dot" style="background:${riskColor(snapshot.riskLevel)}"></span>
          ${escapeHtml(renderRiskLabel(snapshot.riskLevel))}
        </div>
      </div>

      <div class="tag-row">
        <span class="tag ${renderTrendClass(snapshot.trend)}">${escapeHtml(renderTrendLabel(snapshot.trend))}</span>
        ${highlighted ? `<span class="tag">今日优先</span>` : ""}
      </div>

      <p class="student-summary">${escapeHtml(snapshot.currentBarrier)} · ${escapeHtml(snapshot.emotionStatus)}</p>
    </article>
  `;
}

function renderStudentMiniCard(studentId) {
  const student = getStudent(studentId);
  const snapshot = getSnapshot(student.id);
  return `
    <a class="list-item" href="student-profile.html?student=${encodeURIComponent(student.id)}">
      <div class="row-between">
        <strong>${escapeHtml(student.name)}</strong>
        <span class="status-pill ${renderRiskClass(snapshot.riskLevel)}">${escapeHtml(renderTrendLabel(snapshot.trend))}</span>
      </div>
      <p class="muted">${escapeHtml(snapshot.currentBarrier)}</p>
    </a>
  `;
}

function renderStudentProfilePage() {
  const student = getCurrentStudent();
  const snapshot = getSnapshot(student.id);
  const events = getStudentEvents(student.id);
  const interventions = getStudentInterventions(student.id);
  const latestAssessment = getLatestSelfAssessment(student.id);

  return `
    <section class="page-section">
      <div class="section-head">
        <div>
          <h2>${escapeHtml(student.name)} 的当前快照</h2>
          <p>${escapeHtml(student.phaseGoal)}</p>
        </div>
        <div class="tag-row">
          <span class="tag">${escapeHtml(getGroupName(student.groupId))}</span>
          <span class="tag ${renderTrendClass(snapshot.trend)}">${escapeHtml(renderTrendLabel(snapshot.trend))}</span>
        </div>
      </div>

      <div class="split-layout">
        <div class="signal-group">
          <div class="signal-card">
            <h4>当前学业状态</h4>
            <p class="muted">${escapeHtml(snapshot.academicStatus)}</p>
          </div>
          <div class="signal-card">
            <h4>当前学习状态</h4>
            <p class="muted">${escapeHtml(snapshot.learningStatus)}</p>
          </div>
          <div class="signal-card">
            <h4>当前情绪状态</h4>
            <p class="muted">${escapeHtml(snapshot.emotionStatus)}</p>
          </div>
        </div>

        <div class="page-block" style="padding:22px;">
          <div class="section-head">
            <div>
              <h3>近两周趋势</h3>
              <p>重点看变化方向，不把短期波动直接写成稳定能力。悬停节点可查看阶段说明。</p>
            </div>
          </div>
          ${renderTrendLineChart(snapshot.twoWeekTrend, events)}
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="section-head">
        <div>
          <h2>核心判断</h2>
          <p>把“直接观察到的”“通过任务推断的”“暂不宜下结论的”明确分开写。</p>
        </div>
        <a class="tiny-btn" href="self-assessment.html?student=${encodeURIComponent(student.id)}">打开学习认知偏好自评</a>
      </div>
      <div class="section-grid cols-3">
        ${renderSignalColumn("可直接观察的行为", snapshot.directBehaviors, "这些是课堂或任务中可以直接记录的证据。")}
        ${renderSignalColumn("任务推断出的能力线索", snapshot.taskInferences, "根据作业、测验、反思等任务证据形成，仍需持续验证。")}
        ${renderSignalColumn("暂不宜下结论的状态信号", snapshot.stateSignals, "用于提醒老师继续观察，不直接写成固定特质。")}
      </div>
    </section>

    <section class="page-section">
      <div class="section-head">
        <div>
          <h2>成长轨迹</h2>
          <p>把变化放到时间线上，而不是只给出一张当前截图。</p>
        </div>
      </div>
      <div class="timeline">
        ${events.slice(0, 8).map(renderEventTimelineItem).join("")}
      </div>
    </section>

    <section class="page-section">
      <div class="section-head">
        <div>
          <h2>成长证据与积分记录</h2>
          <p>积分只是证据之一，用来补充课堂行为、作业完成、参与度与干预效果，不等于完整评价。</p>
        </div>
      </div>
      <div class="metric-strip" style="margin-bottom:18px;">
        ${metricTile("累计成长积分", String(sumStudentDelta(student.id)), "由行为与任务事件累计")}
        ${metricTile("证据事件数", String(events.length), "课堂 / 作业 / 自评 / 干预")}
        ${metricTile("干预次数", String(interventions.length), "最近两周已记录")}
        ${metricTile("最近自评", latestAssessment ? formatDate(latestAssessment.date) : "未填写", "仅作为 task inference 证据")}
      </div>
      <div class="split-layout">
        <div class="page-block" style="padding:20px;">
          <table class="evidence-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>证据类型</th>
                <th>内容</th>
                <th>积分</th>
              </tr>
            </thead>
            <tbody>
              ${events.map((event) => `
                <tr>
                  <td>${escapeHtml(formatDate(event.date))}</td>
                  <td>${escapeHtml(renderEventType(event.type))}</td>
                  <td>${escapeHtml(event.summary)}</td>
                  <td>${event.delta > 0 ? `+${event.delta}` : event.delta}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
        <div class="result-stack">
          ${latestAssessment ? `
            <div class="result-card">
              <h3>最近一次自评摘要</h3>
              <p class="muted">${escapeHtml(latestAssessment.summaryTitle)}</p>
              <div class="callout">${escapeHtml(latestAssessment.riskHint)}</div>
            </div>
          ` : `
            <div class="result-card">
              <h3>最近一次自评摘要</h3>
              <p class="muted">当前还没有学生自评结果。可以从上方入口发起“学习认知偏好自评”。</p>
            </div>
          `}
          <div class="result-card">
            <h3>最近干预效果</h3>
            <div class="compact-list">
              ${interventions.length ? interventions.map((entry) => `
                <div class="signal-card">
                  <strong>${escapeHtml(entry.interventionType)} · ${escapeHtml(entry.targetIssue)}</strong>
                  <p class="muted">${escapeHtml(entry.observedEffect)}</p>
                </div>
              `).join("") : `<div class="empty-state">还没有记录到这个学生的干预回填。</div>`}
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="section-head">
        <div>
          <h2>教学与沟通建议</h2>
          <p>所有建议都围绕教师实际可执行的动作来写，而不是抽象口号。</p>
        </div>
      </div>
      <div class="section-grid cols-3">
        ${renderSuggestionCard("课堂怎么做", snapshot.classroomSuggestions)}
        ${renderSuggestionCard("课后怎么做", snapshot.afterClassSuggestions)}
        ${renderSuggestionCard("沟通怎么说", snapshot.communicationSuggestions)}
      </div>
    </section>
  `;
}

function renderClassAnalysisPage() {
  const repeated = state.classInsights.repeatedErrors;
  const tiered = state.classInsights.tieredSuggestions;

  return `
    <section class="page-section">
      <div class="section-head">
        <div>
          <h2>本周最常见卡点 TOP 5</h2>
          <p>这页的目标不是看热闹，而是反过来指导课堂设计与分层支持。</p>
        </div>
      </div>
      <div class="compact-list">
        ${state.classInsights.commonBottlenecks.map((item) => `
          <div class="analysis-row bottleneck-bar">
            <div class="row-between">
              <strong>${escapeHtml(item.label)}</strong>
              <small>${escapeHtml(String(item.count))} 人</small>
            </div>
            <p>${escapeHtml(item.summary)}</p>
            <div class="bar-track"><div class="bar-fill" style="width:${Math.min(item.count * 22, 100)}%"></div></div>
          </div>
        `).join("")}
      </div>
    </section>

    <section class="page-section">
      <div class="analysis-grid">
        <div class="result-stack">
          <div class="report-card">
            <h3>哪类题错得最集中</h3>
            <div class="compact-list">
              ${repeated.map((item) => `<div class="signal-card"><strong>${escapeHtml(item)}</strong></div>`).join("")}
            </div>
          </div>
          <div class="report-card">
            <h3>可作为课堂示范对象</h3>
            <div class="compact-list">
              ${state.classInsights.demonstrationStudents.map((item) => {
                const student = getStudent(item.studentId);
                return `
                  <a class="signal-card" href="student-profile.html?student=${encodeURIComponent(student.id)}">
                    <strong>${escapeHtml(student.name)}</strong>
                    <p class="muted">${escapeHtml(item.reason)}</p>
                  </a>
                `;
              }).join("")}
            </div>
          </div>
        </div>

        <div class="report-card">
          <h3>分层教学建议</h3>
          <div class="compact-list">
            ${tiered.map((item) => `
              <div class="support-card">
                <h3>${escapeHtml(item.title)}</h3>
                <p>${escapeHtml(item.action)}</p>
                <div class="tag-row">
                  ${item.studentIds.map((studentId) => `<span class="tag">${escapeHtml(getStudent(studentId).name)}</span>`).join("")}
                </div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderInterventionsPage() {
  const entries = getVisibleInterventions();
  const selectedStudentId = context.studentId === "all" ? getCurrentStudent().id : context.studentId;

  return `
    <section class="page-section">
      <div class="section-head">
        <div>
          <h2>干预录入</h2>
          <p>单独保留为干预回填页，只记录对象、动作、目标问题和结果反馈。</p>
        </div>
      </div>
      <div class="page-block" style="padding:22px;">
        ${renderInterventionForm(selectedStudentId)}
      </div>
    </section>

    <section class="page-section">
      <div class="section-head">
        <div>
          <h2>干预时间线</h2>
          <p>只保留干预相关的关键字段：对象、动作、目标问题、结果。</p>
        </div>
      </div>
      <div class="filters" style="margin-bottom:18px;">
        <label class="field-chip">
          <span>干预类型</span>
          <select data-context-key="interventionType">
            <option value="all" ${context.interventionType === "all" ? "selected" : ""}>全部类型</option>
            ${window.PROTOTYPE_OPTIONS.interventionTypes.map((item) => `
              <option value="${escapeHtml(item)}" ${context.interventionType === item ? "selected" : ""}>${escapeHtml(item)}</option>
            `).join("")}
          </select>
        </label>
        <label class="field-chip">
          <span>目标问题</span>
          <select data-context-key="targetIssue">
            <option value="all" ${context.targetIssue === "all" ? "selected" : ""}>全部问题</option>
            ${window.PROTOTYPE_OPTIONS.targetIssues.map((item) => `
              <option value="${escapeHtml(item)}" ${context.targetIssue === item ? "selected" : ""}>${escapeHtml(item)}</option>
            `).join("")}
          </select>
        </label>
      </div>
      ${entries.length ? `
        <div class="timeline">
          ${entries.map((entry) => {
            const student = getStudent(entry.studentId);
            return `
              <article class="timeline-item">
                <div class="timeline-date">${escapeHtml(formatDate(entry.date))}</div>
                <strong>${escapeHtml(student.name)} · ${escapeHtml(entry.interventionType)} · ${escapeHtml(entry.targetIssue)}</strong>
                <p class="muted">动作：${escapeHtml(entry.actionDetail)}</p>
                <p class="muted">结果：${escapeHtml(entry.observedEffect)}</p>
              </article>
            `;
          }).join("")}
        </div>
      ` : `<div class="empty-state">当前筛选条件下还没有干预记录。</div>`}
    </section>
  `;
}

function renderReportsPage() {
  const weekly = state.reports.weekly;
  return `
    <section class="page-section">
      <div class="section-head">
        <div>
          <h2>${escapeHtml(weekly.title)}</h2>
          <p>让老师快速看到本周状态、重点对象与下一步建议。</p>
        </div>
      </div>
      <div class="callout">${escapeHtml(weekly.overview)}</div>
    </section>

    <section class="page-section">
      <div class="report-grid">
        <div class="report-card">
          <h3>本周最值得关注的学生</h3>
          <div class="compact-list">
            ${state.classInsights.attentionToday.map(renderStudentMiniCard).join("")}
          </div>
        </div>
        <div class="report-card">
          <h3>本周明显进步学生</h3>
          <div class="compact-list">
            ${state.classInsights.progressToday.map(renderStudentMiniCard).join("")}
          </div>
        </div>
      </div>
    </section>

    <section class="page-section">
      <div class="analysis-grid">
        <div class="result-stack">
          <div class="report-card">
            <h3>系统自动生成判断</h3>
            <div class="compact-list">
              ${weekly.autoSummary.map((item) => `<div class="signal-card"><p class="muted">${escapeHtml(item)}</p></div>`).join("")}
            </div>
          </div>
        </div>

        <div class="result-stack">
          <div class="report-card">
            <h3>下周教学建议</h3>
            <ul>
              ${weekly.nextWeekSuggestions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
            </ul>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderSelfAssessmentPage() {
  const student = getCurrentStudent();
  const latest = getLatestSelfAssessment(student.id);

  return `
    <section class="page-section">
      <div class="section-head">
        <div>
          <h2>${escapeHtml(student.name)} 的学习认知偏好自评</h2>
          <p>学生模式已开启：当前页面只保留自评内容，不展示其他学生或教师工作台信息。</p>
        </div>
        <a class="ghost-btn" href="index.html">退出学生模式</a>
      </div>
      <div class="callout">
        使用原则：这些题没有对错，结果只反映当前任务情境下的自我报告。它更适合帮助老师调整支架方式，而不是给学生贴固定标签。
      </div>
    </section>

    <section class="page-section">
      <form id="selfAssessmentForm" class="result-stack">
        ${window.SELF_ASSESSMENT_DIMENSIONS.map((dimension) => `
          <div class="result-card">
            <h3>${escapeHtml(dimension.name)} · ${escapeHtml(dimension.leftLabel)} / ${escapeHtml(dimension.rightLabel)}</h3>
            <div class="compact-list">
              ${dimension.questions.map((question) => `
                <div class="signal-card">
                  <strong>${escapeHtml(question.text)}</strong>
                  <div class="compact-list" style="margin-top:10px;">
                    <label class="signal-card" style="cursor:pointer;">
                      <input type="radio" name="${escapeHtml(question.id)}" value="left" required />
                      ${escapeHtml(question.left)}
                    </label>
                    <label class="signal-card" style="cursor:pointer;">
                      <input type="radio" name="${escapeHtml(question.id)}" value="right" required />
                      ${escapeHtml(question.right)}
                    </label>
                  </div>
                </div>
              `).join("")}
            </div>
          </div>
        `).join("")}
        <div class="row-between">
          <button class="action-btn" type="submit">生成近期偏好报告</button>
          <span class="muted small">完成后会自动保存为该学生的一条 task inference 级证据。</span>
        </div>
      </form>
    </section>

    <section class="page-section">
      <div class="section-head">
        <div>
          <h2>结果报告</h2>
          <p>结果只服务于支持方式选择，不代表固定能力或长期标签。</p>
        </div>
      </div>
      <div id="assessmentResult">
        ${latest ? renderAssessmentResult(latest, student) : `<div class="empty-state">完成上方问答后，这里会生成“近期偏好倾向 + 教学提示 + 支持提醒”的结果卡。</div>`}
      </div>
    </section>
  `;
}

function renderSignalColumn(title, items, note) {
  return `
    <div class="signal-card">
      <h4>${escapeHtml(title)}</h4>
      <ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      <p class="muted small">${escapeHtml(note)}</p>
    </div>
  `;
}

function renderSuggestionCard(title, list) {
  return `
    <div class="support-card">
      <h3>${escapeHtml(title)}</h3>
      <ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </div>
  `;
}

function renderEventTimelineItem(event) {
  const student = getStudent(event.studentId);
  return `
    <article class="timeline-item">
      <div class="timeline-date">${escapeHtml(formatDate(event.date))} · ${escapeHtml(renderEventType(event.type))}</div>
      <strong>${escapeHtml(student.name)} · ${escapeHtml(event.title)}</strong>
      <p class="muted">${escapeHtml(event.summary)}</p>
    </article>
  `;
}

function renderAssessmentResult(result, student) {
  return `
    <div class="result-stack">
      <div class="result-card">
        <h3>${escapeHtml(student.name)} 的近期偏好摘要</h3>
        <p class="muted">${escapeHtml(result.summaryTitle)}</p>
        <div class="callout">${escapeHtml(result.riskHint)}</div>
      </div>
      <div class="result-card">
        <h3>四维倾向雷达图</h3>
        <div class="radar-panel">
          ${renderAssessmentRadar(result)}
          <div class="radar-legend">
            <span class="legend-pill"><span class="legend-dot left"></span>左侧倾向</span>
            <span class="legend-pill"><span class="legend-dot right"></span>右侧倾向</span>
          </div>
          <div class="compact-list">
            ${result.scores.map((item) => `
              <div class="signal-card">
                <div class="row-between">
                  <strong>${escapeHtml(item.name)}</strong>
                  <span class="muted small">${escapeHtml(`${item.left}% / ${item.right}%`)}</span>
                </div>
                <p class="muted">${escapeHtml(`${item.leftLabel} ${item.left}% · ${item.rightLabel} ${item.right}%`)}</p>
              </div>
            `).join("")}
          </div>
        </div>
      </div>
      <div class="result-card">
        <h3>教学提示</h3>
        <p class="muted">${escapeHtml(result.teachingHint)}</p>
        <div class="row-between" style="margin-top:14px;">
          <a class="action-btn" href="index.html">完成并返回首页</a>
          <span class="muted small">保存方式：作为自评证据进入该学生画像页。</span>
        </div>
      </div>
    </div>
  `;
}

function metricTile(title, value, note) {
  return `
    <div class="metric-tile">
      <small>${escapeHtml(title)}</small>
      <strong>${escapeHtml(value)}</strong>
      <small>${escapeHtml(note)}</small>
    </div>
  `;
}

function renderAssessmentRadar(result) {
  const size = 320;
  const center = size / 2;
  const radius = 112;
  const levels = [0.25, 0.5, 0.75, 1];
  const labels = result.scores.map((item) => item.name);
  const leftValues = result.scores.map((item) => item.left);
  const rightValues = result.scores.map((item) => item.right);

  return `
    <svg class="radar-chart" viewBox="0 0 ${size} ${size}" aria-label="学习认知偏好四维雷达图" role="img">
      ${levels.map((level) => `
        <polygon class="radar-grid" points="${buildRadarPolygon(labels.length, center, radius * level)}"></polygon>
      `).join("")}
      ${labels.map((label, index) => `
        <g>
          <line class="radar-axis" x1="${center}" y1="${center}" x2="${radarPoint(index, labels.length, center, radius).x}" y2="${radarPoint(index, labels.length, center, radius).y}"></line>
          <text class="radar-label" x="${radarLabelPoint(index, labels.length, center, radius + 26).x}" y="${radarLabelPoint(index, labels.length, center, radius + 26).y}" text-anchor="${radarAnchor(index, labels.length)}">${escapeHtml(label)}</text>
        </g>
      `).join("")}
      <polygon class="radar-area left" points="${buildRadarValuePolygon(leftValues, center, radius)}"></polygon>
      <polygon class="radar-area right" points="${buildRadarValuePolygon(rightValues, center, radius)}"></polygon>
      ${leftValues.map((value, index) => {
        const point = radarValuePoint(index, labels.length, center, radius, value);
        return `<circle class="radar-node left" cx="${point.x}" cy="${point.y}" r="4"></circle>`;
      }).join("")}
      ${rightValues.map((value, index) => {
        const point = radarValuePoint(index, labels.length, center, radius, value);
        return `<circle class="radar-node right" cx="${point.x}" cy="${point.y}" r="4"></circle>`;
      }).join("")}
    </svg>
  `;
}

function renderTrendLineChart(values, events) {
  const width = 460;
  const height = 220;
  const paddingX = 28;
  const paddingY = 24;
  const minValue = Math.min(...values) - 4;
  const maxValue = Math.max(...values) + 4;
  const eventHints = events.slice().reverse();
  const stepX = values.length > 1 ? (width - paddingX * 2) / (values.length - 1) : 0;

  const pointAt = (value, index) => {
    const x = paddingX + stepX * index;
    const y = height - paddingY - ((value - minValue) / Math.max(maxValue - minValue, 1)) * (height - paddingY * 2);
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)) };
  };

  const path = values.map((value, index) => {
    const point = pointAt(value, index);
    return `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`;
  }).join(" ");

  return `
    <div class="trend-line-card">
      <svg class="trend-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="近两周趋势折线图">
        ${[0, 0.33, 0.66, 1].map((ratio) => {
          const y = paddingY + (height - paddingY * 2) * ratio;
          return `<line class="trend-grid-line" x1="${paddingX}" y1="${y}" x2="${width - paddingX}" y2="${y}"></line>`;
        }).join("")}
        <path class="trend-path" d="${path}"></path>
        ${values.map((value, index) => {
          const point = pointAt(value, index);
          const hint = eventHints[index]?.title || "继续补充阶段事件";
          return `
            <g>
              <circle class="trend-point" cx="${point.x}" cy="${point.y}" r="5">
                <title>第${index + 2}周：${value}
相关事件：${hint}</title>
              </circle>
              <text class="trend-axis-label" x="${point.x}" y="${height - 6}" text-anchor="middle">W${index + 2}</text>
            </g>
          `;
        }).join("")}
      </svg>
      <p class="muted small">悬停节点可查看对应周次的变化值和相关事件提示。</p>
    </div>
  `;
}

function renderModal() {
  const root = document.getElementById("modalRoot");
  if (!root) return;

  document.body.classList.toggle("modal-open", Boolean(ui.modal));

  if (!ui.modal) {
    root.innerHTML = "";
    return;
  }

  if (ui.modal === "class-setup") {
    root.innerHTML = renderClassSetupModal();
    return;
  }

  root.innerHTML = "";
}

function renderClassSetupModal() {
  const sampleRows = state.students
    .slice(0, 3)
    .map((student) => `${student.name},${getGroupName(student.groupId)},${student.phaseGoal}`)
    .join("\n");

  return `
    <div class="modal-layer" data-close-modal>
      <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="classSetupTitle">
        <div class="modal-head">
          <div>
            <h3 id="classSetupTitle">创建班级 / 导入学生</h3>
            <p>这个弹窗只负责班级初始化和数据导入，不承载评价记录。</p>
          </div>
          <button class="ghost-btn" type="button" data-close-modal>关闭</button>
        </div>

        <form id="classSetupForm" class="result-stack compact-form">
          <div class="section-grid cols-3">
            <label class="field-chip">
              <span>班级名称</span>
              <input type="text" name="className" value="${escapeHtml(state.meta.className)}" required />
            </label>
            <label class="field-chip">
              <span>周次</span>
              <input type="text" name="week" value="${escapeHtml(context.week)}" required />
            </label>
            <label class="field-chip">
              <span>学科</span>
              <select name="subject">
                ${window.PROTOTYPE_OPTIONS.subjects.map((subject) => `
                  <option value="${escapeHtml(subject)}" ${context.subject === subject ? "selected" : ""}>${escapeHtml(subject)}</option>
                `).join("")}
              </select>
            </label>
          </div>

          <label class="field-chip">
            <span>学生数据</span>
            <textarea name="studentRows" placeholder="每行一位学生，格式：姓名,小组,阶段目标"></textarea>
          </label>

          <div class="callout">
            导入说明：每行一位学生，支持“姓名,小组,阶段目标”。只有姓名必填；如果勾选“替换当前名单”，系统会基于导入名单重建班级学生档案与基础洞察。
          </div>

          <div class="sample-box">
            <strong>示例格式</strong>
            <pre>${escapeHtml(sampleRows)}</pre>
          </div>

          <label class="check-row">
            <input type="checkbox" name="replaceRoster" checked />
            用导入名单替换当前学生列表
          </label>

          <div class="workspace-actions">
            <button class="ghost-btn" type="button" data-close-modal>取消</button>
            <button class="action-btn" type="submit">保存班级并导入</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderWorkspaceSection(page) {
  const student = getCurrentStudent();
  const workspaceKind = context.workspaceKind || "observation";
  const isObservation = workspaceKind === "observation";
  const description = page === "student-profile"
    ? "固定记录区会跟随学生画像页一起展示，不再用浮动弹窗。"
    : "在干预记录页里固定保留录入区，方便一边看时间线一边回填。";

  return `
    <section class="page-section workspace-section" id="fixedWorkspace">
      <div class="section-head">
        <div>
          <h2>固定记录区</h2>
          <p>${escapeHtml(description)}</p>
        </div>
        <div class="tag-row">
          <span class="tag">${escapeHtml(student.name)}</span>
          <span class="tag">${isObservation ? "观察记录" : "干预记录"}</span>
        </div>
      </div>

      <div class="workspace-toggle">
        <button class="workspace-tab ${isObservation ? "active" : ""}" type="button" data-open-workspace="observation">观察记录</button>
        <button class="workspace-tab ${!isObservation ? "active" : ""}" type="button" data-open-workspace="intervention">干预记录</button>
      </div>

      <div class="workspace-shell">
        ${isObservation ? renderObservationForm(student.id) : renderInterventionForm(student.id)}
      </div>
    </section>
  `;
}

function renderObservationForm(selectedStudentId) {
  return `
    <form id="observationForm" class="result-stack compact-form">
      <label class="field-chip">
        <span>学生</span>
        <select name="studentId">
          ${state.students.map((student) => `
            <option value="${escapeHtml(student.id)}" ${student.id === selectedStudentId ? "selected" : ""}>${escapeHtml(student.name)}</option>
          `).join("")}
        </select>
      </label>
      <label class="field-chip">
        <span>日期</span>
        <input type="date" name="date" value="${escapeHtml(state.meta.updatedAt)}" />
      </label>
      <label class="field-chip">
        <span>记录类型</span>
        <select name="evidenceLevel">
          <option value="direct_behavior">可直接观察的行为</option>
          <option value="task_inference">通过任务推断的能力线索</option>
          <option value="high_risk_inference">暂不宜下结论的状态信号</option>
        </select>
      </label>
      <label class="field-chip">
        <span>观察标题</span>
        <input type="text" name="title" placeholder="例如：任务启动观察" required />
      </label>
      <label class="field-chip">
        <span>关键记录</span>
        <textarea name="summary" placeholder="写下你今天真正看到的行为或现象。" required></textarea>
      </label>
      <div class="workspace-actions">
        <button class="action-btn" type="submit">保存观察</button>
      </div>
    </form>
  `;
}

function renderInterventionForm(selectedStudentId) {
  return `
    <form id="interventionForm" class="result-stack compact-form">
      <div class="field-chip">
        <span>记录对象</span>
        <div class="selector-grid">
          ${state.students.map((student) => `
            <label class="selector-chip">
              <input type="checkbox" name="studentIds" value="${escapeHtml(student.id)}" ${student.id === selectedStudentId ? "checked" : ""} />
              <span>${escapeHtml(student.name)}</span>
            </label>
          `).join("")}
        </div>
        <small class="muted">支持一次勾选多名学生，记录共性干预。</small>
      </div>
      <label class="field-chip">
        <span>日期</span>
        <input type="date" name="date" value="${escapeHtml(state.meta.updatedAt)}" />
      </label>
      <label class="field-chip">
        <span>干预类型</span>
        <select name="interventionType">
          ${window.PROTOTYPE_OPTIONS.interventionTypes.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}
        </select>
      </label>
      <label class="field-chip">
        <span>目标问题</span>
        <select name="targetIssue">
          ${window.PROTOTYPE_OPTIONS.targetIssues.map((item) => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}
        </select>
      </label>
      <label class="field-chip">
        <span>干预动作</span>
        <textarea name="actionDetail" placeholder="例如：先示范一次划关键词，再让学生独立完成一题。" required></textarea>
      </label>
      <label class="field-chip">
        <span>结果反馈</span>
        <textarea name="observedEffect" placeholder="写下短期看到的变化，避免绝对化。" required></textarea>
      </label>
      <div class="workspace-actions">
        <button class="action-btn" type="submit">保存干预</button>
      </div>
    </form>
  `;
}

function handleClick(event) {
  const closeModalTrigger = event.target.closest("[data-close-modal]");
  if (closeModalTrigger && event.target === closeModalTrigger) {
    ui.modal = null;
    renderModal();
    return;
  }

  const openModalTrigger = event.target.closest("[data-open-modal]");
  if (openModalTrigger) {
    ui.modal = openModalTrigger.dataset.openModal;
    renderModal();
    return;
  }

  const navJump = event.target.closest("[data-nav-jump]");
  if (navJump) {
    const page = navJump.dataset.navJump;
    const item = PAGE_META[page];
    if (item) {
      const activeStudent = getCurrentStudent();
      const suffix = page === "student-profile" || page === "self-assessment" ? `?student=${encodeURIComponent(activeStudent.id)}` : "";
      window.location.href = `${item.file}${suffix}`;
    }
    return;
  }

  const studentLink = event.target.closest("[data-student-link]");
  if (studentLink) {
    const studentId = studentLink.dataset.studentLink;
    context.studentId = studentId;
    saveContext();
    window.location.href = `student-profile.html?student=${encodeURIComponent(studentId)}`;
  }
}

function handleChange(event) {
  const target = event.target;
  if (!target.matches("[data-context-key]")) return;

  context[target.dataset.contextKey] = target.value;
  saveContext();

  const page = currentPage();
  if (page === "student-profile" || page === "self-assessment") {
    if (context.studentId === "all") {
      window.history.replaceState({}, "", PAGE_META[page].file);
    } else {
      window.history.replaceState({}, "", `${PAGE_META[page].file}?student=${encodeURIComponent(context.studentId)}`);
    }
  }
  renderApp();
}

function handleSubmit(event) {
  const form = event.target;

  if (form.id === "classSetupForm") {
    event.preventDefault();
    const data = new FormData(form);
    const className = String(data.get("className") || "").trim();
    const week = String(data.get("week") || "").trim();
    const subject = String(data.get("subject") || "").trim();
    const importedStudents = parseImportedStudents(String(data.get("studentRows") || ""));
    const replaceRoster = data.get("replaceRoster") === "on";

    state.meta.className = className || state.meta.className;
    state.meta.classId = uid("class");
    state.meta.week = week || state.meta.week;
    state.meta.subject = subject || state.meta.subject;
    context.week = state.meta.week;
    context.subject = state.meta.subject;

    if (importedStudents.length) {
      applyImportedStudents(importedStudents, replaceRoster);
    }

    context.studentId = "all";
    ui.modal = null;
    saveContext();
    saveState();
    renderApp();
    return;
  }

  if (form.id === "observationForm") {
    event.preventDefault();
    const data = new FormData(form);
    const entry = {
      id: uid("evt"),
      date: data.get("date"),
      studentId: data.get("studentId"),
      type: "teacher_observation",
      title: data.get("title"),
      summary: data.get("summary"),
      source: "教师观察",
      evidenceLevel: data.get("evidenceLevel"),
      subject: context.subject,
      delta: 0,
      tag: "manual",
    };
    state.events.unshift(entry);
    saveState();
    renderApp();
    scrollToWorkspace();
    return;
  }

  if (form.id === "interventionForm") {
    event.preventDefault();
    const data = new FormData(form);
    const studentIds = data.getAll("studentIds").filter(Boolean);
    const targetIds = studentIds.length ? studentIds : [getCurrentStudent().id];
    targetIds.forEach((studentId) => {
      const intervention = {
        id: uid("int"),
        studentId,
        date: data.get("date"),
        interventionType: data.get("interventionType"),
        targetIssue: data.get("targetIssue"),
        actionDetail: data.get("actionDetail"),
        teacherFeedback: "本次为快速记录，待教师补充更完整反馈。",
        observedEffect: data.get("observedEffect"),
      };
      state.interventions.unshift(intervention);
      state.events.unshift({
        id: uid("evt"),
        date: intervention.date,
        studentId: intervention.studentId,
        type: "intervention",
        title: `${intervention.interventionType} · ${intervention.targetIssue}`,
        summary: intervention.actionDetail,
        source: targetIds.length > 1 ? "批量干预记录" : "干预记录",
        evidenceLevel: "direct_behavior",
        subject: context.subject,
        delta: 1,
        tag: "intervention",
      });
    });
    saveState();
    renderApp();
    return;
  }

  if (form.id === "selfAssessmentForm") {
    event.preventDefault();
    const result = calculateAssessment(new FormData(form), getCurrentStudent());
    if (!result) return;
    saveAssessmentResult(result);
    hydrateAssessmentResult(result);
  }
}

function scrollToWorkspace() {
  const target = document.getElementById("fixedWorkspace");
  if (!target) return;
  window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - 112, behavior: "smooth" });
}

function calculateAssessment(formData, student) {
  const scores = [];
  for (const dimension of window.SELF_ASSESSMENT_DIMENSIONS) {
    let leftCount = 0;
    for (const question of dimension.questions) {
      const value = formData.get(question.id);
      if (!value) return null;
      if (value === "left") leftCount += 1;
    }
    const left = Math.round((leftCount / dimension.questions.length) * 100);
    scores.push({
      name: dimension.name,
      left,
      right: 100 - left,
      leftLabel: dimension.leftLabel,
      rightLabel: dimension.rightLabel,
      summary: left >= 67
        ? `近期更偏向 ${dimension.leftLabel}`
        : left <= 33
          ? `近期更偏向 ${dimension.rightLabel}`
          : "近期表现较平衡",
      teachingHint: left >= 50 ? dimension.leftTeaching : dimension.rightTeaching,
      watchout: dimension.watchout,
    });
  }

  const strongest = scores
    .slice()
    .sort((a, b) => Math.abs(b.left - 50) - Math.abs(a.left - 50))
    .slice(0, 2);

  const summaryTitle = `近期更明显的倾向是：${strongest.map((item) => item.summary).join("；")}。`;
  const teachingHint = strongest.map((item) => item.teachingHint).join(" ");
  const riskHint = "本结果仅反映当前任务情境下的自我报告，更容易受到近期情绪、任务难度和课堂环境影响，不等于固定类型结论。";

  return {
    id: uid("self"),
    studentId: student.id,
    date: state.meta.updatedAt,
    summaryTitle,
    teachingHint,
    riskHint,
    evidenceLevel: "task_inference",
    scores: scores.map((item) => ({
      name: item.name,
      left: item.left,
      right: item.right,
      leftLabel: item.leftLabel,
      rightLabel: item.rightLabel,
      summary: item.summary,
    })),
  };
}

function saveAssessmentResult(result) {
  state.selfAssessments = [result, ...state.selfAssessments.filter((item) => item.id !== result.id)];
  state.events.unshift({
    id: uid("evt"),
    date: result.date,
    studentId: result.studentId,
    type: "self_assessment",
    title: "学习认知偏好自评",
    summary: result.summaryTitle,
    source: "学生自评",
    evidenceLevel: "task_inference",
    subject: context.subject,
    delta: 0,
    tag: "self_assessment",
  });
  saveState();
}

function hydrateAssessmentResult(result) {
  const container = document.getElementById("assessmentResult");
  if (!container) return;
  container.innerHTML = renderAssessmentResult(result, getStudent(result.studentId));
  window.scrollTo({ top: container.getBoundingClientRect().top + window.scrollY - 120, behavior: "smooth" });
}

function hydrateSavedAssessment() {
  const student = getCurrentStudent();
  const latest = getLatestSelfAssessment(student.id);
  if (!latest) return;
  const container = document.getElementById("assessmentResult");
  if (!container) return;
  container.innerHTML = renderAssessmentResult(latest, student);
}

function getCurrentStudent() {
  if (context.studentId === "all") {
    const prioritized = state.classInsights.attentionToday[0];
    return getStudent(prioritized) || state.students[0];
  }
  return getStudent(context.studentId) || state.students[0];
}

function hasStudent(studentId) {
  return state.students.some((student) => student.id === studentId);
}

function getStudent(studentId) {
  return state.students.find((student) => student.id === studentId) || state.students[0];
}

function getGroupName(groupId) {
  const group = state.groups.find((item) => item.id === groupId);
  return group ? group.name : "未分组";
}

function getSnapshot(studentId) {
  return state.snapshots[studentId];
}

function getStudentEvents(studentId) {
  return state.events
    .filter((event) => event.studentId === studentId)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function getRecentEvents(limit) {
  return state.events
    .slice()
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, limit);
}

function getStudentInterventions(studentId) {
  return state.interventions
    .filter((item) => item.studentId === studentId)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

function getVisibleInterventions() {
  const all = state.interventions.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return all.filter((item) => {
    const matchStudent = context.studentId === "all" || !context.studentId || item.studentId === context.studentId;
    const matchType = context.interventionType === "all" || item.interventionType === context.interventionType;
    const matchIssue = context.targetIssue === "all" || item.targetIssue === context.targetIssue;
    return matchStudent && matchType && matchIssue;
  });
}

function getLatestSelfAssessment(studentId) {
  return state.selfAssessments
    .filter((item) => item.studentId === studentId)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
}

function getVisibleStudents() {
  const list = state.students.slice();
  return list
    .filter((student) => {
      if (context.risk === "all") return true;
      return getSnapshot(student.id).riskLevel === context.risk;
    })
    .sort(sortStudentsByPriority);
}

function sortStudentsByPriority(a, b) {
  const left = getSnapshot(a.id);
  const right = getSnapshot(b.id);
  const riskScore = { high: 0, medium: 1, low: 2 };
  if (riskScore[left.riskLevel] !== riskScore[right.riskLevel]) {
    return riskScore[left.riskLevel] - riskScore[right.riskLevel];
  }
  const trendScore = { down: 0, stable: 1, up: 2 };
  if (trendScore[left.trend] !== trendScore[right.trend]) {
    return trendScore[left.trend] - trendScore[right.trend];
  }
  return a.name.localeCompare(b.name, "zh-CN");
}

function sumStudentDelta(studentId) {
  return getStudentEvents(studentId).reduce((sum, event) => sum + Number(event.delta || 0), 0);
}

function parseImportedStudents(raw) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parts = line.split(/[,，|\t]/).map((item) => item.trim()).filter(Boolean);
      if (!parts.length) return null;
      return {
        id: uid("stu"),
        name: parts[0],
        groupName: parts[1] || `第${(index % 4) + 1}组`,
        phaseGoal: parts[2] || "先补齐一周学习证据，再逐步更新个体支持方式。",
      };
    })
    .filter((item) => item && item.name);
}

function applyImportedStudents(importedStudents, replaceRoster) {
  const existingGroups = replaceRoster ? [] : clone(state.groups);
  const existingStudents = replaceRoster ? [] : clone(state.students);
  const existingSnapshots = replaceRoster ? {} : clone(state.snapshots);

  const groupMap = new Map(existingGroups.map((group) => [group.name, group.id]));
  const groups = existingGroups.slice();
  const students = existingStudents.slice();
  const snapshots = { ...existingSnapshots };

  importedStudents.forEach((student, index) => {
    let groupId = groupMap.get(student.groupName);
    if (!groupId) {
      groupId = uid("g");
      groupMap.set(student.groupName, groupId);
      groups.push({
        id: groupId,
        name: student.groupName,
        color: ["sky", "mint", "sun", "rose"][groups.length % 4],
      });
    }

    students.push({
      id: student.id,
      name: student.name,
      groupId,
      seatNo: String(students.length + 1).padStart(2, "0"),
      level: "待更新",
      phaseGoal: student.phaseGoal,
      attentionNote: "当前为新导入学生，建议先累积课堂与作业证据。",
      familyNote: "待补充家校协同信息。",
      watchFlags: ["待补充证据"],
    });
    snapshots[student.id] = createImportedSnapshot(student, index);
  });

  state.groups = groups;
  state.students = students;
  state.snapshots = snapshots;

  if (replaceRoster) {
    state.events = buildImportedEvents(students);
    state.interventions = [];
    state.selfAssessments = [];
  }

  state.classInsights = buildDerivedClassInsights();
  state.reports.weekly = buildDerivedWeeklyReport();
}

function createImportedSnapshot(student, index) {
  const trendSeries = [
    [60, 60, 61, 61, 62, 62],
    [58, 59, 59, 60, 60, 61],
    [62, 62, 62, 63, 63, 64],
    [59, 60, 60, 60, 61, 61],
  ][index % 4];

  return {
    riskLevel: "medium",
    trend: "stable",
    academicStatus: "当前刚完成建档，系统还在等待首轮作业、测验与课堂证据。",
    learningStatus: "建议先记录任务启动速度、独立完成情况与求助时机。",
    emotionStatus: "暂无稳定判断，建议结合课堂状态和自评持续观察。",
    currentBarrier: "待补充首轮学习证据",
    recentChange: "新导入学生尚未形成可解释趋势。",
    bestSupport: "先用低负担观察记录补齐证据，再决定更精准的支架方式。",
    directBehaviors: [
      "优先记录任务开始后的进入速度、是否能按提示推进、是否会主动求助。",
    ],
    taskInferences: [
      "当前只适合做初步推断，建议结合一周作业与课堂任务再更新。",
    ],
    stateSignals: [
      "暂不宜根据一次表现下结论，尤其要避免把短期波动写成稳定特质。",
    ],
    classroomSuggestions: [
      "先安排一到两次结构清晰的小任务，观察其启动与完成节奏。",
    ],
    afterClassSuggestions: [
      "优先保留简短复盘，不急于增加额外练习量。",
    ],
    communicationSuggestions: [
      "与家长沟通时先聚焦近期观察到的行为，不做固定标签判断。",
    ],
    twoWeekTrend: trendSeries,
  };
}

function buildImportedEvents(students) {
  return students.slice(0, 3).map((student, index) => ({
    id: uid("evt"),
    date: state.meta.updatedAt,
    studentId: student.id,
    type: "teacher_observation",
    title: "建档初始记录",
    summary: [
      "已完成学生建档，待补充第一轮课堂观察。",
      "建议先记录任务启动和求助行为。",
      "建议结合一周作业证据更新初始判断。",
    ][index % 3],
    source: "系统建档",
    evidenceLevel: "direct_behavior",
    subject: context.subject,
    delta: 0,
    tag: "onboarding",
  }));
}

function buildDerivedClassInsights() {
  const sorted = state.students.slice().sort(sortStudentsByPriority);
  const attentionToday = sorted.slice(0, Math.min(3, sorted.length)).map((student) => student.id);
  const progressToday = sorted
    .filter((student) => getSnapshot(student.id).trend === "up" || getSnapshot(student.id).riskLevel === "low")
    .slice(0, Math.min(3, sorted.length))
    .map((student) => student.id);
  const barrierMap = new Map();

  state.students.forEach((student) => {
    const barrier = getSnapshot(student.id).currentBarrier;
    barrierMap.set(barrier, (barrierMap.get(barrier) || 0) + 1);
  });

  const commonBottlenecks = Array.from(barrierMap.entries())
    .map(([label, count]) => ({
      label,
      count,
      summary: label === "待补充首轮学习证据"
        ? "班级当前处于初始建档阶段，建议先补齐课堂与作业样本。"
        : `${label} 是当前较常出现的关注点。`,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    attentionToday,
    progressToday: progressToday.length ? progressToday : attentionToday,
    commonBottlenecks: commonBottlenecks.length ? commonBottlenecks : [{
      label: "待补充首轮学习证据",
      count: state.students.length,
      summary: "建议先补齐课堂与作业样本，再更新班级层洞察。",
    }],
    repeatedErrors: commonBottlenecks.slice(0, 3).map((item) => item.label),
    demonstrationStudents: sorted.slice(-2).map((student) => ({
      studentId: student.id,
      reason: "当前可作为任务示范或同伴支持对象，后续随证据更新。",
    })),
    tieredSuggestions: [
      {
        title: "先补证据组",
        action: "先用同一类低负担任务收集任务启动、独立完成和求助行为。",
        studentIds: attentionToday.length ? attentionToday : sorted.slice(0, 3).map((student) => student.id),
      },
      {
        title: "稳定推进组",
        action: "维持当前任务节奏，观察是否能逐步撤掉支架。",
        studentIds: sorted.slice(0, Math.min(3, sorted.length)).map((student) => student.id),
      },
    ],
  };
}

function buildDerivedWeeklyReport() {
  const focusCount = state.classInsights.attentionToday.length;
  const progressCount = state.classInsights.progressToday.length;
  return {
    title: `${state.meta.week} 班级成长支持周报`,
    overview: `${state.meta.className} 当前已建立 ${state.students.length} 位学生档案，系统建议优先关注 ${focusCount} 位需要补充证据或先行支持的学生。`,
    autoSummary: [
      "本周系统更适合先帮助老师建立稳定的证据入口，而不是急着下能力结论。",
      "班级层最需要做的是统一记录任务启动、求助时机和关键错误样本。",
      `${progressCount} 位学生可以作为正向示范对象，帮助课堂建立可见的成功经验。`,
    ],
    nextWeekSuggestions: [
      "先选一类典型任务，统一收集直接观察行为。",
      "把干预记录和效果回填固定下来，避免证据只停留在分散备注里。",
      "每周至少更新一次班级层共性卡点，而不是只看单次测验分数。",
    ],
  };
}

function getInterventionFollowUps() {
  return state.interventions
    .filter((item) => daysBetween(item.date, state.meta.updatedAt) >= 3)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 4)
    .map((item) => {
      const student = getStudent(item.studentId);
      const gap = daysBetween(item.date, state.meta.updatedAt);
      return {
        studentName: student.name,
        interventionType: item.interventionType,
        message: `您${gap}天前对${student.name}进行了【${item.interventionType}】，建议确认“${item.targetIssue}”是否已有缓解。`,
      };
    });
}

function daysBetween(start, end) {
  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T00:00:00`);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return 0;
  return Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
}

function buildRadarPolygon(count, center, radius) {
  return Array.from({ length: count }, (_, index) => {
    const point = radarPoint(index, count, center, radius);
    return `${point.x},${point.y}`;
  }).join(" ");
}

function buildRadarValuePolygon(values, center, radius) {
  return values.map((value, index) => {
    const point = radarValuePoint(index, values.length, center, radius, value);
    return `${point.x},${point.y}`;
  }).join(" ");
}

function radarValuePoint(index, count, center, radius, value) {
  return radarPoint(index, count, center, radius * (value / 100));
}

function radarPoint(index, count, center, radius) {
  const angle = ((Math.PI * 2) / count) * index - Math.PI / 2;
  return {
    x: Number((center + Math.cos(angle) * radius).toFixed(2)),
    y: Number((center + Math.sin(angle) * radius).toFixed(2)),
  };
}

function radarLabelPoint(index, count, center, radius) {
  return radarPoint(index, count, center, radius);
}

function radarAnchor(index, count) {
  if (count === 4) {
    return ["middle", "start", "middle", "end"][index] || "middle";
  }
  return "middle";
}

function renderEventType(type) {
  const mapping = {
    homework: "作业",
    quiz: "测验",
    exam: "考试",
    class_participation: "课堂参与",
    reflection: "学生反思",
    emotion_checkin: "情绪自评",
    teacher_observation: "教师观察",
    intervention: "干预记录",
    self_assessment: "学习偏好自评",
  };
  return mapping[type] || "学习事件";
}

function renderRiskLabel(level) {
  const mapping = { high: "重点关注", medium: "建议跟进", low: "稳步发展" };
  return mapping[level] || "待观察";
}

function renderTrendLabel(trend) {
  const mapping = { up: "趋势上升", down: "趋势下滑", stable: "基本稳定" };
  return mapping[trend] || "趋势待定";
}

function renderRiskClass(level) {
  const mapping = { high: "risk-high", medium: "risk-medium", low: "risk-low" };
  return mapping[level] || "";
}

function renderTrendClass(trend) {
  const mapping = { up: "trend-up", down: "trend-down", stable: "trend-stable" };
  return mapping[trend] || "";
}

function riskColor(level) {
  const mapping = { high: "#ce675c", medium: "#d09542", low: "#4f946e" };
  return mapping[level] || "#5270a4";
}

function formatDate(dateText) {
  const value = new Date(`${dateText}T00:00:00`);
  if (Number.isNaN(value.getTime())) return dateText;
  return `${value.getMonth() + 1}月${value.getDate()}日`;
}

function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36).slice(-5)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
