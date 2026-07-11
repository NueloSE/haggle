// Paste this whole file into the browser console on https://agent.croo.network
// while logged in. It fetches service listings for every candidate agent in
// Haggle's registry using your session, and prints one JSON blob to copy back.
(async () => {
  const agents = [
    ['Floatline', 'd1f0a83a-569b-48f3-993d-cdc59d13564c'],
    ['Receipt Agent', 'c48d4feb-e646-4732-84b0-0d361c59884d'],
    ['Verigate', 'd233deca-1d68-4efb-85b2-11dc34d64a7c'],
    ['VeriMath', '10c250b0-c4dd-48de-be0f-5138645e1045'],
    ['Quanta', '21006671-0444-4afc-b25c-b1162685ad8a'],
    ['ProofDesk', 'ee0428c4-63d9-4ee2-9a06-1239a8fb1b34'],
    ['DataScout', '91652cb6-99d8-4633-9870-4c65c9286f7f'],
    ['RateCard', '1a6b6e0c-7257-4c52-bdbd-6b39ba9f5d4b'],
    ['AlphaTrack', 'e05abaea-a586-4954-bbcf-d5c93127a214'],
    ['DepegGuard', '5cbcbd42-efb7-4e53-ab0b-83e2a53acbfc'],
    ['FUD.ai', '4799b7fe-3b19-4435-bdfe-93de07ec5c40'],
    ['Manga Localizer', '0dfd114d-dc6e-4f01-bfce-686617d38ee8'],
    ['Handshake', 'ef693589-8b87-4b4f-8bfd-bf47d47e01d7'],
    ['Gauntlet', 'cbff66bc-affc-45a2-a85f-7f228a8f764b'],
    // Haggle itself — confirms our own service id:
    ['HAGGLE (self)', 'a28b21af-6664-4e21-b0d9-bd12d5a1eacb'],
  ];
  const bases = [
    (id) => `https://api.croo.network/backend/v1/agents/${id}/services`,
    (id) => `https://api.croo.network/backend/v1/agents/${id}`,
    (id) => `https://api.croo.network/backend/v1/services?agent_id=${id}`,
  ];
  const out = {};
  for (const [name, id] of agents) {
    out[name] = { agentId: id, raw: null };
    for (const mk of bases) {
      try {
        const r = await fetch(mk(id), { credentials: 'include' });
        if (!r.ok) continue;
        const j = await r.json();
        if (j && (j.services || j.data || j.items || Array.isArray(j))) {
          out[name].raw = j;
          break;
        }
        if (!out[name].raw) out[name].raw = j; // keep last non-empty response as fallback
      } catch (e) { /* try next */ }
    }
    console.log(name, out[name].raw ? 'OK' : 'no data');
  }
  console.log('=== COPY EVERYTHING BELOW THIS LINE ===');
  console.log(JSON.stringify(out));
})();
