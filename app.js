// TMR Blockchain Explorer
// Frontend application
// Fixed API response handling + mobile friendly UI

const API_BASE = window.location.origin;

const $ = (id) => document.getElementById(id);

let refreshTimer = null;

async function api(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(API_BASE + path, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store",
      signal: controller.signal
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Invalid JSON response");
    }
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("API request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function shortHash(value) {
  if (!value) return "—";

  const text = String(value);

  if (text.length <= 28) {
    return text;
  }

  return text.slice(0, 14) + "…" + text.slice(-10);
}

function getBlockHeight(block) {
  return block?.height ?? block?.blockNumber ?? 0;
}

function getBlockHash(block) {
  return block?.hash || block?.blockHash || "—";
}

function getTransactions(block) {
  return Array.isArray(block?.transactions)
    ? block.transactions
    : [];
}

function getTransactionCount(block) {
  if (Array.isArray(block?.transactions)) {
    return block.transactions.length;
  }

  const count =
    block?.transactionCount ??
    block?.txCount ??
    block?.transactionsCount ??
    0;

  const number = Number(count);
  return Number.isFinite(number) ? number : 0;
}

function getProposer(block) {
  return (
    block?.proposer ||
    block?.validator ||
    block?.proposerId ||
    "—"
  );
}

function getStatus(block) {
  return block?.status || "finalized";
}

function getTransactionHash(tx) {
  return (
    tx?.hash ||
    tx?.txHash ||
    tx?.transactionHash ||
    tx?.id ||
    "—"
  );
}

function getTransactionFrom(tx) {
  return (
    tx?.from ||
    tx?.sender ||
    tx?.fromAddress ||
    "—"
  );
}

function getTransactionTo(tx) {
  return (
    tx?.to ||
    tx?.receiver ||
    tx?.toAddress ||
    "—"
  );
}

function getTransactionAmount(tx) {
  return (
    tx?.amount ??
    tx?.value ??
    tx?.quantity ??
    0
  );
}

function setStatus(text) {
  if ($("status")) {
    $("status").textContent = text;
  }
}

function showMessage(message) {
  if ($("msg")) {
    $("msg").textContent = message || "";
  }
}

function clearMessage() {
  showMessage("");
}

/* ---------------------------------
   NETWORK
---------------------------------- */

async function loadNetwork() {
  try {
    const data = await api("/api/network");

    // IMPORTANT:
    // server.js returns:
    // { success: true, network: {...} }
    const network = data.network || data;

    setStatus("🟢 Online");

    const latestBlock =
      network.latestBlockNumber ??
      network.latestHeight ??
      network.latestBlock ??
      network.height ??
      0;

    if ($("height")) {
      $("height").textContent = latestBlock;
    }

    if ($("blocksCount")) {
      $("blocksCount").textContent =
        network.totalBlocks ??
        network.count ??
        network.blocks ??
        "—";
    }

    return network;
  } catch (error) {
    console.error("Network error:", error);
    setStatus("🔴 Offline");
    throw error;
  }
}

/* ---------------------------------
   TRANSACTIONS COUNT
---------------------------------- */

async function loadTransactionCount() {
  try {
    const data = await api("/api/transactions");

    if ($("txCount")) {
      $("txCount").textContent =
        data.total ??
        data.totalTransactions ??
        (Array.isArray(data.transactions)
          ? data.transactions.length
          : 0);
    }
  } catch (error) {
    console.error("Transaction count error:", error);

    if ($("txCount")) {
      $("txCount").textContent = "0";
    }
  }
}

/* ---------------------------------
   BLOCKS
---------------------------------- */

async function loadBlocks() {
  const list = $("list");

  if (!list) return;

  list.innerHTML = `
    <div class="muted">
      Loading latest blocks…
    </div>
  `;

  try {
    const data = await api("/api/blocks");

    let blocks = [];

    if (Array.isArray(data)) {
      blocks = data;
    } else if (Array.isArray(data.blocks)) {
      blocks = data.blocks;
    } else if (Array.isArray(data.data)) {
      blocks = data.data;
    }

    if (!blocks.length) {
      list.innerHTML = `
        <div class="muted">
          No blocks available.
        </div>
      `;
      return;
    }

    blocks.sort(
      (a, b) =>
        Number(getBlockHeight(b)) -
        Number(getBlockHeight(a))
    );

    list.innerHTML = blocks
      .map((block) => {
        const height = getBlockHeight(block);
        const hash = getBlockHash(block);
        const count = getTransactionCount(block);
        const proposer = getProposer(block);
        const status = getStatus(block);

        return `
          <article
            class="block"
            data-height="${escapeHTML(height)}"
            role="button"
            tabindex="0"
          >
            <div class="row">
              <b>Block #${escapeHTML(height)}</b>

              <span class="ok">
                ${escapeHTML(status)}
              </span>
            </div>

            <div class="hash">
              ${escapeHTML(shortHash(hash))}
            </div>

            <div class="muted">
              ${escapeHTML(count)} transaction(s)
              •
              ${escapeHTML(proposer)}
            </div>
          </article>
        `;
      })
      .join("");

    // Attach click handlers safely.
    list.querySelectorAll(".block").forEach((element) => {
      const height = element.dataset.height;

      element.addEventListener("click", () => {
        showBlock(height);
      });

      element.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          showBlock(height);
        }
      });
    });

    // The API has the authoritative total count.
    if ($("blocksCount")) {
      $("blocksCount").textContent =
        data.total ?? blocks.length;
    }
  } catch (error) {
    console.error("Blocks error:", error);

    list.innerHTML = `
      <div class="error">
        ❌ Failed to load blocks.
        <br>
        ${escapeHTML(error.message)}
      </div>
    `;
  }
}

/* ---------------------------------
   BLOCK DETAILS
---------------------------------- */

async function showBlock(height) {
  const detail = $("detail");

  if (!detail) return;

  detail.classList.remove("hidden");

  detail.innerHTML = `
    <div class="muted">
      Loading block #${escapeHTML(height)}…
    </div>
  `;

  try {
    const data = await api(
      "/api/blocks/" + encodeURIComponent(height)
    );

    // IMPORTANT:
    // server.js returns { success: true, block: {...}, ... }
    const block = data.block || data;

    const transactions = getTransactions(block);
    const hash = getBlockHash(block);

    const previousHash =
      block.previousHash ||
      block.prevHash ||
      block.previous_block_hash ||
      "—";

    const timestamp =
      block.timestamp ||
      block.time ||
      block.createdAt ||
      "—";

    const proposer = getProposer(block);
    const status = getStatus(block);

    detail.innerHTML = `
      <div class="title">
        <h2>
          Block #${escapeHTML(
            getBlockHeight(block)
          )}
        </h2>

        <button id="closeDetail" type="button">
          Close
        </button>
      </div>

      <p>
        <span class="muted">Block Hash</span>
        <br>
        <span class="hash">
          ${escapeHTML(hash)}
        </span>
      </p>

      <p>
        <span class="muted">Previous Hash</span>
        <br>
        <span class="hash">
          ${escapeHTML(previousHash)}
        </span>
      </p>

      <p>
        <span class="muted">Timestamp</span>
        <br>
        ${escapeHTML(timestamp)}
      </p>

      <p>
        <span class="muted">Proposer</span>
        <br>
        ${escapeHTML(proposer)}
      </p>

      <p>
        <span class="muted">Status</span>
        <br>
        <span class="ok">
          ${escapeHTML(status)}
        </span>
      </p>

      <h3>
        Transactions (${transactions.length})
      </h3>

      ${
        transactions.length
          ? transactions
              .map(
                (tx) => `
                  <div class="block">
                    <div class="hash">
                      ${escapeHTML(
                        getTransactionHash(tx)
                      )}
                    </div>

                    <div class="muted">
                      ${escapeHTML(
                        getTransactionFrom(tx)
                      )}
                      →
                      ${escapeHTML(
                        getTransactionTo(tx)
                      )}
                      • Amount:
                      ${escapeHTML(
                        getTransactionAmount(tx)
                      )}
                    </div>
                  </div>
                `
              )
              .join("")
          : `
              <p class="muted">
                No transactions in this block.
              </p>
            `
      }
    `;

    $("closeDetail")?.addEventListener(
      "click",
      closeDetail
    );

    detail.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  } catch (error) {
    console.error("Block details error:", error);

    detail.innerHTML = `
      <div class="title">
        <h2>Block not found</h2>

        <button id="closeDetail" type="button">
          Close
        </button>
      </div>

      <p class="error">
        Unable to load block #${escapeHTML(height)}.
        <br>
        ${escapeHTML(error.message)}
      </p>
    `;

    $("closeDetail")?.addEventListener(
      "click",
      closeDetail
    );
  }
}

function closeDetail() {
  const detail = $("detail");

  if (!detail) return;

  detail.classList.add("hidden");
  detail.innerHTML = "";
}

/* ---------------------------------
   TRANSACTION SEARCH
---------------------------------- */

async function searchTransaction(hash) {
  try {
    const data = await api(
      "/api/transactions/" +
      encodeURIComponent(hash)
    );

    const tx = data.transaction || data;
    const detail = $("detail");

    if (!detail) return;

    detail.classList.remove("hidden");

    detail.innerHTML = `
      <div class="title">
        <h2>Transaction</h2>

        <button id="closeDetail" type="button">
          Close
        </button>
      </div>

      <p>
        <span class="muted">
          Transaction Hash
        </span>
        <br>
        <span class="hash">
          ${escapeHTML(getTransactionHash(tx))}
        </span>
      </p>

      <p>
        <span class="muted">From</span>
        <br>
        ${escapeHTML(getTransactionFrom(tx))}
      </p>

      <p>
        <span class="muted">To</span>
        <br>
        ${escapeHTML(getTransactionTo(tx))}
      </p>

      <p>
        <span class="muted">Amount</span>
        <br>
        ${escapeHTML(getTransactionAmount(tx))}
      </p>
    `;

    $("closeDetail")?.addEventListener(
      "click",
      closeDetail
    );

    detail.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  } catch (error) {
    console.error("Transaction error:", error);
    showMessage("❌ Transaction not found.");
  }
}

/* ---------------------------------
   SEARCH
---------------------------------- */

async function searchChain() {
  const input = $("q");

  if (!input) return;

  const query = input.value.trim();

  if (!query) {
    showMessage(
      "Please enter a block height or transaction hash."
    );
    return;
  }

  clearMessage();

  if (/^\d+$/.test(query)) {
    await showBlock(query);
  } else {
    await searchTransaction(query);
  }
}

/* ---------------------------------
   VALIDATORS
---------------------------------- */

async function loadValidators() {
  const container = $("validators");
  const summary = $("validatorSummary");

  if (!container || !summary) return;

  container.innerHTML = `
    <div class="muted">
      Loading validators…
    </div>
  `;

  try {
    const data = await api("/api/validators");

    const validators = Array.isArray(data.validators)
      ? data.validators
      : Array.isArray(data)
        ? data
        : [];

    const total =
      data.totalValidators ??
      validators.length;

    const active =
      data.activeValidators ??
      validators.filter(
        (validator) =>
          String(
            validator.status || "active"
          ).toLowerCase() === "active"
      ).length;

    summary.textContent =
      `${active} active / ${total} total validators`;

    if (!validators.length) {
      container.innerHTML = `
        <p class="muted">
          No validators found.
        </p>
      `;
      return;
    }

    container.innerHTML = validators
      .map((validator) => {
        const id =
          validator.validatorId ||
          validator.id ||
          "unknown-validator";

        const reputation =
          validator.reputationScore ??
          validator.reputation ??
          0;

        const publicKey =
          validator.publicKey ||
          validator.public_key ||
          "—";

        const proposed =
          validator.blocksProposed ??
          validator.proposedBlocks ??
          0;

        const validated =
          validator.blocksValidated ??
          validator.validatedBlocks ??
          0;

        const status =
          validator.status ||
          "active";

        const uptime =
          validator.uptime ??
          "—";

        const participation =
          validator.participationRate ??
          validator.participation ??
          "—";

        return `
          <article class="validator">
            <div class="validator-top">
              <div class="validator-id">
                🛡️ ${escapeHTML(id)}
              </div>

              <div class="active">
                ● ${escapeHTML(status)}
              </div>
            </div>

            <div class="reputation">
              ${escapeHTML(reputation)}
              <span class="muted">
                Reputation
              </span>
            </div>

            <div class="validator-info">
              Public Key:
              <span class="hash">
                ${escapeHTML(publicKey)}
              </span>
            </div>

            <div class="validator-stats">
              <div class="mini-stat">
                <small>Blocks Proposed</small>
                <b>${escapeHTML(proposed)}</b>
              </div>

              <div class="mini-stat">
                <small>Blocks Validated</small>
                <b>${escapeHTML(validated)}</b>
              </div>

              <div class="mini-stat">
                <small>Uptime</small>
                <b>${escapeHTML(uptime)}</b>
              </div>

              <div class="mini-stat">
                <small>Participation</small>
                <b>${escapeHTML(participation)}</b>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Validator error:", error);

    summary.textContent =
      "Validator API error";

    container.innerHTML = `
      <p class="error">
        ❌ Unable to load validators.
        <br>
        ${escapeHTML(error.message)}
      </p>
    `;
  }
}

/* ---------------------------------
   LOAD EVERYTHING
---------------------------------- */

async function load() {
  clearMessage();
  setStatus("🟡 Checking…");

  await Promise.allSettled([
    loadNetwork(),
    loadTransactionCount(),
    loadBlocks(),
    loadValidators()
  ]);

  // If network failed but blocks/API work, show a useful state.
  if ($("status")?.textContent === "🟡 Checking…") {
    setStatus("🔴 Offline");
  }
}

/* ---------------------------------
   AUTO REFRESH
---------------------------------- */

function startAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  refreshTimer = setInterval(() => {
    load();
  }, 30000);
}

/* ---------------------------------
   START
---------------------------------- */

document.addEventListener("DOMContentLoaded", () => {
  $("searchButton")?.addEventListener(
    "click",
    searchChain
  );

  $("refreshValidators")?.addEventListener(
    "click",
    loadValidators
  );

  $("refreshBlocks")?.addEventListener(
    "click",
    loadBlocks
  );

  $("q")?.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") {
        searchChain();
      }
    }
  );

  load();
  startAutoRefresh();
});

/* Global functions for compatibility */
window.searchChain = searchChain;
window.search = searchChain;
window.load = load;
window.loadNetwork = loadNetwork;
window.loadBlocks = loadBlocks;
window.loadValidators = loadValidators;
window.showBlock = showBlock;
window.closeDetail = closeDetail;
window.searchTransaction = searchTransaction;
window.startAutoRefresh = startAutoRefresh;
