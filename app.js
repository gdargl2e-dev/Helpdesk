const ISSUE_GUIDES = [
  {
    type: "A망 장애",
    steps: [
      "PC와 랜선 연결 상태를 확인합니다.",
      "업무망 로그인 또는 인증 상태를 다시 확인합니다.",
      "PC를 재부팅한 뒤 A망 접속을 다시 시도합니다.",
      "같은 위치의 다른 사용자도 장애인지 확인합니다."
    ]
  },
  {
    type: "B망 장애",
    steps: [
      "B망 전용 포트와 케이블 연결 상태를 확인합니다.",
      "브라우저를 모두 닫고 다시 접속합니다.",
      "VPN 또는 보안 프로그램 상태를 확인합니다.",
      "동일 사이트 접속 장애가 반복되는지 확인합니다."
    ]
  },
  {
    type: "전화/내선 장애",
    steps: [
      "전화기 전원과 선 연결 상태를 확인합니다.",
      "수화기를 내려놓고 10초 뒤 다시 시도합니다.",
      "다른 내선으로 통화가 가능한지 확인합니다.",
      "특정 번호만 안 되는지 전체 통화가 안 되는지 확인합니다."
    ]
  },
  {
    type: "프린터/복합기 연결 장애",
    steps: [
      "프린터 전원과 네트워크 연결 상태를 확인합니다.",
      "용지 걸림 또는 토너 오류 표시를 확인합니다.",
      "PC의 기본 프린터 설정을 확인합니다.",
      "인쇄 대기열을 삭제한 뒤 다시 출력합니다."
    ]
  }
];

const STORAGE_KEY = "ict-helpdesk-tickets-v1";
const STATUS_FLOW = ["접수", "처리중", "완료"];
const PRIORITY_WEIGHT = { "높음": 3, "보통": 2, "낮음": 1 };

const state = {
  tickets: loadTickets(),
  showCompleted: true,
  completingTicketId: null
};

const guideView = document.querySelector("#guideView");
const ticketsView = document.querySelector("#ticketsView");
const tabs = document.querySelectorAll(".tab");
const guideList = document.querySelector("#guideList");
const issueTypeSelect = document.querySelector("#issueType");
const ticketForm = document.querySelector("#ticketForm");
const ticketList = document.querySelector("#ticketList");
const ticketCount = document.querySelector("#ticketCount");
const clearCompletedBtn = document.querySelector("#clearCompletedBtn");
const completionDialog = document.querySelector("#completionDialog");
const completionNote = document.querySelector("#completionNote");
const saveCompletionBtn = document.querySelector("#saveCompletionBtn");

init();

function init() {
  renderIssueOptions();
  renderGuides();
  renderTickets();
  bindEvents();
}

function bindEvents() {
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => showView(tab.dataset.view));
  });

  ticketForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(ticketForm);
    const ticket = {
      id: crypto.randomUUID(),
      userName: String(formData.get("userName")).trim(),
      contact: String(formData.get("contact")).trim(),
      location: String(formData.get("location")).trim(),
      issueType: String(formData.get("issueType")),
      description: String(formData.get("description")).trim(),
      priority: String(formData.get("priority")),
      createdAt: new Date().toISOString(),
      status: "접수",
      completionNote: ""
    };

    state.tickets.push(ticket);
    saveTickets();
    ticketForm.reset();
    issueTypeSelect.value = ticket.issueType;
    ticketForm.elements.priority.value = "보통";
    renderTickets();
  });

  clearCompletedBtn.addEventListener("click", () => {
    state.showCompleted = !state.showCompleted;
    clearCompletedBtn.textContent = state.showCompleted ? "완료 건 숨기기" : "완료 건 보기";
    renderTickets();
  });

  saveCompletionBtn.addEventListener("click", () => {
    const note = completionNote.value.trim();
    if (!note) {
      completionNote.focus();
      return;
    }

    const ticket = state.tickets.find((item) => item.id === state.completingTicketId);
    if (ticket) {
      ticket.status = "완료";
      ticket.completionNote = note;
      saveTickets();
      renderTickets();
    }

    state.completingTicketId = null;
    completionDialog.close();
    completionNote.value = "";
  });

  completionDialog.addEventListener("close", () => {
    if (completionDialog.returnValue === "cancel") {
      state.completingTicketId = null;
      completionNote.value = "";
    }
  });
}

function renderIssueOptions() {
  issueTypeSelect.innerHTML = ISSUE_GUIDES.map((guide) => {
    return `<option value="${escapeHtml(guide.type)}">${escapeHtml(guide.type)}</option>`;
  }).join("");
}

function renderGuides() {
  guideList.innerHTML = ISSUE_GUIDES.map((guide) => {
    const steps = guide.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("");
    return `
      <article class="guide-card">
        <h3>${escapeHtml(guide.type)}</h3>
        <ol class="checklist">${steps}</ol>
        <button class="primary-button" type="button" data-create-ticket="${escapeHtml(guide.type)}">
          해결 안 됨, 접수하기
        </button>
      </article>
    `;
  }).join("");

  guideList.querySelectorAll("[data-create-ticket]").forEach((button) => {
    button.addEventListener("click", () => {
      showView("tickets");
      issueTypeSelect.value = button.dataset.createTicket;
      document.querySelector("#userName").focus();
    });
  });
}

function renderTickets() {
  const visibleTickets = getSortedTickets().filter((ticket) => {
    return state.showCompleted || ticket.status !== "완료";
  });

  ticketCount.textContent = `${visibleTickets.length}건`;

  if (visibleTickets.length === 0) {
    ticketList.innerHTML = `<div class="empty">표시할 접수 건이 없습니다.</div>`;
    return;
  }

  ticketList.innerHTML = visibleTickets.map((ticket) => {
    const nextStatus = getNextStatus(ticket.status);
    const statusControl = nextStatus
      ? `<button class="status-button" type="button" data-next-status="${ticket.id}">${escapeHtml(nextStatus)}로 변경</button>`
      : `<span class="note">완료 메모: ${escapeHtml(ticket.completionNote)}</span>`;

    return `
      <article class="ticket-card">
        <div class="ticket-top">
          <div>
            <h4 class="ticket-title">${escapeHtml(ticket.issueType)}</h4>
            <div class="ticket-meta">${escapeHtml(ticket.userName)} · ${escapeHtml(ticket.location)} · ${escapeHtml(ticket.contact)}</div>
          </div>
          <time class="ticket-meta" datetime="${ticket.createdAt}">${formatDate(ticket.createdAt)}</time>
        </div>
        <div class="badges">
          <span class="badge ${getPriorityClass(ticket.priority)}">${escapeHtml(ticket.priority)}</span>
          <span class="badge">${escapeHtml(ticket.status)}</span>
        </div>
        <p class="ticket-body">${escapeHtml(ticket.description)}</p>
        ${statusControl}
      </article>
    `;
  }).join("");

  ticketList.querySelectorAll("[data-next-status]").forEach((button) => {
    button.addEventListener("click", () => advanceStatus(button.dataset.nextStatus));
  });
}

function advanceStatus(ticketId) {
  const ticket = state.tickets.find((item) => item.id === ticketId);
  if (!ticket) {
    return;
  }

  const nextStatus = getNextStatus(ticket.status);
  if (nextStatus === "완료") {
    state.completingTicketId = ticket.id;
    completionDialog.showModal();
    completionNote.focus();
    return;
  }

  ticket.status = nextStatus;
  saveTickets();
  renderTickets();
}

function getNextStatus(status) {
  const index = STATUS_FLOW.indexOf(status);
  return STATUS_FLOW[index + 1] || "";
}

function getSortedTickets() {
  return [...state.tickets].sort((a, b) => {
    const priorityDiff = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
}

function showView(viewName) {
  const isGuide = viewName === "guide";
  guideView.classList.toggle("active", isGuide);
  ticketsView.classList.toggle("active", !isGuide);
  tabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.view === viewName);
  });
}

function loadTickets() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTickets() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tickets));
}

function formatDate(value) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function getPriorityClass(priority) {
  if (priority === "높음") {
    return "priority-high";
  }
  if (priority === "보통") {
    return "priority-medium";
  }
  return "priority-low";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
