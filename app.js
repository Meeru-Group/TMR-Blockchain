// TMR Blockchain Explorer
// Frontend application
// Version: 2.0

const API_BASE = "";

/* ---------------------------------
   HELPERS
---------------------------------- */

const $ = (id) => document.getElementById(id);

async function api(path, options = {}) {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 10000);

  try {
    const response = await fetch(API_BASE + path, {
      method: "GET",

      headers: {
        "Accept": "application/json"
      },

      cache: "no-store",

      signal: controller.signal,

      ...options
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const text = await response.text();

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
    clearTimeout(timeout);
  }
}

function shortHash(value) {

  if (!value) {
    return "—";
  }

  const text = String(value);

  if (text.length <= 28) {
    return text;
  }

  return (
    text.slice(0, 14) +
    "…" +
    text.slice(-10)
  );
}

function escapeHTML(value) {

  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ---------------------------------
   TRANSACTION HELPERS
---------------------------------- */

function transactionCount(block) {

  if (
    Array.isArray(block.transactions)
  ) {
    return block.transactions.length;
  }

  if (
    typeof block.transactionCount === "number"
  ) {
    return block.transactionCount;
  }

  if (
    typeof block.txCount === "number"
  ) {
    return block.txCount;
  }

  if (
    typeof block.transactionsCount === "number"
  ) {
    return block.transactionsCount;
  }

  return 0;
}

function blockProposer(block) {

  return (
    block.proposer ||
    block.validator ||
    block.proposerId ||
    "unknown"
  );
}

function blockStatus(block) {

  return (
    block.status ||
    "finalized"
  );
}

function transactionHash(tx) {

  return (
    tx.hash ||
    tx.txHash ||
    tx.transactionHash ||
    tx.id ||
    "—"
  );
}

function transactionFrom(tx) {

  return (
    tx.from ||
    tx.sender ||
    tx.fromAddress ||
    "—"
  );
}

function transactionTo(tx) {

  return (
    tx.to ||
    tx.receiver ||
    tx.toAddress ||
    "—"
  );
}

function transactionAmount(tx) {

  return (
    tx.amount ??
    tx.value ??
    tx.quantity ??
    0
  );
}

/* ---------------------------------
   NETWORK
---------------------------------- */

async function loadNetwork() {

  try {

    const network =
      await api("/api/network");

    if ($("status")) {

      $("status").textContent =
        "🟢 Online";

    }

    const latestHeight =
      network.latestHeight ??
      network.latestBlock ??
      network.height ??
      network.latestBlockNumber ??
      "—";

    if ($("height")) {

      $("height").textContent =
        latestHeight;

    }

    const blocksCount =
      network.count ??
      network.blocks ??
      network.totalBlocks ??
      network.blockCount ??
      "—";

    if ($("blocksCount")) {

      $("blocksCount").textContent =
        blocksCount;

    }

    if ($("latestBlock")) {

      $("latestBlock").textContent =
        latestHeight;

    }

    return network;

  } catch (error) {

    console.error(
      "Network error:",
      error
    );

    if ($("status")) {

      $("status").textContent =
        "🔴 Offline";

    }

    throw error;
  }
}

/* ---------------------------------
   BLOCKS
---------------------------------- */

async function loadBlocks() {

  const list = $("list");

  if (!list) {
    return;
  }

  try {

    list.innerHTML = `
      <div class="muted">
        Loading latest blocks...
      </div>
    `;

    const data =
      await api("/api/blocks");

    let blocks = [];

    if (Array.isArray(data)) {

      blocks = data;

    } else if (
      Array.isArray(data.blocks)
    ) {

      blocks = data.blocks;

    } else if (
      Array.isArray(data.data)
    ) {

      blocks = data.data;

    }

    if (!blocks.length) {

      list.innerHTML = `
        <div class="muted">
          No blocks available.
        </div>
      `;

      updateBlockCounters(0);

      return;
    }

    blocks.sort((a, b) => {

      return (
        Number(
          b.height ??
          b.blockNumber ??
          0
        ) -
        Number(
          a.height ??
          a.blockNumber ??
          0
        )
      );

    });

    updateBlockCounters(
      blocks.length
    );

    list.innerHTML =
      blocks
        .map((block) => {

          const height =
            block.height ??
            block.blockNumber ??
            0;

          const hash =
            block.hash ||
            block.blockHash ||
            "—";

          const count =
            transactionCount(block);

          const proposer =
            blockProposer(block);

          const status =
            blockStatus(block);

          return `
            <article
              class="block"
              onclick="showBlock(${Number(height)})"
              style="cursor:pointer"
            >

              <div class="row">

                <b>
                  Block #${escapeHTML(height)}
                </b>

                <span class="ok">
                  ${escapeHTML(status)}
                </span>

              </div>

              <div class="hash">
                ${escapeHTML(
                  shortHash(hash)
                )}
              </div>

              <div class="muted">

                ${escapeHTML(count)}
                transaction(s)

                •
                
                ${escapeHTML(proposer)}

              </div>

            </article>
          `;

        })
        .join("");

  } catch (error) {

    console.error(
      "Blocks error:",
      error
    );

    list.innerHTML = `
      <div class="muted">

        ❌ Failed to load blocks.

        <br><br>

        ${escapeHTML(
          error.message
        )}

      </div>
    `;

  }
}

function updateBlockCounters(count) {

  if ($("blocksCount")) {

    $("blocksCount").textContent =
      count;

  }

  if ($("blocks")) {

    $("blocks").textContent =
      count;

  }
}

/* ---------------------------------
   BLOCK DETAILS
---------------------------------- */

async function showBlock(height) {

  const detail = $("detail");

  if (!detail) {
    return;
  }

  try {

    detail.classList.remove(
      "hidden"
    );

    detail.innerHTML = `
      <div class="muted">

        Loading block #${escapeHTML(
          height
        )}...

      </div>
    `;

    const block =
      await api(
        "/api/blocks/" +
        encodeURIComponent(height)
      );

    const transactions =
      Array.isArray(
        block.transactions
      )
        ? block.transactions
        : [];

    const hash =
      block.hash ||
      block.blockHash ||
      "—";

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

    const proposer =
      blockProposer(block);

    const status =
      blockStatus(block);

    detail.innerHTML = `

      <div class="title">

        <h2>
          Block #${escapeHTML(
            block.height ??
            height
          )}
        </h2>

        <button
          onclick="closeDetail()"
        >
          Close
        </button>

      </div>

      <p>

        <span class="muted">
          Block Hash
        </span>

        <br>

        <span class="hash">
          ${escapeHTML(hash)}
        </span>

      </p>

      <p>

        <span class="muted">
          Previous Hash
        </span>

        <br>

        <span class="hash">
          ${escapeHTML(
            previousHash
          )}
        </span>

      </p>

      <p>

        <span class="muted">
          Timestamp
        </span>

        <br>

        ${escapeHTML(timestamp)}

      </p>

      <p>

        <span class="muted">
          Proposer
        </span>

        <br>

        ${escapeHTML(proposer)}

      </p>

      <p>

        <span class="muted">
          Status
        </span>

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
              .map((tx) => {

                return `

                  <div class="block">

                    <div class="hash">

                      ${escapeHTML(
                        transactionHash(tx)
                      )}

                    </div>

                    <div class="muted">

                      ${escapeHTML(
                        transactionFrom(tx)
                      )}

                      →

                      ${escapeHTML(
                        transactionTo(tx)
                      )}

                      • Amount:

                      ${escapeHTML(
                        transactionAmount(tx)
                      )}

                    </div>

                  </div>

                `;

              })
              .join("")

          : `

            <p class="muted">
              No transactions in this block.
            </p>

          `
      }

    `;

    detail.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

  } catch (error) {

    console.error(
      "Block details error:",
      error
    );

    detail.classList.remove(
      "hidden"
    );

    detail.innerHTML = `

      <div class="title">

        <h2>
          Block not found
        </h2>

        <button
          onclick="closeDetail()"
        >
          Close
        </button>

      </div>

      <p class="muted">

        Unable to load block
        #${escapeHTML(height)}.

        <br><br>

        ${escapeHTML(
          error.message
        )}

      </p>

    `;

  }
}

/* ---------------------------------
   CLOSE DETAILS
---------------------------------- */

function closeDetail() {

  const detail =
    $("detail");

  if (!detail) {
    return;
  }

  detail.classList.add(
    "hidden"
  );

  detail.innerHTML = "";
}

/* ---------------------------------
   TRANSACTION SEARCH
---------------------------------- */

async function searchTransaction(
  hash
) {

  try {

    const tx =
      await api(
        "/api/transactions/" +
        encodeURIComponent(hash)
      );

    const detail =
      $("detail");

    if (!detail) {
      return;
    }

    detail.classList.remove(
      "hidden"
    );

    detail.innerHTML = `

      <div class="title">

        <h2>
          Transaction
        </h2>

        <button
          onclick="closeDetail()"
        >
          Close
        </button>

      </div>

      <p>

        <span class="muted">
          Transaction Hash
        </span>

        <br>

        <span class="hash">

          ${escapeHTML(
            transactionHash(tx)
          )}

        </span>

      </p>

      <p>

        <span class="muted">
          From
        </span>

        <br>

        ${escapeHTML(
          transactionFrom(tx)
        )}

      </p>

      <p>

        <span class="muted">
          To
        </span>

        <br>

        ${escapeHTML(
          transactionTo(tx)
        )}

      </p>

      <p>

        <span class="muted">
          Amount
        </span>

        <br>

        ${escapeHTML(
          transactionAmount(tx)
        )}

      </p>

    `;

    detail.scrollIntoView({
      behavior: "smooth"
    });

  } catch (error) {

    console.error(
      "Transaction error:",
      error
    );

    showMessage(
      "❌ Transaction not found."
    );

  }
}

/* ---------------------------------
   SEARCH
---------------------------------- */

async function search() {

  const input =
    $("q");

  if (!input) {
    return;
  }

  const query =
    input.value.trim();

  if (!query) {

    showMessage(
      "Please enter a block height or transaction hash."
    );

    return;
  }

  clearMessage();

  if (/^\d+$/.test(query)) {

    await showBlock(query);

    return;
  }

  await searchTransaction(
    query
  );
}

/* ---------------------------------
   MESSAGE
---------------------------------- */

function showMessage(
  message
) {

  const msg =
    $("msg");

  if (!msg) {
    return;
  }

  msg.textContent =
    message;
}

function clearMessage() {

  const msg =
    $("msg");

  if (!msg) {
    return;
  }

  msg.textContent = "";
}

/* ---------------------------------
   VALIDATORS
---------------------------------- */

async function loadValidators() {

  const section =
    document.getElementById(
      "validatorsSection"
    );

  try {

    const data =
      await api(
        "/api/validators"
      );

    let validators = [];

    if (Array.isArray(data)) {

      validators = data;

    } else if (
      Array.isArray(
        data.validators
      )
    ) {

      validators =
        data.validators;

    }

    let target = section;

    if (!target) {

      target =
        document.createElement(
          "section"
        );

      target.id =
        "validatorsSection";

      target.className =
        "panel";

      const main =
        document.querySelector(
          "main"
        );

      if (main) {
        main.appendChild(
          target
        );
      }
    }

    if (!validators.length) {

      target.innerHTML = `

        <div class="title">

          <h2>
            Validators
          </h2>

          <button
            onclick="loadValidators()"
          >
            ↻ Refresh
          </button>

        </div>

        <p class="muted">
          No validators available.
        </p>

      `;

      return;
    }

    const totalValidators =
      data.totalValidators ??
      validators.length;

    const activeValidators =
      data.activeValidators ??
      validators.filter(
        (v) =>
          String(
            v.status ||
            "active"
          ).toLowerCase() ===
          "active"
      ).length;

    target.innerHTML = `

      <div class="title">

        <h2>
          Validators
        </h2>

        <button
          onclick="loadValidators()"
        >
          ↻ Refresh
        </button>

      </div>

      <p class="muted">

        ${escapeHTML(
          activeValidators
        )}
        active /

        ${escapeHTML(
          totalValidators
        )}
        total validators

      </p>

      <div id="validatorList">
      </div>

    `;

    const validatorList =
      document.getElementById(
        "validatorList"
      );

    validatorList.innerHTML =
      validators
        .map(
          (validator) => {

            const id =
              validator.validatorId ||
              validator.id ||
              validator.name ||
              "unknown-validator";

            const reputation =
              validator.reputation ??
              validator.reputationScore ??
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

            const uptime =
              validator.uptime ??
              100;

            const participation =
              validator.participationRate ??
              validator.participation ??
              100;

            const status =
              validator.status ||
              "active";

            return `

              <article class="block">

                <div class="row">

                  <b>

                    🛡️
                    ${escapeHTML(id)}

                  </b>

                  <span class="ok">

                    🟢
                    ${escapeHTML(
                      status
                    )}

                  </span>

                </div>

                <h2>

                  ${escapeHTML(
                    reputation
                  )}

                  <span class="muted">
                    Reputation
                  </span>

                </h2>

                <p>

                  <span class="muted">
                    Public Key
                  </span>

                  <br>

                  <span class="hash">

                    ${escapeHTML(
                      publicKey
                    )}

                  </span>

                </p>

                <div class="stats">

                  <div>

                    <small>
                      Blocks Proposed
                    </small>

                    <strong>
                      ${escapeHTML(
                        proposed
                      )}
                    </strong>

                  </div>

                  <div>

                    <small>
                      Blocks Validated
                    </small>

                    <strong>
                      ${escapeHTML(
                        validated
                      )}
                    </strong>

                  </div>

                  <div>

                    <small>
                      Uptime
                    </small>

                    <strong>

                      ${escapeHTML(
                        Number(
                          uptime
                        ).toFixed(2)
                      )}%

                    </strong>

                  </div>

                  <div>

                    <small>
                      Participation
                    </small>

                    <strong>

                      ${escapeHTML(
                        Number(
                          participation
                        ).toFixed(2)
                      )}%

                    </strong>

                  </div>

                </div>

              </article>

            `;

          }
        )
        .join("");

  } catch (error) {

    console.warn(
      "Validators API unavailable:",
      error
    );

    if (section) {

      section.innerHTML = `

        <div class="title">

          <h2>
            Validators
          </h2>

          <button
            onclick="loadValidators()"
          >
            ↻ Retry
          </button>

        </div>

        <p class="muted">

          ⚠️ Unable to load validators.

          <br>

          ${escapeHTML(
            error.message
          )}

        </p>

      `;

    }

  }
}

/* ---------------------------------
   REFRESH ALL
---------------------------------- */

async function load() {

  clearMessage();

  if ($("status")) {

    $("status").textContent =
      "🟡 Checking...";

  }

  try {

    await loadNetwork();

  } catch (error) {

    console.error(
      "Network loading failed:",
      error
    );

  }

  try {

    await loadBlocks();

  } catch (error) {

    console.error(
      "Blocks loading failed:",
      error
    );

  }

  try {

    await loadValidators();

  } catch (error) {

    console.error(
      "Validators loading failed:",
      error
    );

  }

}

/* ---------------------------------
   AUTO REFRESH
---------------------------------- */

let refreshTimer = null;

function startAutoRefresh() {

  if (refreshTimer) {

    clearInterval(
      refreshTimer
    );

  }

  refreshTimer =
    setInterval(
      () => {

        load();

      },
      30000
    );

}

/* ---------------------------------
   ENTER KEY SEARCH
---------------------------------- */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const input =
      $("q");

    if (input) {

      input.addEventListener(
        "keydown",
        (event) => {

          if (
            event.key === "Enter"
          ) {

            search();

          }

        }
      );

    }

    load();

    startAutoRefresh();

  }
);

/* ---------------------------------
   GLOBAL FUNCTIONS
---------------------------------- */

window.search =
  search;

window.showBlock =
  showBlock;

window.closeDetail =
  closeDetail;

window.loadValidators =
  loadValidators;

window.load =
  load;

window.startAutoRefresh =
  startAutoRefresh;
