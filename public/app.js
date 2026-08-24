// TMR Blockchain Explorer
// Frontend application
// Complete replacement for app.js

"use strict";

/* =========================================================
   CONFIG
========================================================= */

const API_BASE = 
   "https://tmr-blockchain.vercel.app";

/* =========================================================
   HELPERS
========================================================= */

const $ = (id) => document.getElementById(id);

async function api(path) {
  const response = await fetch(API_BASE + path, {
    method: "GET",
    headers: {
      Accept: "application/json"
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return await response.json();
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

  return (
    text.slice(0, 14) +
    "…" +
    text.slice(-10)
  );
}

function formatNumber(value) {
  if (value === null || value === undefined) {
    return "0";
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    return String(value);
  }

  return number.toLocaleString();
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

/* =========================================================
   BLOCK HELPERS
========================================================= */

function getBlockHeight(block) {
  return (
    block?.height ??
    block?.blockHeight ??
    block?.index ??
    0
  );
}

function getBlockHash(block) {
  return (
    block?.hash ||
    block?.blockHash ||
    "—"
  );
}

function getPreviousHash(block) {
  return (
    block?.previousHash ||
    block?.prevHash ||
    block?.previous_block_hash ||
    "—"
  );
}

function getBlockTimestamp(block) {
  return (
    block?.timestamp ||
    block?.time ||
    block?.createdAt ||
    "—"
  );
}

function getBlockProposer(block) {
  return (
    block?.proposer ||
    block?.validator ||
    block?.proposerId ||
    "unknown"
  );
}

function getBlockStatus(block) {
  return (
    block?.status ||
    "finalized"
  );
}

function getTransactions(block) {
  if (
    block &&
    Array.isArray(block.transactions)
  ) {
    return block.transactions;
  }

  return [];
}

function transactionCount(block) {
  if (
    block &&
    Array.isArray(block.transactions)
  ) {
    return block.transactions.length;
  }

  if (
    typeof block?.transactionCount === "number"
  ) {
    return block.transactionCount;
  }

  if (
    typeof block?.txCount === "number"
  ) {
    return block.txCount;
  }

  if (
    typeof block?.transactionsCount === "number"
  ) {
    return block.transactionsCount;
  }

  return 0;
}

/* =========================================================
   TRANSACTION HELPERS
========================================================= */

function transactionHash(tx) {
  return (
    tx?.hash ||
    tx?.txHash ||
    tx?.transactionHash ||
    tx?.id ||
    "—"
  );
}

function transactionFrom(tx) {
  return (
    tx?.from ||
    tx?.sender ||
    tx?.fromAddress ||
    "—"
  );
}

function transactionTo(tx) {
  return (
    tx?.to ||
    tx?.receiver ||
    tx?.toAddress ||
    "—"
  );
}

function transactionAmount(tx) {
  return (
    tx?.amount ??
    tx?.value ??
    tx?.quantity ??
    0
  );
}

/* =========================================================
   NETWORK
========================================================= */

async function loadNetwork() {
  try {
    const network = await api(
      "/api/network"
    );

    if ($("status")) {
      $("status").textContent =
        "🟢 Online";
    }

    const latest =
      network?.latestHeight ??
      network?.latestBlock ??
      network?.height ??
      0;

    if ($("height")) {
      $("height").textContent =
        formatNumber(latest);
    }

    const count =
      network?.count ??
      network?.blocks ??
      network?.totalBlocks ??
      0;

    if ($("blocksCount")) {
      $("blocksCount").textContent =
        formatNumber(count);
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

/* =========================================================
   BLOCKS
========================================================= */

async function loadBlocks() {

  const list = $("list");

  if (!list) {
    console.warn(
      "Element #list not found"
    );
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
      Array.isArray(data?.blocks)
    ) {

      blocks = data.blocks;
    }

    /* -----------------------------------------
       IMPORTANT:
       Never modify the API response directly.
    ----------------------------------------- */

    blocks = [...blocks];

    /* -----------------------------------------
       Sort newest block first
    ----------------------------------------- */

    blocks.sort(
      (a, b) =>
        Number(
          getBlockHeight(b)
        ) -
        Number(
          getBlockHeight(a)
        )
    );

    if (!blocks.length) {

      list.innerHTML = `
        <div class="muted">
          No blocks available.
        </div>
      `;

      return;
    }

    list.innerHTML =
      blocks
        .map(
          (block) => {

            const height =
              getBlockHeight(block);

            const hash =
              getBlockHash(block);

            const count =
              transactionCount(block);

            const proposer =
              getBlockProposer(block);

            const status =
              getBlockStatus(block);

            return `
              <article
                class="block"
                data-height="${escapeHTML(
                  height
                )}"
                onclick="showBlock('${escapeHTML(
                  height
                )}')"
                style="cursor:pointer"
              >

                <div class="row">

                  <b>
                    Block #${escapeHTML(
                      height
                    )}
                  </b>

                  <span class="ok">
                    ${escapeHTML(
                      status
                    )}
                  </span>

                </div>

                <div class="hash">
                  ${escapeHTML(
                    shortHash(hash)
                  )}
                </div>

                <div class="muted">

                  ${formatNumber(
                    count
                  )}
                  transaction(s)

                  •

                  ${escapeHTML(
                    proposer
                  )}

                </div>

              </article>
            `;
          }
        )
        .join("");

  } catch (error) {

    console.error(
      "Blocks error:",
      error
    );

    list.innerHTML = `
      <div class="muted">
        ❌ Failed to load blocks.
      </div>
    `;
  }
}

/* =========================================================
   SHOW BLOCK
========================================================= */

async function showBlock(height) {

  const detail = $("detail");

  if (!detail) {
    console.warn(
      "Element #detail not found"
    );
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
      getTransactions(block);

    const hash =
      getBlockHash(block);

    const previousHash =
      getPreviousHash(block);

    const timestamp =
      getBlockTimestamp(block);

    const proposer =
      getBlockProposer(block);

    const status =
      getBlockStatus(block);

    detail.innerHTML = `

      <div class="title">

        <h2>
          Block #${escapeHTML(
            getBlockHeight(block)
          )}
        </h2>

        <button
          type="button"
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

        ${escapeHTML(
          formatDate(timestamp)
        )}

      </p>

      <p>

        <span class="muted">
          Proposer
        </span>

        <br>

        ${escapeHTML(
          proposer
        )}

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
        Transactions
        (${formatNumber(
          transactions.length
        )})
      </h3>

      ${
        transactions.length

          ? transactions
              .map(
                (tx) => `

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

                `
              )
              .join("")

          : `
              <p class="muted">
                No transactions
                in this block.
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
          type="button"
          onclick="closeDetail()"
        >
          Close
        </button>

      </div>

      <p class="muted">

        Unable to load
        block #${escapeHTML(
          height
        )}.

      </p>

    `;
  }
}

/* =========================================================
   CLOSE DETAILS
========================================================= */

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

/* =========================================================
   TRANSACTION SEARCH
========================================================= */

async function searchTransaction(
  hash
) {

  const detail =
    $("detail");

  if (!detail) {
    return;
  }

  try {

    const tx =
      await api(
        "/api/transactions/" +
        encodeURIComponent(hash)
      );

    detail.classList.remove(
      "hidden"
    );

    detail.innerHTML = `

      <div class="title">

        <h2>
          Transaction
        </h2>

        <button
          type="button"
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
      behavior: "smooth",
      block: "start"
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

/* =========================================================
   SEARCH
========================================================= */

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

  /* Block height */

  if (
    /^\d+$/.test(query)
  ) {

    await showBlock(
      query
    );

    return;
  }

  /* Transaction hash */

  await searchTransaction(
    query
  );
}

/* =========================================================
   MESSAGE
========================================================= */

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

/* =========================================================
   VALIDATORS
========================================================= */

async function loadValidators() {

  try {

    const data =
      await api(
        "/api/validators"
      );

    let validators = [];

    if (
      Array.isArray(data)
    ) {

      validators = data;

    } else if (
      Array.isArray(
        data?.validators
      )
    ) {

      validators =
        data.validators;
    }

    let section =
      document.getElementById(
        "validatorsSection"
      );

    /* Create section if missing */

    if (!section) {

      section =
        document.createElement(
          "section"
        );

      section.id =
        "validatorsSection";

      section.className =
        "panel";

      const main =
        document.querySelector(
          "main"
        );

      if (main) {
        main.appendChild(
          section
        );
      }
    }

    /* No validators */

    if (!validators.length) {

      section.innerHTML = `

        <div class="title">

          <h2>
            Validators
          </h2>

        </div>

        <p class="muted">
          No validators available.
        </p>

      `;

      return;
    }

    section.innerHTML = `

      <div class="title">

        <h2>
          Validators
        </h2>

        <button
          type="button"
          onclick="loadValidators()"
        >
          ↻ Refresh
        </button>

      </div>

      <p class="muted">

        ${formatNumber(
          validators.length
        )}
        active /
        ${formatNumber(
          validators.length
        )}
        total validators

      </p>

      <div
        id="validatorList"
      ></div>

    `;

    const validatorList =
      document.getElement
