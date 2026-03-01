async function g(e){var o;const c="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",p=e.topCVEs.map(s=>`  - ${s.cveId} (CVSS ${s.score}) — ${s.product} — ${s.affected} ativos afetados`).join(`
`),d=e.highRiskAssets.slice(0,6).map(s=>`  - ${s.asset} (${s.ip}, ${s.type}) — Score de Risco: ${s.riskScore}, Críticos: ${s.critical}, Altos: ${s.high}`).join(`
`),n=e.openTasks.slice(0,8).map(s=>`  - [${s.id}] ${s.cveId} em ${s.asset} — Prioridade: ${s.priority}, Status: ${s.status}`).join(`
`),r=`Você é um analista sênior de gestão de vulnerabilidades. Com base nos seguintes dados reais de varredura do Outpost24, gere exatamente 4 recomendações de remediação priorizadas. Responda TUDO em Português do Brasil.

Resumo de Vulnerabilidades:
- Total de vulnerabilidades: ${e.totalVulns}
- CVEs críticas: ${e.criticalCount}
- Conformidade de patches: ${e.patchCompliance}

CVEs Críticas Prioritárias:
${p}

Ativos de Maior Risco:
${d}

Tarefas de Remediação Abertas:
${n}

Retorne APENAS um array JSON válido com exatamente 4 objetos. Cada objeto deve ter exatamente estes campos:
- "priority": number (1-4, 1 = mais urgente)
- "title": string (título curto da ação em português, máx 12 palavras)
- "cveId": string (o CVE ID mais relevante, ou "Múltiplos" se geral)
- "rationale": string (1-2 frases em português explicando por que é priorizado, referenciando dados reais)
- "steps": array de 3 strings (passos concretos de remediação em português)
- "urgency": string, exatamente um de: "Critical", "High", "Medium"

Sem markdown, sem explicações, sem chaves extras. Apenas o array JSON.`,a=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${c}`},body:JSON.stringify({model:"gpt-4o-mini",messages:[{role:"user",content:r}],max_tokens:1200,temperature:.55})});if(!a.ok){const s=await a.json().catch(()=>({}));throw new Error(`OpenAI API error (${a.status}): ${((o=s.error)==null?void 0:o.message)??a.statusText}`)}const i=(await a.json()).choices[0].message.content.trim();try{const s=JSON.parse(i);if(Array.isArray(s))return s}catch{const s=i.match(/\[[\s\S]*\]/);if(s)try{return JSON.parse(s[0])}catch{}}throw new Error("Could not parse AI response as a valid remediation plan.")}async function h(e){var u,i;const c="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",d=`Você é um especialista sênior em gestão de vulnerabilidades. Para cada CVE listada abaixo, forneça um guia de remediação detalhado e acionável baseado em avisos reais de fabricantes e melhores práticas de segurança. Responda TUDO em Português do Brasil.

CVEs para remediar:
${e.map(o=>`- ${o.cveId} (CVSS ${o.score}) — Product: ${o.product} — ${o.affected} assets affected`).join(`
`)}

Retorne APENAS um array JSON válido. Cada elemento deve ser um objeto com exatamente estes campos:
- "cveId": string (o CVE ID exato)
- "product": string (nome exato do produto da entrada)
- "score": number (score CVSS exato da entrada)
- "severity": string — exatamente um de: "Critical", "High", "Medium", "Low"
- "summary": string (1 frase em português: o que é a vulnerabilidade e seu impacto)
- "steps": array de exatamente 5 strings — passos concretos e ordenados de remediação em português (ex: "1. Identificar versões afetadas...", "2. Aplicar patch...", etc.)
- "verification": string (1 frase em português: como confirmar que a remediação foi bem-sucedida)
- "references": array de 2 strings — URLs reais de avisos de fabricantes ou NVD (use formato: "https://nvd.nist.gov/vuln/detail/${((u=e[0])==null?void 0:u.cveId)??"CVE-XXXX-XXXX"}" como fallback)

Sem markdown, sem comentários extras, apenas o array JSON.`,n=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${c}`},body:JSON.stringify({model:"gpt-4o-mini",messages:[{role:"user",content:d}],max_tokens:2500,temperature:.4})});if(!n.ok){const o=await n.json().catch(()=>({}));throw new Error(`OpenAI API error (${n.status}): ${((i=o.error)==null?void 0:i.message)??n.statusText}`)}const a=(await n.json()).choices[0].message.content.trim();try{const o=JSON.parse(a);if(Array.isArray(o))return o}catch{const o=a.match(/\[[\s\S]*\]/);if(o)try{return JSON.parse(o[0])}catch{}}throw new Error("Could not parse AI response as CVE remediation guides.")}async function v(e){var i,o,s,m;const c="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",p=(i=e.severityBreakdown)!=null&&i.length?`
Distribuição de severidade:
`+e.severityBreakdown.map(t=>`  - ${t.name}: ${t.value}`).join(`
`):"",d=(o=e.endpointsByOS)!=null&&o.length?`
Endpoints por sistema operativo:
`+e.endpointsByOS.map(t=>`  - ${t.os}: ${t.count}`).join(`
`):"",n=(s=e.incidents)!=null&&s.length?`
Registo de incidentes:
`+e.incidents.map(t=>`  - [${t.ref}] ${t.severity} | ${t.category} | ${t.description} | Estado: ${t.status}`).join(`
`):"",r=`És um analista sénior de cibersegurança da empresa Contego Security a redigir um relatório executivo em português europeu (pt-PT) para um cliente MSSP.

Redige um parágrafo executivo com 3-4 frases concisas e profissionais baseado nos seguintes dados reais de segurança. Usa exatamente os valores e referências fornecidos. Não uses marcadores, cabeçalhos nem listas — apenas texto corrido.

Plataforma: ${e.platform}
Cliente: ${e.client}
Período do relatório: ${e.period} (${e.periodRange})
Endpoints geridos: ${e.totalEndpoints}
Deteções ativas: ${e.activeDetections}
Incidentes resolvidos: ${e.resolvedIncidents}
Incidentes em investigação: ${e.openIncidents}
Tempo médio de resposta (MTTR): ${e.mttr}
Cobertura de proteção: ${e.coverage}
Alertas críticos contidos: ${e.criticalAlerts}
Classificação de risco: ${e.riskRating}${p}${d}${n}

Redige apenas o parágrafo narrativo, sem introdução nem conclusão adicionais.`,a=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${c}`},body:JSON.stringify({model:"gpt-4o-mini",messages:[{role:"user",content:r}],max_tokens:400,temperature:.65})});if(!a.ok){const t=await a.json().catch(()=>({}));throw new Error(`Erro da API OpenAI (${a.status}): ${((m=t.error)==null?void 0:m.message)??a.statusText}`)}return(await a.json()).choices[0].message.content.trim()}async function f(e){var o,s,m;const c="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",p=e.incidents.map(t=>`  - [${t.ref}] ${t.severity} | ${t.category} | ${t.description} | Estado: ${t.status}`).join(`
`),d=(o=e.severityBreakdown)!=null&&o.length?`
Distribuição de severidade:
`+e.severityBreakdown.map(t=>`  - ${t.name}: ${t.value}`).join(`
`):"",n=(s=e.endpointsByOS)!=null&&s.length?`
Endpoints por SO:
`+e.endpointsByOS.map(t=>`  - ${t.os}: ${t.count}`).join(`
`):"",r=`És um analista sénior de cibersegurança da empresa Contego Security a elaborar recomendações estratégicas em português europeu (pt-PT) para um relatório executivo MSSP.

Com base nos seguintes dados reais do período ${e.period}, gera exatamente 3 recomendações estratégicas prioritárias, concisas e acionáveis. Cada recomendação deve ter 1-2 frases, referenciar dados ou incidentes concretos quando relevante, e ser dirigida à equipa de gestão de segurança.

Plataforma: ${e.platform}
Cliente: ${e.client}
Endpoints geridos: ${e.totalEndpoints??"N/A"}
Incidentes resolvidos: ${e.resolvedIncidents}
Incidentes em investigação: ${e.openIncidents}
Alertas críticos contidos: ${e.criticalAlerts}
Cobertura de proteção: ${e.coverage}
Classificação de risco: ${e.riskRating}${d}${n}

Registo completo de incidentes:
${p}

Responde APENAS com um array JSON válido de 3 strings, sem markdown, sem comentários, sem chaves extra. Exemplo: ["Rec 1", "Rec 2", "Rec 3"]`,a=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${c}`},body:JSON.stringify({model:"gpt-4o-mini",messages:[{role:"user",content:r}],max_tokens:500,temperature:.6})});if(!a.ok){const t=await a.json().catch(()=>({}));throw new Error(`Erro da API OpenAI (${a.status}): ${((m=t.error)==null?void 0:m.message)??a.statusText}`)}const i=(await a.json()).choices[0].message.content.trim();try{const t=JSON.parse(i);if(Array.isArray(t))return t.map(String)}catch{const t=i.match(/\[[\s\S]*\]/);if(t)try{const l=JSON.parse(t[0]);if(Array.isArray(l))return l.map(String)}catch{}}return i.split(`
`).map(t=>t.replace(/^[\d.\-*]+\s*/,"").trim()).filter(Boolean).slice(0,3)}async function $(e){var i;const c="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",p=e.topCVEs.slice(0,10).map(o=>`  - ${o.cveId} (CVSS ${o.score}) — ${o.product} — ${o.affected} ativos`).join(`
`),d=e.riskBands.map(o=>`  - ${o.label}: ${o.count} ativos`).join(`
`),n=`Você é um analista sênior de cibersegurança especializado em gestão de risco corporativo. Com base nos dados reais de varredura do Outpost24 abaixo, calcule o risco geral da organização e forneça uma análise detalhada. Responda TUDO em Português do Brasil.

Dados de Vulnerabilidade:
- Total de vulnerabilidades: ${e.totalVulns}
- CVEs críticas: ${e.criticalCount}
- CVEs altas: ${e.highCount}
- CVSS médio: ${e.avgCVSS}
- Ativos escaneados: ${e.assetsScanned}
- Conformidade de patches: ${e.patchCompliance}
- Ativos críticos (score ≥80): ${e.criticalAssets}
- Score médio de risco dos ativos: ${e.avgRiskScore}

Distribuição por Banda de Risco:
${d}

Top CVEs Encontradas:
${p}

Retorne APENAS um objeto JSON válido com exatamente estes campos:
- "overallRiskScore": number (0-100, calculado com base na severidade, quantidade, exposição e conformidade)
- "riskLevel": string (exatamente um de: "Crítico", "Alto", "Médio", "Baixo")
- "summary": string (2-3 frases em português resumindo a postura de risco da organização)
- "factors": array de 4 objetos, cada um com: { "factor": string (nome do fator), "impact": string ("Alto"|"Médio"|"Baixo"), "description": string (1 frase explicando) }
- "recommendations": array de 3 strings (recomendações prioritárias em português para reduzir o risco)
- "trend": string (exatamente um de: "Piorando", "Estável", "Melhorando")
- "trendExplanation": string (1 frase explicando a tendência)

Sem markdown, sem explicações extras. Apenas o objeto JSON.`,r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${c}`},body:JSON.stringify({model:"gpt-4o-mini",messages:[{role:"user",content:n}],max_tokens:1500,temperature:.45})});if(!r.ok){const o=await r.json().catch(()=>({}));throw new Error(`Erro da API OpenAI (${r.status}): ${((i=o.error)==null?void 0:i.message)??r.statusText}`)}const u=(await r.json()).choices[0].message.content.trim();try{return JSON.parse(u)}catch{const o=u.match(/\{[\s\S]*\}/);if(o)try{return JSON.parse(o[0])}catch{}}throw new Error("Não foi possível interpretar a resposta da IA como análise de risco.")}async function C(e){var i;const c="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",p=e.topCVEs.slice(0,8).map(o=>`  - ${o.cveId} (CVSS ${o.score}) — ${o.product} — ${o.affected} ativos`).join(`
`),d=e.topProducts.slice(0,6).map(o=>`  - ${o.label}: ${o.count} vulnerabilidades`).join(`
`),n=`Você é um analista sênior de cibersegurança da empresa CAP elaborando um relatório executivo completo de gestão de vulnerabilidades. Com base nos dados reais do Outpost24 abaixo, gere uma análise completa do relatório. Responda TUDO em Português do Brasil.

Dados do Período:
- Total de vulnerabilidades: ${e.totalVulns}
- CVEs Críticas: ${e.criticalCount}
- CVEs Altas: ${e.highCount}
- CVEs Médias: ${e.mediumCount}
- CVEs Baixas: ${e.lowCount}
- CVSS médio: ${e.avgCVSS}
- Ativos escaneados: ${e.assetsScanned}
- Conformidade de patches: ${e.patchCompliance}
- Total de achados: ${e.totalFindings}
- Agendamentos de varredura: ${e.scanSchedules}

Top CVEs:
${p}

Produtos Mais Afetados:
${d}

Retorne APENAS um objeto JSON válido com exatamente estes campos:
- "executiveSummary": string (3-4 frases em português — resumo executivo profissional da postura de segurança)
- "keyFindings": array de 4 strings (principais descobertas em português, cada uma com 1-2 frases)
- "riskOverview": string (2 frases sobre o panorama geral de risco em português)
- "complianceStatus": string (1-2 frases sobre conformidade e patches em português)
- "actionItems": array de 3 objetos: { "priority": number (1-3), "action": string (ação em português), "deadline": string (prazo sugerido, ex: "Imediato", "7 dias", "30 dias") }
- "conclusion": string (1-2 frases — conclusão e próximos passos em português)

Sem markdown, sem explicações extras. Apenas o objeto JSON.`,r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${c}`},body:JSON.stringify({model:"gpt-4o-mini",messages:[{role:"user",content:n}],max_tokens:2e3,temperature:.5})});if(!r.ok){const o=await r.json().catch(()=>({}));throw new Error(`Erro da API OpenAI (${r.status}): ${((i=o.error)==null?void 0:i.message)??r.statusText}`)}const u=(await r.json()).choices[0].message.content.trim();try{return JSON.parse(u)}catch{const o=u.match(/\{[\s\S]*\}/);if(o)try{return JSON.parse(o[0])}catch{}}throw new Error("Não foi possível interpretar a resposta da IA como análise de relatório.")}export{f as a,$ as b,g as c,h as d,C as e,v as g};
