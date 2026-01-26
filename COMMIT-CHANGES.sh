#!/bin/bash
# Script para commitar atualizações dos READMEs
# Tracklay v3.0.0 - SEO Optimization

echo "📝 Preparando commit dos READMEs atualizados..."
echo

# Verificar se arquivos foram modificados
echo "Status dos arquivos:"
git status --short README.md README.pt-BR.md
echo

# Adicionar arquivos
echo " → Adicionando README.md e README.pt-BR.md..."
git add README.md README.pt-BR.md
echo

# Fazer commit
echo " → Fazendo commit..."
git commit -m "docs: atualiza README.md e README.pt-BR.md para v3.0.0

🎯 Otimização SEO completa dos READMEs

README.md (Inglês):
- Adicionada seção 'Why This Project Exists' com história completa
- Incluídos estudos de caso reais com dados financeiros
- Adicionado resumo executivo de problemas de privacidade
- Otimizado para SEO com foco em 'first-party tracking', 'Safari ITP', 'ad-blocker bypass'
- Melhorada estrutura de tabelas comparativas
- Adicionados exemplos práticos de ROI

README.pt-BR.md (Português):
- Tradução completa do novo conteúdo do README.md
- Mantida paridade 100% de informações entre versões
- Otimizado para SEO brasileiro: 'bypass Safari', 'bloqueadores de anúncios', 'rastreamento first-party'
- Adaptados valores monetários para real (R$)
- Mantido tom profissional e técnico

Ambos:
- Versionados como v3.0.0
- Estrutura de headings otimizada (H1, H2, H3)
- Rich snippets e meta descrições implícitas
- Links internos para documentação
- Chamadas para ação claras (Deploy button, Quick Start)

🔗 Pronto para indexação e rankeamento em busca"
echo

# Mostrar resultado
echo "✅ Commit realizado com sucesso!"
echo
echo "Para enviar ao remote:"
echo "   git push origin main"
echo
