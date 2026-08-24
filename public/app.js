async function api(p){
  const r=await fetch(p);
  if(!r.ok)throw Error(r.status);
  return r.json();
}

const $=id=>document.getElementById(id);

function short(s){
  return s&&s.length>24?s.slice(0,12)+'…'+s.slice(-10):(s||'—');
}

async function load(){
  try{
    const n=await api('/api/network');

    $('status').textContent='🟢 Online';
    $('height').textContent=n.latestHeight;
    $('blocksCount').textContent=n.count;

    const d=await api('/api/blocks');

    $('list').innerHTML=(d.blocks||[]).map(b=>`
      <article class="block" onclick="show(${b.height})">
        <div class="row">
          <b>Block #${b.height}</b>
          <span class="ok">${b.status}</span>
        </div>

        <div class="hash">${short(b.hash)}</div>

        <div class="muted">
          ${b.transactionCount} transaction(s) • ${b.proposer}
        </div>
      </article>
    `).join('')||'No blocks';

  }catch(e){
    $('status').textContent='🔴 Offline';
    $('list').textContent='API connection failed.';
  }
}

async function show(h){
  try{
    const b=await api('/api/blocks/'+h);

    $('detail').classList.remove('hidden');

    $('detail').innerHTML=`
      <div class="title">
        <h2>Block #${b.height}</h2>
        <button onclick="closeDetail()">Close</button>
      </div>

      <p>
        <span class="muted">Hash</span><br>
        <span class="hash">${b.hash}</span>
      </p>

      <p>
        <span class="muted">Previous Hash</span><br>
        <span class="hash">${b.previousHash}</span>
      </p>

      <p>
        <span class="muted">Timestamp</span><br>
        ${b.timestamp}
      </p>

      <p>
        <span class="muted">Proposer</span><br>
        ${b.proposer}
      </p>

      <p>
        <span class="muted">Status</span><br>
        <span class="ok">${b.status}</span>
      </p>

      <h3>Transactions (${b.transactions.length})</h3>

      ${
        b.transactions.map(t=>`
          <div
            class="block"
            onclick="showTransaction('${String(t.hash).replace(/'/g,"\\'")}')"
            style="cursor:pointer"
          >
            <div class="hash">${t.hash}</div>

            <div class="muted">
              ${t.from} → ${t.to} • Amount: ${t.amount}
            </div>

            <div class="muted">
              Tap to view transaction details →
            </div>
          </div>
        `).join('')
        || '<p class="muted">No transactions.</p>'
      }
    `;

    $('detail').scrollIntoView({
      behavior:'smooth'
    });

  }catch(e){
    $('msg').textContent='Block not found';
  }
}

async function showTransaction(hash){
  try{
    const t=await api(
      '/api/transactions/'+encodeURIComponent(hash)
    );

    $('detail').classList.remove('hidden');

    $('detail').innerHTML=`
      <div class="title">
        <h2>💸 Transaction Details</h2>
        <button onclick="closeDetail()">Close</button>
      </div>

      <p>
        <span class="muted">Transaction Hash</span><br>
        <span class="hash">${t.hash||hash}</span>
      </p>

      <p>
        <span class="muted">Status</span><br>
        <span class="ok">${t.status||'Finalized'}</span>
      </p>

      <p>
        <span class="muted">From</span><br>
        ${t.from||'—'}
      </p>

      <p>
        <span class="muted">To</span><br>
        ${t.to||'—'}
      </p>

      <p>
        <span class="muted">Amount</span><br>
        ${t.amount??'—'}
      </p>

      <p>
        <span class="muted">Nonce</span><br>
        ${t.nonce??'—'}
      </p>

      <p>
        <span class="muted">Timestamp</span><br>
        ${t.timestamp||'—'}
      </p>

      <p>
        <span class="muted">Block</span><br>
        ${t.blockHeight??t.height??'—'}
      </p>

      <p>
        <span class="muted">Proposer</span><br>
        ${t.proposer||'—'}
      </p>

      <p>
        <span class="muted">Consensus</span><br>
        ${t.consensus||'Proof-of-Reputation'}
      </p>
    `;

    $('detail').scrollIntoView({
      behavior:'smooth'
    });

  }catch(e){
    $('msg').textContent='Transaction not found';
  }
}

function closeDetail(){
  $('detail').classList.add('hidden');
}

async function search(){
  const q=$('q').value.trim();

  if(!q)return;

  if(/^\d+$/.test(q)){
    show(q);
    return;
  }

  try{
    await showTransaction(q);
  }catch(e){
    $('msg').textContent='Transaction not found';
  }
}

load();
