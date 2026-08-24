const API = window.TMR_API_BASE || "https://tmr-blockchain.vercel.app";

const $ = id => document.getElementById(id);

function short(v){ return v && v.length > 22 ? v.slice(0,12)+"…"+v.slice(-8) : (v ?? "—"); }

async function api(path){
  const r = await fetch(API + path);
  if(!r.ok) throw new Error("API error " + r.status);
  return r.json();
}

async function loadNetwork(){
  try{
    const d = await api("/api/network");
    $("status").textContent = "🟢 Online";
    $("status").style.color = "#86efac";
    $("consensus").textContent = d.consensus?.algorithm || d.algorithm || "Proof-of-Reputation";
  }catch(e){
    $("status").textContent = "🔴 Offline";
    $("message").textContent = "Could not connect to the TMR API.";
  }
}

async function loadBlocks(){
  $("blocks").textContent = "Loading…";
  try{
    const d = await api("/api/blocks");
    $("height").textContent = d.latestHeight ?? "—";
    $("count").textContent = d.count ?? d.blocks?.length ?? "—";
    const blocks = d.blocks || [];
    $("blocks").innerHTML = blocks.map(b => `
      <article class="block" onclick="showBlock(${Number(b.height)})">
        <div class="row">
          <strong>Block #${b.height}</strong>
          <span class="ok">${b.status || "Finalized"}</span>
        </div>
        <div class="hash">${short(b.hash)}</div>
        <div class="muted">${b.transactionCount ?? 0} transaction(s) • ${b.proposer || "—"}</div>
      </article>
    `).join("") || "No blocks found.";
  }catch(e){
    $("blocks").textContent = "Failed to load blocks.";
  }
}

async function showBlock(height){
  try{
    const b = await api("/api/blocks/" + encodeURIComponent(height));
    const txs = b.transactions || [];
    $("details").classList.remove("hidden");
    $("details").innerHTML = `
      <div class="panel-head"><h2>Block #${b.height}</h2><button class="refresh" onclick="closeDetails()">Close</button></div>
      <p><span class="muted">Hash</span><br><span class="hash">${b.hash || "—"}</span></p>
      <p><span class="muted">Previous Hash</span><br><span class="hash">${b.previousHash || "—"}</span></p>
      <p><span class="muted">Timestamp</span><br>${b.timestamp || "—"}</p>
      <p><span class="muted">Proposer</span><br>${b.proposer || "—"}</p>
      <p><span class="muted">Status</span><br><span class="ok">${b.status || "Finalized"}</span></p>
      <h3>Transactions (${txs.length})</h3>
      ${txs.map(t=>`<div class="block"><div class="hash">${short(t.hash)}</div><div class="muted">${t.from || "—"} → ${t.to || "—"} • ${t.amount ?? 0}</div></div>`).join("") || "<p class='muted'>No transactions.</p>"}
    `;
    $("details").scrollIntoView({behavior:"smooth"});
  }catch(e){
    $("message").textContent = "Block details could not be loaded.";
  }
}

function closeDetails(){ $("details").classList.add("hidden"); }

async function doSearch(){
  const q = $("search").value.trim();
  if(!q) return;
  if(/^\d+$/.test(q)){ await showBlock(q); return; }
  $("message").textContent = "Search API can be connected next for transaction/address lookup.";
}

loadNetwork();
loadBlocks();
