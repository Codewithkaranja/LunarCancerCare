// navigation.js

/**
 * Initialize sidebar navigation dynamically
 * @param {Array} navItems - [{id, icon, label}]
 */
export function initSidebarNavigation(navItems = []) {
  const sidebarNav = document.getElementById("sidebarNav");
  if (!sidebarNav) return;

  sidebarNav.innerHTML = ""; // clear existing links

  navItems.forEach((item) => {
    const link = document.createElement("a");
    link.href = "#";
    link.dataset.section = item.id;
    link.innerHTML = `<i class="fa ${item.icon}"></i> <span>${item.label}</span>`;
    sidebarNav.appendChild(link);
  });

  // Bind click events
  sidebarNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      showSection(link.dataset.section);
      highlightActive(link.dataset.section);
    });
  });

  // Highlight default section
  showSection("dashboard");
}

/**
 * Show a section, hide others
 * @param {string} sectionId
 */
export function showSection(sectionId) {
  document.querySelectorAll(".section").forEach((sec) => {
    sec.style.display = sec.id === `${sectionId}Section` ? "block" : "none";
  });
}

/**
 * Highlight the active sidebar link
 * @param {string} sectionId
 */
export function highlightActive(sectionId) {
  document.querySelectorAll("#sidebarNav a").forEach((link) => {
    link.classList.toggle(
      "active",
      link.dataset.section === sectionId
    );
  });
}

/**
 * Apply role-based access to sidebar links
 * @param {string} role
 */
export function applyRoleAccess(role) {
  const links = document.querySelectorAll("#sidebarNav a");
  links.forEach((link) => {
    const restricted = ["staff", "inventory"];
    if (!["admin", "superadmin"].includes(role)) {
      if (restricted.includes(link.dataset.section)) {
        link.style.display = "none";
      }
    }
  });
}
