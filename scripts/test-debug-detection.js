/**
 * Teste de Detecção de Debug
 * Script para testar se a detecção está funcionando
 */

// Testes de detecção
const testCases = [
  {
    name: 'Query param gtm_debug',
    url: 'https://cdn.suevich.com/gtm.js?id=GTM-TEST&gtm_debug=12345',
    expected: true
  },
  {
    name: 'Query param gtm_preview', 
    url: 'https://cdn.suevich.com/gtm.js?id=GTM-TEST&gtm_preview=1',
    expected: true
  },
  {
    name: 'Sem debug',
    url: 'https://cdn.suevich.com/gtm.js?id=GTM-TEST',
    expected: false
  },
  {
    name: 'Referrer Tag Assistant',
    url: 'https://cdn.suevich.com/gtm.js?id=GTM-TEST',
    referrer: 'https://tagassistant.google.com/',
    expected: true
  }
];

// Simular função de detecção
function testIsDebugMode(url, referrer = '') {
  const urlObj = new URL(url);
  
  // Query params
  if (urlObj.searchParams.has('gtm_debug') || 
      urlObj.searchParams.has('gtm_preview')) {
    return true;
  }
  
  // Referrer
  if (referrer.includes('tagassistant.google.com')) {
    return true;
  }
  
  return false;
}

// Testar modificações no script
function testScriptModification(scriptContent) {
  console.log('\n=== Teste de Modificação ===\n');
  
  // Teste 1: Detectar Lg=!1
  const hasLgFalse = scriptContent.includes('Lg=!1');
  console.log('Script original tem Lg=!1:', hasLgFalse);
  
  // Teste 2: Simular modificação
  let modified = scriptContent;
  modified = modified.replace(/Lg=!1/g, 'Lg=!0');
  
  const hasLgTrue = modified.includes('Lg=!0');
  console.log('Após modificação tem Lg=!0:', hasLgTrue);
  
  // Teste 3: Verificar blob
  const hasBlob = modified.includes('"blob":{');
  console.log('Tem blob:', hasBlob);
  
  return modified;
}

// Executar testes
console.log('=== Testes de Detecção ===\n');

testCases.forEach((test, index) => {
  const result = testIsDebugMode(test.url, test.referrer);
  const status = result === test.expected ? '✅' : '❌';
  
  console.log(`${status} Teste ${index + 1}: ${test.name}`);
  console.log(`   URL: ${test.url}`);
  console.log(`   Esperado: ${test.expected}, Obtido: ${result}`);
  console.log('');
});

// Testar com script real se disponível
if (typeof fetch !== 'undefined') {
  console.log('=== Teste com Script Real ===\n');
  
  fetch('https://www.googletagmanager.com/gtm.js?id=GTM-XXXXXX')
    .then(r => r.text())
    .then(content => {
      console.log('Script carregado, tamanho:', content.length);
      testScriptModification(content);
    })
    .catch(err => {
      console.log('Erro ao carregar script:', err.message);
    });
}

console.log('\n=== Instruções ===');
console.log('1. Adicione ?gtm_debug=1 na URL para ativar debug');
console.log('2. Verifique no console se X-GTM-Mode: debug aparece');
console.log('3. No Tag Assistant, o container deve ser reconhecido');
