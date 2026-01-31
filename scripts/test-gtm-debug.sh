#!/bin/bash
# Testa se gtm_debug afeta a criação do sw_iframe.html

echo "========================================"
echo "Teste: gtm_debug vs sw_iframe.html"
echo "========================================"
echo ""

GTM_URL="https://cdn.suevich.com/cdn/g/b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f?id=GTM-MJ7DW8H"

echo "1. Baixando script SEM gtm_debug..."
curl -s "$GTM_URL" -o /tmp/gtm_normal.js
echo "   Tamanho: $(wc -c < /tmp/gtm_normal.js) bytes"

echo ""
echo "2. Baixando script COM gtm_debug..."
curl -s "$GTM_URL&gtm_debug=1769870218473" -o /tmp/gtm_debug.js
echo "   Tamanho: $(wc -c < /tmp/gtm_debug.js) bytes"

echo ""
echo "3. Comparando conteúdo..."
if diff -q /tmp/gtm_normal.js /tmp/gtm_debug.js > /dev/null 2>&1; then
    echo "   ❌ Arquivos são IDÊNTICOS"
    echo "   O parâmetro gtm_debug NÃO altera o script servido"
else
    echo "   ✅ Arquivos são DIFERENTES"
    echo "   O parâmetro gtm_debug ALTERA o script!"
    echo ""
    echo "   Diferenças encontradas:"
    diff /tmp/gtm_normal.js /tmp/gtm_debug.js | head -20
fi

echo ""
echo "4. Verificando referências a 'debug' nos scripts..."
echo "   Script normal:"
grep -o 'debug' /tmp/gtm_normal.js | wc -l
echo "   ocorrências de 'debug'"

echo ""
echo "   Script com gtm_debug:"
grep -o 'debug' /tmp/gtm_debug.js | wc -l
echo "   ocorrências de 'debug'"

echo ""
echo "5. Verificando blob de configuração..."
echo "   Normal:"
grep -o '"blob":{[^}]*}' /tmp/gtm_normal.js | head -1 | cut -c1-100
echo "..."

echo ""
echo "   Com gtm_debug:"
grep -o '"blob":{[^}]*}' /tmp/gtm_debug.js | head -1 | cut -c1-100
echo "..."

echo ""
echo "========================================"
echo "Teste concluído!"
echo "========================================"
